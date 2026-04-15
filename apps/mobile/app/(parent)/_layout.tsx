/**
 * Parent stack layout.
 * All screens here are gated to UserRole.PARENT.
 * Navigation structure:
 *   - Bottom tabs: Dashboard, Growth, Safety, Memory, Settings
 *   - Each tab has its own nested stack for drilling into details
 */

import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../src/constants/colors';

const TAB_ICON_SIZE = 24;

function TabBarIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const { Text } = require('react-native');
  return (
    <Text style={{ fontSize: TAB_ICON_SIZE, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
  );
}

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.parent.surface,
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarActiveTintColor: COLORS.parent.primary,
        tabBarInactiveTintColor: COLORS.parent.textMuted,
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
  );
}
