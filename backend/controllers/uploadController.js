const crypto = require('crypto');
const csv = require('csv-parser');
const { Readable } = require('stream');
// Assuming you have a db connection file, e.g., const db = require('../config/db');

// --- 1. EMISSION FACTOR ENGINE ---
// A standard mapping of activity types to their Carbon Multipliers (kg CO2e per unit)
const EMISSION_FACTORS = {
    // Volume-based factors
    'mobile_diesel_liters': 2.68,         // 1 liter of diesel = ~2.68 kg CO2e
    'mobile_petrol_liters': 2.31,         // 1 liter of petrol = ~2.31 kg CO2e
    'electricity_grid_kwh': 0.43,         // Ghana average grid factor (kg CO2e per kWh)
    
    // Financial / Spend-based factors (Estimated kg CO2e per GHC spent)
    'spend_diesel_ghc': 0.18,             
    'spend_electricity_ghc': 0.25,
    'spend_flights_ghc': 0.85
};

// Helper function to calculate the final footprint
const calculateCarbonFootprint = (activity_type, raw_amount) => {
    // Look up the multiplier, default to 1.0 if not found
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

        // Cryptographic File Hashing (The Intake Shield)
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        // Check if file was already processed
        const hashCheck = await db.query(
            'SELECT uploaded_at FROM uploaded_files_log WHERE file_hash = $1', 
            [fileHash]
        );

        if (hashCheck.rowCount > 0) {
            const uploadDate = new Date(hashCheck.rows[0].uploaded_at).toLocaleString();
            return res.status(400).json({
                error: `Duplicate File Detected: This exact file was already processed on ${uploadDate}.`
            });
        }

        // Parsing & Graceful Upsert
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
                        
                        // Safety Check: Ensure no undefined values crash the database
                        if (!organization_id || !activity_type || raw_amount === undefined) {
                            throw new Error('Missing required fields. Ensure headers match exactly: organization_id, scope_category, activity_type, raw_amount');
                        }

                        // CALCULATE CARBON FOOTPRINT
                        const final_co2e = calculateCarbonFootprint(activity_type, raw_amount);

                        const query = `
                            INSERT INTO emissions 
                            (organization_id, scope_category, activity_type, raw_amount, calculated_co2e, recorded_date)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            ON CONFLICT ON CONSTRAINT unique_emission_log 
                            DO NOTHING
                            RETURNING id;
                        `;
                        
                        const insertRes = await db.query(query, [
                            organization_id, 
                            scope_category, 
                            activity_type, 
                            parseFloat(raw_amount), 
                            final_co2e,                                 // Injecting the calculated footprint
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

                // Lock the file hash in the database
                await db.query(
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