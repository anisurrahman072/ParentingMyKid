import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';

type Props = {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

/**
 * Full-screen kids shell for routes outside `(child)` (e.g. link-device) — same gradient as child layout.
 */
export function KidsGradientScreen({ children, edges = ['top', 'bottom', 'left', 'right'] }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={[...COLORS.kids.gradientApp]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FF6B6B' },
  fill: { flex: 1 },
});
