require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const createMappings = async () => {
    try {
        console.log("Connecting to Render Cloud Database...");
        
        // 1. Create the table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS Framework_Mappings (
                mapping_id SERIAL PRIMARY KEY,
                framework_name VARCHAR(50) NOT NULL,
                framework_code VARCHAR(50) NOT NULL,
                activity_type VARCHAR(100) NOT NULL,
                description TEXT
            );
        `);

        // 2. Inject the GRI rules
        await pool.query(`
            INSERT INTO Framework_Mappings (framework_name, framework_code, activity_type, description) VALUES
            ('GRI', '302-1', 'electricity_grid_kwh', 'Energy consumption within the organization'),
            ('GRI', '305-1', 'mobile_diesel_liters', 'Direct (Scope 1) GHG emissions'),
            ('GRI', '305-1', 'mobile_petrol_liters', 'Direct (Scope 1) GHG emissions'),
            ('GRI', '305-1', 'stationary_natural_gas_therms', 'Direct (Scope 1) GHG emissions'),
            ('GRI', '305-2', 'electricity_grid_kwh', 'Energy indirect (Scope 2) GHG emissions'),
            ('GRI', '305-3', 'travel_flight_short_haul_km', 'Other indirect (Scope 3) GHG emissions'),
            ('GRI', '306-3', 'waste_landfill_kg', 'Waste generated');
        `);
        
        console.log("✅ Rosetta Stone successfully injected into Render Cloud!");
        process.exit();
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
};

createMappings();