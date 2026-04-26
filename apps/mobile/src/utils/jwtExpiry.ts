/**
 * Client-side JWT exp check (no secret verification — only used to choose refresh vs. reuse).
 * Access tokens are still validated by the server on each request.
 */

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(
      b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4)),
    );
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

/**
 * @param skewSec — refresh a bit before true expiry to avoid 401s at the boundary
 */
export function isAccessTokenUsable(token: string | null, skewSec = 90): boolean {
  if (!token) return false;
  const p = decodeJwtPayload(token);
  if (p?.exp == null) return true;
  const expMs = p.exp * 1000;
  return Date.now() < expMs - skewSec * 1000;
}
