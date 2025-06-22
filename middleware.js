import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SECRET_KEY || 'fallback-secret'
);

export const config = {
  matcher: ['/admin/:path*', '/api/socket'],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/socket')) {
    console.log('🧪 Skipping middleware for /api/socket (WebSocket)');
    return NextResponse.next();
  }

  // also allow static + login + websocket upgrades
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/notification.wav')
  ) {
    return NextResponse.next();
  }

  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    console.log('🟢 WebSocket upgrade request - bypassing auth middleware');
    return NextResponse.next();
  }

  console.log('🔐 Middleware running for:', pathname);

  const tokenCookie = req.cookies.get('token');
  const outletCookie = req.cookies.get('selectedOutlet');

  if (!tokenCookie) {
    console.warn('🔒 No token cookie found — redirecting to /admin/login');
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(tokenCookie.value, SECRET_KEY);
    console.log('✅ Token verified for:', payload?.username || 'unknown');
    return NextResponse.next();
  } catch (err) {
    console.error('❌ Invalid token —', err.message);
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}
