const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorize = require('./middleware/authorize'); // Our bouncer
require('dotenv').config();
const CARBON_MULTIPLIERS = require('./utils/carbonFactors');
const multer = require('multer');
const path = require('path');
const auditorGuard = require('./middleware/auditorGuard');
const uploadRoutes = require('./routes/uploadRoutes');
const crypto = require('crypto');
const bankingRoutes = require('./routes/banking-routes');
const insuranceRoutes = require('./routes/insurance-routes');
const sectorRoutes = require('./routes/sector-routes');

const app = express();

// ==========================================
// MULTER / R2 CONFIGURATION
// ==========================================

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multerS3 = require('multer-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const storage = multerS3({
  s3: s3Client,
  bucket: process.env.R2_BUCKET_NAME,
  key: function (req, file, cb) {
    const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });

// Middleware
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://esgradarcompliance.com', 'https://www.esgradarcompliance.com'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());
app.use('/api', uploadRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/organizations', sectorRoutes);

// ==========================================
// GET ALL EMISSIONS (For Dashboards)
// ==========================================
app.get('/api/emissions', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, u.name as organization_name
             FROM esg_observation e
             JOIN Organization_Unit u ON e.unit_id = u.unit_id
             WHERE e.scope_category IS NOT NULL
             ORDER BY 
                CASE WHEN status = 'Pending' THEN 1 ELSE 2 END, 
                created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching emissions:", err.message);
        res.status(500).send('Server error fetching emissions');
    }
});

