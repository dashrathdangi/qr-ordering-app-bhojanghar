import { query } from '@/lib/server/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    console.log('🔐 Login attempt for user:', username);

    const result = await query('SELECT * FROM admins WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const admin = result.rows[0];

    if (!admin.password) {
      throw new Error('Admin password is missing in DB');
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        timestamp: Date.now(),
      },
      process.env.SECRET_KEY,
      { expiresIn: '7d' }
    );

    const maxAgeSeconds = 7 * 24 * 60 * 60; // 7 days
    const isProd = process.env.NODE_ENV === 'production';

    const cookie = [
      `token=${token}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${maxAgeSeconds}`,
      'SameSite=Lax',
      isProd ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    console.log('✅ Token issued and cookie set for user:', username);

    return new Response(JSON.stringify({ message: 'Login successful' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
