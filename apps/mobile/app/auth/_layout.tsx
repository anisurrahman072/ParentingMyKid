import { Stack } from 'expo-router';

/** File-based routes under app/auth/* register automatically — no explicit Stack.Screen list */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