// ==========================================
// AUDIT QUEUE ROUTE (UNIFIED & PATCHED)
// ==========================================
app.get('/api/audit/pending', authorize, async (req, res) => {
    try {
        const query = `
            -- 1. FETCH CARBON DATA
            SELECT 
                e.observation_id as id,
                'GHG' as type, 
                u.name as organization_name,
                e.scope_category,
                e.activity_type as metric, 
                e.activity_type,             
                e.raw_amount::text as value, 
                e.raw_amount,                
                e.calculated_co2e,           
                'units' as unit_of_measure,
                e.quality_tier,
                e.evidence_url as evidence_file_url,
                e.status, 
                COALESCE(e.created_at, e.timestamp) as created_at 
            FROM esg_observation e
            JOIN organization_unit u ON e.unit_id = u.unit_id
            WHERE e.scope_category IS NOT NULL
            
            UNION ALL
            
            -- 2. FETCH GENERAL, SOCIAL, & GOV DATA
            SELECT 
                o.observation_id as id, 
                CASE 
                    WHEN o.pillar = 'E' THEN 'Environment'
                    WHEN o.pillar = 'S' THEN 'Social'
                    WHEN o.pillar = 'G' THEN 'Governance'
                    ELSE 'General' 
                END as type, 
                u.name as organization_name,
                'N/A' as scope_category,
                o.metric_name as metric, 
                o.metric_name as activity_type,             
                COALESCE(o.numeric_value::text, o.text_value) as value, 
                o.numeric_value as raw_amount,                
                NULL::numeric as calculated_co2e,           
                o.unit_of_measure,
                o.quality_tier,
                o.evidence_url as evidence_file_url,
                o.status, 
                COALESCE(o.timestamp, o.created_at) as created_at 
            FROM esg_observation o
            JOIN organization_unit u ON o.unit_id = u.unit_id
            WHERE o.pillar IS NOT NULL
            
            ORDER BY created_at DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching audit queue:", err.message);
        res.status(500).json({ error: "Failed to fetch audit queue." });
    }
});

// Setup memory storage specifically for reading CSV text directly into the pipeline
const memoryUpload = multer({ storage: multer.memoryStorage() });

// ==========================================
// HEALTH CHECK ROUTE (Unprotected)
// ==========================================
app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'Database connected!', time: result.rows[0].now });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ==========================================
// ORGANIZATION UNIT ROUTES (Multi-Tenant Protected)
// ==========================================

// CREATE a new Organization Unit
app.post('/api/organizations', authorize, auditorGuard, async (req, res) => {
    try {
        const { name, unit_type, jurisdiction, parent_unit_id } = req.body;
        const finalParentId = parent_unit_id === "" || !parent_unit_id ? null : parent_unit_id;

        const newOrg = await pool.query(
            "INSERT INTO Organization_Unit (name, unit_type, jurisdiction, parent_unit_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, unit_type, jurisdiction, finalParentId]
        );
        
        res.json(newOrg.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to create organization" });
    }
});

// UPDATE an Organization Unit
app.put('/api/organizations/:id', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const { id } = req.params;
        const { name, parent_unit_id, equity_share_percentage, has_operational_control } = req.body;

        const safeParentId = parent_unit_id === "" ? null : parent_unit_id;

        const updatedOrg = await pool.query(
            `UPDATE Organization_Unit 
             SET name = $1, parent_unit_id = $2, equity_share_percentage = $3, has_operational_control = $4 
             WHERE unit_id = $5 RETURNING *`,
            [name, safeParentId, equity_share_percentage, has_operational_control, id]
        );

        if (updatedOrg.rows.length === 0) {
            return res.status(404).json({ error: "Organization not found." });
        }

        res.json(updatedOrg.rows[0]);
    } catch (err) {
        console.error("Error updating organization:", err.message);
        res.status(500).json({ error: "Failed to update organization structure." });
    }
});

// READ all Organization Units (full hierarchy under the root company)
app.get('/api/organizations', authorize, async (req, res) => {
    try {
        const query = `
            WITH RECURSIVE 
            root_finder AS (
                SELECT unit_id, parent_unit_id, name
                FROM Organization_Unit
                WHERE unit_id = $1

                UNION ALL

                SELECT ou.unit_id, ou.parent_unit_id, ou.name
                FROM Organization_Unit ou
                JOIN root_finder rf ON ou.unit_id = rf.parent_unit_id
            ),
            root_unit AS (
                SELECT unit_id FROM root_finder WHERE parent_unit_id IS NULL
                LIMIT 1
            ),
            org_tree AS (
                SELECT * FROM Organization_Unit WHERE unit_id = (SELECT unit_id FROM root_unit)

                UNION ALL

                SELECT ou.*
                FROM Organization_Unit ou
                JOIN org_tree ot ON ou.parent_unit_id = ot.unit_id
            )
            SELECT * FROM org_tree ORDER BY created_at DESC;
        `;
        const allOrgs = await pool.query(query, [req.user.company_id]);
        res.json(allOrgs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch organizations" });
    }
});

// DELETE an Organization Unit
// (Note: this was previously defined twice in the file — the duplicate, buggy
// version referencing a non-existent 'company_id' column has been removed.
// This is the single, corrected definition.)
app.delete('/api/organizations/:id', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const { id } = req.params;

        const deletedOrg = await pool.query(
            "DELETE FROM Organization_Unit WHERE unit_id = $1 RETURNING *",
            [id]
        );

        if (deletedOrg.rows.length === 0) {
            return res.status(404).json({ error: "Organization not found." });
        }

        res.json({ message: "Organization deleted successfully." });
    } catch (err) {
        console.error(err.message);
        if (err.code === '23503') {
            return res.status(400).json({ error: "Cannot delete: This organization already has emissions or observations logged against it." });
        }
        res.status(500).json({ error: "Failed to delete organization" });
    }
});

// ==========================================
// METRIC DEFINITION ROUTES (Global)
// ==========================================

app.post('/api/metrics', authorize, auditorGuard, async (req, res) => {
    try {
        const { pillar, name, data_type, unit_of_measure, aggregation_type } = req.body;
        const newMetric = await pool.query(
            "INSERT INTO Metric_Definition (pillar, name, data_type, unit_of_measure, aggregation_type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [pillar, name, data_type, unit_of_measure, aggregation_type]
        );
        res.json(newMetric.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to create metric" });
    }
});

app.get('/api/metrics', authorize, async (req, res) => {
    try {
        const allMetrics = await pool.query("SELECT * FROM Metric_Definition ORDER BY pillar, name");
        res.json(allMetrics.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
});

// ==========================================
// ESG OBSERVATION (DATA ENTRY) ROUTES 
// ==========================================

app.post('/api/observations', authorize, auditorGuard, upload.single('evidence_file'), async (req, res) => {
    try {
        let { organization_id, metric_name, numeric_value, text_value, unit_of_measure, pillar } = req.body;
        const evidence_url = req.file ? req.file.key : null;
        const quality_tier = req.file ? 'A' : 'C';

        if (!organization_id || organization_id === 'undefined' || organization_id === 'null' || organization_id === '') {
            return res.status(400).json({ error: "Please select an Organization from the dropdown." });
        }

        const safeNumeric = (!numeric_value || numeric_value === 'undefined' || numeric_value === 'null' || numeric_value === '') 
            ? null 
            : Number(numeric_value);
            
        const safeText = (!text_value || text_value === 'undefined' || text_value === 'null') 
            ? null 
            : text_value;

        const metricResult = await pool.query(
            `SELECT metric_id FROM metric_definition WHERE name = $1 LIMIT 1`,
            [metric_name]
        );

        if (metricResult.rows.length === 0) {
            return res.status(400).json({
                error: `No metric definition found for "${metric_name}".`
            });
        }

        const metric_id = metricResult.rows[0].metric_id;

        const result = await pool.query(`
            INSERT INTO ESG_Observation 
            (unit_id, metric_id, metric_name, numeric_value, text_value, unit_of_measure, pillar, evidence_url, quality_tier, "timestamp")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *;
        `, [organization_id, metric_id, metric_name, safeNumeric, safeText, unit_of_measure, pillar, evidence_url, quality_tier]);

        res.json({ message: "Data logged successfully with evidence!", data: result.rows[0] });
    } catch (err) {
        console.error("Error saving observation:", err);
        res.status(500).json({ error: "Failed to log data." });
    }
});

app.get('/api/observations', authorize, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.observation_id, 
                o.numeric_value, 
                o.text_value, 
                o.timestamp,
                u.name AS organization_name,
                COALESCE(o.metric_name, m.name) AS metric_name,
                COALESCE(o.unit_of_measure, m.unit_of_measure) AS unit_of_measure,
                COALESCE(o.pillar, m.pillar) AS pillar
            FROM ESG_Observation o
            JOIN Organization_Unit u ON o.unit_id = u.unit_id
            LEFT JOIN Metric_Definition m ON o.metric_id = m.metric_id
            WHERE u.unit_id = $1
            ORDER BY o.timestamp DESC
        `;
        const allObs = await pool.query(query, [req.user.company_id]);
        res.json(allObs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch observations" });
    }
});

// ==========================================
// GHG EMISSIONS (CARBON TRACKER) ROUTE
// ==========================================
app.post('/api/emissions', authorize, auditorGuard, upload.single('evidence_file'), async (req, res) => {
    try {
        const { organization_id, scope_category, activity_type, raw_amount } = req.body;

        if (!organization_id || !scope_category || !activity_type || raw_amount == null) {
            return res.status(400).json({ error: "Missing required field(s)" });
        }

        const metricResult = await pool.query(
            `SELECT metric_id FROM metric_definition WHERE name = $1 LIMIT 1`,
            [activity_type]
        );

        if (metricResult.rows.length === 0) {
            return res.status(400).json({
                error: `No metric definition found for activity type "${activity_type}".`
            });
        }

        const metric_id = metricResult.rows[0].metric_id;
        const evidence_url = req.file ? req.file.key : null;
        const quality_tier = req.file ? 'A' : 'C';

        const multiplier = CARBON_MULTIPLIERS[scope_category]?.[activity_type] || 2.3;
        const calculated_co2e = Number(raw_amount) * multiplier;

        const result = await pool.query(`
            INSERT INTO esg_observation 
            (unit_id, metric_id, scope_category, activity_type, raw_amount, calculated_co2e, status, evidence_url, quality_tier, "timestamp")
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, NOW())
            RETURNING *;
        `, [organization_id, metric_id, scope_category, activity_type, raw_amount, calculated_co2e, evidence_url, quality_tier]);

        res.json({ message: "GHG Emission securely logged!", data: result.rows[0] });
    } catch (err) {
        console.error("Error saving GHG emission:", err.message);
        res.status(500).json({ error: "Failed to save GHG data." });
    }
});

app.put('/api/emissions/:id/status', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied: Only Admins and Compliance Managers can approve data." });
        }

        const { id } = req.params;
        const { status } = req.body;

        // Admins have org-wide approval rights.
        // Managers are restricted to their own unit (req.user.company_id is really their unit_id).
        const updatedEmission = req.user.role === 'Admin'
            ? await pool.query(
                `UPDATE esg_observation SET status = $1 
                 WHERE observation_id = $2 
                 RETURNING *`,
                [status, id]
              )
            : await pool.query(
                `UPDATE esg_observation SET status = $1 
                 WHERE observation_id = $2 AND unit_id = $3
                 RETURNING *`,
                [status, id, req.user.company_id]
              );

        if (updatedEmission.rows.length === 0) {
            return res.status(404).json({ error: "Emission record not found, or you don't have permission to approve this unit's data." });
        }

        res.json(updatedEmission.rows[0]);
    } catch (err) {
        console.error("Error updating status:", err.message);
        res.status(500).send('Server error updating status');
    }
});

