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

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Expose the uploads folder so the React frontend can fetch the files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup local storage for files (MVP approach)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure to create an 'uploads' folder in your backend directory!
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

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
        // SECURITY UPDATE: Lock this org to the user's company_id
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

// READ all Organization Units
app.get('/api/organizations', authorize, async (req, res) => {
    try {
        // SECURITY UPDATE: Only fetch orgs that belong to the user's company
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

        // SECURITY UPDATE: Ensure the org belongs to the user's company before deleting
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
        
        // Safety Catch: If the org has emissions attached, Postgres will throw error code '23503'
        if (err.code === '23503') {
            return res.status(400).json({ error: "Cannot delete: This organization already has emissions or observations logged against it." });
        }
        res.status(500).json({ error: "Failed to delete organization" });
    }
});

// ==========================================
// METRIC DEFINITION ROUTES (Global)
// ==========================================

// CREATE a new Metric
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

// READ all Metrics
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
// ESG OBSERVATION (DATA ENTRY) ROUTES (Multi-Tenant Protected)
// ==========================================

// CREATE a new ESG Observation (Updated for new Frontend Payload with File Upload)
app.post('/api/observations', authorize, auditorGuard, upload.single('evidence_file'), async (req, res) => {
    try {
        // Because we are uploading a file, data comes in req.body (strings) and req.file (the physical file)
        const { organization_id, metric_name, numeric_value, text_value, unit_of_measure, pillar } = req.body;
        const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await pool.query(`
            INSERT INTO Observations 
            (organization_id, metric_name, numeric_value, text_value, unit_of_measure, pillar, evidence_file_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `, [organization_id, metric_name, numeric_value || null, text_value, unit_of_measure, pillar, evidence_url]);

        res.json({ message: "Data logged successfully with evidence!", data: result.rows[0] });
    } catch (err) {
        console.error("Error saving observation:", err);
        res.status(500).json({ error: "Failed to log data." });
    }
});

