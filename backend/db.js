const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DB_URL,
    // This setup works for local testing and cloud production
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : { rejectUnauthorized: false }
});

module.exports = pool;