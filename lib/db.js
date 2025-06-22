import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables.");
  process.exit(1);
}

let pool;

async function getPool() {
  if (pool) {
    return pool;
  }
 console.log("📦 DATABASE_URL =>", process.env.DATABASE_URL);
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });

  pool.on("connect", () => {
    console.log("✅ Connected to the PostgreSQL database");
  });

  pool.on("error", (err) => {
    console.error("❌ Unexpected error on idle client:", err);
  });

  console.log("🔧 Database configuration loaded.");

  return pool;
}

// Server-side only query helper
export const query = async (text, params) => {
  const clientPool = await getPool();
  try {
    return await clientPool.query(text, params);
  } catch (err) {
    console.error("❌ Query error:", err);
    throw err;
  }
};
