import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SECRET_KEY || 'fallback-secret'
);

export const config = {
  matcher: ['/admin/:path*'],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/notification.wav') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/api/socket')
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

  if (outletCookie) {
    console.log(`🏪 selectedOutlet cookie: ${outletCookie.value}`);
  } else {
    console.log('⚠️ No selectedOutlet cookie found');
  }

  if (!tokenCookie) {
    console.warn('🔒 No token cookie found — redirecting to /admin/login');
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(tokenCookie.value, SECRET_KEY);
    console.log('✅ Token verified for:', payload?.username || payload?.sub || 'unknown');
    return NextResponse.next();
  } catch (err) {
    console.error('❌ Invalid or expired token —', err.message);
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}
