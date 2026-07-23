const express = require('express');
const router = express.Router();
const pool = require('../db');
const authorize = require('../middleware/authorize');

// ============================================================
// MIRRORING HELPER
// ============================================================
// Mirrors the 9 EnergyDataEntry fields that overlap with Gap Analysis
// clauses into esg_observation, so logging through the Energy Data
// Entry form also closes the matching Framework_Mappings clauses.
//
// Uses DELETE-then-INSERT per activity_type (not ON CONFLICT) since
// esg_observation has no known unique constraint to upsert against —
// this keeps re-saving the same unit/year idempotent without needing
// one.
//
// created_at is explicitly set to Dec 31 of the assessment year, NOT
// left to default to "now" — otherwise entering historical data (e.g.
// assessment_year=2024 while actually saving in 2026) would silently
// never match the gap-analysis query's EXTRACT(YEAR FROM created_at)
// filter for 2024.
// ============================================================

const MIRRORED_METRIC_NAMES = [
    'energy_production_mwh',
    'renewable_energy_share_pct',
    'grid_loss_percentage',
    'energy_access_connections_count',
    'fugitive_emissions_co2e_tonnes',
    'land_rehabilitation_hectares',
    'local_content_procurement_pct',
    'carbon_credits_traded_tonnes',
    'government_subsidies_received_ghs'
];

