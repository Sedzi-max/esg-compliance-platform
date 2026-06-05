const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    // This tells pg to use the single URL string we pasted into Render
    connectionString: process.env.DB_URL,
    // Note: If you ever switch back to the external Render URL, 
    // uncomment the ssl configuration below:
    // ssl: {
    //     rejectUnauthorized: false
    // }
});

module.exports = pool;