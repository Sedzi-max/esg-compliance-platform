const express = require('express');
const router = express.Router();
const pool = require('../db'); // your pg Pool instance
const authorize = require('../middleware/authorize');

// ============================================================
// PORTFOLIO SCREENING (Principle 1)
// ============================================================

router.get('/portfolio-screening', authorize, async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year query parameter is required.' });

    try {
        const result = await pool.query(
            `SELECT sector,
                    SUM(total_loan_value_ghs) AS total_loans,
                    SUM(es_screened_value_ghs) AS es_screened
             FROM loan_portfolio_screening
             WHERE assessment_year = $1
             GROUP BY sector
             ORDER BY sector`,
            [year]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch portfolio screening:', err);
        res.status(500).json({ error: 'Failed to fetch portfolio screening data.' });
    }
});

router.get('/portfolio-screening/raw', authorize, async (req, res) => {
    const { year } = req.query;
    try {
        const result = await pool.query(
            `SELECT r.record_id, r.unit_id, o.name AS unit_name, r.assessment_year, r.sector,
                    r.total_loan_value_ghs, r.es_screened_value_ghs, r.created_at
             FROM loan_portfolio_screening r
             LEFT JOIN organization_unit o ON o.unit_id = r.unit_id
             WHERE ($1::int IS NULL OR r.assessment_year = $1)
             ORDER BY r.created_at DESC`,
            [year || null]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch raw portfolio screening rows:', err);
        res.status(500).json({ error: 'Failed to fetch portfolio screening records.' });
    }
});

router.post('/portfolio-screening', authorize, async (req, res) => {
    const { unit_id, assessment_year, sector, total_loan_value_ghs, es_screened_value_ghs } = req.body;
    if (!unit_id || !assessment_year || !sector || total_loan_value_ghs == null || es_screened_value_ghs == null) {
        return res.status(400).json({ error: 'unit_id, assessment_year, sector, total_loan_value_ghs, and es_screened_value_ghs are all required.' });
    }
    if (Number(es_screened_value_ghs) > Number(total_loan_value_ghs)) {
        return res.status(400).json({ error: 'Screened value cannot exceed total loan value.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO loan_portfolio_screening (unit_id, assessment_year, sector, total_loan_value_ghs, es_screened_value_ghs)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (unit_id, assessment_year, sector)
             DO UPDATE SET total_loan_value_ghs = EXCLUDED.total_loan_value_ghs,
                           es_screened_value_ghs = EXCLUDED.es_screened_value_ghs
             RETURNING *`,
            [unit_id, assessment_year, sector, total_loan_value_ghs, es_screened_value_ghs]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Failed to create portfolio screening record:', err);
        res.status(500).json({ error: 'Failed to save portfolio screening record.' });
    }
});

router.delete('/portfolio-screening/:recordId', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM loan_portfolio_screening WHERE record_id = $1 RETURNING record_id`,
            [req.params.recordId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
        res.status(200).json({ success: true, deleted_id: req.params.recordId });
    } catch (err) {
        console.error('Failed to delete portfolio screening record:', err);
        res.status(500).json({ error: 'Failed to delete record.' });
    }
});

// ============================================================
// HR HEADCOUNT (Principle 4)
// ============================================================

router.get('/gender-equality', authorize, async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year query parameter is required.' });

    try {
        const result = await pool.query(
            `SELECT category,
                    SUM(male_count) AS male_count,
                    SUM(female_count) AS female_count
             FROM hr_headcount
             WHERE assessment_year = $1
             GROUP BY category
             ORDER BY category`,
            [year]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch gender equality metrics:', err);
        res.status(500).json({ error: 'Failed to fetch gender equality data.' });
    }
});

router.get('/gender-equality/raw', authorize, async (req, res) => {
    const { year } = req.query;
    try {
        const result = await pool.query(
            `SELECT r.record_id, r.unit_id, o.name AS unit_name, r.assessment_year, r.category,
                    r.male_count, r.female_count, r.created_at
             FROM hr_headcount r
             LEFT JOIN organization_unit o ON o.unit_id = r.unit_id
             WHERE ($1::int IS NULL OR r.assessment_year = $1)
             ORDER BY r.created_at DESC`,
            [year || null]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch raw headcount rows:', err);
        res.status(500).json({ error: 'Failed to fetch headcount records.' });
    }
});

router.post('/gender-equality', authorize, async (req, res) => {
    const { unit_id, assessment_year, category, male_count, female_count } = req.body;
    if (!unit_id || !assessment_year || !category || male_count == null || female_count == null) {
        return res.status(400).json({ error: 'unit_id, assessment_year, category, male_count, and female_count are all required.' });
    }
    if (Number(male_count) < 0 || Number(female_count) < 0) {
        return res.status(400).json({ error: 'Counts cannot be negative.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO hr_headcount (unit_id, assessment_year, category, male_count, female_count)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (unit_id, assessment_year, category)
             DO UPDATE SET male_count = EXCLUDED.male_count,
                           female_count = EXCLUDED.female_count
             RETURNING *`,
            [unit_id, assessment_year, category, male_count, female_count]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Failed to create headcount record:', err);
        res.status(500).json({ error: 'Failed to save headcount record.' });
    }
});

router.delete('/gender-equality/:recordId', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM hr_headcount WHERE record_id = $1 RETURNING record_id`,
            [req.params.recordId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
        res.status(200).json({ success: true, deleted_id: req.params.recordId });
    } catch (err) {
        console.error('Failed to delete headcount record:', err);
        res.status(500).json({ error: 'Failed to delete record.' });
    }
});

// ============================================================
// FINANCIAL INCLUSION (Principle 5)
// ============================================================

router.get('/financial-inclusion', authorize, async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year query parameter is required.' });

    try {
        const result = await pool.query(
            `SELECT period_month,
                    SUM(basic_accounts_opened) AS basic_accounts_opened,
                    SUM(mobile_money_transactions_k) AS mobile_money_transactions_k
             FROM financial_inclusion_metrics
             WHERE assessment_year = $1
             GROUP BY period_month
             ORDER BY period_month`,
            [year]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch financial inclusion metrics:', err);
        res.status(500).json({ error: 'Failed to fetch financial inclusion data.' });
    }
});

router.get('/financial-inclusion/raw', authorize, async (req, res) => {
    const { year } = req.query;
    try {
        const result = await pool.query(
            `SELECT r.record_id, r.unit_id, o.name AS unit_name, r.assessment_year, r.period_month,
                    r.basic_accounts_opened, r.mobile_money_transactions_k, r.created_at
             FROM financial_inclusion_metrics r
             LEFT JOIN organization_unit o ON o.unit_id = r.unit_id
             WHERE ($1::int IS NULL OR r.assessment_year = $1)
             ORDER BY r.created_at DESC`,
            [year || null]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch raw financial inclusion rows:', err);
        res.status(500).json({ error: 'Failed to fetch financial inclusion records.' });
    }
});

router.post('/financial-inclusion', authorize, async (req, res) => {
    const { unit_id, assessment_year, period_month, basic_accounts_opened, mobile_money_transactions_k } = req.body;
    if (!unit_id || !assessment_year || !period_month || basic_accounts_opened == null || mobile_money_transactions_k == null) {
        return res.status(400).json({ error: 'unit_id, assessment_year, period_month, basic_accounts_opened, and mobile_money_transactions_k are all required.' });
    }
    if (Number(period_month) < 1 || Number(period_month) > 12) {
        return res.status(400).json({ error: 'period_month must be between 1 and 12.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO financial_inclusion_metrics (unit_id, assessment_year, period_month, basic_accounts_opened, mobile_money_transactions_k)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (unit_id, assessment_year, period_month)
             DO UPDATE SET basic_accounts_opened = EXCLUDED.basic_accounts_opened,
                           mobile_money_transactions_k = EXCLUDED.mobile_money_transactions_k
             RETURNING *`,
            [unit_id, assessment_year, period_month, basic_accounts_opened, mobile_money_transactions_k]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Failed to create financial inclusion record:', err);
        res.status(500).json({ error: 'Failed to save financial inclusion record.' });
    }
});

router.delete('/financial-inclusion/:recordId', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM financial_inclusion_metrics WHERE record_id = $1 RETURNING record_id`,
            [req.params.recordId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
        res.status(200).json({ success: true, deleted_id: req.params.recordId });
    } catch (err) {
        console.error('Failed to delete financial inclusion record:', err);
        res.status(500).json({ error: 'Failed to delete record.' });
    }
});

// ============================================================
// PRINCIPLE MATURITY (overall radar scores)
// ============================================================

router.get('/principle-maturity', authorize, async (req, res) => {
    const { year } = req.query;
    if (!year) return res.status(400).json({ error: 'year query parameter is required.' });

    try {
        const result = await pool.query(
            `SELECT principle_code, principle_name,
                    AVG(maturity_score) AS score
             FROM bog_principle_maturity
             WHERE assessment_year = $1
             GROUP BY principle_code, principle_name
             ORDER BY principle_code`,
            [year]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch principle maturity:', err);
        res.status(500).json({ error: 'Failed to fetch principle maturity data.' });
    }
});

router.get('/principle-maturity/raw', authorize, async (req, res) => {
    const { year } = req.query;
    try {
        const result = await pool.query(
            `SELECT r.record_id, r.unit_id, o.name AS unit_name, r.assessment_year,
                    r.principle_code, r.principle_name, r.maturity_score, r.created_at
             FROM bog_principle_maturity r
             LEFT JOIN organization_unit o ON o.unit_id = r.unit_id
             WHERE ($1::int IS NULL OR r.assessment_year = $1)
             ORDER BY r.created_at DESC`,
            [year || null]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Failed to fetch raw principle maturity rows:', err);
        res.status(500).json({ error: 'Failed to fetch principle maturity records.' });
    }
});

router.post('/principle-maturity', authorize, async (req, res) => {
    const { unit_id, assessment_year, principle_code, principle_name, maturity_score } = req.body;
    if (!unit_id || !assessment_year || !principle_code || !principle_name || maturity_score == null) {
        return res.status(400).json({ error: 'unit_id, assessment_year, principle_code, principle_name, and maturity_score are all required.' });
    }
    if (Number(maturity_score) < 0 || Number(maturity_score) > 100) {
        return res.status(400).json({ error: 'maturity_score must be between 0 and 100.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO bog_principle_maturity (unit_id, assessment_year, principle_code, principle_name, maturity_score)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (unit_id, assessment_year, principle_code)
             DO UPDATE SET principle_name = EXCLUDED.principle_name,
                           maturity_score = EXCLUDED.maturity_score
             RETURNING *`,
            [unit_id, assessment_year, principle_code, principle_name, maturity_score]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Failed to create principle maturity record:', err);
        res.status(500).json({ error: 'Failed to save principle maturity record.' });
    }
});

router.delete('/principle-maturity/:recordId', authorize, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM bog_principle_maturity WHERE record_id = $1 RETURNING record_id`,
            [req.params.recordId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
        res.status(200).json({ success: true, deleted_id: req.params.recordId });
    } catch (err) {
        console.error('Failed to delete principle maturity record:', err);
        res.status(500).json({ error: 'Failed to delete record.' });
    }
});

module.exports = router;
