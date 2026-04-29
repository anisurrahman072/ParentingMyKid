import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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

const PRESET_DOMAINS = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com'];

function DomainList({
  domains,
  onRemove,
  onAdd,
  placeholder,
  label,
  color,
}: {
  domains: string[];
  onRemove: (d: string) => void;
  onAdd: (d: string) => void;
  placeholder: string;
  label: string;
  color: string;
}) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return;
    if (domains.includes(trimmed)) {
      Alert.alert('Already added', 'This domain is already in the list.');
      return;
    }
    onAdd(trimmed);
    setInput('');
  }

  return (
    <View>
      <View style={[domainStyles.inputRow]}>
        <TextInput
          style={domainStyles.input}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.parent.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[domainStyles.addBtn, { backgroundColor: color }]}
          onPress={handleAdd}
        >
          <Text style={domainStyles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Preset quick-add chips */}
      <View style={domainStyles.presetsRow}>
        {PRESET_DOMAINS.map((d) => (
          !domains.includes(d) && (
            <TouchableOpacity
              key={d}
              style={[domainStyles.presetChip, { borderColor: color }]}
              onPress={() => onAdd(d)}
            >
              <Text style={[domainStyles.presetChipText, { color }]}>+{d}</Text>
            </TouchableOpacity>
          )
        ))}
      </View>

      {/* Domain chips */}
      <View style={domainStyles.chipsWrap}>
        {domains.map((d) => (
          <View key={d} style={[domainStyles.chip, { borderColor: color }]}>
            <Text style={[domainStyles.chipText, { color }]} numberOfLines={1}>{d}</Text>
            <TouchableOpacity onPress={() => onRemove(d)} style={domainStyles.chipRemove}>
              <Text style={[domainStyles.chipRemoveText, { color }]}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {domains.length === 0 && (
          <Text style={domainStyles.emptyText}>No {label.toLowerCase()} yet.</Text>
        )}
      </View>
    </View>
  );
}

const domainStyles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(92,61,46,0.05)',
    borderRadius: 10,
    paddingHorizontal: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
  },
  addBtn: {
    height: 44,
    paddingHorizontal: SPACING[4],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  presetChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
  },
  presetChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    maxWidth: 200,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flexShrink: 1,
  },
  chipRemove: { padding: 2 },
  chipRemoveText: {
    fontSize: 16,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    fontStyle: 'italic',
  },
});

export default function WebsiteBlockerScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stopInternetEnabled, setStopInternetEnabled] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      setStopInternetEnabled(data?.stopInternetEnabled ?? false);
      setAllowedDomains(data?.allowedDomains ?? []);
      setBlockedDomains(data?.blockedDomains ?? []);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!childId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        stopInternetEnabled,
        allowedDomains,
        blockedDomains,
      });
      Alert.alert('Saved', 'Website Blocker settings updated successfully.');
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
            <Text style={styles.headerTitle}>Website Blocker</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Enable toggle */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>🌐 Enable Website Blocking</Text>
                <Text style={styles.toggleDesc}>Filter websites based on lists below</Text>
              </View>
              <Switch
                value={stopInternetEnabled}
                onValueChange={setStopInternetEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {/* Allowed Domains */}
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <Text style={styles.sectionLabel}>ALLOWED DOMAINS (WHITELIST)</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
            <Text style={styles.sectionHint}>Only these sites are accessible when enabled.</Text>
            <DomainList
              label="Allowed domains"
              domains={allowedDomains}
              onRemove={(d) => setAllowedDomains((prev) => prev.filter((x) => x !== d))}
              onAdd={(d) => setAllowedDomains((prev) => [...prev, d])}
              placeholder="e.g. youtube.com"
              color={COLORS.parent.success}
            />
          </Animated.View>

          {/* Blocked Domains */}
          <Animated.View entering={FadeInDown.delay(260).springify()}>
            <Text style={styles.sectionLabel}>BLOCKED DOMAINS (BLACKLIST)</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.card}>
            <Text style={styles.sectionHint}>These sites are always blocked.</Text>
            <DomainList
              label="Blocked domains"
              domains={blockedDomains}
              onRemove={(d) => setBlockedDomains((prev) => prev.filter((x) => x !== d))}
              onAdd={(d) => setBlockedDomains((prev) => [...prev, d])}
              placeholder="e.g. tiktok.com"
              color={COLORS.parent.danger}
            />
          </Animated.View>

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.saveWrap}>
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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: { flex: 1, marginRight: SPACING[4] },
  toggleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  toggleDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING[2],
    marginTop: SPACING[2],
  },
  sectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[3],
    fontStyle: 'italic',
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
