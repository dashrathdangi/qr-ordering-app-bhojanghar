import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Export a query function that uses the pool
export async function query(text, params) {
  return pool.query(text, params);
}

// Also export pool if you need it elsewhere
export { pool };
