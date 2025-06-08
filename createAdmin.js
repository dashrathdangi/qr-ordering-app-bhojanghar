import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres.pxyiruxducjidsdcwhkm',
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  database: 'postgres',
  password: 'Dashrath#69',
  port: 6543,
});

const username = 'admin';
const password = 'Dashrath#69';

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO public.admins (username, password)
      VALUES ($1, $2)
      RETURNING id, username
    `;

    const result = await pool.query(query, [username, hashedPassword]);
    console.log('✅ Inserted:', result.rows[0]);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
