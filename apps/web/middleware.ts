import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { homeLocalePath, resolveCountryCode } from './lib/geo';

/**
 * Sets document language for `<html lang>` in the root layout (hreflang + accessibility).
 * Must be forwarded on the request so Server Components can read it via `headers()`.
 */
function documentLangForPathname(pathname: string): string {
  if (pathname === '/bn' || pathname.startsWith('/bn/')) {
    return 'bn';
  }
  return 'en';
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    const country = resolveCountryCode({
      vercelCountry: request.headers.get('x-vercel-ip-country'),
      simulateEnv: process.env.GEO_SIMULATE_COUNTRY,
      devHeader: request.headers.get('x-dev-geo-country'),
      nodeEnv: process.env.NODE_ENV,
    });
    const target = homeLocalePath(country);
    return NextResponse.redirect(new URL(target, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-document-lang', documentLangForPathname(pathname));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except Next internals, API routes, well-known metadata files,
     * and paths that look like static files (last segment contains a dot).
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|[^/]+\\.[^/]+$).*)',
    '/',
  ],
};