app.post('/api/emissions/bulk', authorize, auditorGuard, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const emissionsArray = req.body; 
        if (!Array.isArray(emissionsArray)) {
            return res.status(400).json({ error: "Expected an array of emissions data." });
        }

        await client.query('BEGIN'); 

        let insertedCount = 0;

        for (const row of emissionsArray) {
            const { unit_id, scope_category, activity_type, raw_amount } = row;
            
            const multiplier = CARBON_MULTIPLIERS[scope_category]?.[activity_type];
            if (multiplier === undefined) {
                throw new Error(`Invalid category or activity: ${scope_category} / ${activity_type}`);
            }

            const calculated_co2e = Number(raw_amount) * multiplier;

            await client.query(
                `INSERT INTO esg_observation 
                (unit_id, scope_category, activity_type, raw_amount, calculated_co2e) 
                VALUES ($1, $2, $3, $4, $5)`,
                [unit_id, scope_category, activity_type, raw_amount, calculated_co2e]
            );
            insertedCount++;
        }

        await client.query('COMMIT'); 
        res.json({ message: `Successfully processed ${insertedCount} bulk records.` });

    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error("Bulk upload error:", err.message);
        res.status(500).json({ error: err.message || "Failed to process bulk upload." });
    } finally {
        client.release();
    }
});

