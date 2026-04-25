/**
 * Parent "More" hub — secondary destinations in a 2-column grid of large tappable cards.
 * Keeps the bottom tab bar to 5 main tabs while preserving access to all parent flows.
 */

import type { ComponentProps } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../src/constants/colors';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { ParentCard } from '../../../src/components/parent/ui/ParentCard';

type MenuItem = {
  href: Href;
  title: string;
  subtitle: string;
  /** Ionicons glyph name (outline set for a consistent premium look). */
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
};

const MORE_ITEMS: MenuItem[] = [
  {
    href: '/(parent)/memory',
    title: 'Memories',
    subtitle: 'Photos, milestones, certificates',
    icon: 'images-outline',
    color: COLORS.parent.primary,
  },
  {
    href: '/(parent)/settings',
    title: 'Settings',
    subtitle: 'Account, family, notifications',
    icon: 'settings-outline',
    color: COLORS.parent.textSecondary,
  },
  {
    href: '/(parent)/community',
    title: 'Community',
    subtitle: 'Connect with other parents',
    icon: 'people-outline',
    color: COLORS.parent.secondary,
  },
  {
    href: '/(parent)/finance',
    title: 'Family finance',
    subtitle: 'Allowance, goals, spending',
    icon: 'wallet-outline',
    color: COLORS.parent.success,
  },
  {
    href: '/(parent)/nutrition',
    title: 'Nutrition',
    subtitle: 'Meals and healthy habits',
    icon: 'restaurant-outline',
    color: COLORS.parent.warning,
  },
  {
    href: '/(parent)/baseline',
    title: 'Baseline',
    subtitle: 'Assessment & growth report',
    icon: 'clipboard-outline',
    color: COLORS.parent.primaryDark,
  },
  {
    href: '/(parent)/paywall',
    title: 'Premium',
    subtitle: 'Subscription & benefits',
    icon: 'diamond-outline',
    color: COLORS.parent.gold,
  },
  {
    href: '/(parent)/settings/add-device',
    title: 'Add device',
    subtitle: "Pair a child's phone or tablet",
    icon: 'phone-portrait-outline',
    color: COLORS.parent.danger,
  },
  {
    href: '/(parent)/settings/appearance',
    title: 'Appearance',
    subtitle: 'Theme & background',
    icon: 'color-palette-outline',
    color: '#EC4899',
  },
  {
    href: '/(parent)/settings/theme-picker',
    title: 'Theme picker',
    subtitle: 'Gradient presets & gallery',
    icon: 'brush-outline',
    color: '#0EA5E9',
  },
];

/** 8-char #RRGGBBAA for translucent colored chips on 7-char design tokens. */
function hexWithAlpha(hex: string, a: string) {
  return hex.length === 7 && hex.startsWith('#') ? `${hex}${a}` : 'rgba(59, 130, 246, 0.12)';
}

export default function ParentMoreScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const padding = Spacing.screenPadding;
  const gap = Spacing.md;
  const colWidth = (width - padding * 2 - gap) / 2;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + insets.bottom, paddingHorizontal: padding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Everything else, one tap away</Text>

        <View style={styles.grid}>
          {MORE_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.cell, { width: colWidth }]}
              onPress={() => router.push(item.href)}
              activeOpacity={0.85}
            >
              <ParentCard style={styles.card}>
                <View style={[styles.iconWrap, { backgroundColor: hexWithAlpha(item.color, '22') }]}>
                  <Ionicons name={item.icon} size={32} color={item.color} />
                </View>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </ParentCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 16,
  },
  title: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.headingLarge,
    color: COLORS.parent.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    color: COLORS.parent.textSecondary,
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  cell: {
    maxWidth: '100%',
  },
  card: {
    minHeight: 132,
    padding: Spacing.base,
    ...Shadow.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  itemTitle: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: Typography.parent.bodyLarge,
    color: COLORS.parent.textPrimary,
  },
  itemSubtitle: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: Typography.parent.caption,
    color: COLORS.parent.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
});
