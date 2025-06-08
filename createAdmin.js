import bcrypt from 'bcrypt';
import { Pool } from 'pg'; // ✅ Fix: make sure this line is included

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'qr_ordering_system',
  password: 'Dashrath#69',
  port: 5432,
});

const username = 'admin';
const password = 'Dashrath#69';

const hashPassword = async () => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const query = 'INSERT INTO admins (username, password) VALUES ($1, $2)';
    await pool.query(query, [username, hashedPassword]);
    console.log('✅ Admin user created successfully!');
  } catch (err) {
    console.error('❌ Error hashing password:', err);
  } finally {
    pool.end();
  }
};

hashPassword();
