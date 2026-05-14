import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  AppState,
  InteractionManager,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { SPACING } from '../../../constants/spacing';
import { getInstalledApps } from '../../../services/ParentalControl';

export type InstalledAppRow = {
  packageName: string;
  appName: string;
  category: string;
  iconBase64?: string;
};

const GRADIENT_SPINNER = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#22C55E'] as const;

function CategoryExpandSpinner() {
  return (
    <View style={styles.catLoadingInner} accessibilityRole="progressbar" accessibilityLabel="Loading apps">
      <LinearGradient colors={[...GRADIENT_SPINNER]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catLoadingRing}>
        <View style={styles.catLoadingInnerCircle}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      </LinearGradient>
      <Text style={styles.catLoadingLabel}>Loading apps…</Text>
    </View>
  );
}

const CATEGORY_ICON: Record<string, string> = {
  Games: '🎮',
  'Audio & Music': '🎵',
  Video: '🎬',
  'Images & Photos': '🖼️',
  News: '📰',
  Productivity: '📋',
  Social: '👥',
  'Maps & Navigation': '🗺️',
  Other: '⋯',
};

function sortCategories(keys: string[]): string[] {
  const rest = keys.filter((k) => k !== 'Other').sort((a, b) => a.localeCompare(b));
  if (keys.includes('Other')) rest.push('Other');
  return rest;
}

function groupAndSort(apps: InstalledAppRow[]): { category: string; apps: InstalledAppRow[] }[] {
  const map = new Map<string, InstalledAppRow[]>();
  for (const a of apps) {
    const c = a.category?.trim() || 'Other';
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(a);
  }
  for (const list of map.values()) {
    list.sort((x, y) => x.appName.localeCompare(y.appName));
  }
  return sortCategories([...map.keys()]).map((category) => ({
    category,
    apps: map.get(category)!,
  }));
}

type Props = {
  visible: boolean;
  onClose: () => void;
  blockedPackages: string[];
  onApply: (packages: string[]) => void;
  /** When the native list is empty, parent can open manual package entry. */
  onRequestManualEntry?: () => void;
};

