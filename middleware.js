import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SECRET_KEY || 'fallback-secret'
);

// ✅ Match only page routes
export const config = {
  matcher: [
    '/admin((?!.*\\.(js|json|png|jpg|jpeg|gif|ico|svg|webp|wav|php)).*)',
  ],
};

export async function middleware(req) {
  const pathname = req.nextUrl.pathname;

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // ✅ This will catch WebSocket upgrades and bypass auth
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    console.log('🟢 WebSocket upgrade — skipping auth');
    return NextResponse.next();
  }

  console.log('🔐 Middleware running for:', pathname);

  const tokenCookie = req.cookies.get('token');
  if (!tokenCookie) {
    console.warn('🔒 No token cookie — redirecting to login');
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(tokenCookie.value, SECRET_KEY);
    console.log('✅ Token OK for:', payload?.username || 'unknown');
    return NextResponse.next();
  } catch (err) {
    console.error('❌ Token invalid:', err.message);
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}
