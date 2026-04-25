import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { useFamilyStore } from '../../store/family.store';
import { CHILD_ID_KEY } from '../../store/deviceSession.store';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';

export function DeviceContextBanner() {
  const [childId, setChildId] = useState<string | null>(null);
  const { dashboard } = useFamilyStore();

  useEffect(() => {
    SecureStore.getItemAsync(CHILD_ID_KEY).then(setChildId);
  }, []);

  if (!childId) return null;

  const child = dashboard?.children?.find((c) => c.childId === childId);
  const childName = child?.name ?? 'your child';
  const deviceName = Device.deviceName ?? Device.modelName ?? 'this device';

  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={2}>
        On {childName}&apos;s device — {deviceName} ({Platform.OS})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.35)',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
  },
  text: {
    color: COLORS.parent.primary,
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    textAlign: 'center',
  },
});
