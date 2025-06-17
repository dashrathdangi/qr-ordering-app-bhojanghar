const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Export a query function that uses the pool
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  query,
  pool,
};
