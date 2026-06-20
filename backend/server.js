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

// --- NEW IMPORTS FOR CSV PARSING ---
const csv = require('csv-parser');
const { Readable } = require('stream');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Expose the uploads folder so the React frontend can fetch the files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// MULTER CONFIGURATIONS
// ==========================================

// Setup local storage for physical files (Evidence PDFs, Receipts)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

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
        const { name, unit_type, jurisdiction } = req.body;
        const newOrg = await pool.query(
            "INSERT INTO Organization_Unit (name, unit_type, jurisdiction, company_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, unit_type, jurisdiction, req.user.company_id]
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
             WHERE unit_id = $5 AND company_id = $6 RETURNING *`,
            [name, safeParentId, equity_share_percentage, has_operational_control, id, req.user.company_id]
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

// READ all Organization Units
app.get('/api/organizations', authorize, async (req, res) => {
    try {
        const allOrgs = await pool.query(
            "SELECT * FROM Organization_Unit WHERE company_id = $1 ORDER BY created_at DESC",
            [req.user.company_id]
        );
        res.json(allOrgs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch organizations" });
    }
});

// DELETE an Organization Unit
app.delete('/api/organizations/:id', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const { id } = req.params;

        const deletedOrg = await pool.query(
            "DELETE FROM Organization_Unit WHERE unit_id = $1 AND company_id = $2 RETURNING *",
            [id, req.user.company_id]
        );

        if (deletedOrg.rows.length === 0) {
            return res.status(404).json({ error: "Organization not found or you do not have permission." });
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
        const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

        // --- THE FIX: Scrub the FormData Strings ---
        // FormData turns empty variables into literal text strings. We must convert them back.
        if (!organization_id || organization_id === 'undefined' || organization_id === 'null' || organization_id === '') {
            return res.status(400).json({ error: "Please select an Organization from the dropdown." });
        }

        const safeNumeric = (!numeric_value || numeric_value === 'undefined' || numeric_value === 'null' || numeric_value === '') 
            ? null 
            : Number(numeric_value);
            
        const safeText = (!text_value || text_value === 'undefined' || text_value === 'null') 
            ? null 
            : text_value;

        // Note: Using ESG_Observation (matching your GET route)
        const result = await pool.query(`
            INSERT INTO ESG_Observation 
            (unit_id, metric_name, numeric_value, text_value, unit_of_measure, pillar, evidence_file_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `, [organization_id, metric_name, safeNumeric, safeText, unit_of_measure, pillar, evidence_url]);

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
            WHERE u.company_id = $1
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
// BULK CSV UPLOAD PIPELINE
// ==========================================

app.post('/api/upload-csv', authorize, memoryUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const results = [];
    const errors = [];
    let rowCount = 0;

    const stream = Readable.from(req.file.buffer.toString('utf-8'));

    stream
        .pipe(csv({
            mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/ /g, '_')
        }))
        .on('data', (data) => {
            rowCount++;
            results.push({ row: rowCount, ...data });
        })
        .on('end', async () => {
            if (results.length === 0) {
                return res.status(400).json({ error: "No valid data found to unpack." });
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const orgQuery = await client.query('SELECT unit_id, name FROM Organization_Unit WHERE company_id = $1', [req.user.company_id]);
                const validOrgs = orgQuery.rows.reduce((acc, org) => {
                    acc[org.name.toLowerCase()] = org.unit_id;
                    return acc;
                }, {});

                let successCount = 0;

                for (const row of results) {
                    const rawOrg = row.organization || row.facility || row.company || row.organization_name;
                    const orgName = rawOrg ? rawOrg.trim().toLowerCase() : null;
                    const orgId = validOrgs[orgName];

                    if (!orgId) {
                        errors.push(`Row ${row.row}: Facility/Organization '${rawOrg || 'Unknown'}' not found.`);
                        continue; 
                    }

                    const explicitMetricCol = row.activity_type || row.metric || row.metric_name || row.activity;
                    const explicitValueCol = row.raw_amount || row.value || row.amount || row.numeric_value;

                    // --- INTEGRATED TIER LOGIC ---
                    const explicitTier = row.quality_tier || row.tier || row.data_quality;
                    const explicitMethodology = row.methodology || row.calculation_method;

                    let calculatedTier = explicitTier ? explicitTier.toUpperCase() : 'C';
                    let calculatedMethodology = explicitMethodology || 'Spend-Based Estimate';

                    if (!explicitTier && calculatedMethodology.toLowerCase().includes('activity')) {
                        calculatedTier = 'A';
                    }

                    const recordsToProcess = [];

                    if (explicitMetricCol) {
                        if (explicitValueCol === '' || explicitValueCol === undefined) continue;

                        recordsToProcess.push({
                            metric: explicitMetricCol,
                            value: explicitValueCol,
                            pillar: row.pillar || row.category || 'E',
                            unit: row.unit || row.unit_of_measure || 'units',
                            tier: calculatedTier,
                            methodology: calculatedMethodology
                        });
                    } else {
                        const ignoredColumns = ['organization', 'facility', 'company', 'organization_name', 'date', 'timestamp', 'row', 'pillar', 'category', 'unit', 'quality_tier', 'tier', 'data_quality', 'methodology', 'calculation_method'];
                        
                        for (const colName of Object.keys(row)) {
                            if (ignoredColumns.includes(colName)) continue;
                            
                            const cellValue = row[colName];
                            
                            if (cellValue === '' || cellValue === undefined || cellValue === '0') continue;

                            recordsToProcess.push({
                                metric: colName,
                                value: cellValue,
                                pillar: 'E', 
                                unit: 'units',
                                tier: calculatedTier,
                                methodology: calculatedMethodology
                            });
                        }
                    }

                    for (const record of recordsToProcess) {
                        const rawAmountClean = Number(record.value.toString().replace(/,/g, ''));
                        if (isNaN(rawAmountClean)) continue; 

                        if (record.pillar.toUpperCase() === 'E') {
                            const multiplier = CARBON_MULTIPLIERS['scope_1']?.[record.metric] || 2.3; 
                            const calculatedCo2e = rawAmountClean * multiplier;

                            // --- INTEGRATED TIER INSERT ---
                            await client.query(
                                `INSERT INTO ghg_emissions (organization_id, scope_category, activity_type, raw_amount, calculated_co2e, status, quality_tier, methodology) 
                                 VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7)`,
                                [orgId, 'Scope 1', record.metric, rawAmountClean, calculatedCo2e, record.tier, record.methodology]
                            );
                            successCount++;
                        } else {
                            await client.query(
                                `INSERT INTO Observations (organization_id, pillar, metric_name, numeric_value, unit_of_measure) 
                                 VALUES ($1, $2, $3, $4, $5)`,
                                [orgId, record.pillar.toUpperCase(), record.metric, rawAmountClean, record.unit]
                            );
                            successCount++;
                        }
                    }
                }

                await client.query('COMMIT');
                
                res.json({ 
                    message: "Upload processing complete.", 
                    rows_processed: rowCount,
                    successful_inserts: successCount,
                    errors: errors 
                });

            } catch (err) {
                await client.query('ROLLBACK');
                console.error("CSV Transaction Error:", err);
                res.status(500).json({ error: `Database error: ${err.message}` });
            } finally {
                client.release();
            }
        });
});

// ==========================================
// GHG EMISSIONS ROUTES 
// ==========================================

app.get('/api/emissions', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, u.name as organization_name
             FROM ghg_emissions e
             JOIN Organization_Unit u ON e.organization_id = u.unit_id
             WHERE u.company_id = $1
             ORDER BY 
                CASE WHEN status = 'Pending' THEN 1 ELSE 2 END, 
                created_at DESC 
             LIMIT 100`,
             [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching emissions:", err.message);
        res.status(500).send('Server error fetching emissions');
    }
});

