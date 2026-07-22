const crypto = require('crypto');
const csv = require('csv-parser');
const { Readable } = require('stream');
const pool = require('../db');
const CARBON_MULTIPLIERS = require('../utils/carbonFactors');

// Mirrors the frontend's ACTIVITY_TO_SCOPE_MAP (DataEntry.jsx) so a
// bulk-uploaded row and a manually-entered row for the same activity_type
// always resolve to the same scope_category, and therefore the same
// multiplier out of the shared CARBON_MULTIPLIERS table.
const ACTIVITY_TO_SCOPE_MAP = {
    'mobile_diesel_liters': 'scope_1',
    'mobile_petrol_liters': 'scope_1',
    'stationary_natural_gas_therms': 'scope_1',
    'generator_diesel_liters': 'scope_1',
    'electricity_grid_kwh': 'scope_2',
    'district_heating_kwh': 'scope_2',
    'travel_flight_short_haul_km': 'scope_3',
    'travel_flight_long_haul_km': 'scope_3',
    'travel_hotel_stay_nights': 'scope_3',
    'waste_landfill_kg': 'scope_3',
    'waste_recycled_kg': 'scope_3'
};

const calculateCarbonFootprint = (activity_type, raw_amount) => {
    const scope_category = ACTIVITY_TO_SCOPE_MAP[activity_type];
    const multiplier = CARBON_MULTIPLIERS[scope_category]?.[activity_type] || 2.3;
    return parseFloat(raw_amount) * multiplier;
};

// --- FUZZY-MATCH HELPERS (new) ---
// Standard Levenshtein edit-distance between two strings.
// Lower = more similar. 0 = identical.
function levenshteinDistance(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,       // deletion
                matrix[i][j - 1] + 1,       // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[a.length][b.length];
}

// Given an invalid activity_type and the full list of valid metric_definition
// names, return the closest match if it's plausibly a typo/naming variant —
// or null if nothing is close enough to be worth suggesting.
function findClosestMetricMatch(invalidValue, validNames) {
    let best = null;
    let bestDistance = Infinity;

    for (const validName of validNames) {
        const distance = levenshteinDistance(invalidValue.toLowerCase(), validName.toLowerCase());
        if (distance < bestDistance) {
            bestDistance = distance;
            best = validName;
        }
    }

    const maxLen = Math.max(invalidValue.length, best?.length || 1);
    const normalizedDistance = bestDistance / maxLen;

    return normalizedDistance < 0.4 ? best : null;
}

// --- CSV UPLOAD PROCESSOR ---
const processCsvUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No CSV file uploaded." });
        }

        const fileBuffer = req.file.buffer;
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const hashCheck = await pool.query(
            'SELECT uploaded_at FROM uploaded_files_log WHERE file_hash = $1',
            [fileHash]
        );

        if (hashCheck.rowCount > 0) {
            const uploadDate = new Date(hashCheck.rows[0].uploaded_at).toLocaleString();
            return res.status(400).json({
                error: `Duplicate File Detected: This exact file was already processed on ${uploadDate}.`
            });
        }

        // Fetch the full valid metric list ONCE, before the row loop —
        // used both for the existing exact-match lookup and the new
        // fuzzy-match suggestion on rejection.
        const { rows: metricRows } = await pool.query('SELECT name FROM metric_definition');
        const validMetricNames = metricRows.map(r => r.name);

        const results = [];
        const bufferStream = new Readable();
        bufferStream.push(fileBuffer);
        bufferStream.push(null);

        bufferStream.pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let successfulInserts = 0;
                let rowErrors = [];

                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    try {
                        const { organization_name, pillar, activity_type, raw_amount, unit, quality_tier, methodology } = row;

                        if (!organization_name || !activity_type || raw_amount === undefined) {
                            throw new Error('Missing required fields. Ensure headers match the template.');
                        }

                        // STEP A: Lookup the organization's UUID
                        const orgLookup = await pool.query(
                            'SELECT unit_id FROM organization_unit WHERE name = $1 LIMIT 1',
                            [organization_name]
                        );

                        if (orgLookup.rowCount === 0) {
                            throw new Error(`Organization '${organization_name}' not found in database.`);
                        }
                        const unit_id = orgLookup.rows[0].unit_id;

                        // STEP B: Lookup the metric's UUID
                        // FIX (previous): metric_definition's column is 'name', not
                        // 'metric_name' — every row previously failed here regardless
                        // of CSV content.
                        // FIX (new): on a miss, suggest the closest real metric name
                        // instead of just reporting "not found", so users can correct
                        // and re-upload without guessing.
                        const metricLookup = await pool.query(
                            'SELECT metric_id FROM metric_definition WHERE name = $1 LIMIT 1',
                            [activity_type]
                        );

                        if (metricLookup.rowCount === 0) {
                            const suggestion = findClosestMetricMatch(activity_type, validMetricNames);
                            const message = suggestion
                                ? `'${activity_type}' is not a recognized metric — did you mean '${suggestion}'?`
                                : `'${activity_type}' is not a recognized metric. Check the metric list for valid names.`;
                            throw new Error(message);
                        }
                        const metric_id = metricLookup.rows[0].metric_id;

                        // STEP C: Calculate CO2e — only for actual GHG activity types
                        // (those present in CARBON_MULTIPLIERS). Previously this ran
                        // unconditionally for every row, so Social/Governance metrics
                        // like community_investment_ghc or board_diversity_ratio got a
                        // fake calculated_co2e value silently attached. Non-GHG rows
                        // now correctly store null instead.
                        const scope_category = ACTIVITY_TO_SCOPE_MAP[activity_type];
                        const isGhgActivity = scope_category && CARBON_MULTIPLIERS[scope_category]?.[activity_type] !== undefined;
                        const final_co2e = isGhgActivity ? calculateCarbonFootprint(activity_type, raw_amount) : null;

                        // STEP D: Insert into esg_observation with metric_id included
                        const query = `
                            INSERT INTO esg_observation 
                            (unit_id, metric_id, pillar, activity_type, raw_amount, unit_of_measure, quality_tier, text_value, calculated_co2e, timestamp)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                            RETURNING observation_id;
                        `;

                        const insertRes = await pool.query(query, [
                            unit_id,
                            metric_id,
                            pillar || null,
                            activity_type,
                            parseFloat(raw_amount),
                            unit || null,
                            quality_tier || null,
                            methodology || null,
                            final_co2e,
                            new Date().toISOString()
                        ]);

                        if (insertRes.rowCount > 0) {
                            successfulInserts++;
                        }
                    } catch (rowErr) {
                        console.error(`Error at row ${i + 1}:`, rowErr.message);
                        rowErrors.push(`Row ${i + 1} Error: ${rowErr.message}`);
                    }
                }

                await pool.query(
                    'INSERT INTO uploaded_files_log (file_hash, file_name) VALUES ($1, $2)',
                    [fileHash, req.file.originalname]
                );

                res.json({
                    rows_processed: results.length,
                    successful_inserts: successfulInserts,
                    errors: rowErrors
                });
            });

    } catch (error) {
        console.error("Critical Upload Error:", error);
        res.status(500).json({ error: "Internal server error during CSV processing." });
    }
};

module.exports = {
    processCsvUpload
};