const express = require('express');
const router = express.Router();
const pool = require('../db');
const authorize = require('../middleware/authorize');

// ============================================================
// INSURANCE GOVERNANCE METRICS (NIC-specific fields)
// ============================================================

router.get('/governance-metrics/raw', authorize, async (req, res) => {
    const { year } = req.query;
    try {
        const result = await pool.query(
            `SELECT r.record_id, r.unit_id, o.name AS unit_name, r.assessment_year,
                    r.has_esg_committee, r.board_oversight_score, r.nic_stress_test_submitted,
                    r.customer_complaints_received, r.customer_complaints_resolved,
                    r.high_risk_clients_screened, r.high_risk_clients_total, r.created_at
             FROM insurance_governance_metrics r
             LEFT JOIN organization_unit o ON o.unit_id = r.unit_id
             WHERE ($1::int IS NULL OR r.assessment_year = $1)
             ORDER BY r.created_at DESC`,
            [year || null]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch raw governance metrics:', err);
        res.status(500).json({ error: 'Failed to fetch governance metrics records.' });
    }
});

router.post('/governance-metrics', authorize, async (req, res) => {
    const {
        unit_id, assessment_year, has_esg_committee, board_oversight_score,
        nic_stress_test_submitted, customer_complaints_received, customer_complaints_resolved,
        high_risk_clients_screened, high_risk_clients_total
    } = req.body;

    if (!unit_id || !assessment_year) {
        return res.status(400).json({ error: 'unit_id and assessment_year are required.' });
    }
    if (board_oversight_score != null && (Number(board_oversight_score) < 0 || Number(board_oversight_score) > 100)) {
        return res.status(400).json({ error: 'board_oversight_score must be between 0 and 100.' });
    }
    if (customer_complaints_resolved != null && customer_complaints_received != null
        && Number(customer_complaints_resolved) > Number(customer_complaints_received)) {
        return res.status(400).json({ error: 'Resolved complaints cannot exceed received complaints.' });
    }
    if (high_risk_clients_screened != null && high_risk_clients_total != null
        && Number(high_risk_clients_screened) > Number(high_risk_clients_total)) {
        return res.status(400).json({ error: 'Screened high-risk clients cannot exceed total high-risk clients.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO insurance_governance_metrics (
                unit_id, assessment_year, has_esg_committee, board_oversight_score,
                nic_stress_test_submitted, customer_complaints_received, customer_complaints_resolved,
                high_risk_clients_screened, high_risk_clients_total
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (unit_id, assessment_year)
             DO UPDATE SET has_esg_committee = EXCLUDED.has_esg_committee,
                           board_oversight_score = EXCLUDED.board_oversight_score,
                           nic_stress_test_submitted = EXCLUDED.nic_stress_test_submitted,
                           customer_complaints_received = EXCLUDED.customer_complaints_received,
                           customer_complaints_resolved = EXCLUDED.customer_complaints_resolved,
                           high_risk_clients_screened = EXCLUDED.high_risk_clients_screened,
                           high_risk_clients_total = EXCLUDED.high_risk_clients_total
             RETURNING *`,
            [unit_id, assessment_year, !!has_esg_committee, board_oversight_score || null,
             !!nic_stress_test_submitted, customer_complaints_received || 0, customer_complaints_resolved || 0,
             high_risk_clients_screened || 0, high_risk_clients_total || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Failed to save governance metrics record:', err);
        res.status(500).json({ error: 'Failed to save governance metrics record.' });
    }
});

router.delete('/governance-metrics/:recordId', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM insurance_governance_metrics WHERE record_id = $1 RETURNING record_id`,
            [req.params.recordId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
        res.status(200).json({ success: true, deleted_id: req.params.recordId });
    } catch (err) {
        console.error('Failed to delete governance metrics record:', err);
        res.status(500).json({ error: 'Failed to delete record.' });
    }
});

// ============================================================
// COMBINED DASHBOARD DATA
// Pulls governance metrics (new table) alongside existing ESG
// observation, climate scenario, and materiality data — filtered
// to insurer units only via the unit_type column.
// ============================================================

router.get('/dashboard-summary', authorize, async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year query parameter is required.' });

    try {
        const [governanceRes, emissionsRes, scenarioRes, materialityRes] = await Promise.all([
            pool.query(
                `SELECT o.name AS unit_name, r.*
                 FROM insurance_governance_metrics r
                 JOIN organization_unit o ON o.unit_id = r.unit_id
                 WHERE r.assessment_year = $1`,
                [year]
            ),
            pool.query(
                `SELECT scope_category, SUM(calculated_co2e) AS total_co2e,
                        SUM(CASE WHEN activity_type ILIKE '%water%' THEN raw_amount ELSE 0 END) AS water_usage,
                        SUM(CASE WHEN activity_type ILIKE '%waste%' THEN raw_amount ELSE 0 END) AS waste_generated
                 FROM esg_observation eo
                 JOIN organization_unit o ON o.unit_id = eo.unit_id
                 WHERE EXTRACT(YEAR FROM eo.timestamp) = $1 AND eo.status = 'Approved'
                 GROUP BY scope_category`,
                [year]
            ),
            pool.query(
                `SELECT scenario_name, time_horizon, projected_financial_impact_ghs
                 FROM climate_scenario_analysis cs
                 JOIN organization_unit o ON o.unit_id = cs.unit_id
                 WHERE cs.assessment_year = $1`,
                [year]
            ),
            pool.query(
                `SELECT topic_name, stakeholder_importance_score, business_impact_score
                 FROM materiality_scores ms
                 JOIN organization_unit o ON o.unit_id = ms.unit_id
                 WHERE ms.assessment_year = $1`,
                [year]
            ),
        ]);

        res.status(200).json({
            governance: governanceRes.rows,
            emissions: emissionsRes.rows,
            scenarios: scenarioRes.rows,
            materiality: materialityRes.rows,
        });
    } catch (err) {
        console.error('Failed to fetch insurance dashboard summary:', err);
        res.status(500).json({ error: 'Failed to fetch insurance dashboard data.' });
    }
});

module.exports = router;
