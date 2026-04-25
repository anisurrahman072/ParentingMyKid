/**
 * Parent stack layout.
 * All screens here are gated to UserRole.PARENT.
 * Navigation structure:
 *   - Bottom tabs: Dashboard, Chat, Growth, Safety, Memory, Settings
 *   - Each tab has its own nested stack for drilling into details
 */

import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/colors';
import { DeviceContextBanner } from '../../src/components/parent/DeviceContextBanner';
import { useThemeStore, GRADIENT_PRESETS } from '../../src/store/theme.store';

const TAB_ICON_SIZE = 24;

function TabBarIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const { Text } = require('react-native');
  return (
    <Text style={{ fontSize: TAB_ICON_SIZE, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export default function ParentLayout() {
  const { gradientPreset, customBackgroundUri, hydrated } = useThemeStore();
  const gradient = GRADIENT_PRESETS[gradientPreset];

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: gradient[0] }}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {customBackgroundUri ? (
        <ImageBackground
          source={{ uri: customBackgroundUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      )}
      <DeviceContextBanner />
      <View style={styles.stack}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.parent.tabBarBg,
          borderTopColor: COLORS.parent.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarActiveTintColor: COLORS.parent.tabBarActive,
        tabBarInactiveTintColor: COLORS.parent.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter',
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="growth/index"
        options={{
          title: 'Growth',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="safety/index"
        options={{
          title: 'Safety',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="🛡️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="memory/index"
        options={{
          title: 'Memories',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="📸" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabBarIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#C8F5E1' },
  stack: { flex: 1 },
});
