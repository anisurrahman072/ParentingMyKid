import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

type VideoSettings = {
  ageGroup: 'TODDLER' | 'CHILD' | 'TEEN' | 'ALL';
  music: 'NONE' | 'NASHEEDS_ONLY' | 'ALL';
  language: 'EN' | 'BN' | 'AR' | 'ALL';
  contentType: 'STRICT_HALAL' | 'GENERAL_ISLAMIC' | 'NORMAL';
  genderFilter: 'BOYS' | 'GIRLS' | 'BOTH';
  theme: 'EDUCATIONAL' | 'ENTERTAINMENT' | 'BOTH';
};

const PICKER_OPTIONS: Record<keyof VideoSettings, { label: string; value: string }[]> = {
  ageGroup: [
    { label: 'Toddler (0–4)', value: 'TODDLER' },
    { label: 'Child (5–11)', value: 'CHILD' },
    { label: 'Teen (12+)', value: 'TEEN' },
    { label: 'All Ages', value: 'ALL' },
  ],
  music: [
    { label: 'No Music', value: 'NONE' },
    { label: 'Nasheeds Only', value: 'NASHEEDS_ONLY' },
    { label: 'All Music', value: 'ALL' },
  ],
  language: [
    { label: 'English', value: 'EN' },
    { label: 'Bengali', value: 'BN' },
    { label: 'Arabic', value: 'AR' },
    { label: 'All Languages', value: 'ALL' },
  ],
  contentType: [
    { label: 'Strict Halal', value: 'STRICT_HALAL' },
    { label: 'General Islamic', value: 'GENERAL_ISLAMIC' },
    { label: 'Normal', value: 'NORMAL' },
  ],
  genderFilter: [
    { label: 'Boys', value: 'BOYS' },
    { label: 'Girls', value: 'GIRLS' },
    { label: 'Both', value: 'BOTH' },
  ],
  theme: [
    { label: 'Educational', value: 'EDUCATIONAL' },
    { label: 'Entertainment', value: 'ENTERTAINMENT' },
    { label: 'Both', value: 'BOTH' },
  ],
};

const PICKER_LABELS: Record<keyof VideoSettings, string> = {
  ageGroup: 'Age Group',
  music: 'Music',
  language: 'Language',
  contentType: 'Content Type',
  genderFilter: 'Gender Filter',
  theme: 'Theme',
};

function PickerRow<K extends keyof VideoSettings>({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: K;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = PICKER_OPTIONS[field];
  return (
    <View style={pickerStyles.row}>
      <Text style={pickerStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pickerStyles.options}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              pickerStyles.option,
              value === opt.value && pickerStyles.optionActive,
            ]}
            onPress={() => onChange(opt.value)}
          >
            <Text
              style={[
                pickerStyles.optionText,
                value === opt.value && pickerStyles.optionTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: {
    marginBottom: SPACING[4],
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginBottom: SPACING[2],
  },
  options: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  option: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(92,61,46,0.15)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  optionActive: {
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  optionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
  },
  optionTextActive: {
    color: COLORS.parent.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});

const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  ageGroup: 'CHILD',
  music: 'NASHEEDS_ONLY',
  language: 'EN',
  contentType: 'GENERAL_ISLAMIC',
  genderFilter: 'BOTH',
  theme: 'BOTH',
};

export default function VideoManagerScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      if (data?.videoSettings) {
        setVideoSettings({ ...DEFAULT_VIDEO_SETTINGS, ...data.videoSettings });
      }
      setCustomUrls(data?.videoSettings?.customUrls ?? []);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(key: keyof VideoSettings, value: string) {
    setVideoSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleAddUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube URL starting with http.');
      return;
    }
    if (customUrls.includes(trimmed)) {
      Alert.alert('Already added', 'This URL is already in the list.');
      return;
    }
    setCustomUrls((prev) => [...prev, trimmed]);
    setUrlInput('');
  }

  async function handleSave() {
    if (!childId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        videoSettings: { ...videoSettings, customUrls },
      });
      Alert.alert('Saved', 'Video Manager settings updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ActivityIndicator size="large" color={COLORS.parent.primary} style={{ flex: 1 }} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Video Manager</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Video Filters */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text style={styles.sectionLabel}>VIDEO FILTERS</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.card}>
            {(Object.keys(PICKER_LABELS) as (keyof VideoSettings)[]).map((field) => (
              <PickerRow
                key={field}
                label={PICKER_LABELS[field]}
                field={field}
                value={videoSettings[field]}
                onChange={(v) => updateField(field, v)}
              />
            ))}
          </Animated.View>

          {/* Custom YouTube URLs */}
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <Text style={styles.sectionLabel}>CUSTOM YOUTUBE URLS</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.card}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.urlInput}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={COLORS.parent.textMuted}
                autoCapitalize="none"
                keyboardType="url"
                onSubmitEditing={handleAddUrl}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddUrl}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {customUrls.length === 0 ? (
              <Text style={styles.emptyText}>No custom URLs added yet.</Text>
            ) : (
              customUrls.map((url, i) => (
                <View key={i} style={styles.urlRow}>
                  <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setCustomUrls((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Text style={styles.removeIcon}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </Animated.View>

          {/* Parent Content */}
          <Animated.View entering={FadeInDown.delay(320).springify()}>
            <Text style={styles.sectionLabel}>PARENT CONTENT</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.card}>
            <Text style={styles.parentContentDesc}>
              Create a personal message or video for your child to see inside the app.
            </Text>
            <TouchableOpacity
              style={styles.parentContentButton}
              onPress={() => router.push(`/(parent)/control-center/parent-content?childId=${childId}`)}
            >
              <Text style={styles.parentContentButtonText}>
                💌 Create Message for {kid?.name ?? 'Your Child'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(420).springify()} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  backIcon: {
    fontSize: 26,
    color: COLORS.parent.textPrimary,
    lineHeight: 30,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  headerRight: { width: 40 },

  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[2] },

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING[2],
    marginTop: SPACING[2],
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  inputRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  urlInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(92,61,46,0.05)',
    borderRadius: 10,
    paddingHorizontal: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
  },
  addBtn: {
    height: 44,
    paddingHorizontal: SPACING[4],
    borderRadius: 10,
    backgroundColor: COLORS.parent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING[3],
    fontStyle: 'italic',
  },

  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
    gap: SPACING[2],
  },
  urlText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textPrimary,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: 18,
    color: COLORS.parent.danger,
    lineHeight: 22,
  },

  parentContentDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING[3],
  },
  parentContentButton: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    alignItems: 'center',
  },
  parentContentButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
  },

  saveWrap: { marginTop: SPACING[2] },
  saveButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.parent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
