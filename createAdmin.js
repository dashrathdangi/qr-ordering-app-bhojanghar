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

const createAdmin = async () => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = 'INSERT INTO admins (username, password) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [username, hashedPassword]);

    console.log('✅ Admin user created:', result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating admin user:', err);
  } finally {
    await pool.end();
  }
};

createAdmin();
