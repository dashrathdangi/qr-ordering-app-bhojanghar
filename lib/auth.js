import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY;

// ✅ Sign JWT token
export function signToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });
}

// ✅ Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    return null;
  }
}

// ✅ Extract raw token string from Authorization header or cookie
export function getToken(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7); // Remove 'Bearer '
  }

  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

// ✅ Extract decoded admin ID (used for route protection)
export function getAdminIdFromRequest(req) {
  const authHeader = req.headers.get('authorization');
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    const cookie = req.cookies.get?.('token')?.value;
    if (cookie) {
      token = cookie;
    }
  }

  if (!token) {
    throw new Error('No valid token found in headers or cookies');
  }

  const decoded = verifyToken(token);

  if (!decoded || !decoded.adminId) {
    throw new Error('Invalid token payload');
  }

  return decoded.adminId;
}
