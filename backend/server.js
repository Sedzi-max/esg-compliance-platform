const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// HEALTH CHECK ROUTE
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
// ORGANIZATION UNIT ROUTES
// ==========================================

// CREATE a new Organization Unit
app.post('/api/organizations', async (req, res) => {
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
app.get('/api/organizations', async (req, res) => {
    try {
        const allOrgs = await pool.query("SELECT * FROM Organization_Unit ORDER BY created_at DESC");
        res.json(allOrgs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Failed to fetch organizations" });
    }
});

// ==========================================
// METRIC DEFINITION ROUTES
// ==========================================

// CREATE a new Metric
app.post('/api/metrics', async (req, res) => {
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
app.get('/api/metrics', async (req, res) => {
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

// CREATE a new ESG Observation
app.post('/api/observations', async (req, res) => {
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

// READ all Observations (with joined names for the frontend)
app.get('/api/observations', async (req, res) => {
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
// START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});