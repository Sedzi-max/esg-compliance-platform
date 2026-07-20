const express = require('express');
const router = express.Router();
const pool = require('../db');
const authorize = require('../middleware/authorize');

const MIN_PEER_COMPANIES = 3; // anonymization floor — never benchmark against fewer than this many OTHER companies

// Each metric query is self-contained: it builds unit_roots, filters to the
// requested sector, and returns one row per company (root_id) with that
// company's aggregate value for the given year. No individual raw table
// rows are ever returned to the caller — only this per-company summary,
// which itself only leaves this function as anonymized aggregate stats.
const METRIC_CONFIG = {
    banking: {
        label: 'Portfolio E&S Screening Rate',
        unit: '%',
        higherIsBetter: true,
        query: `
            WITH RECURSIVE ancestry AS (
                SELECT unit_id, parent_unit_id, unit_id AS root_id
                FROM organization_unit
                WHERE parent_unit_id IS NULL
                UNION ALL
                SELECT ou.unit_id, ou.parent_unit_id, a.root_id
                FROM organization_unit ou
                JOIN ancestry a ON ou.parent_unit_id = a.unit_id
            ),
            unit_roots AS (SELECT unit_id, root_id FROM ancestry),
            sector_roots AS (
                SELECT unit_id AS root_id FROM organization_unit
                WHERE parent_unit_id IS NULL AND COALESCE(sector, 'general') = $1
            )
            SELECT ur.root_id AS company_root_id,
                   CASE WHEN SUM(l.total_loan_value_ghs) > 0
                        THEN (SUM(l.es_screened_value_ghs) / SUM(l.total_loan_value_ghs)) * 100
                        ELSE NULL END AS value
            FROM loan_portfolio_screening l
            JOIN unit_roots ur ON l.unit_id = ur.unit_id
            JOIN sector_roots sr ON ur.root_id = sr.root_id
            WHERE l.assessment_year = $2
            GROUP BY ur.root_id
            HAVING SUM(l.total_loan_value_ghs) > 0
        `,
    },
    insurance: {
        label: 'High-Risk Client Screening Rate',
        unit: '%',
        higherIsBetter: true,
        query: `
            WITH RECURSIVE ancestry AS (
                SELECT unit_id, parent_unit_id, unit_id AS root_id
                FROM organization_unit
                WHERE parent_unit_id IS NULL
                UNION ALL
                SELECT ou.unit_id, ou.parent_unit_id, a.root_id
                FROM organization_unit ou
                JOIN ancestry a ON ou.parent_unit_id = a.unit_id
            ),
            unit_roots AS (SELECT unit_id, root_id FROM ancestry),
            sector_roots AS (
                SELECT unit_id AS root_id FROM organization_unit
                WHERE parent_unit_id IS NULL AND COALESCE(sector, 'general') = $1
            )
            SELECT ur.root_id AS company_root_id,
                   CASE WHEN SUM(i.high_risk_clients_total) > 0
                        THEN (SUM(i.high_risk_clients_screened)::numeric / SUM(i.high_risk_clients_total)) * 100
                        ELSE NULL END AS value
            FROM insurance_governance_metrics i
            JOIN unit_roots ur ON i.unit_id = ur.unit_id
            JOIN sector_roots sr ON ur.root_id = sr.root_id
            WHERE i.assessment_year = $2
            GROUP BY ur.root_id
            HAVING SUM(i.high_risk_clients_total) > 0
        `,
    },
    energy: {
        label: 'Renewable Generation Share',
        unit: '%',
        higherIsBetter: true,
        query: `
            WITH RECURSIVE ancestry AS (
                SELECT unit_id, parent_unit_id, unit_id AS root_id
                FROM organization_unit
                WHERE parent_unit_id IS NULL
                UNION ALL
                SELECT ou.unit_id, ou.parent_unit_id, a.root_id
                FROM organization_unit ou
                JOIN ancestry a ON ou.parent_unit_id = a.unit_id
            ),
            unit_roots AS (SELECT unit_id, root_id FROM ancestry),
            sector_roots AS (
                SELECT unit_id AS root_id FROM organization_unit
                WHERE parent_unit_id IS NULL AND COALESCE(sector, 'general') = $1
            )
            SELECT ur.root_id AS company_root_id,
                   CASE WHEN SUM(e.renewable_generation_mwh + e.thermal_generation_mwh) > 0
                        THEN (SUM(e.renewable_generation_mwh) / SUM(e.renewable_generation_mwh + e.thermal_generation_mwh)) * 100
                        ELSE NULL END AS value
            FROM energy_sector_metrics e
            JOIN unit_roots ur ON e.unit_id = ur.unit_id
            JOIN sector_roots sr ON ur.root_id = sr.root_id
            WHERE e.assessment_year = $2
            GROUP BY ur.root_id
            HAVING SUM(e.renewable_generation_mwh + e.thermal_generation_mwh) > 0
        `,
    },
    general: {
        label: 'Total Approved Emissions',
        unit: 'kg CO2e',
        higherIsBetter: false,
        // NOTE: this is an absolute total, not normalized by revenue,
        // headcount, or facility count — flagged honestly to the user
        // rather than implied to be a fair apples-to-apples comparison.
        query: `
            WITH RECURSIVE ancestry AS (
                SELECT unit_id, parent_unit_id, unit_id AS root_id
                FROM organization_unit
                WHERE parent_unit_id IS NULL
                UNION ALL
                SELECT ou.unit_id, ou.parent_unit_id, a.root_id
                FROM organization_unit ou
                JOIN ancestry a ON ou.parent_unit_id = a.unit_id
            ),
            unit_roots AS (SELECT unit_id, root_id FROM ancestry),
            sector_roots AS (
                SELECT unit_id AS root_id FROM organization_unit
                WHERE parent_unit_id IS NULL AND COALESCE(sector, 'general') = $1
            )
            SELECT ur.root_id AS company_root_id,
                   SUM(o.calculated_co2e) AS value
            FROM esg_observation o
            JOIN unit_roots ur ON o.unit_id = ur.unit_id
            JOIN sector_roots sr ON ur.root_id = sr.root_id
            WHERE o.status = 'Approved'
              AND EXTRACT(YEAR FROM COALESCE(o.timestamp, o.created_at)) = $2
            GROUP BY ur.root_id
        `,
    },
};

