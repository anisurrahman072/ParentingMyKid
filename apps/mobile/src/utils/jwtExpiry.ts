/**
 * Client-side JWT exp check (no secret verification — only used to choose refresh vs. reuse).
 * Access tokens are still validated by the server on each request.
 */

import type { UserProfile } from '@parentingmykid/shared-types';
import { UserRole } from '@parentingmykid/shared-types';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(
      b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4)),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Minimal profile from access JWT when /auth/me cannot be reached (offline / flaky network).
 * Not verified — same trust as any client-held token.
 */
export function decodeAccessTokenProfile(token: string | null): UserProfile | null {
  if (!token) return null;
  const p = decodeJwtPayload(token);
  if (!p || typeof p.sub !== 'string' || typeof p.email !== 'string' || p.role === undefined) {
    return null;
  }
  const iatSec = typeof p.iat === 'number' ? p.iat : Math.floor(Date.now() / 1000);
  return {
    id: p.sub,
    email: p.email,
    name: typeof p.name === 'string' ? p.name : p.email.split('@')[0] || 'Parent',
    role: p.role as UserRole,
    createdAt: new Date(iatSec * 1000).toISOString(),
    familyIds: Array.isArray(p.familyIds) ? (p.familyIds as string[]) : [],
  };
}

/**
 * @param skewSec — refresh a bit before true expiry to avoid 401s at the boundary
 */
export function isAccessTokenUsable(token: string | null, skewSec = 90): boolean {
  if (!token) return false;
  const p = decodeJwtPayload(token);
  const exp = p?.exp;
  if (typeof exp !== 'number') return true;
  const expMs = exp * 1000;
  return Date.now() < expMs - skewSec * 1000;
}
