require('dotenv').config();
const pool = require('./db');

async function fixDatabase() {
    console.log("⏳ Connecting to Render Database...");
    try {
        await pool.query(`
            ALTER TABLE esg_observation 
            ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'units';
        `);
        console.log("✅ SUCCESS! The unit_of_measure column has been permanently added.");
        process.exit(0);
    } catch (err) {
        console.error("❌ ERROR:", err.message);
        process.exit(1);
    }
}

fixDatabase();