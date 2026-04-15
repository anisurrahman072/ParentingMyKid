/**
 * Tutor stack layout.
 * Scoped tutor portal — read-only view of assigned children's academic progress.
 */

import { Stack } from 'expo-router';
import { COLORS } from '../../src/constants/colors';

export default function TutorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.parent.surface },
        headerTintColor: COLORS.parent.text,
        headerTitleStyle: { fontFamily: 'Inter', fontWeight: '600' },
      }}
    >
      <Stack.Screen name="portal/index" options={{ title: 'Tutor Portal' }} />
      <Stack.Screen name="child/[id]" options={{ title: 'Student Progress' }} />
    </Stack>
  );
}
