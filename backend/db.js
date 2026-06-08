const { Pool } = require('pg');
// 1. Force Node to read the .env file immediately
require('dotenv').config(); 

// 2. A diagnostic check to ensure the URL isn't "undefined"
console.log("Database URL Status:", process.env.DATABASE_URL ? "Loaded successfully ✅" : "MISSING ❌");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render's external connections
  }
});

// 3. Catch idle connection drops gracefully
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;