app.put('/api/emissions/bulk-approve', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied: Only Admins and Compliance Managers can approve data." });
        }

        const updatedEmissions = await pool.query(
            `UPDATE esg_observation SET status = 'Approved' 
             WHERE status = 'Pending' AND unit_id IN (SELECT unit_id FROM Organization_Unit WHERE unit_id = $1)
             RETURNING *`,
            [req.user.company_id]
        );

        res.json({ 
            message: `Successfully approved ${updatedEmissions.rowCount} records.`, 
            count: updatedEmissions.rowCount 
        });
    } catch (err) {
        console.error("Error in bulk approval:", err.message);
        res.status(500).send('Server error during bulk approval');
    }
});

// ==========================================
// COMPLIANCE TASK ASSIGNMENT ROUTES
// ==========================================

app.post('/api/tasks/assign', authorize, async (req, res) => {
    try {
        const { framework_code, description, severity, facility_id, due_date } = req.body;

        if (!framework_code || !description || !due_date) {
            return res.status(400).json({ error: "Missing required field(s)" });
        }

        const isExternal = facility_id === 'external_vendor';
        const assigned_unit_id = isExternal ? null : facility_id;

        const result = await pool.query(
            `INSERT INTO compliance_task_assignment 
             (framework_code, description, severity, assigned_unit_id, assigned_to_external, due_date, assigned_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [framework_code, description, severity || null, assigned_unit_id, isExternal, due_date, req.user.id || null]
        );

        res.json({ message: "Task assigned successfully", data: result.rows[0] });
    } catch (err) {
        console.error("Error assigning task:", err.message);
        res.status(500).json({ error: "Failed to assign task." });
    }
});

app.get('/api/tasks', authorize, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ta.*, ou.name AS facility_name
            FROM compliance_task_assignment ta
            LEFT JOIN organization_unit ou ON ta.assigned_unit_id = ou.unit_id
            ORDER BY ta.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching task assignments:", err.message);
        res.status(500).json({ error: "Failed to fetch task assignments." });
    }
});

// ==========================================
// AUTOMATED FRAMEWORK REPORTING (PATCHED)
// ==========================================
app.get('/api/reports/framework', authorize, async (req, res) => {
    try {
        const { framework, year } = req.query;
        if (!framework || !year) return res.status(400).json({ error: "Missing parameters." });

        const query = `
            SELECT 
                fm.framework_code,
                fm.description as disclosure_requirement,
                SUM(e.calculated_co2e) as total_tco2e,
                SUM(e.raw_amount) as total_raw_amount
            FROM esg_observation e
            JOIN Organization_Unit u ON e.unit_id = u.unit_id
            JOIN Framework_Mappings fm ON e.activity_type = fm.activity_type
            WHERE u.unit_id = $1
              AND e.status = 'Approved'
              AND fm.framework_name = $2
              AND EXTRACT(YEAR FROM e.created_at) = $3 
            GROUP BY fm.framework_code, fm.description
            ORDER BY fm.framework_code;
        `;
        const reportData = await pool.query(query, [req.user.company_id, framework, year]);
        res.json(reportData.rows);
    } catch (err) {
        console.error("Report Engine Error:", err.message);
        res.status(500).json({ error: "Failed to compile framework report." });
    }
});

app.get('/api/reports/readiness', authorize, async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear().toString();
        const query = `
            WITH CompanyFulfilled AS (
                SELECT DISTINCT fm.framework_code
                FROM esg_observation e
                JOIN Organization_Unit u ON e.unit_id = u.unit_id
                JOIN Framework_Mappings fm ON e.activity_type = fm.activity_type
                WHERE u.unit_id = $1
                  AND e.status = 'Approved' 
                  AND EXTRACT(YEAR FROM e.created_at) = $2
            )
            SELECT 
                f.framework_name,
                COUNT(f.framework_code) AS total_requirements,
                COUNT(c.framework_code) AS fulfilled_requirements,
                ROUND((COUNT(c.framework_code)::numeric / COUNT(f.framework_code)::numeric) * 100, 0) AS readiness_score
            FROM Framework_Mappings f
            LEFT JOIN CompanyFulfilled c ON f.framework_code = c.framework_code
            GROUP BY f.framework_name
            ORDER BY readiness_score DESC;
        `;
        const readinessData = await pool.query(query, [req.user.company_id, year]);
        res.json(readinessData.rows);
    } catch (err) {
        console.error("Readiness Engine Error:", err.message);
        res.status(500).json({ error: "Failed to calculate readiness." });
    }
});

app.get('/api/reports/gap-analysis', authorize, async (req, res) => {
    try {
        const { framework, year } = req.query;
        if (!framework || !year) return res.status(400).json({ error: "Missing parameters." });

        const query = `
            WITH CompanyFulfilled AS (
                SELECT 
                    fm.framework_code, 
                    SUM(e.calculated_co2e) as total_co2e,
                    MIN(e.quality_tier) as quality_tier
                FROM esg_observation e
                JOIN Organization_Unit u ON e.unit_id = u.unit_id
                JOIN Framework_Mappings fm ON e.activity_type = fm.activity_type
                WHERE u.unit_id = $1
                  AND e.status = 'Approved' 
                  AND EXTRACT(YEAR FROM e.created_at) = $2
                GROUP BY fm.framework_code
            )
            SELECT 
                f.framework_code,
                f.description,
                f.activity_type,
                CASE WHEN c.framework_code IS NOT NULL THEN true ELSE false END as is_fulfilled,
                c.total_co2e,
                c.quality_tier
            FROM Framework_Mappings f
            LEFT JOIN CompanyFulfilled c ON f.framework_code = c.framework_code
            WHERE f.framework_name = $3
            ORDER BY is_fulfilled ASC, f.framework_code ASC;
        `;
        const gapData = await pool.query(query, [req.user.company_id, year, framework]);
        res.json(gapData.rows);
    } catch (err) {
        console.error("Gap Analysis Engine Error:", err.message);
        res.status(500).json({ error: "Failed to compile gap analysis." });
    }
});

// ==========================================
// ADMIN FRAMEWORK MAPPING ROUTES
// ==========================================

app.get('/api/mappings', authorize, async (req, res) => {
    try {
        const query = `
            SELECT 
                f.mapping_id,
                m.name AS metric_name,
                f.framework_name,
                f.framework_code,
                f.description,
                f.activity_type
            FROM Framework_Mappings f
            JOIN Metric_Definition m ON f.activity_type = m.name
            ORDER BY f.framework_name, m.name;
        `;
        const mappings = await pool.query(query);
        res.status(200).json(mappings.rows);
    } catch (err) {
        console.error("Mapping Engine Error:", err.message);
        res.status(500).json({ error: "Failed to fetch framework mappings", details: err.message });
    }
});

app.post('/api/mappings', authorize, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Only Administrators can modify framework mappings." });
        }
        const { framework_name, framework_code, description, activity_type } = req.body;
        const result = await pool.query(
            `INSERT INTO Framework_Mappings (framework_name, framework_code, description, activity_type) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [framework_name, framework_code, description, activity_type]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add new mapping" });
    }
});

app.delete('/api/mappings/:id', authorize, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied." });
        }

        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM Framework_Mappings WHERE mapping_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Mapping not found." });
        }

        res.json({ message: "Mapping deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete mapping" });
    }
});