// READ all Observations
app.get('/api/observations', authorize, async (req, res) => {
    try {
        // SECURITY UPDATE: Join with orgs and filter by company_id
        // UPGRADE: Use LEFT JOIN and COALESCE to support both strict metrics and flexible custom logs
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
// GHG EMISSIONS ROUTES (Multi-Tenant Protected)
// ==========================================

// 1. GET Route: Fetch emissions 
app.get('/api/emissions', authorize, async (req, res) => {
    try {
        // SECURITY UPDATE: Filter by company_id
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

// 2. POST Route: The Carbon Conversion Engine (Upgraded for External Assurance & Atomic Checkout)
app.post('/api/emissions', authorize, auditorGuard, upload.single('evidence_file'), async (req, res) => {
    try {
        const { organization_id, scope_category, activity_type, raw_amount, unit_of_measure } = req.body;
        
        // Handle physical evidence files via Multer
        const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

        // 1. Fetch the base multiplier from your existing utility
        const baseMultiplier = CARBON_MULTIPLIERS[scope_category]?.[activity_type];

        if (baseMultiplier === undefined) {
            return res.status(400).json({ error: `Unrecognized activity type: ${activity_type}. No emission factor found.` });
        }

        // 2. Define Audit-Grade Metadata for the snapshot
        const factorMetadata = {
            multiplier: baseMultiplier,
            source: scope_category === 'scope_1' ? 'GHG Protocol Stationary' : 'EPA eGRID 2026',
            version: 'v3.2.1'
        };

        // 3. Perform the exact calculation
        const calculated_co2e = Number(raw_amount) * factorMetadata.multiplier;

        // 4. THE ATOMIC CHECKOUT: Write data, evidence, AND mathematical logic to the DB
        const insertQuery = `
            INSERT INTO ghg_emissions 
            (organization_id, scope_category, activity_type, raw_amount, unit_of_measure, calculated_co2e, status, evidence_file_url, emission_factor_used, factor_source, methodology_version) 
            VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8, $9, $10) 
            RETURNING *;
        `;

        const values = [
            organization_id, 
            scope_category, 
            activity_type, 
            raw_amount, 
            unit_of_measure || 'units', // fallback if unit is missing
            calculated_co2e,
            evidence_url,               // Snapshot: The uploaded evidence file
            factorMetadata.multiplier,  // Snapshot: Exact number used
            factorMetadata.source,      // Snapshot: Where the number came from
            factorMetadata.version      // Snapshot: The methodology version
        ];

        const newEmission = await pool.query(insertQuery, values);

        res.status(201).json(newEmission.rows[0]);
    } catch (err) {
        console.error("Error saving atomic emission transaction:", err.message);
        res.status(500).send('Server error sealing atomic transaction');
    }
});

// 3. PUT Route: Audit Approval Workflow (Upgraded for RBAC)
app.put('/api/emissions/:id/status', authorize, auditorGuard, async (req, res) => {
    try {
        // SECURITY UPDATE: Allow BOTH Admins and Compliance Managers to approve data
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied: Only Admins and Compliance Managers can approve data." });
        }

        const { id } = req.params;
        const { status } = req.body; 

        // SECURITY UPDATE: Ensure they only approve emissions for their own company
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

// 4. POST Route: Bulk Carbon Conversion Engine
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

// 5. PUT Route: Bulk Approve All Pending Emissions
app.put('/api/emissions/bulk-approve', authorize, auditorGuard, async (req, res) => {
    try {
        // SECURITY: Only Admins and Managers can bulk approve
        if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: "Access Denied: Only Admins and Compliance Managers can approve data." });
        }

        // Mass update all pending records for this specific company
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

        // The Engine: Join Emissions with Mappings, Filter by Approved & Year, then SUM the totals.
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
              -- Assuming your data has timestamps in created_at, we filter by the requested year
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

// ==========================================
// NET-ZERO TARGET ROUTES (Multi-Tenant Protected)
// ==========================================

// 1. POST Route: Set a new reduction target (Admins Only)
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

// 2. GET Route: Fetch active targets
app.get('/api/targets', authorize, async (req, res) => {
    try {
        // SECURITY UPDATE: Filter targets by company_id
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

// 1. Fetch all pending corporate registrations
app.get('/api/admin/pending', async (req, res) => {
  try {
    // We join the Companies table so you can actually see the company name you are approving
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

// 2. Approve a specific corporate account
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
// AUTHENTICATION ROUTES (Multi-Tenant Enabled)
// ==========================================

// --- 1. REGISTRATION ENDPOINT (Manual Approval Workflow) ---
app.post('/api/auth/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password, company_name } = req.body;
    
    if (!company_name) return res.status(400).json({ error: "Company name required." });

    await client.query('BEGIN');

    // Create Company
    const newComp = await client.query(
        "INSERT INTO Companies (company_name) VALUES ($1) RETURNING company_id",
        [company_name]
    );
    const newCompanyId = newComp.rows[0].company_id;

    // Hash & Create User
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // HARDENED SECURITY: Explicitly force the status to 'pending'
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

// --- 2. LOGIN ENDPOINT (The Gatekeeper) ---
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

    // HARDENED SECURITY: Default Deny. If they are not strictly 'approved', block them.
    if (user.rows[0].status !== 'approved') {
      return res.status(403).json({ error: "Access Denied: Your corporate account is still pending verification." });
    }

    // Mint the token!
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
// USER MANAGEMENT ROUTES (Multi-Tenant Protected)
// ==========================================

// CREATE a new user within the Admin's company (Internal Invite)
app.post('/api/users', authorize, async (req, res) => {
    const client = await pool.connect();
    try {
        // SECURITY: Only Admins can invite new users
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: "Email, password, and role are required." });
        }

        await client.query('BEGIN');

        // Check if user already exists
        const userExists = await client.query("SELECT * FROM Users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "A user with this email already exists." });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert user explicitly bound to the Admin's company and auto-approved
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

// GET all users
app.get('/api/users', authorize, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        // SECURITY UPDATE: Admins can ONLY see users in their own company
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

// UPDATE a user's role
app.put('/api/users/:id/role', authorize, auditorGuard, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const { id } = req.params;
        const { role } = req.body;

        // SECURITY UPDATE: Admins can ONLY update roles for users in their own company
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

        // NEW: If deploying a starter kit, wipe the slate clean first!
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
// SCOPE 3 CAMPAIGNS (External Supplier Portal)
// ==========================================

// 1. PROTECTED: Create a new Campaign (Called by Manager from Dashboard)
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

// 2. PUBLIC: Fetch campaign details for the Supplier Portal
app.get('/api/public/campaigns/:token', async (req, res) => {
    try {
        const { token } = req.params;
        // Join with Companies table so the portal can display the host's real name!
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

// 3. PUBLIC: Supplier submits their data anonymously
app.post('/api/public/supplier-submit', upload.single('evidence_file'), async (req, res) => {
    try {
        const { campaign_token, raw_amount } = req.body;
        const evidence_url = req.file ? `/uploads/${req.file.filename}` : null;

        // Mark the campaign as completed and save the vendor's submitted data
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
// 1.5 PROTECTED: Fetch all campaigns for the Manager's Dashboard
app.get('/api/campaigns', authorize, async (req, res) => {
    try {
        // Fetch campaigns matching the user's company and alias the columns to match the React frontend
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