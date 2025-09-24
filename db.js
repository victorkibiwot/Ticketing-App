require('dotenv').config();
const { Pool } = require('pg');
require("./logger"); // Require the logger utility to store the logs

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ,
    ssl: { rejectUnauthorized: false } // Required for Neon
});

module.exports = pool; 
