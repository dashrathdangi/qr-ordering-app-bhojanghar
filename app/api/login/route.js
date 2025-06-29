import { query } from '@/lib/db';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    console.log('🔐 Login attempt for user:', username);

    const result = await query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const admin = result.rows[0];

    if (!admin.password) {
      throw new Error('Admin password is missing in DB');
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = signToken({
      adminId: admin.id,
      username: admin.username,
      timestamp: Date.now(),
    });

    const maxAgeSeconds = 7 * 24 * 60 * 60; // 7 days

    // ✅ Manual cookie string
    const cookie = [
      `token=${token}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${maxAgeSeconds}`,
      'SameSite=None',
      'Secure',
      'Domain=.stonezon.com',
    ]
      .filter(Boolean)
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
   console.log("🍪 Set-Cookie string:", cookie);
    console.log('✅ Token issued and cookie set for user:', username);
    return response;
  } catch (err) {
    console.error('❌ Login error:', err.message, err.stack);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
