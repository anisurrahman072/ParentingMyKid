import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { homeLocalePath, resolveCountryCode } from '@/lib/geo';

export default async function HomePage(): Promise<never> {
  const h = await headers();
  const country = resolveCountryCode({
    vercelCountry: h.get('x-vercel-ip-country'),
    simulateEnv: process.env.GEO_SIMULATE_COUNTRY,
    devHeader: h.get('x-dev-geo-country'),
    nodeEnv: process.env.NODE_ENV,
  });
  redirect(homeLocalePath(country));
}
