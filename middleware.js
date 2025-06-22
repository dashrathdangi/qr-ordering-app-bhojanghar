import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SECRET_KEY || 'fallback-secret'
);

export const config = {
  matcher: ['/admin/:path*'], // ✅ only match protected admin pages
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // ✅ Skip for static files and login
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/notification.wav')
  ) {
    return NextResponse.next();
  }

  // ✅ Skip auth check if it's a WebSocket upgrade
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    console.log('🟢 WebSocket upgrade request — bypassing middleware');
    return NextResponse.next();
  }

  console.log('🔐 Middleware running for:', pathname);

  const tokenCookie = req.cookies.get('token');
  if (!tokenCookie) {
    console.warn('🔒 No token cookie — redirecting to /admin/login');
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(tokenCookie.value, SECRET_KEY);
    console.log('✅ Token OK for:', payload?.username || payload?.sub || 'unknown');
    return NextResponse.next();
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}