// POST Route: The Carbon Conversion Engine
app.post('/api/emissions', authorize, auditorGuard, upload.single('evidence_file'), async (req, res) => {
    try {
        const { organization_id, scope_category, activity_type, raw_amount, unit_of_measure } = req.body;
        
        const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;
        const baseMultiplier = CARBON_MULTIPLIERS[scope_category]?.[activity_type];

        if (baseMultiplier === undefined) {
            return res.status(400).json({ error: `Unrecognized activity type: ${activity_type}. No emission factor found.` });
        }

        const factorMetadata = {
            multiplier: baseMultiplier,
            source: scope_category === 'scope_1' ? 'GHG Protocol Stationary' : 'EPA eGRID 2026',
            version: 'v3.2.1'
        };

        const calculated_co2e = Number(raw_amount) * factorMetadata.multiplier;

        // --- NEW: AUTO-GRADE QUALITY TIER BASED ON EVIDENCE ATTACHMENT ---
        const autoTier = req.file ? 'A' : 'B';
        const autoMethod = req.file ? 'Primary Data (Receipt)' : 'Activity-Based Estimate';

        const insertQuery = `
            INSERT INTO ghg_emissions 
            (organization_id, scope_category, activity_type, raw_amount, unit_of_measure, calculated_co2e, status, evidence_file_url, emission_factor_used, factor_source, methodology_version, quality_tier, methodology) 
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9, $10, $11, $12) 
            RETURNING *;
        `;

        const values = [
            organization_id, 
            scope_category, 
            activity_type, 
            raw_amount, 
            unit_of_measure || 'units',
            calculated_co2e,
            evidence_url,               
            factorMetadata.multiplier,  
            factorMetadata.source,      
            factorMetadata.version,
            autoTier,                   // <-- NEW Auto-Grade 
            autoMethod                  // <-- NEW Auto-Method
        ];

        const newEmission = await pool.query(insertQuery, values);

        res.status(201).json(newEmission.rows[0]);
    } catch (err) {
        console.error("Error saving atomic emission transaction:", err.message);
        res.status(500).send('Server error sealing atomic transaction');
    }
});

