/**
 * Root path `/` — must exist so the deep link `parentingmykid:///` matches a route.
 * RootLayout in _layout.tsx performs router.replace to /auth or the role home; no UI here.
 */
export default function Index() {
  return null;
}
