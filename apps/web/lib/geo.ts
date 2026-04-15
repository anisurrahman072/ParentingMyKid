/**
 * Resolves visitor country for "/" → /bn vs /en.
 *
 * - **Production (Vercel):** `x-vercel-ip-country` is set automatically.
 * - **Localhost:** that header is missing → use `GEO_SIMULATE_COUNTRY` in `apps/web/.env.local`
 *   (e.g. `GEO_SIMULATE_COUNTRY=BD` to test Bangladesh), or in development only send header
 *   `x-dev-geo-country: BD` (ModHeader / similar).
 *
 * `/bn` and `/en` are never rewritten — only `/` uses this.
 */

const ISO2 = /^[A-Z]{2}$/i;

export function resolveCountryCode(input: {
  vercelCountry: string | null;
  simulateEnv: string | undefined;
  devHeader: string | null;
  nodeEnv: string | undefined;
}): string {
  const v = input.vercelCountry?.trim();
  if (v && ISO2.test(v)) {
    return v.toUpperCase();
  }

  const sim = input.simulateEnv?.trim();
  if (sim && ISO2.test(sim)) {
    return sim.toUpperCase();
  }

  if (input.nodeEnv === 'development') {
    const h = input.devHeader?.trim();
    if (h && ISO2.test(h)) {
      return h.toUpperCase();
    }
  }

  return 'XX';
}

export function homeLocalePath(country: string): '/bn' | '/en' {
  return country === 'BD' ? '/bn' : '/en';
}