app.put('/api/emissions/:id/status', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied: Only Admins and Compliance Managers can approve data." });
        }

        const { id } = req.params;
        const { status } = req.body; 

        const updatedEmission = await pool.query(
            `UPDATE ghg_emissions SET status = $1 
             WHERE id = $2 AND organization_id IN (SELECT unit_id FROM Organization_Unit WHERE company_id = $3)
             RETURNING *`,
            [status, id, req.user.company_id]
        );

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
            const { organization_id, scope_category, activity_type, raw_amount } = row;
            
            const multiplier = CARBON_MULTIPLIERS[scope_category]?.[activity_type];
            if (multiplier === undefined) {
                throw new Error(`Invalid category or activity: ${scope_category} / ${activity_type}`);
            }

            const calculated_co2e = Number(raw_amount) * multiplier;

            await client.query(
                `INSERT INTO ghg_emissions 
                (organization_id, scope_category, activity_type, raw_amount, calculated_co2e) 
                VALUES ($1, $2, $3, $4, $5)`,
                [organization_id, scope_category, activity_type, raw_amount, calculated_co2e]
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
            `UPDATE ghg_emissions SET status = 'Approved' 
             WHERE status = 'Pending' AND organization_id IN (SELECT unit_id FROM Organization_Unit WHERE company_id = $1)
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
// AUTOMATED FRAMEWORK REPORTING
// ==========================================
app.get('/api/reports/framework', authorize, async (req, res) => {
    try {
        const { framework, year } = req.query;

        if (!framework || !year) {
            return res.status(400).json({ error: "Framework and year parameters are required." });
        }

        const query = `
            SELECT 
                fm.framework_code,
                fm.description as disclosure_requirement,
                SUM(e.calculated_co2e) as total_tco2e,
                SUM(e.raw_amount) as total_raw_amount
            FROM ghg_emissions e
            JOIN Organization_Unit u ON e.organization_id = u.unit_id
            JOIN Framework_Mappings fm ON e.activity_type = fm.activity_type
            WHERE u.company_id = $1 
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
                FROM ghg_emissions e
                JOIN Organization_Unit u ON e.organization_id = u.unit_id
                JOIN Framework_Mappings fm ON e.activity_type = fm.activity_type
                WHERE u.company_id = $1 
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
        res.status(500).json({ error: "Failed to calculate framework readiness." });
    }
});

// --- UPGRADED: Detailed Gap Analysis (Now dynamically extracts Quality Tier from DB) ---
app.get('/api/reports/gap-analysis', authorize, async (req, res) => {
    try {
        const { framework, year } = req.query;

        if (!framework || !year) {
            return res.status(400).json({ error: "Framework and year are required." });
        }

        // UPGRADE: Uses MIN(e.quality_tier) to grab the highest grade of data available ('A' < 'B' < 'C')
        const query = `
            WITH CompanyFulfilled AS (
                SELECT 
                    fm.framework_code, 
                    SUM(e.calculated_co2e) as total_co2e,
                    MIN(e.quality_tier) as quality_tier
                FROM ghg_emissions e
                JOIN Organization_Unit u ON e.organization_id = u.unit_id
                JOIN Framework_Mappings fm ON e.activity_type = fm.activity_type
                WHERE u.company_id = $1 
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
// NET-ZERO TARGET ROUTES 
// ==========================================

app.post('/api/targets', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ error: "Admins only." });

        const { organization_id, scope_category, baseline_year, target_year, reduction_percentage } = req.body;

        const newTarget = await pool.query(
            `INSERT INTO reduction_targets 
            (organization_id, scope_category, baseline_year, target_year, reduction_percentage) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [organization_id, scope_category, baseline_year, target_year, reduction_percentage]
        );
        res.json(newTarget.rows[0]);
    } catch (err) {
        console.error("Error saving target:", err.message);
        res.status(500).json({ error: "Failed to set target." });
    }
});

