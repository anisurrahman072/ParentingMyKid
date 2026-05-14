/**
 * Parent-device “kid handoff”: parent stays logged in as PARENT but UI is in Kid Mode / category content.
 * Native Accessibility enforcement keys off this + mirrored child policy.
 */
export function childIdFromGlobalParams(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  const v = Array.isArray(raw) ? raw[0] : raw;
  const t = typeof v === 'string' ? v.trim() : '';
  return t.length > 0 ? t : undefined;
}

export function isParentKidHandoffPath(pathname: string | null | undefined, childId?: string | null): boolean {
  if (!pathname) return false;
  if (pathname.includes('/control-center/kid-mode')) return true;
  if (pathname.includes('/control-center/category/') && !!childId?.trim()) return true;
  return false;
}
