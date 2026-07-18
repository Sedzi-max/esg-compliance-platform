const express = require('express');
const router = express.Router();
const pool = require('../db');
const authorize = require('../middleware/authorize');

// GET /api/organizations/my-sector
// Returns the sector ('general' | 'banking' | 'insurance') of the logged-in
// user's ROOT organizational unit, walking up parent_unit_id as needed —
// sector is only meaningful set at the root, child facilities inherit it.
router.get('/my-sector', authorize, async (req, res) => {
    try {
        const userResult = await pool.query(
            `SELECT unit_id FROM users WHERE user_id = $1`,
            [req.user.id]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].unit_id) {
            return res.status(200).json({ sector: 'general' });
        }

        const startUnitId = userResult.rows[0].unit_id;

        const rootResult = await pool.query(
            `WITH RECURSIVE ancestry AS (
                SELECT unit_id, parent_unit_id, sector
                FROM organization_unit
                WHERE unit_id = $1
                UNION ALL
                SELECT o.unit_id, o.parent_unit_id, o.sector
                FROM organization_unit o
                INNER JOIN ancestry a ON o.unit_id = a.parent_unit_id
             )
             SELECT sector FROM ancestry WHERE parent_unit_id IS NULL LIMIT 1`,
            [startUnitId]
        );

        const sector = rootResult.rows[0]?.sector || 'general';
        res.status(200).json({ sector });
    } catch (err) {
        console.error('Failed to resolve organization sector:', err);
        res.status(200).json({ sector: 'general' });
    }
});

module.exports = router;