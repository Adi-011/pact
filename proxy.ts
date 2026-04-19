import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/lobby',
  '/pacts',
  '/stakes',
  '/notifications',
  '/profile',
  '/marketplace',
  '/invite',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth — never redirect them
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── Admin route protection ─────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const adminSession = request.cookies.get('admin_session')?.value;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminSession || adminSession !== adminPassword) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ── Auth-protected routes ──────────────────────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtected) {
    const hasSession = Array.from(request.cookies.getAll()).some(
      (c) =>
        c.name.startsWith('sb-') &&
        (c.name.endsWith('-auth-token') || c.name.endsWith('-auth-token.0'))
    );

    if (!hasSession) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - api          (API routes — they handle their own auth)
     *  - _next/static (static files)
     *  - _next/image  (image optimisation)
     *  - favicon.ico
     *  - public folder assets (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
