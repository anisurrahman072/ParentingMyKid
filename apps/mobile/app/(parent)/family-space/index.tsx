/**
 * Family Space — parent hub for “our household” in the app.
 * Premium tiles: solid white, single surface (no grey “frame”), soft shadow.
 */

import type { ComponentProps } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../src/constants/colors';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { colorWithAlpha } from '../../../src/utils/colorAlpha';

type LinkItem = {
  href: Href;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  accent: string;
};

const LINKS: LinkItem[] = [
  {
    href: '/(parent)/add-child',
    title: 'Add a child',
    subtitle: 'New profile & PIN',
    icon: 'person-add-outline',
    accent: COLORS.parent.primary,
  },
  {
    href: '/(parent)/chat',
    title: 'Family chat',
    subtitle: 'One place for your threads',
    icon: 'chatbubbles-outline',
    accent: COLORS.parent.primary,
  },
  {
    href: '/(parent)/memory',
    title: 'Memories',
    subtitle: 'Photos & milestones',
    icon: 'images-outline',
    accent: '#EC4899',
  },
  {
    href: '/(parent)/community',
    title: 'Community',
    subtitle: 'Parents like you',
    icon: 'people-outline',
    accent: COLORS.parent.secondary,
  },
  {
    href: '/(parent)/finance',
    title: 'Family finance',
    subtitle: 'Allowance & goals',
    icon: 'wallet-outline',
    accent: COLORS.parent.success,
  },
  {
    href: '/(parent)/nutrition',
    title: 'Nutrition',
    subtitle: 'Meals & habits',
    icon: 'restaurant-outline',
    accent: COLORS.parent.warning,
  },
  {
    href: '/(parent)/settings',
    title: 'Settings',
    subtitle: 'Account, devices, notifications',
    icon: 'settings-outline',
    accent: COLORS.parent.textSecondary,
  },
  {
    href: '/(parent)/settings/add-device',
    title: 'Pair a device',
    subtitle: "Link a child's phone or tablet",
    icon: 'phone-portrait-outline',
    accent: COLORS.parent.primaryDark,
  },
];

const CARD_RADIUS = 20;

export default function FamilySpaceScreen() {
  const { width } = useWindowDimensions();
  const pad = Spacing.screenPadding;
  const gap = Spacing.md;
  const colW = (width - pad * 2 - gap) / 2;

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
          Family space
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: pad, paddingBottom: 32 }]}
      >
        <Text style={styles.lead}>
          Your family memories, weekly rhythm, meals, and nutrition—in one place.
        </Text>

        <View style={styles.grid}>
          {LINKS.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.tile, { width: colW }]}
              onPress={() => router.push(item.href)}
              activeOpacity={0.92}
            >
              <View style={[styles.iconWrap, { backgroundColor: colorWithAlpha(item.accent, 0.12) }]}>
                <Ionicons name={item.icon} size={24} color={item.accent} />
              </View>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.tileSub} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
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
    letterSpacing: -0.3,
  },
  scroll: { paddingTop: 4 },
  lead: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.parent.textSecondary,
    marginBottom: Spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: CARD_RADIUS,
    borderWidth: 0,
    padding: Spacing.base,
    marginBottom: 0,
    minHeight: 128,
    justifyContent: 'flex-start',
    /* Single surface — no second “inner” color */
    ...Shadow.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  tileTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  tileSub: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.parent.textMuted,
  },
});
