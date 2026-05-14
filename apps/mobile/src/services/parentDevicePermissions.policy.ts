/**
 * Detect whether server-side parental rules expect native/device enforcement on this phone.
 * Used to prioritize permission UX when the parent reinstalls or clears app data.
 */
export function policyHasEnforcementRulesConfigured(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  const blockedApps = Array.isArray(r.blockedApps) ? r.blockedApps.length : 0;
  const blockedSites = Array.isArray(r.blockedWebsites) ? r.blockedWebsites.length : 0;
  const blockedDomains = Array.isArray(r.blockedDomains) ? r.blockedDomains.length : 0;
  const allowedDomains = Array.isArray(r.allowedDomains) ? r.allowedDomains.length : 0;
  return (
    blockedApps > 0 ||
    r.blockAllAppsEnabled === true ||
    r.appGuardEnabled === true ||
    r.stopInternetEnabled === true ||
    r.websiteFilteringEnabled === true ||
    blockedSites > 0 ||
    blockedDomains > 0 ||
    allowedDomains > 0 ||
    r.silentCameraEnabled === true
  );
}