// ==========================================
// NET-ZERO TARGET ROUTES (RESTORED — was missing)
// ==========================================
app.get('/api/targets', authorize, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, o.name as organization_name 
            FROM reduction_targets t
            JOIN Organization_Unit o ON t.unit_id = o.unit_id
            WHERE o.unit_id = $1
            ORDER BY created_at DESC
        `, [req.user.company_id]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching targets:", err.message);
        res.status(500).json({ error: "Failed to load targets." });
    }
});

// ==========================================
// SUPER ADMIN: APPROVAL WORKFLOW
// ==========================================

app.get('/api/admin/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.user_id, 
        u.email, 
        u.created_at, 
        o.name AS company_name 
      FROM users u
      LEFT JOIN organization_unit o ON u.unit_id = o.unit_id
      WHERE u.role = 'Pending'
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending accounts:", err);
    res.status(500).json({ error: "Failed to fetch pending accounts." });
  }
});

app.put('/api/admin/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE users SET status = 'approved' WHERE user_id = $1", [id]);
    res.json({ message: "Corporate account approved successfully." });
  } catch (err) {
    console.error("Error approving account:", err);
    res.status(500).json({ error: "Failed to approve account." });
  }
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password, company_name } = req.body;
        
        if (!company_name) return res.status(400).json({ error: "Company name required." });
        if (!password) return res.status(400).json({ error: "Password required." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await client.query('BEGIN');

        const newOrgResult = await client.query(
            'INSERT INTO organization_unit (name) VALUES ($1) RETURNING unit_id',
            [company_name]
        );

        const newUnitId = newOrgResult.rows[0].unit_id;

        const newUserResult = await client.query(
            `INSERT INTO users (email, password_hash, role, unit_id, status) 
             VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, role, unit_id`,
            [email, hashedPassword, 'Pending', newUnitId, 'pending']
        );

        await client.query('COMMIT');
        
        res.json({ message: "Registration successful. Your account is pending admin approval." });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("REGISTRATION FAILED:", err); 
        res.status(500).json({ error: "Check server logs for registration error." });
    } finally {
        client.release();
    }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query(
      'SELECT user_id, email, password_hash, role, unit_id, status FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    if (user.rows[0].status !== 'approved') {
      return res.status(403).json({ error: "Access Denied: Your corporate account is still pending verification." });
    }

    const token = jwt.sign(
      { 
          id: user.rows[0].user_id, 
          role: user.rows[0].role, 
          company_id: user.rows[0].unit_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { id: user.rows[0].user_id, email: user.rows[0].email, role: user.rows[0].role } 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error during login" });
  }
});

// ==========================================
// USER MANAGEMENT ROUTES 
// ==========================================

app.post('/api/users', authorize, async (req, res) => {
    const client = await pool.connect();
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: "Email, password, and role are required." });
        }

        await client.query('BEGIN');

        const userExists = await client.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "A user with this email already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await client.query(
            `INSERT INTO users (email, password_hash, unit_id, role, status) 
             VALUES ($1, $2, $3, $4, 'approved') 
             RETURNING user_id, email, role, status, created_at`,
            [email, password_hash, req.user.company_id, role]
        );

        await client.query('COMMIT');
        res.status(201).json(newUser.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error creating user:", err.message);
        res.status(500).json({ error: "Failed to create new user." });
    } finally {
        client.release();
    }
});

app.get('/api/users', authorize, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const allUsers = await pool.query(
            "SELECT user_id, email, role, created_at FROM users WHERE unit_id = $1 ORDER BY created_at DESC",
            [req.user.company_id]
        );
        res.json(allUsers.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.put('/api/users/:id/role', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const { id } = req.params;
        const { role } = req.body;

        const updatedUser = await pool.query(
            "UPDATE users SET role = $1 WHERE user_id = $2 AND unit_id = $3 RETURNING user_id, email, role",
            [role, id, req.user.company_id]
        );

        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to update user role" });
    }
});

// ==========================================
// MATERIALITY ASSESSMENT ROUTES
// ==========================================
app.post('/api/materiality', authorize, auditorGuard, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { unit_id, assessment_year, topics, overwrite_all } = req.body;

        if (!unit_id) {
            return res.status(400).json({ error: "Organization ID is required." });
        }

        await client.query('BEGIN');

        if (overwrite_all) {
            await client.query(`
                DELETE FROM Materiality_Scores 
                WHERE unit_id = $1 AND assessment_year = $2
            `, [unit_id, assessment_year]);
        }

        for (const topic of topics) {
            await client.query(`
                INSERT INTO Materiality_Scores 
                (unit_id, topic_name, stakeholder_importance_score, business_impact_score, assessment_year)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (unit_id, topic_name, assessment_year) 
                DO UPDATE SET 
                    stakeholder_importance_score = EXCLUDED.stakeholder_importance_score,
                    business_impact_score = EXCLUDED.business_impact_score;
            `, [unit_id, topic.name, topic.y, topic.x, assessment_year]);
        }

        await client.query('COMMIT');
        res.json({ message: "Materiality profile saved successfully!" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error saving materiality:", err.message);
        res.status(500).json({ error: "Failed to save materiality scores." });
    } finally {
        client.release();
    }
});

app.get('/api/materiality/:orgId', authorize, async (req, res) => {
    try {
        const { orgId } = req.params;
        const currentYear = new Date().getFullYear();
        
        const result = await pool.query(`
            SELECT topic_name as name, stakeholder_importance_score as y, business_impact_score as x
            FROM Materiality_Scores
            WHERE unit_id = $1 AND assessment_year = $2
        `, [orgId, currentYear]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching materiality:", err.message);
        res.status(500).json({ error: "Failed to fetch scores." });
    }
});

// ==========================================
// CLIMATE SCENARIO ANALYSIS (STRESS TESTING)
// ==========================================

app.post('/api/scenarios', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied: Only Admins/Managers can log stress tests." });
        }

        const { 
            assessment_year, 
            scenario_name, 
            time_horizon, 
            physical_risk_impact, 
            transition_risk_impact, 
            projected_financial_impact_ghs, 
            mitigation_strategy 
        } = req.body;

        const insertQuery = `
            INSERT INTO Climate_Scenario_Analysis 
            (unit_id, assessment_year, scenario_name, time_horizon, physical_risk_impact, transition_risk_impact, projected_financial_impact_ghs, mitigation_strategy) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
        `;

        const values = [
            req.user.company_id,
            assessment_year,
            scenario_name,
            time_horizon,
            physical_risk_impact,
            transition_risk_impact,
            projected_financial_impact_ghs,
            mitigation_strategy
        ];

        const newScenario = await pool.query(insertQuery, values);
        res.status(201).json(newScenario.rows[0]);

    } catch (err) {
        console.error("Error saving scenario analysis:", err.message);
        if (err.code === '23505') {
            return res.status(400).json({ error: "A scenario with this name and time horizon already exists for this year." });
        }
        res.status(500).json({ error: "Failed to save climate scenario." });
    }
});

app.get('/api/scenarios', authorize, async (req, res) => {
    try {
        const { year } = req.query;
        let query = `
            SELECT s.*, u.name as organization_name 
            FROM Climate_Scenario_Analysis s
            JOIN Organization_Unit u ON s.unit_id = u.unit_id
            WHERE u.unit_id = $1
        `;
        const values = [req.user.company_id];

        if (year) {
            query += ` AND s.assessment_year = $2`;
            values.push(year);
        }

        query += ` ORDER BY s.assessment_year DESC, s.created_at DESC`;

        const scenarios = await pool.query(query, values);
        res.json(scenarios.rows);

    } catch (err) {
        console.error("Error fetching scenarios:", err.message);
        res.status(500).json({ error: "Failed to fetch scenario analysis reports." });
    }
});

// ==========================================
// SUPPLIER CAMPAIGNS (SCOPE 3)
// ==========================================

app.post('/api/campaigns', authorize, async (req, res) => {
    try {
        const { token, supplier_name, activity_type, deadline } = req.body;
        const newCamp = await pool.query(
            `INSERT INTO Supplier_Campaigns (token, supplier_name, activity_type, deadline, unit_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [token, supplier_name, activity_type, deadline, req.user.company_id]
        );
        res.status(201).json(newCamp.rows[0]);
    } catch (err) {
        console.error("Error creating campaign:", err.message);
        res.status(500).json({ error: "Failed to create campaign" });
    }
});