export function SelectAppsToBlockModal({
  visible,
  onClose,
  blockedPackages,
  onApply,
  onRequestManualEntry,
}: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<InstalledAppRow[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const expandedRef = useRef<Record<string, boolean>>({});
  const [categoryLoading, setCategoryLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set(blockedPackages));
    setSearch('');
    setExpanded({});
    expandedRef.current = {};
    setCategoryLoading(null);
  }, [visible, blockedPackages]);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getInstalledApps();
      const normalized: InstalledAppRow[] = (Array.isArray(list) ? list : []).map((item: InstalledAppRow) => ({
        packageName: item.packageName,
        appName: item.appName || item.packageName,
        category: item.category || 'Other',
        iconBase64: typeof item.iconBase64 === 'string' && item.iconBase64.length > 0 ? item.iconBase64 : undefined,
      }));
      setApps(normalized);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadApps();
  }, [visible, loadApps]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && visible) void loadApps();
    });
    return () => sub.remove();
  }, [visible, loadApps]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.appName.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q),
    );
  }, [apps, search]);

  const sections = useMemo(() => groupAndSort(filtered), [filtered]);

  function toggleExpanded(cat: string) {
    const prev = expandedRef.current;
    const wasOpen = prev[cat] === true;
    const next = { ...prev, [cat]: !wasOpen };
    expandedRef.current = next;
    setExpanded(next);

    if (!wasOpen) {
      setCategoryLoading(cat);
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          setCategoryLoading((c) => (c === cat ? null : c));
        }, 520);
      });
    } else {
      setCategoryLoading((c) => (c === cat ? null : c));
    }
  }

  function togglePackage(pkg: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  }

  function toggleCategoryApps(catApps: InstalledAppRow[], selectAll: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const a of catApps) {
        if (selectAll) next.add(a.packageName);
        else next.delete(a.packageName);
      }
      return next;
    });
  }

  function handleSave() {
    onApply([...selected]);
    onClose();
  }

  const catEmoji = (c: string) => CATEGORY_ICON[c] ?? '📱';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top + SPACING[2], paddingBottom: insets.bottom }]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerIconBtn}>
              <Text style={styles.closeGlyph}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select apps</Text>
            <TouchableOpacity onPress={handleSave} hitSlop={12} style={styles.saveHeaderBtn}>
              <Text style={styles.saveHeaderBtnText}>SAVE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps..."
              placeholderTextColor={COLORS.parent.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <LinearGradient
                colors={[...GRADIENT_SPINNER]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.initialLoadingRing}
              >
                <View style={styles.initialLoadingInner}>
                  <ActivityIndicator size="large" color="#2563EB" />
                </View>
              </LinearGradient>
              <Text style={styles.loadingText}>Loading applications…</Text>
            </View>
          ) : apps.length === 0 ? (
            <View style={styles.loadingBox}>
              <Text style={styles.emptyTitle}>No apps found</Text>
              <Text style={styles.emptyDesc}>
                Rebuild a dev client with the parental-control native module, or add a package name manually from the previous screen.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void loadApps()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
              {onRequestManualEntry ? (
                <TouchableOpacity
                  style={styles.manualLink}
                  onPress={() => {
                    onClose();
                    onRequestManualEntry();
                  }}
                >
                  <Text style={styles.manualLinkText}>Enter package name manually</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {sections.map(({ category, apps: catApps }) => {
                const allSel = catApps.every((a) => selected.has(a.packageName));
                const expandedCat = expanded[category] === true;

                return (
                  <View key={category} style={styles.section}>
                    <View style={styles.catRow}>
                      <TouchableOpacity
                        style={styles.radioOuter}
                        onPress={() => toggleCategoryApps(catApps, !allSel)}
                        hitSlop={6}
                      >
                        <View style={[styles.radioInner, allSel && styles.radioInnerFilled]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.catMain}
                        onPress={() => toggleExpanded(category)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.catEmoji}>{catEmoji(category)}</Text>
                        <Text style={styles.catName}>{category}</Text>
                        <Text style={styles.chevron}>{expandedCat ? '▼' : '▶'}</Text>
                      </TouchableOpacity>
                    </View>

                    {expandedCat ? (
                      categoryLoading === category ? (
                        <CategoryExpandSpinner />
                      ) : (
                        catApps.map((a) => {
                          const on = selected.has(a.packageName);
                          const iconUri =
                            a.iconBase64 && a.iconBase64.length > 0
                              ? `data:image/png;base64,${a.iconBase64}`
                              : null;
                          return (
                            <TouchableOpacity
                              key={a.packageName}
                              style={styles.appRow}
                              onPress={() => togglePackage(a.packageName)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.radioOuterSmall}>
                                <View style={[styles.radioInnerSmall, on && styles.radioInnerFilled]} />
                              </View>
                              {iconUri ? (
                                <Image source={{ uri: iconUri }} style={styles.appIcon} resizeMode="cover" />
                              ) : (
                                <View style={[styles.appIcon, styles.appIconPlaceholder]}>
                                  <Text style={styles.appIconPlaceholderGlyph}>📱</Text>
                                </View>
                              )}
                              <View style={styles.appTextCol}>
                                <Text style={styles.appName} numberOfLines={1}>
                                  {a.appName}
                                </Text>
                                <Text style={styles.pkgName} numberOfLines={1}>
                                  {a.packageName}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )
                    ) : null}
                  </View>
                );
              })}
              <View style={{ height: SPACING[6] }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 36, 32, 0.35)',
    justifyContent: 'flex-end',
  },
  card: {
    flex: 1,
    maxHeight: '92%',
    backgroundColor: COLORS.parent.surfaceSolid,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(91, 61, 46, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
  },
  headerIconBtn: { width: 40, alignItems: 'flex-start' },
  closeGlyph: {
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: COLORS.parent.textPrimary,
  },
  saveHeaderBtn: {
    minWidth: 56,
    alignItems: 'flex-end',
    backgroundColor: '#EA580C',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 10,
  },
  saveHeaderBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
    marginBottom: SPACING[2],
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderRadius: 12,
    paddingHorizontal: SPACING[3],
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    color: COLORS.parent.textMuted,
    marginRight: SPACING[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    paddingVertical: 0,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING[8],
    paddingVertical: SPACING[10],
  },
  loadingText: {
    marginTop: SPACING[4],
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textSecondary,
  },
  initialLoadingRing: {
    padding: 4,
    borderRadius: 999,
  },
  initialLoadingInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.parent.surfaceSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: SPACING[5],
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: 12,
    backgroundColor: COLORS.parent.primary,
  },
  retryBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  manualLink: { marginTop: SPACING[4], paddingVertical: SPACING[2] },
  manualLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
  },
  list: { flex: 1, paddingHorizontal: SPACING[4] },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.06)',
    paddingVertical: SPACING[2],
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(92,61,46,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[2],
  },
  radioOuterSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(92,61,46,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
    marginLeft: SPACING[1],
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  radioInnerSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  radioInnerFilled: {
    backgroundColor: COLORS.parent.primary,
  },
  catMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },
  catEmoji: { fontSize: 22, marginRight: SPACING[3] },
  catName: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
  },
  chevron: {
    fontSize: 11,
    color: COLORS.parent.textMuted,
    marginRight: SPACING[1],
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    paddingLeft: SPACING[2],
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: SPACING[3],
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.08)',
  },
  appIconPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconPlaceholderGlyph: {
    fontSize: 22,
  },
  catLoadingInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[6],
    paddingHorizontal: SPACING[4],
    minHeight: 120,
  },
  catLoadingRing: {
    padding: 3,
    borderRadius: 999,
    marginBottom: SPACING[3],
  },
  catLoadingInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.parent.surfaceSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLoadingLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
  },
  appTextCol: { flex: 1 },
  appName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
  },
  pkgName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
});
