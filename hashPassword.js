import bcrypt from 'bcrypt';
import { query } from '@/lib/server/db';
 } from 'pg'; // PostgreSQL client

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'qr_ordering_system',
  password: 'Dashrath#69', // You can change this to any password
  port: 5432,
});

const username = 'admin'; // The username for the admin
const password = 'Dashrath#69'; // Your plain text password

// Hashing the password
const hashPassword = async () => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert hashed password into the database
    const query = 'INSERT INTO admins (username, password) VALUES ($1, $2)';
    await pool.query(query, [username, hashedPassword]);
    console.log('Admin user created successfully!');
  } catch (err) {
    console.error('Error hashing password:', err);
  } finally {
    pool.end();
  }
};

hashPassword();
