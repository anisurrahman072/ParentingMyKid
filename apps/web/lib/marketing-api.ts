/**
 * Base URL for the NestJS API (marketing lead + feedback). Set in `.env` as
 * `NEXT_PUBLIC_SERVER_URL` (no trailing slash), e.g. `http://localhost:3001`.
 */
export function getMarketingApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace(/\/$/, '');
}
