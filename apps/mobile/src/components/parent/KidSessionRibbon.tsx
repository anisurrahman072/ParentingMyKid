import { View, Text, StyleSheet } from 'react-native';
import { usePathname, useGlobalSearchParams } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';
import { childIdFromGlobalParams, isParentKidHandoffPath } from '../../utils/kidHandoffSession';

/**
 * Visible indicator while the parent app is in an on-device kid session (Kid Mode grid or category).
 */
export function KidSessionRibbon() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ childId?: string | string[] }>();
  const childId = childIdFromGlobalParams(params.childId);
  const visible = isParentKidHandoffPath(pathname, childId);

  if (!visible) return null;

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.text} numberOfLines={2}>
        Kid session — blocked apps and limits from Block Apps / Watch Limit apply while this banner shows.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 119, 6, 0.35)',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
  },
  text: {
    color: COLORS.parent.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    textAlign: 'center',
  },
});
