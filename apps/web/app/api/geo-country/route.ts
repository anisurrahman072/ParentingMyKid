import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { resolveCountryCode } from '@/lib/geo';

/**
 * Returns the visitor’s ISO 3166-1 alpha-2 country code for client-side defaults
 * (same signals as `/` → /bn vs /en: Vercel geo, GEO_SIMULATE_COUNTRY, x-dev-geo-country in dev).
 */
export function GET(request: NextRequest): NextResponse {
  const country = resolveCountryCode({
    vercelCountry: request.headers.get('x-vercel-ip-country'),
    simulateEnv: process.env.GEO_SIMULATE_COUNTRY,
    devHeader: request.headers.get('x-dev-geo-country'),
    nodeEnv: process.env.NODE_ENV,
  });
  return NextResponse.json({ country });
}
