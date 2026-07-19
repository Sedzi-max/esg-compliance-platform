const express = require('express');
const router = express.Router();
const pool = require('../db');
const authorize = require('../middleware/authorize');

// ============================================================
// PLATFORM OVERVIEW (Super Admin only)
// Deliberately NOT scoped to any single company's org tree — this is
// the one place on the platform meant to see across all companies.
// ============================================================

router.get('/overview', authorize, async (req, res) => {
    if (req.user.role !== 'Super Admin') {
        return res.status(403).json({ error: 'Access Denied: Platform Super Admin only.' });
    }

    try {
        const [companiesBySectorRes, usersByRoleRes, pendingCountRes, companiesRes, activitySummaryRes] = await Promise.all([
            // Root companies grouped by sector
            pool.query(
                `SELECT COALESCE(sector, 'general') AS sector, COUNT(*) AS company_count
                 FROM organization_unit
                 WHERE parent_unit_id IS NULL
                 GROUP BY sector`
            ),
            // Users grouped by role, platform-wide
            pool.query(
                `SELECT role, COUNT(*) AS user_count
                 FROM users
                 GROUP BY role`
            ),
            // Count of accounts still awaiting approval
            pool.query(
                `SELECT COUNT(*) AS pending_count FROM users WHERE role = 'Pending'`
            ),
            // One row per root company, with its admin's status and a data-activity flag
            pool.query(
                `SELECT
                    o.unit_id,
                    o.name,
                    COALESCE(o.sector, 'general') AS sector,
                    o.created_at,
                    (SELECT COUNT(*) FROM users u WHERE u.unit_id = o.unit_id) AS user_count,
                    EXISTS (
                        SELECT 1 FROM esg_observation eo
                        WHERE eo.unit_id IN (
                            WITH RECURSIVE org_tree AS (
                                SELECT unit_id FROM organization_unit WHERE unit_id = o.unit_id
                                UNION ALL
                                SELECT ou.unit_id FROM organization_unit ou
                                JOIN org_tree ot ON ou.parent_unit_id = ot.unit_id
                            )
                            SELECT unit_id FROM org_tree
                        )
                    ) AS has_logged_data
                 FROM organization_unit o
                 WHERE o.parent_unit_id IS NULL
                 ORDER BY o.created_at DESC`
            ),
            // Platform-wide activity totals (approved + pending emissions records)
            pool.query(
                `SELECT
                    COUNT(*) FILTER (WHERE status = 'Approved') AS approved_records,
                    COUNT(*) FILTER (WHERE status = 'Pending') AS pending_records,
                    COALESCE(SUM(calculated_co2e) FILTER (WHERE status = 'Approved'), 0) AS total_approved_co2e
                 FROM esg_observation
                 WHERE scope_category IS NOT NULL`
            ),
        ]);

        res.status(200).json({
            companiesBySector: companiesBySectorRes.rows,
            usersByRole: usersByRoleRes.rows,
            pendingCount: Number(pendingCountRes.rows[0]?.pending_count || 0),
            companies: companiesRes.rows,
            activitySummary: activitySummaryRes.rows[0] || { approved_records: 0, pending_records: 0, total_approved_co2e: 0 },
        });
    } catch (err) {
        console.error('Failed to fetch platform overview:', err);
        res.status(500).json({ error: 'Failed to fetch platform overview.' });
    }
});

module.exports = router;