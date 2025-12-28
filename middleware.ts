import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Paths that require authentication
const protectedPaths = ['/', '/dashboard', '/admin'];

// Paths that should redirect if already logged in
const authPaths = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path requires protection
  const isProtectedPath = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );

  const isAuthPath = authPaths.some(path => pathname.startsWith(path));

  // Get token from cookies
  const token = request.cookies.get('token')?.value;

  // Verify token
  let session = null;
  if (token) {
    session = await verifyToken(token);
  }

  // If accessing protected path without valid session, redirect to login
  if (isProtectedPath && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If accessing auth path (like /login) with valid session, redirect to main page
  if (isAuthPath && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
