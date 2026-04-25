import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'pmk_theme';

/** Light green–pink family only (replaces old dark “Nebula” presets) */
export type GradientPreset = 'mint' | 'blossom' | 'peach' | 'sage';

const LEGACY_DARK_PRESETS = [
  'default',
  'midnight',
  'sunset',
  'ocean',
  'forest',
] as const;

const VALID_PRESETS: readonly GradientPreset[] = ['mint', 'blossom', 'peach', 'sage'];

export const GRADIENT_PRESETS: Record<GradientPreset, [string, string, string]> = {
  mint: ['#C8F5E1', '#D8EFD8', '#FADADD'],
  blossom: ['#FAD0E8', '#F9C6D0', '#FDE8CB'],
  peach: ['#FDE8CB', '#FADADD', '#FAD0E8'],
  sage: ['#D4EDDA', '#C8F5E1', '#E8F5E9'],
};

function migratePreset(p: string | undefined): GradientPreset {
  if (!p) return 'mint';
  if (LEGACY_DARK_PRESETS.includes(p as (typeof LEGACY_DARK_PRESETS)[number])) return 'mint';
  if (VALID_PRESETS.includes(p as GradientPreset)) return p as GradientPreset;
  return 'mint';
}

interface ThemeState {
  gradientPreset: GradientPreset;
  customBackgroundUri: string | null;
  hydrated: boolean;
  setGradientPreset: (p: GradientPreset) => void;
  setCustomBackground: (uri: string | null) => void;
  load: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  gradientPreset: 'mint',
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
    set({ customBackgroundUri, gradientPreset: 'mint' });
    void SecureStore.setItemAsync(
      THEME_KEY,
      JSON.stringify({ gradientPreset: 'mint', customBackgroundUri }),
    );
  },
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(THEME_KEY);
      if (raw) {
        const p = JSON.parse(raw) as {
          gradientPreset?: string;
          customBackgroundUri?: string | null;
        };
        set({
          gradientPreset: migratePreset(p.gradientPreset),
          customBackgroundUri: p.customBackgroundUri ?? null,
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },
}));
