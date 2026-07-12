const crypto = require('crypto');
const csv = require('csv-parser');
const { Readable } = require('stream');
// Database imported correctly!
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

        // FIX 1: Changed db.query to pool.query
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
                let duplicatesSkipped = 0;
                let rowErrors = [];

                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    try {
                        const { organization_id, scope_category, activity_type, raw_amount, recorded_date } = row;
                        
                        if (!organization_id || !activity_type || raw_amount === undefined) {
                            throw new Error('Missing required fields. Ensure headers match exactly: organization_id, scope_category, activity_type, raw_amount');
                        }

                        const final_co2e = calculateCarbonFootprint(activity_type, raw_amount);

                        const query = `
                            INSERT INTO esg_observation
                            (organization_id, scope_category, activity_type, raw_amount, calculated_co2e, recorded_date)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            ON CONFLICT ON CONSTRAINT unique_emission_log 
                            DO NOTHING
                            RETURNING id;
                        `;
                        
                        // FIX 2: Changed db.query to pool.query
                        const insertRes = await pool.query(query, [
                            organization_id, 
                            scope_category, 
                            activity_type, 
                            parseFloat(raw_amount), 
                            final_co2e,                                 
                            recorded_date || new Date().toISOString()
                        ]);

                        if (insertRes.rowCount === 0) {
                            duplicatesSkipped++;
                        } else {
                            successfulInserts++;
                        }
                    } catch (rowErr) {
                        console.error(`Error at row ${i + 1}:`, rowErr.message);
                        rowErrors.push(`Row ${i + 1} Error: ${rowErr.message}`);
                    }
                }

                // FIX 3: Changed db.query to pool.query
                await pool.query(
                    'INSERT INTO uploaded_files_log (file_hash, file_name) VALUES ($1, $2)',
                    [fileHash, req.file.originalname]
                );

                res.json({
                    rows_processed: results.length,
                    successful_inserts: successfulInserts,
                    duplicates_skipped: duplicatesSkipped,
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