import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'pmk_theme';

export type GradientPreset = 'default' | 'midnight' | 'sunset' | 'ocean' | 'forest';

export const GRADIENT_PRESETS: Record<GradientPreset, [string, string, string]> = {
  default: ['#0F0F1A', '#1A1035', '#0F0A1E'],
  midnight: ['#0D0D0D', '#1a1a2e', '#16213e'],
  sunset: ['#1a0a2e', '#3d1147', '#6b1a3a'],
  ocean: ['#0a1628', '#0d2e4e', '#0a4a5e'],
  forest: ['#0a1a0d', '#0f2e14', '#1a4a1f'],
};

interface ThemeState {
  gradientPreset: GradientPreset;
  customBackgroundUri: string | null;
  hydrated: boolean;
  setGradientPreset: (p: GradientPreset) => void;
  setCustomBackground: (uri: string | null) => void;
  load: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  gradientPreset: 'default',
  customBackgroundUri: null,
  hydrated: false,
  setGradientPreset: (gradientPreset) => {
    set({ gradientPreset, customBackgroundUri: null });
    void SecureStore.setItemAsync(
      THEME_KEY,
      JSON.stringify({ gradientPreset, customBackgroundUri: null }),
    );
  },
  setCustomBackground: (customBackgroundUri) => {
    set({ customBackgroundUri, gradientPreset: 'default' });
    void SecureStore.setItemAsync(
      THEME_KEY,
      JSON.stringify({ gradientPreset: 'default', customBackgroundUri }),
    );
  },
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(THEME_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { gradientPreset?: GradientPreset; customBackgroundUri?: string | null };
        set({
          gradientPreset: p.gradientPreset ?? 'default',
          customBackgroundUri: p.customBackgroundUri ?? null,
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },
}));
