const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorize = require('./middleware/authorize'); // Our bouncer
require('dotenv').config();
const CARBON_MULTIPLIERS = require('./utils/carbonFactors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
app.post('/api/organizations', authorize, async (req, res) => {
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
app.delete('/api/organizations/:id', authorize, async (req, res) => {
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
app.post('/api/metrics', authorize, async (req, res) => {
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

// CREATE a new ESG Observation (Updated for new Frontend Payload)
app.post('/api/observations', authorize, async (req, res) => {
    try {
        // 1. Destructure EXACTLY what the React frontend is sending
        const { organization_id, pillar, metric_name, numeric_value, unit_of_measure, text_value } = req.body;

        // 2. Map the frontend data into the database
        const newObs = await pool.query(
            `INSERT INTO ESG_Observation 
            (unit_id, pillar, metric_name, numeric_value, unit_of_measure, text_value, timestamp) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
            [
                organization_id,          // $1 (Mapped to unit_id)
                pillar,                   // $2
                metric_name,              // $3
                numeric_value || null,    // $4 (Prevents errors if empty)
                unit_of_measure || null,  // $5
                text_value || null        // $6
            ]
        );
        res.json(newObs.rows[0]);
    } catch (err) {
        console.error("Database Insert Error:", err.message);
        res.status(500).json({ error: "Failed to log observation" });
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

// 2. POST Route: The Carbon Conversion Engine
app.post('/api/emissions', authorize, async (req, res) => {
    try {
        const { organization_id, scope_category, activity_type, raw_amount } = req.body;
        const multiplier = CARBON_MULTIPLIERS[scope_category][activity_type];
        const calculated_co2e = raw_amount * multiplier;

        const newEmission = await pool.query(
            `INSERT INTO ghg_emissions 
            (organization_id, scope_category, activity_type, raw_amount, calculated_co2e) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`,
            [organization_id, scope_category, activity_type, raw_amount, calculated_co2e]
        );

        res.json(newEmission.rows[0]);
    } catch (err) {
        console.error("Error saving emission:", err.message);
        res.status(500).send('Server error saving emission');
    }
});

// 3. PUT Route: Audit Approval Workflow (Upgraded for RBAC)
app.put('/api/emissions/:id/status', authorize, async (req, res) => {
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
app.post('/api/emissions/bulk', authorize, async (req, res) => {
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
app.put('/api/emissions/bulk-approve', authorize, async (req, res) => {
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
// NET-ZERO TARGET ROUTES (Multi-Tenant Protected)
// ==========================================

// 1. POST Route: Set a new reduction target (Admins Only)
app.post('/api/targets', authorize, async (req, res) => {
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
app.put('/api/users/:id/role', authorize, async (req, res) => {
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
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});