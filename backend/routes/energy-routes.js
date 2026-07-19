const express = require('express');
const router = express.Router();
const pool = require('../db');
const authorize = require('../middleware/authorize');

// ============================================================
// ENERGY SECTOR METRICS
// ============================================================

router.get('/metrics/raw', authorize, async (req, res) => {
    const { year } = req.query;
    try {
        const result = await pool.query(
            `WITH RECURSIVE org_tree AS (
                SELECT unit_id FROM organization_unit WHERE unit_id = $1
                UNION ALL
                SELECT ou.unit_id
                FROM organization_unit ou
                JOIN org_tree ot ON ou.parent_unit_id = ot.unit_id
            )
             SELECT r.record_id, r.unit_id, o.name AS unit_name, r.assessment_year,
                    r.renewable_generation_mwh, r.thermal_generation_mwh,
                    r.grid_loss_percentage, r.renewable_investment_ghs,
                    r.energy_efficiency_score, r.created_at
             FROM energy_sector_metrics r
             JOIN organization_unit o ON o.unit_id = r.unit_id
             WHERE r.unit_id IN (SELECT unit_id FROM org_tree)
               AND ($2::int IS NULL OR r.assessment_year = $2)
             ORDER BY r.created_at DESC`,
            [req.user.company_id, year || null]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch raw energy metrics:', err);
        res.status(500).json({ error: 'Failed to fetch energy metrics records.' });
    }
});

router.post('/metrics', authorize, async (req, res) => {
    const {
        unit_id, assessment_year, renewable_generation_mwh, thermal_generation_mwh,
        grid_loss_percentage, renewable_investment_ghs, energy_efficiency_score
    } = req.body;

    if (!unit_id || !assessment_year) {
        return res.status(400).json({ error: 'unit_id and assessment_year are required.' });
    }
    if (grid_loss_percentage != null && (Number(grid_loss_percentage) < 0 || Number(grid_loss_percentage) > 100)) {
        return res.status(400).json({ error: 'grid_loss_percentage must be between 0 and 100.' });
    }
    if (energy_efficiency_score != null && (Number(energy_efficiency_score) < 0 || Number(energy_efficiency_score) > 100)) {
        return res.status(400).json({ error: 'energy_efficiency_score must be between 0 and 100.' });
    }

    try {
        // Verify the unit belongs to the caller's own org tree before writing.
        const ownershipCheck = await pool.query(
            `WITH RECURSIVE org_tree AS (
                SELECT unit_id FROM organization_unit WHERE unit_id = $1
                UNION ALL
                SELECT ou.unit_id
                FROM organization_unit ou
                JOIN org_tree ot ON ou.parent_unit_id = ot.unit_id
            )
             SELECT 1 FROM org_tree WHERE unit_id = $2`,
            [req.user.company_id, unit_id]
        );
        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access Denied: That organization unit does not belong to your company.' });
        }

        const result = await pool.query(
            `INSERT INTO energy_sector_metrics (
                unit_id, assessment_year, renewable_generation_mwh, thermal_generation_mwh,
                grid_loss_percentage, renewable_investment_ghs, energy_efficiency_score
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (unit_id, assessment_year)
             DO UPDATE SET renewable_generation_mwh = EXCLUDED.renewable_generation_mwh,
                           thermal_generation_mwh = EXCLUDED.thermal_generation_mwh,
                           grid_loss_percentage = EXCLUDED.grid_loss_percentage,
                           renewable_investment_ghs = EXCLUDED.renewable_investment_ghs,
                           energy_efficiency_score = EXCLUDED.energy_efficiency_score
             RETURNING *`,
            [unit_id, assessment_year, renewable_generation_mwh || 0, thermal_generation_mwh || 0,
             grid_loss_percentage || null, renewable_investment_ghs || 0, energy_efficiency_score || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Failed to save energy metrics record:', err);
        res.status(500).json({ error: 'Failed to save energy metrics record.' });
    }
});

router.delete('/metrics/:recordId', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM energy_sector_metrics WHERE record_id = $1 RETURNING record_id`,
            [req.params.recordId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
        res.status(200).json({ success: true, deleted_id: req.params.recordId });
    } catch (err) {
        console.error('Failed to delete energy metrics record:', err);
        res.status(500).json({ error: 'Failed to delete record.' });
    }
});

// ============================================================
// COMBINED DASHBOARD DATA
// Pulls energy_sector_metrics (new table) alongside the existing
// esg_observation table, filtered to this company's org tree.
// ============================================================
router.get('/dashboard-summary', authorize, async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year query parameter is required.' });

    try {
        const [metricsRes, emissionsRes] = await Promise.all([
            pool.query(
                `WITH RECURSIVE org_tree AS (
                    SELECT unit_id FROM organization_unit WHERE unit_id = $1
                    UNION ALL
                    SELECT ou.unit_id
                    FROM organization_unit ou
                    JOIN org_tree ot ON ou.parent_unit_id = ot.unit_id
                )
                 SELECT o.name AS unit_name, r.*
                 FROM energy_sector_metrics r
                 JOIN organization_unit o ON o.unit_id = r.unit_id
                 WHERE r.unit_id IN (SELECT unit_id FROM org_tree)
                   AND r.assessment_year = $2`,
                [req.user.company_id, year]
            ),
            pool.query(
                `WITH RECURSIVE org_tree AS (
                    SELECT unit_id FROM organization_unit WHERE unit_id = $1
                    UNION ALL
                    SELECT ou.unit_id
                    FROM organization_unit ou
                    JOIN org_tree ot ON ou.parent_unit_id = ot.unit_id
                )
                 SELECT scope_category, SUM(calculated_co2e) AS total_co2e
                 FROM esg_observation eo
                 WHERE eo.unit_id IN (SELECT unit_id FROM org_tree)
                   AND EXTRACT(YEAR FROM eo.timestamp) = $2
                   AND eo.status = 'Approved'
                 GROUP BY scope_category`,
                [req.user.company_id, year]
            ),
        ]);

        res.status(200).json({
            metrics: metricsRes.rows,
            emissions: emissionsRes.rows,
        });
    } catch (err) {
        console.error('Failed to fetch energy dashboard summary:', err);
        res.status(500).json({ error: 'Failed to fetch energy dashboard data.' });
    }
});

module.exports = router;