app.get('/api/targets', authorize, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, o.name as organization_name 
            FROM reduction_targets t
            JOIN Organization_Unit o ON t.organization_id = o.unit_id
            WHERE o.company_id = $1
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
      SELECT u.user_id, u.email, u.created_at, c.company_name
      FROM Users u
      JOIN Companies c ON u.company_id = c.company_id
      WHERE u.status = 'pending'
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
    await pool.query("UPDATE Users SET status = 'approved' WHERE user_id = $1", [id]);
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

    await client.query('BEGIN');

    const newComp = await client.query(
        "INSERT INTO Companies (company_name) VALUES ($1) RETURNING company_id",
        [company_name]
    );
    const newCompanyId = newComp.rows[0].company_id;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await client.query(
      "INSERT INTO Users (email, password_hash, company_id, role, status) VALUES ($1, $2, $3, 'Admin', 'pending')",
      [email, password_hash, newCompanyId]
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
      'SELECT user_id, email, password_hash, role, company_id, status FROM Users WHERE email = $1',
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
      { id: user.rows[0].user_id, role: user.rows[0].role, company_id: user.rows[0].company_id },
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

        const userExists = await client.query("SELECT * FROM Users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "A user with this email already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const newUser = await client.query(
            `INSERT INTO Users (email, password_hash, company_id, role, status) 
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
            "SELECT user_id, email, role, created_at FROM Users WHERE company_id = $1 ORDER BY created_at DESC",
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
            "UPDATE Users SET role = $1 WHERE user_id = $2 AND company_id = $3 RETURNING user_id, email, role",
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
        const { organization_id, assessment_year, topics, overwrite_all } = req.body;

        if (!organization_id) {
            return res.status(400).json({ error: "Organization ID is required." });
        }

        await client.query('BEGIN');

        if (overwrite_all) {
            await client.query(`
                DELETE FROM Materiality_Scores 
                WHERE organization_id = $1 AND assessment_year = $2
            `, [organization_id, assessment_year]);
        }

        for (const topic of topics) {
            await client.query(`
                INSERT INTO Materiality_Scores 
                (organization_id, topic_name, stakeholder_importance_score, business_impact_score, assessment_year)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (organization_id, topic_name, assessment_year) 
                DO UPDATE SET 
                    stakeholder_importance_score = EXCLUDED.stakeholder_importance_score,
                    business_impact_score = EXCLUDED.business_impact_score;
            `, [organization_id, topic.name, topic.y, topic.x, assessment_year]);
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
            WHERE organization_id = $1 AND assessment_year = $2
        `, [orgId, currentYear]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching materiality:", err.message);
        res.status(500).json({ error: "Failed to fetch scores." });
    }
});

// ==========================================
// SCOPE 3 CAMPAIGNS 
// ==========================================

app.post('/api/campaigns', authorize, async (req, res) => {
    try {
        const { token, supplier_name, activity_type, deadline } = req.body;
        const newCamp = await pool.query(
            `INSERT INTO Supplier_Campaigns (token, supplier_name, activity_type, deadline, company_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [token, supplier_name, activity_type, deadline, req.user.company_id]
        );
        res.status(201).json(newCamp.rows[0]);
    } catch (err) {
        console.error("Error creating campaign:", err.message);
        res.status(500).json({ error: "Failed to create campaign" });
    }
});

app.get('/api/public/campaigns/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const result = await pool.query(
            `SELECT sc.*, c.company_name
             FROM Supplier_Campaigns sc
             JOIN Companies c ON sc.company_id = c.company_id
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
        const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

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

app.get('/api/campaigns', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT token as id, supplier_name as supplier, activity_type as metric, 
                    deadline, status 
             FROM Supplier_Campaigns 
             WHERE company_id = $1 
             ORDER BY created_at DESC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching campaigns:", err.message);
        res.status(500).json({ error: "Failed to fetch campaigns" });
    }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});