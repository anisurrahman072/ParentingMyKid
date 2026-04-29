/**
 * Language selection screen — shown once on first launch.
 * Also reachable from Settings to change language at any time.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { COLORS } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/api.client';
import { API_ENDPOINTS } from '../../src/constants/api';

export const LANGUAGE_SELECTED_KEY = '@pmk_language_selected';
export const LANGUAGE_VALUE_KEY = '@pmk_language_value';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'bn', label: 'Bangla', nativeLabel: 'বাংলা', flag: '🇧🇩' },
];

function LanguageCard({
  language,
  selected,
  onPress,
  index,
}: {
  language: (typeof LANGUAGES)[0];
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  }

  return (
    <Animated.View entering={FadeInDown.delay(300 + index * 120).springify()} style={animStyle}>
      <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={styles.flag}>{language.flag}</Text>
        <Text style={styles.cardLabel}>{language.label}</Text>
        <Text style={styles.cardNative}>{language.nativeLabel}</Text>
        {selected && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LanguageScreen() {
  const [selected, setSelected] = useState('en');
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuthStore();

  async function handleConfirm() {
    setSaving(true);
    try {
      await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, 'true');
      await AsyncStorage.setItem(LANGUAGE_VALUE_KEY, selected);

      if (isAuthenticated) {
        try {
          await apiClient.patch(API_ENDPOINTS.auth.me, {
            languagePreference: selected,
          });
        } catch {
          // Best effort — language saved locally regardless
        }
      }

      router.replace('/auth');
    } catch (e) {
      Alert.alert('Error', 'Could not save language preference. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinearGradient
      colors={COLORS.parent.gradientHero as unknown as [string, string]}
      style={styles.container}
    >
      <Animated.View entering={FadeInUp.duration(700).delay(100)} style={styles.header}>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>
          Select the language you'd like to use in the app.{'\n'}
          You can change this later in Settings.
        </Text>
      </Animated.View>

      <View style={styles.cards}>
        {LANGUAGES.map((lang, i) => (
          <LanguageCard
            key={lang.code}
            language={lang}
            selected={selected === lang.code}
            onPress={() => setSelected(lang.code)}
            index={i}
          />
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(600)} style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>
              {selected === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  cardSelected: {
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderColor: '#3B82F6',
  },
  flag: {
    fontSize: 52,
    marginBottom: 10,
  },
  cardLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardNative: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  checkBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
