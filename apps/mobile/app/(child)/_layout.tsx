/**
 * Child stack layout.
 * All screens here are gated to UserRole.CHILD (PIN-authenticated).
 * Global coral → orange shell gradient; tab bar glass/coral tint.
 */

import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/colors';

function TabBarIcon({ icon, focused }: { icon: string; focused: boolean }) {
  const { Text } = require('react-native');
  return (
    <Text
      style={{
        fontSize: 26,
        opacity: focused ? 1 : 0.55,
        transform: [{ scale: focused ? 1.15 : 1 }],
      }}
    >
      {icon}
    </Text>
  );
}

export default function ChildLayout() {
  /** Server still gates Islamic missions; tab visibility is opt-in per child profile when that data is wired. */
  const islamicEnabled = true;

  return (
    <View style={styles.root}>
      <LinearGradient colors={COLORS.kids.gradientApp} style={StyleSheet.absoluteFill} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.kids.tabBarBg,
            borderTopColor: COLORS.kids.tabBarBorder,
            borderTopWidth: 1,
            paddingBottom: Platform.OS === 'ios' ? 24 : 10,
            paddingTop: 8,
            height: Platform.OS === 'ios' ? 90 : 68,
          },
          tabBarActiveTintColor: COLORS.kids.tabBarActive,
          tabBarInactiveTintColor: COLORS.kids.tabBarInactive,
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'Nunito_400Regular',
            fontWeight: '700',
            marginTop: 0,
          },
        }}
      >
        <Tabs.Screen
          name="missions/index"
          options={{
            title: 'Missions',
            tabBarIcon: ({ focused }) => <TabBarIcon icon="⚡" focused={focused} />,
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
          name="friends/index"
          options={{
            title: 'Friends',
            tabBarIcon: ({ focused }) => <TabBarIcon icon="🤝" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rewards/index"
          options={{
            title: 'Rewards',
            tabBarIcon: ({ focused }) => <TabBarIcon icon="🏆" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="games/index"
          options={{
            title: 'Games',
            tabBarIcon: ({ focused }) => <TabBarIcon icon="🎮" focused={focused} />,
          }}
        />
        {islamicEnabled && (
          <Tabs.Screen
            name="islamic/index"
            options={{
              title: 'Islam',
              tabBarIcon: ({ focused }) => <TabBarIcon icon="🌙" focused={focused} />,
            }}
          />
        )}
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Me',
            tabBarIcon: ({ focused }) => <TabBarIcon icon="😊" focused={focused} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FF6B6B' },
});
