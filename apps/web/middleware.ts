import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { homeLocalePath, resolveCountryCode } from './lib/geo';

export function middleware(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === '/') {
    const country = resolveCountryCode({
      vercelCountry: request.headers.get('x-vercel-ip-country'),
      simulateEnv: process.env.GEO_SIMULATE_COUNTRY,
      devHeader: request.headers.get('x-dev-geo-country'),
      nodeEnv: process.env.NODE_ENV,
    });
    const target = homeLocalePath(country);
    return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
