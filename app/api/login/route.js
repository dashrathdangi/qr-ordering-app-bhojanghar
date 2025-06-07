import { query } from '@/lib/server/db'
;
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    console.log('🔐 Login attempt for user:', username);

    const result = await query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid username or password' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid username or password' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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

    // Build cookie string
    const cookie = [
      `token=${token}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${maxAgeSeconds}`,
      'SameSite=Lax',
      isProd ? 'Secure' : '',
    ]
      .filter(Boolean) // remove empty strings
      .join('; ');

    const response = new Response(
      JSON.stringify({ message: 'Login successful' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie,
        },
      }
    );

    console.log('✅ Token issued and cookie set for user:', username);
    return response;
  } catch (err) {
    console.error('❌ Login error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
