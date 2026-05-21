import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { setKidModeActive, setOverlayChildId, stopVpn } from '../../../modules/parental-control/src/index';
import { fetchAndPushParentalPolicyForChild } from '../../../src/services/policySync.service';
import { childIdFromGlobalParams, isParentKidHandoffPath } from '../../../src/utils/kidHandoffSession';

export default function ControlCenterLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ childId?: string | string[] }>();
  const childId = childIdFromGlobalParams(params.childId);
  const handoff = isParentKidHandoffPath(pathname, childId);
  const onKidLandingScreen = pathname?.includes('/control-center/kid-mode');

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    if (!handoff || !childId) {
      // Leaving kid mode — write kidModeActive=false then immediately kill the VPN service.
      // Two-step is critical: setKidModeActive(false) writes the SharedPreferences flag AND
      // calls syncVpnAfterParentalPrefsChange (which may race); stopVpn() ensures the service
      // is terminated even if the sync decision is stale for any reason.
      void (async () => {
        try {
          await setKidModeActive(false);
          await stopVpn();
        } catch {
          /* Expo Go / module missing */
        }
      })();
      return;
    }

    // Defer kid-mode activation while identity modal/landing is still shown.
    if (onKidLandingScreen) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        // Step 1: Activate kid mode first so native prefs see kidModeActive=true before ANY
        // setPolicyCache (otherwise Kotlin hard-stops the VPN on policy-only pushes while
        // still "between" modes — fixes kid blocking + VPN icon).
        // Stale cached policy briefly applies until Step 2 — usually already correct from Save.
        if (!cancelled) {
          await setKidModeActive(true);
          await setOverlayChildId(childId);
        }

        // Step 2: Latest server policy — setPolicyCache + VPN sync sees kid mode ON.
        if (!cancelled) await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
      } catch {
        /* native module missing */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handoff, childId, onKidLandingScreen]);

  // Re-sync native policy while handing the device off (delayed stop-internet countdown, server edits, etc.)
  useEffect(() => {
    if (Platform.OS !== 'android' || !handoff || !childId || onKidLandingScreen) return;
    const t = setInterval(() => {
      void fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
    }, 10_000);
    return () => clearInterval(t);
  }, [handoff, childId, onKidLandingScreen]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
