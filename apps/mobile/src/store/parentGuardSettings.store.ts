/**
 * @module parentGuardSettings.store.ts
 * @description Device-local settings for 3 parent-guard features:
 *   1. "Apply block rules to me (parent) too" — blocked apps/websites also apply in Parent Mode
 *   2. Auto Kid Mode — phone auto-switches to Kid Mode when idle/locked for N minutes
 *   3. Quick Access Overlay — floating bubble on the home screen for one-tap mode switching
 *
 * Persisted to AsyncStorage (not SecureStore; these are UI preferences, not secrets).
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@pmk_parent_guard_settings';

export interface ParentGuardSettings {
  /**
   * Feature 1: when true, blocked apps & websites enforced by the accessibility service
   * even when the parent is in Parent Mode (not just Kid Mode).
   * Default: false — parent is unrestricted in Parent Mode.
   */
  applyBlockRulesToParent: boolean;

  /**
   * Feature 2: automatically route to Kid Mode when the device has been
   * idle/locked for `autoKidModeIdleMinutes` minutes.
   */
  autoKidModeEnabled: boolean;

  /** Minutes of idle/lock before auto-switching (1–60). Default: 5. */
  autoKidModeIdleMinutes: number;

  /**
   * The child ID to activate when auto kid mode triggers or the overlay
   * switches to kid mode. Updated whenever a parent manually enters kid mode.
   */
  lastActiveChildId: string | null;

  /**
   * Feature 3: show a floating draggable overlay button above all other apps
   * so the parent can switch modes with one tap.
   */
  quickAccessOverlayEnabled: boolean;
}

interface ParentGuardState extends ParentGuardSettings {
  isHydrated: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<ParentGuardSettings>) => Promise<void>;
}

const DEFAULTS: ParentGuardSettings = {
  applyBlockRulesToParent: false,
  autoKidModeEnabled: false,
  autoKidModeIdleMinutes: 5,
  lastActiveChildId: null,
  quickAccessOverlayEnabled: false,
};

export const useParentGuardStore = create<ParentGuardState>((set, get) => ({
  ...DEFAULTS,
  isHydrated: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ParentGuardSettings>;
        set({ ...DEFAULTS, ...parsed, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  update: async (patch: Partial<ParentGuardSettings>) => {
    const current = get();
    const next: ParentGuardSettings = {
      applyBlockRulesToParent: patch.applyBlockRulesToParent ?? current.applyBlockRulesToParent,
      autoKidModeEnabled: patch.autoKidModeEnabled ?? current.autoKidModeEnabled,
      autoKidModeIdleMinutes: patch.autoKidModeIdleMinutes ?? current.autoKidModeIdleMinutes,
      lastActiveChildId:
        patch.lastActiveChildId !== undefined
          ? patch.lastActiveChildId
          : current.lastActiveChildId,
      quickAccessOverlayEnabled:
        patch.quickAccessOverlayEnabled ?? current.quickAccessOverlayEnabled,
    };
    set(next);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — in-memory update already applied
    }
  },
}));
