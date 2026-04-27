/**
 * Stack so “Switch family” is pushed on top of Family space.
 * With only Tabs (no stack), `router.back()` from switch-family was popping to the wrong route (e.g. Home).
 */

import { Stack } from 'expo-router';

export default function FamilySpaceStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