// RESTORED — this route was missing from the file, causing 404s on the Evidence Locker
app.get('/api/campaigns', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT token as id, supplier_name as supplier, activity_type as metric, 
                    deadline, status, evidence_url, created_at 
             FROM Supplier_Campaigns 
             WHERE unit_id = $1 
             ORDER BY created_at DESC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching campaigns:", err.message);
        res.status(500).json({ error: "Failed to fetch campaigns" });
    }
});

app.get('/api/public/campaigns/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const result = await pool.query(
            `SELECT sc.*, c.name as company_name
             FROM Supplier_Campaigns sc
             JOIN Organization_Unit c ON sc.unit_id = c.unit_id
             WHERE sc.token = $1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Campaign not found or expired." });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching campaign:", err.message);
        res.status(500).json({ error: "Server error fetching campaign" });
    }
});

app.post('/api/public/supplier-submit', upload.single('evidence_file'), async (req, res) => {
    try {
        const { campaign_token, raw_amount } = req.body;
        const evidence_url = req.file ? req.file.key : null;

        const updateResult = await pool.query(
            `UPDATE Supplier_Campaigns 
             SET status = 'Completed', submitted_amount = $1, evidence_url = $2 
             WHERE token = $3 RETURNING *`,
            [raw_amount, evidence_url, campaign_token]
        );

        if (updateResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid campaign token." });
        }

        res.json({ message: "Submission successful" });
    } catch (err) {
        console.error("Error saving supplier submission:", err.message);
        res.status(500).json({ error: "Failed to submit data" });
    }
});

app.put('/api/campaigns/:token/status', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied." });
        }
        const { token } = req.params;
        const { status } = req.body;

        const updated = req.user.role === 'Admin'
            ? await pool.query(
                `UPDATE Supplier_Campaigns SET status = $1 WHERE token = $2 RETURNING *`,
                [status, token]
              )
            : await pool.query(
                `UPDATE Supplier_Campaigns SET status = $1 WHERE token = $2 AND unit_id = $3 RETURNING *`,
                [status, token, req.user.company_id]
              );

        if (updated.rows.length === 0) {
            return res.status(404).json({ error: "Campaign not found or access denied." });
        }

        res.json(updated.rows[0]);
    } catch (err) {
        console.error("Error updating campaign status:", err.message);
        res.status(500).json({ error: "Failed to update campaign status." });
    }
});

// ==========================================
// REQUEST CORRECTION (creates a new campaign, keeps the original intact)
// ==========================================
app.post('/api/campaigns/:token/request-correction', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied." });
        }

        const { token } = req.params;
        const { deadline } = req.body; // new deadline for the correction request

        // Fetch the original campaign, scoped the same way status updates are
        const originalResult = req.user.role === 'Admin'
            ? await pool.query(`SELECT * FROM Supplier_Campaigns WHERE token = $1`, [token])
            : await pool.query(
                `SELECT * FROM Supplier_Campaigns WHERE token = $1 AND unit_id = $2`,
                [token, req.user.company_id]
              );

        if (originalResult.rows.length === 0) {
            return res.status(404).json({ error: "Original campaign not found or access denied." });
        }

        const original = originalResult.rows[0];

        if (original.status !== 'Completed') {
            return res.status(400).json({ error: "Only completed submissions can have a correction requested." });
        }

        // Generate a fresh token for the new link
        const newToken = crypto.randomBytes(16).toString('hex');

        const newCampaign = await pool.query(
            `INSERT INTO Supplier_Campaigns (token, supplier_name, activity_type, deadline, unit_id, status)
             VALUES ($1, $2, $3, $4, $5, 'Pending')
             RETURNING *`,
            [newToken, original.supplier_name, original.activity_type, deadline || original.deadline, original.unit_id]
        );

        res.status(201).json({
            message: "Correction request created. Share the new link with the supplier.",
            data: newCampaign.rows[0]
        });
    } catch (err) {
        console.error("Error creating correction request:", err.message);
        res.status(500).json({ error: "Failed to create correction request." });
    }
});

// ==========================================
// ADVANCED ANALYTICS ENGINE
// ==========================================
app.get('/api/analytics/variance', authorize, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const previousYear = currentYear - 1;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    EXTRACT(MONTH FROM COALESCE(e.timestamp, e.created_at)) as month_num,
                    SUM(CASE WHEN EXTRACT(YEAR FROM COALESCE(e.timestamp, e.created_at)) = $2 THEN e.calculated_co2e ELSE 0 END) as current_co2e,
                    SUM(CASE WHEN EXTRACT(YEAR FROM COALESCE(e.timestamp, e.created_at)) = $3 THEN e.calculated_co2e ELSE 0 END) as previous_co2e
                FROM esg_observation e
                JOIN Organization_Unit u ON e.unit_id = u.unit_id
                WHERE u.unit_id = $1
                  AND e.status = 'Approved'
                GROUP BY month_num
            )
            SELECT 
                m.month_abbr as month,
                COALESCE(d.current_co2e, 0) as current_co2e,
                COALESCE(d.previous_co2e, 0) as previous_co2e
            FROM (
                VALUES (1, 'Jan'), (2, 'Feb'), (3, 'Mar'), (4, 'Apr'), (5, 'May'), (6, 'Jun'),
                       (7, 'Jul'), (8, 'Aug'), (9, 'Sep'), (10, 'Oct'), (11, 'Nov'), (12, 'Dec')
            ) AS m(month_num, month_abbr)
            LEFT JOIN MonthlyData d ON m.month_num = d.month_num
            ORDER BY m.month_num;
        `;

        const analyticsData = await pool.query(query, [req.user.company_id, currentYear, previousYear]);
        res.json(analyticsData.rows);

    } catch (err) {
        console.error("Variance Engine Error:", err.message);
        res.status(500).json({ error: "Failed to compile variance analytics." });
    }
});

