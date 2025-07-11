import { Pool } from "pg";
console.log("🔍 DATABASE_URL from .env:", process.env.DATABASE_URL);
console.log("🔍 Effective DATABASE_URL =>", process.env.DATABASE_URL);

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables.");
  process.exit(1);
}

// ✅ Fix special characters like #
const fixedConnectionString = (process.env.DATABASE_URL || "").replace(/#/g, '%23').replace(/^postgresql:\/\//, 'postgres://');
console.log("🌐 Final connection string:", fixedConnectionString);

let pool;

async function getPool() {
  if (pool) {
    return pool;
  }

  console.log("📦 DATABASE_URL =>", process.env.DATABASE_URL);
  pool = new Pool({
    connectionString: fixedConnectionString,
    ssl: {
  rejectUnauthorized: false
},
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

export const query = async (text, params) => {
  const clientPool = await getPool();
  try {
    return await clientPool.query(text, params);
  } catch (err) {
    console.error("❌ Query error:", err);
    throw err;
  }
};
