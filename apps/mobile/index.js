/**
 * Metro entry runs before the router bundle. Expo's dev-only `withDevTools()` wraps the root
 * component and calls `useKeepAwake()` immediately; on some Android OEMs the native Activity is not
 * attached yet, so `activateKeepAwakeAsync` rejects with "Unable to activate keep awake" and
 * surfaces as an uncaught promise / LogBox error. Swallow that failure in development only.
 */
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  try {
    const ka = require('expo-keep-awake');
    const orig = ka.activateKeepAwakeAsync;
    if (typeof orig === 'function' && !orig.__pmkPatched) {
      const patched = async (tag) => {
        try {
          await orig(tag);
        } catch {
          /* CurrentActivityNotFound — harmless for dev overlay */
        }
      };
      patched.__pmkPatched = true;
      ka.activateKeepAwakeAsync = patched;
    }
  } catch {
    /* optional dependency resolution edge cases */
  }
}

require('expo-router/entry');
