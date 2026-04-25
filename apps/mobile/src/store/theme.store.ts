import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'pmk_theme';

/** Light green–pink family only (replaces old dark “Nebula” presets) */
export type GradientPreset = 'mint' | 'blossom' | 'peach' | 'sage';

const LEGACY_DARK_PRESETS = ['default', 'midnight', 'sunset', 'ocean', 'forest'] as const;

const VALID_PRESETS: readonly GradientPreset[] = ['mint', 'blossom', 'peach', 'sage'];

/** Very soft mint → blush; all stops lightened so the shell never feels “deep”. */
export const GRADIENT_PRESETS: Record<GradientPreset, [string, string, string]> = {
  mint: ['#E8F4EC', '#EEF0EE', '#F2E8E9'],
  blossom: ['#F0E3EC', '#F1E1E0', '#F6ECDE'],
  peach: ['#F4ECDE', '#F0E6E5', '#F0E2EA'],
  sage: ['#E4F0E8', '#E9F2EC', '#F0F4F0'],
};

/**
 * Selected tab “pill” — two-stop only: airy light cyan → light pink (premium, not deep/saturated).
 * Sheen comes from the white overlay in `ParentTabBarButton`, not extra gradient stops.
 */
export const TAB_PILL_GLASS_GRADIENTS: Record<GradientPreset, readonly [string, string]> = {
  mint: ['rgba(195, 233, 252, 0.88)', 'rgba(250, 215, 232, 0.88)'],
  blossom: ['rgba(192, 230, 250, 0.88)', 'rgba(250, 218, 235, 0.88)'],
  peach: ['rgba(200, 235, 250, 0.87)', 'rgba(250, 212, 225, 0.88)'],
  sage: ['rgba(190, 232, 248, 0.88)', 'rgba(248, 218, 234, 0.87)'],
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
