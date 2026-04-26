/**
 * Parent stack layout.
 * All screens here are gated to UserRole.PARENT.
 *
 * Bottom tabs: max 5 (Home, Chat, Growth, Safety, More).
 * All other parent routes are registered with `href: null` so they do not appear as extra tabs
 * (Expo Router would otherwise add one tab per file). The More hub links to every secondary flow.
 */

import type { ComponentProps } from 'react';
import { DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/colors';
import { DeviceContextBanner } from '../../src/components/parent/DeviceContextBanner';
import { useThemeStore, GRADIENT_PRESETS } from '../../src/store/theme.store';
import { ParentGlassTabBarBackground } from '../../src/components/parent/ParentGlassTabBarBackground';
import {
  createParentTabButton,
  parentTabLabelColors,
} from '../../src/components/parent/ParentTabBarButton';

type IonName = ComponentProps<typeof Ionicons>['name'];

function ParentTabIcon({ name, color }: { name: IonName; color: string }) {
  return <Ionicons name={name} size={25} color={color} />;
}

const TabBtn = {
  home: createParentTabButton('dashboard/index'),
  chat: createParentTabButton('chat/index'),
  growth: createParentTabButton('growth/index'),
  safety: createParentTabButton('safety/index'),
  more: createParentTabButton('more/index'),
} as const;

/** React Navigation defaults to rgb(242,242,242) — that hides the shell gradient behind each tab. */
const parentNavTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

export default function ParentLayout() {
  const insets = useSafeAreaInsets();
  const { gradientPreset, customBackgroundUri, hydrated } = useThemeStore();
  const gradient = GRADIENT_PRESETS[gradientPreset];

  const tabBarPaddingTop = 8;
  const tabBarPaddingBottom = 10 + insets.bottom;
  /** Tall enough for icon + label + glass pill padding/border without clipping the pill bottom */
  const tabContentHeight = Platform.OS === 'ios' ? 60 : 56;
  const tabBarHeight = tabBarPaddingTop + tabContentHeight + tabBarPaddingBottom;

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
      <ThemeProvider value={parentNavTheme}>
        <View style={styles.stack}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: 'transparent' },
            tabBarBackground: ParentGlassTabBarBackground,
            tabBarStyle: {
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              paddingTop: tabBarPaddingTop,
              paddingBottom: tabBarPaddingBottom,
              height: tabBarHeight,
              width: '100%',
              alignSelf: 'stretch',
              elevation: 0,
              marginHorizontal: 0,
              shadowColor: 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
            },
            tabBarActiveTintColor: parentTabLabelColors.active,
            tabBarInactiveTintColor: parentTabLabelColors.inactive,
            tabBarLabelStyle: {
              fontSize: 12,
              fontFamily: 'Inter_500Medium',
              fontWeight: '600',
              marginTop: 2,
              marginBottom: 0,
              paddingBottom: 2,
              letterSpacing: 0.1,
            },
            tabBarIconStyle: { marginTop: 0 },
            tabBarItemStyle: {
              paddingVertical: 0,
              justifyContent: 'center',
              alignItems: 'center',
            },
            tabBarShowLabel: true,
            tabBarHideOnKeyboard: true,
          }}
        >
          <Tabs.Screen
            name="dashboard/index"
            options={{
              title: 'Home',
              tabBarButton: TabBtn.home,
              tabBarIcon: ({ color }) => <ParentTabIcon name="home-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="chat/index"
            options={{
              title: 'Chat',
              tabBarButton: TabBtn.chat,
              tabBarIcon: ({ color }) => <ParentTabIcon name="chatbubbles-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="growth/index"
            options={{
              title: 'Growth',
              tabBarButton: TabBtn.growth,
              tabBarIcon: ({ color }) => <ParentTabIcon name="trending-up-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="safety/index"
            options={{
              title: 'Safety',
              tabBarButton: TabBtn.safety,
              tabBarIcon: ({ color }) => <ParentTabIcon name="shield-checkmark-outline" color={color} />,
            }}
          />
          <Tabs.Screen
            name="more/index"
            options={{
              title: 'More',
              tabBarButton: TabBtn.more,
              tabBarIcon: ({ color }) => <ParentTabIcon name="grid-outline" color={color} />,
            }}
          />
          <Tabs.Screen name="memory/index" options={{ href: null }} />
          <Tabs.Screen name="settings/index" options={{ href: null }} />
          <Tabs.Screen name="community/index" options={{ href: null }} />
          <Tabs.Screen name="finance/index" options={{ href: null }} />
          <Tabs.Screen name="nutrition/index" options={{ href: null }} />
          <Tabs.Screen name="paywall/index" options={{ href: null }} />
          <Tabs.Screen name="baseline/index" options={{ href: null }} />
          <Tabs.Screen name="settings/add-device" options={{ href: null }} />
          <Tabs.Screen name="settings/appearance" options={{ href: null }} />
          <Tabs.Screen name="settings/theme-picker" options={{ href: null }} />
          <Tabs.Screen name="family-space/index" options={{ href: null }} />
          <Tabs.Screen name="add-child/index" options={{ href: null }} />
        </Tabs>
        </View>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8F4EC' },
  stack: { flex: 1 },
});
