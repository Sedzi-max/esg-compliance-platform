const pool = require('./db');

async function upgradeSchema() {
    try {
        console.log("Connecting to Render database...");
        
        // Add the missing columns safely (IF NOT EXISTS prevents errors if you run it twice)
        await pool.query(`
            ALTER TABLE ESG_Observation ADD COLUMN IF NOT EXISTS pillar VARCHAR(10);
            ALTER TABLE ESG_Observation ADD COLUMN IF NOT EXISTS metric_name VARCHAR(255);
            ALTER TABLE ESG_Observation ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);
        `);

        console.log("✅ Database Schema Upgraded Successfully!");
        console.log("The 'pillar', 'metric_name', and 'unit_of_measure' columns are now ready.");
    } catch (err) {
        console.error("❌ Upgrade Failed:", err.message);
    } finally {
        // Close the connection so the script finishes cleanly
        pool.end();
    }
}

upgradeSchema();