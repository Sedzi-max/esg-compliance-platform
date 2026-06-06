const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorize = require('./middleware/authorize'); // Our new bouncer
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
// ORGANIZATION UNIT ROUTES (Protected)
// ==========================================

// CREATE a new Organization Unit
app.post('/api/organizations', authorize, async (req, res) => {
    try {
        const { name, unit_type, jurisdiction } = req.body;
        const newOrg = await pool.query(
            "INSERT INTO Organization_Unit (name, unit_type, jurisdiction) VALUES ($1, $2, $3) RETURNING *",
            [name, unit_type, jurisdiction]
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
        const allOrgs = await pool.query("SELECT * FROM Organization_Unit ORDER BY created_at DESC");
        res.json(allOrgs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch organizations" });
    }
});

// ==========================================
// METRIC DEFINITION ROUTES (Protected)
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
// ESG OBSERVATION (DATA ENTRY) ROUTES (Protected)
// ==========================================

// CREATE a new ESG Observation
app.post('/api/observations', authorize, async (req, res) => {
    try {
        const { unit_id, metric_id, numeric_value, text_value } = req.body;
        
        const newObs = await pool.query(
            "INSERT INTO ESG_Observation (unit_id, metric_id, numeric_value, text_value, timestamp) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
            [unit_id, metric_id, numeric_value, text_value]
        );
        res.json(newObs.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to log observation" });
    }
});

// READ all Observations
app.get('/api/observations', authorize, async (req, res) => {
    try {
        const query = `
            SELECT 
                o.observation_id, 
                o.numeric_value, 
                o.text_value, 
                o.timestamp,
                u.name AS organization_name,
                m.name AS metric_name,
                m.unit_of_measure,
                m.pillar
            FROM ESG_Observation o
            JOIN Organization_Unit u ON o.unit_id = u.unit_id
            JOIN Metric_Definition m ON o.metric_id = m.metric_id
            ORDER BY o.timestamp DESC
        `;
        const allObs = await pool.query(query);
        res.json(allObs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch observations" });
    }
});

// ==========================================
// GHG EMISSIONS ROUTES (Protected)
// ==========================================

// 1. GET Route: Fetch emissions (Admins see all, Data Entry sees only their org's/approved - simplified to all for now)
app.get('/api/emissions', authorize, async (req, res) => {
    try {
        // We now fetch the status column as well, sorting pending items to the top!
        const result = await pool.query(
            `SELECT * FROM ghg_emissions 
             ORDER BY 
                CASE WHEN status = 'Pending' THEN 1 ELSE 2 END, 
                created_at DESC 
             LIMIT 100`
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

        // Notice we don't need to insert the 'status' here—PostgreSQL defaults it to 'Pending' automatically!
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

// 3. PUT Route: Admin Approval Workflow
app.put('/api/emissions/:id/status', authorize, async (req, res) => {
    try {
        // Security Check: Only allow Admins to approve/reject data
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Only Admins can approve data." });
        }

        const { id } = req.params;
        const { status } = req.body; // Expecting 'Approved' or 'Rejected'

        const updatedEmission = await pool.query(
            "UPDATE ghg_emissions SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        res.json(updatedEmission.rows[0]);
    } catch (err) {
        console.error("Error updating status:", err.message);
        res.status(500).send('Server error updating status');
    }
});

// 4. POST Route: Bulk Carbon Conversion Engine (NEW!)
app.post('/api/emissions/bulk', authorize, async (req, res) => {
    // We use a database 'client' directly so we can use a SQL Transaction (BEGIN/COMMIT)
    // This ensures if row #499 fails, the whole batch rolls back safely!
    const client = await pool.connect();
    
    try {
        const emissionsArray = req.body; 
        if (!Array.isArray(emissionsArray)) {
            return res.status(400).json({ error: "Expected an array of emissions data." });
        }

        await client.query('BEGIN'); // Start Transaction

        let insertedCount = 0;

        for (const row of emissionsArray) {
            const { organization_id, scope_category, activity_type, raw_amount } = row;
            
            // Look up the math multiplier safely
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

        await client.query('COMMIT'); // Save everything!
        res.json({ message: `Successfully processed ${insertedCount} bulk records.` });

    } catch (err) {
        await client.query('ROLLBACK'); // Cancel everything if there is an error
        console.error("Bulk upload error:", err.message);
        res.status(500).json({ error: err.message || "Failed to process bulk upload." });
    } finally {
        client.release();
    }
});

// ==========================================
// AUTHENTICATION ROUTES (Unprotected)
// ==========================================

// --- 1. REGISTRATION ENDPOINT ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user (PostgreSQL will automatically assign the 'Data Entry' role!)
    const newUser = await pool.query(
      'INSERT INTO Users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email, role',
      [email, password_hash]
    );

    // Create a token that includes their role
    const token = jwt.sign(
      { id: newUser.rows[0].user_id, role: newUser.rows[0].role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Send the token AND the user data back to React
    res.json({ 
      token, 
      user: { id: newUser.rows[0].user_id, email: newUser.rows[0].email, role: newUser.rows[0].role } 
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error during registration" });
  }
});

// --- 2. LOGIN ENDPOINT ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // IMPORTANT: Make sure you SELECT the role column here!
    const user = await pool.query(
      'SELECT user_id, email, password_hash, role FROM Users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    // Create a token that includes their role
    const token = jwt.sign(
      { id: user.rows[0].user_id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send the token AND the user data back to React
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
// USER MANAGEMENT ROUTES (Admin Only)
// ==========================================

// GET all users
app.get('/api/users', authorize, async (req, res) => {
    try {
        // Security check: Ensure the user's token says they are an Admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        const allUsers = await pool.query(
            "SELECT user_id, email, role, created_at FROM Users ORDER BY created_at DESC"
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

        const updatedUser = await pool.query(
            "UPDATE Users SET role = $1 WHERE user_id = $2 RETURNING user_id, email, role",
            [role, id]
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