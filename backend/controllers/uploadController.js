const crypto = require('crypto');
const csv = require('csv-parser');
const { Readable } = require('stream');
const pool = require('../db'); 

// --- 1. EMISSION FACTOR ENGINE ---
const EMISSION_FACTORS = {
    'mobile_diesel_liters': 2.68,        
    'mobile_petrol_liters': 2.31,        
    'electricity_grid_kwh': 0.43,        
    'spend_diesel_ghc': 0.18,            
    'spend_electricity_ghc': 0.25,
    'spend_flights_ghc': 0.85
};

const calculateCarbonFootprint = (activity_type, raw_amount) => {
    const multiplier = EMISSION_FACTORS[activity_type] || 1.0; 
    return parseFloat(raw_amount) * multiplier;
};

// --- 2. CSV UPLOAD PROCESSOR ---
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
                        // Note: If your column in metric_definition is named 'name' instead of 'metric_name', adjust this query!
                        const metricLookup = await pool.query(
                            'SELECT metric_id FROM metric_definition WHERE metric_name = $1 LIMIT 1',
                            [activity_type]
                        );

                        if (metricLookup.rowCount === 0) {
                            throw new Error(`Metric '${activity_type}' not found in metric_definition table.`);
                        }
                        const metric_id = metricLookup.rows[0].metric_id;

                        // STEP C: Calculate CO2e
                        const final_co2e = calculateCarbonFootprint(activity_type, raw_amount);

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