async function mirrorEnergyMetricsToObservations(unit_id, assessment_year, fields) {
    const {
        renewable_generation_mwh, thermal_generation_mwh, grid_loss_percentage,
        energy_access_connections_count, fugitive_emissions_co2e_tonnes,
        land_rehabilitation_hectares, local_content_procurement_pct,
        carbon_credits_traded_tonnes, government_subsidies_received_ghs
    } = fields;

    const renewable = Number(renewable_generation_mwh) || 0;
    const thermal = Number(thermal_generation_mwh) || 0;
    const totalGeneration = renewable + thermal;
    const renewableSharePct = totalGeneration > 0 ? (renewable / totalGeneration) * 100 : null;
    const explicitCreatedAt = `${assessment_year}-12-31`;

    const { rows: metricRows } = await pool.query(
        `SELECT metric_id, name FROM metric_definition WHERE name = ANY($1)`,
        [MIRRORED_METRIC_NAMES]
    );
    const metricIdByName = Object.fromEntries(metricRows.map(r => [r.name, r.metric_id]));

    const mirroredRows = [
        { activity_type: 'energy_production_mwh', raw_amount: totalGeneration, unit_of_measure: 'MWh', pillar: 'E' },
        { activity_type: 'renewable_energy_share_pct', raw_amount: renewableSharePct, unit_of_measure: '%', pillar: 'E' },
        { activity_type: 'grid_loss_percentage', raw_amount: grid_loss_percentage != null ? Number(grid_loss_percentage) : null, unit_of_measure: '%', pillar: 'E' },
        { activity_type: 'energy_access_connections_count', raw_amount: energy_access_connections_count != null ? Number(energy_access_connections_count) : null, unit_of_measure: 'Count', pillar: 'S' },
        { activity_type: 'fugitive_emissions_co2e_tonnes', raw_amount: fugitive_emissions_co2e_tonnes != null ? Number(fugitive_emissions_co2e_tonnes) : null, unit_of_measure: 'tCO2e', pillar: 'E' },
        { activity_type: 'land_rehabilitation_hectares', raw_amount: land_rehabilitation_hectares != null ? Number(land_rehabilitation_hectares) : null, unit_of_measure: 'Hectares', pillar: 'E' },
        { activity_type: 'local_content_procurement_pct', raw_amount: local_content_procurement_pct != null ? Number(local_content_procurement_pct) : null, unit_of_measure: '%', pillar: 'F' },
        { activity_type: 'carbon_credits_traded_tonnes', raw_amount: carbon_credits_traded_tonnes != null ? Number(carbon_credits_traded_tonnes) : null, unit_of_measure: 'tCO2e', pillar: 'F' },
        { activity_type: 'government_subsidies_received_ghs', raw_amount: government_subsidies_received_ghs != null ? Number(government_subsidies_received_ghs) : null, unit_of_measure: 'GHS', pillar: 'F' }
    ];

    for (const row of mirroredRows) {
        const metric_id = metricIdByName[row.activity_type];
        if (row.raw_amount === null || metric_id === undefined) continue; // skip if no data or metric_definition row missing

        await pool.query(
            `DELETE FROM esg_observation
             WHERE unit_id = $1 AND activity_type = $2
               AND EXTRACT(YEAR FROM created_at) = $3`,
            [unit_id, row.activity_type, assessment_year]
        );

        await pool.query(
            `INSERT INTO esg_observation
                (unit_id, metric_id, pillar, activity_type, raw_amount, unit_of_measure, status, created_at, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, 'Approved', $7, $7)`,
            [unit_id, metric_id, row.pillar, row.activity_type, row.raw_amount, row.unit_of_measure, explicitCreatedAt]
        );
    }
}

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
                    r.energy_efficiency_score,
                    r.energy_access_connections_count, r.fugitive_emissions_co2e_tonnes,
                    r.land_rehabilitation_hectares, r.local_content_procurement_pct,
                    r.carbon_credits_traded_tonnes, r.government_subsidies_received_ghs,
                    r.created_at
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
        grid_loss_percentage, renewable_investment_ghs, energy_efficiency_score,
        energy_access_connections_count, fugitive_emissions_co2e_tonnes,
        land_rehabilitation_hectares, local_content_procurement_pct,
        carbon_credits_traded_tonnes, government_subsidies_received_ghs
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
    if (local_content_procurement_pct != null && (Number(local_content_procurement_pct) < 0 || Number(local_content_procurement_pct) > 100)) {
        return res.status(400).json({ error: 'local_content_procurement_pct must be between 0 and 100.' });
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
                grid_loss_percentage, renewable_investment_ghs, energy_efficiency_score,
                energy_access_connections_count, fugitive_emissions_co2e_tonnes,
                land_rehabilitation_hectares, local_content_procurement_pct,
                carbon_credits_traded_tonnes, government_subsidies_received_ghs
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (unit_id, assessment_year)
             DO UPDATE SET renewable_generation_mwh = EXCLUDED.renewable_generation_mwh,
                           thermal_generation_mwh = EXCLUDED.thermal_generation_mwh,
                           grid_loss_percentage = EXCLUDED.grid_loss_percentage,
                           renewable_investment_ghs = EXCLUDED.renewable_investment_ghs,
                           energy_efficiency_score = EXCLUDED.energy_efficiency_score,
                           energy_access_connections_count = EXCLUDED.energy_access_connections_count,
                           fugitive_emissions_co2e_tonnes = EXCLUDED.fugitive_emissions_co2e_tonnes,
                           land_rehabilitation_hectares = EXCLUDED.land_rehabilitation_hectares,
                           local_content_procurement_pct = EXCLUDED.local_content_procurement_pct,
                           carbon_credits_traded_tonnes = EXCLUDED.carbon_credits_traded_tonnes,
                           government_subsidies_received_ghs = EXCLUDED.government_subsidies_received_ghs
             RETURNING *`,
            [unit_id, assessment_year, renewable_generation_mwh || 0, thermal_generation_mwh || 0,
             grid_loss_percentage || null, renewable_investment_ghs || 0, energy_efficiency_score || null,
             energy_access_connections_count || null, fugitive_emissions_co2e_tonnes || null,
             land_rehabilitation_hectares || null, local_content_procurement_pct || null,
             carbon_credits_traded_tonnes || null, government_subsidies_received_ghs || null]
        );

        // Mirror into esg_observation so Gap Analysis can see this data.
        // Awaited before responding so a mirroring failure surfaces as an
        // error rather than a false-success response.
        await mirrorEnergyMetricsToObservations(unit_id, assessment_year, {
            renewable_generation_mwh, thermal_generation_mwh, grid_loss_percentage,
            energy_access_connections_count, fugitive_emissions_co2e_tonnes,
            land_rehabilitation_hectares, local_content_procurement_pct,
            carbon_credits_traded_tonnes, government_subsidies_received_ghs
        });

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
