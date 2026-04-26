/**
 * Add child — create a new child profile for the active family (POST /children).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { ChildProfile } from '@parentingmykid/shared-types';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { Spacing } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { ParentPrimaryButton } from '../../../src/components/parent/ui/ParentPrimaryButton';
import { ParentDateOfBirthPicker } from '../../../src/components/parent/ui/ParentDateOfBirthPicker';

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function AddChildScreen() {
  const queryClient = useQueryClient();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);

  const [name, setName] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [initialPin, setInitialPin] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters.');
      }
      if (!DOB_RE.test(dob.trim())) {
        throw new Error('Date of birth must be YYYY-MM-DD (e.g. 2016-03-15).');
      }
      if (grade.trim().length < 1) {
        throw new Error('Add a grade or level (e.g. Grade 4).');
      }
      if (initialPin.length > 0 && !/^\d{4}$/.test(initialPin)) {
        throw new Error('PIN must be exactly 4 digits, or leave empty to set later.');
      }
      try {
        const { data } = await apiClient.post<ChildProfile>(API_ENDPOINTS.children.base, {
          name: name.trim(),
          dob: dob.trim(),
          grade: grade.trim(),
          school: school.trim() || undefined,
          initialPin: initialPin.length === 4 ? initialPin : undefined,
          familyId: activeFamilyId ?? undefined,
          languagePreference: 'en',
        });
        return data;
      } catch (e) {
        if (isAxiosError(e) && e.response?.data) {
          const raw = (e.response.data as { message?: string | string[] }).message;
          const msg = Array.isArray(raw) ? raw[0] : raw;
          if (msg) throw new Error(String(msg));
        }
        throw e;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-dashboard', activeFamilyId] });
      Alert.alert('Child added', 'You can hand them a device and pair it from Family space or Settings.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: Error) => {
      Alert.alert('Could not add child', e?.message ?? 'Please try again.');
    },
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.parent.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          New child
        </Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>
            Create a profile for your child. They’ll use a PIN to open the kid app on their device.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="First name or full name"
              placeholderTextColor={COLORS.parent.textMuted}
              style={styles.input}
              autoCapitalize="words"
            />
          </View>

          <ParentDateOfBirthPicker value={dob} onChange={setDob} />

          <View style={styles.field}>
            <Text style={styles.label}>Grade / level</Text>
            <TextInput
              value={grade}
              onChangeText={setGrade}
              placeholder="e.g. Grade 4, Year 2"
              placeholderTextColor={COLORS.parent.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>School (optional)</Text>
            <TextInput
              value={school}
              onChangeText={setSchool}
              placeholder="School name"
              placeholderTextColor={COLORS.parent.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>4-digit PIN (optional)</Text>
            <TextInput
              value={initialPin}
              onChangeText={(t) => setInitialPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="Set now or later"
              placeholderTextColor={COLORS.parent.textMuted}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </View>

          {createMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.parent.primary} style={styles.spinner} />
          ) : (
            <ParentPrimaryButton
              label="Create child"
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.fonts.interBold,
    fontSize: 18,
    color: COLORS.parent.textPrimary,
  },
  scroll: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 40 },
  lead: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.parent.textSecondary,
    marginBottom: Spacing.lg,
  },
  field: { marginBottom: Spacing.md },
  label: {
    fontFamily: Typography.fonts.interMedium,
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    marginBottom: 6,
  },
  input: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 16,
    color: COLORS.parent.textPrimary,
    backgroundColor: COLORS.parent.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  spinner: { marginVertical: Spacing.lg },
});