router.get('/overview', authorize, async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year query parameter is required.' });

    try {
        // 1. Resolve the caller's own root company and sector.
        const rootResult = await pool.query(
            `WITH RECURSIVE ancestry AS (
                SELECT unit_id, parent_unit_id, sector
                FROM organization_unit
                WHERE unit_id = $1
                UNION ALL
                SELECT o.unit_id, o.parent_unit_id, o.sector
                FROM organization_unit o
                JOIN ancestry a ON o.unit_id = a.parent_unit_id
             )
             SELECT unit_id, sector FROM ancestry WHERE parent_unit_id IS NULL LIMIT 1`,
            [req.user.company_id]
        );

        if (rootResult.rows.length === 0) {
            return res.status(404).json({ error: 'Could not resolve your organization.' });
        }

        const myRootId = rootResult.rows[0].unit_id;
        const sector = rootResult.rows[0].sector || 'general';
        const metricConfig = METRIC_CONFIG[sector] || METRIC_CONFIG.general;

        // 2. One query, returns one row per company in this sector with
        // their aggregate metric value for the requested year.
        const perCompanyResult = await pool.query(metricConfig.query, [sector, year]);

        const peerValues = perCompanyResult.rows
            .filter(r => r.value !== null)
            .map(r => ({ rootId: r.company_root_id, value: Number(r.value) }));

        const myEntry = peerValues.find(p => p.rootId === myRootId);
        const otherPeers = peerValues.filter(p => p.rootId !== myRootId);

        // 3. Anonymization floor: refuse to benchmark against too few peers.
        if (otherPeers.length < MIN_PEER_COMPANIES) {
            return res.status(200).json({
                sector,
                metricLabel: metricConfig.label,
                insufficientData: true,
                peerCount: otherPeers.length,
                minRequired: MIN_PEER_COMPANIES,
                message: `Not enough other ${sector} companies have logged this data yet for anonymized benchmarking (${otherPeers.length} of ${MIN_PEER_COMPANIES} required). This protects every company's privacy — benchmarking will appear automatically once enough peers have data.`,
            });
        }

        // 4. Compute aggregate stats.
        const allValues = peerValues.map(p => p.value).sort((a, b) => a - b);
        const average = allValues.reduce((s, v) => s + v, 0) / allValues.length;

        const topPercentileIndex = metricConfig.higherIsBetter
            ? Math.floor(allValues.length * 0.9)
            : Math.floor(allValues.length * 0.1);
        const topPerformerValue = allValues[Math.min(topPercentileIndex, allValues.length - 1)];

        let userPercentile = null;
        if (myEntry) {
            const rank = allValues.filter(v => metricConfig.higherIsBetter ? v <= myEntry.value : v >= myEntry.value).length;
            userPercentile = Math.round((rank / allValues.length) * 100);
        }

        // 5. Build a coarse histogram (5 buckets) across the real value range —
        // never returning any individual company's value, only bucket counts.
        const min = allValues[0];
        const max = allValues[allValues.length - 1];
        const bucketCount = 5;
        const bucketSize = (max - min) / bucketCount || 1;
        const buckets = Array.from({ length: bucketCount }, (_, i) => {
            const bucketMin = min + i * bucketSize;
            const bucketMax = i === bucketCount - 1 ? max : bucketMin + bucketSize;
            return {
                range: `${bucketMin.toFixed(1)}-${bucketMax.toFixed(1)}`,
                count: 0,
                containsUser: false,
            };
        });
        allValues.forEach(v => {
            let idx = Math.floor((v - min) / bucketSize);
            if (idx >= bucketCount) idx = bucketCount - 1;
            buckets[idx].count += 1;
        });
        if (myEntry) {
            let userIdx = Math.floor((myEntry.value - min) / bucketSize);
            if (userIdx >= bucketCount) userIdx = bucketCount - 1;
            buckets[userIdx].containsUser = true;
        }

        res.status(200).json({
            sector,
            metricLabel: metricConfig.label,
            unit: metricConfig.unit,
            higherIsBetter: metricConfig.higherIsBetter,
            insufficientData: false,
            peerCount: otherPeers.length,
            userValue: myEntry ? myEntry.value : null,
            userPercentile,
            average,
            topPerformerValue,
            distribution: buckets,
        });

    } catch (err) {
        console.error('Failed to compute industry benchmarking:', err);
        res.status(500).json({ error: 'Failed to compute industry benchmarking.' });
    }
});

module.exports = router;