// ==========================================
// DECARBONIZATION INITIATIVES ENGINE
// ==========================================
app.get('/api/initiatives', authorize, async (req, res) => {
    try {
        const { sector } = req.query;
        
        if (!sector) {
            return res.status(400).json({ error: "Sector query parameter is required." });
        }

        const query = `
            SELECT id, title, description, impact_percentage, phase_in_years 
            FROM esg_initiatives 
            WHERE sector = $1
            ORDER BY impact_percentage DESC;
        `;

        const result = await pool.query(query, [sector]);
        res.json(result.rows);

    } catch (err) {
        console.error("Failed to fetch initiatives:", err.message);
        res.status(500).json({ error: "Failed to load sector initiatives." });
    }
});

// ==========================================
// EVIDENCE VIEWING (R2 PRESIGNED URLS)
// ==========================================
app.get('/api/evidence/:key/view', authorize, async (req, res) => {
    try {
        const { key } = req.params;
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        res.json({ url: signedUrl });
    } catch (err) {
        console.error("Error generating evidence URL:", err.message);
        res.status(500).json({ error: "Failed to generate evidence link." });
    }
});

// ==========================================
// ONE-TIME DATABASE SCHEMA PATCH
// ==========================================
pool.query(`
    ALTER TABLE esg_observation ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(500);
    ALTER TABLE esg_observation ADD COLUMN IF NOT EXISTS quality_tier VARCHAR(10) DEFAULT 'C';

    ALTER TABLE ESG_Observation ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(500);
    ALTER TABLE ESG_Observation ADD COLUMN IF NOT EXISTS quality_tier VARCHAR(10) DEFAULT 'C';
`).then(() => {
    console.log("✅ Database schema successfully patched for ALL tables!");
}).catch(err => {
    console.error("⚠️ Schema patch skipped or failed:", err.message);
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});