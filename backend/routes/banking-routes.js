const express = require('express');
const router = express.Router();
const pool = require('../db'); // your pg Pool instance
const authenticateToken = require('../middleware/auth'); // your existing JWT middleware

// GET /api/banking/portfolio-screening?year=2026
router.get('/portfolio-screening', authenticateToken, async (req, res) => {
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

// GET /api/banking/financial-inclusion?year=2026
router.get('/financial-inclusion', authenticateToken, async (req, res) => {
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

// GET /api/banking/gender-equality?year=2026
router.get('/gender-equality', authenticateToken, async (req, res) => {
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

// GET /api/banking/principle-maturity?year=2026
router.get('/principle-maturity', authenticateToken, async (req, res) => {
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

module.exports = router;