import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Soft background phases — same light, airy feel as parent shell gradients. */
export type TimeOfDayPhase = 'night' | 'sunrise' | 'morning' | 'afternoon' | 'evening';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface TimeOfDayTheme {
  phase: TimeOfDayPhase;
  greeting: string;
  icon: IoniconName;
  iconColor: string;
  /** Three-stop gradient aligned with `GRADIENT_PRESETS` (never dark / saturated). */
  backgroundGradient: [string, string, string];
}

/** Must match `getPhase` hour checks (5, 8, 12, 17, 21). */
const PHASE_BOUNDARY_HOURS = [5, 8, 12, 17, 21] as const;

function getPhase(hour: number): TimeOfDayPhase {
  if (hour >= 21 || hour < 5) return 'night';
  if (hour < 8) return 'sunrise';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const PHASE_THEMES: Record<
  TimeOfDayPhase,
  Pick<TimeOfDayTheme, 'greeting' | 'icon' | 'iconColor' | 'backgroundGradient'>
> = {
  night: {
    greeting: 'Good night',
    icon: 'moon',
    iconColor: '#5C6B9A',
    backgroundGradient: ['#E6E9F4', '#EDE8F4', '#F0E8F2'],
  },
  sunrise: {
    greeting: 'Good morning',
    icon: 'sunny-outline',
    iconColor: '#D4923A',
    backgroundGradient: ['#F6EDE4', '#F4EBE8', '#F2EDE8'],
  },
  morning: {
    greeting: 'Good morning',
    icon: 'sunny-outline',
    iconColor: '#D4A82E',
    backgroundGradient: ['#E8F4EC', '#F2E8E9', '#F0F4FF'],
  },
  afternoon: {
    greeting: 'Good afternoon',
    icon: 'sunny',
    iconColor: '#E5A318',
    backgroundGradient: ['#E4F0F8', '#EAEEF6', '#F0F2FC'],
  },
  evening: {
    greeting: 'Good evening',
    icon: 'partly-sunny-outline',
    iconColor: '#C9724A',
    backgroundGradient: ['#F4E6E8', '#F2E8EA', '#F6EDE6'],
  },
};

/** Milliseconds until the next phase boundary (5:00, 8:00, 12:00, 17:00, 21:00). */
export function getMsUntilNextPhaseChange(from = new Date()): number {
  const hour = from.getHours();
  const minute = from.getMinutes();
  const second = from.getSeconds();
  const ms = from.getMilliseconds();

  const nowMsInHour =
    hour * 3_600_000 + minute * 60_000 + second * 1_000 + ms;

  for (const boundaryHour of PHASE_BOUNDARY_HOURS) {
    const boundaryMs = boundaryHour * 3_600_000;
    if (nowMsInHour < boundaryMs) {
      return boundaryMs - nowMsInHour;
    }
  }

  // After 21:00 — next boundary is 05:00 tomorrow.
  const msUntilMidnight = 24 * 3_600_000 - nowMsInHour;
  return msUntilMidnight + 5 * 3_600_000;
}

export function getTimeOfDayTheme(date = new Date()): TimeOfDayTheme {
  const phase = getPhase(date.getHours());
  return { phase, ...PHASE_THEMES[phase] };
}

export function formatGreetingLine(name: string, date = new Date()): string {
  const first = (name.split(' ')[0] ?? 'Parent').trim() || 'Parent';
  const { greeting } = getTimeOfDayTheme(date);
  return `${greeting}, ${first}`;
}

const BOUNDARY_TICK_MS = 150;

/**
 * Keeps greeting, icon, and background in sync at phase boundaries (not on a slow poll).
 * Also refreshes when the screen is focused or the app returns to the foreground.
 */
export function useTimeOfDayTheme() {
  const [theme, setTheme] = useState(() => getTimeOfDayTheme(new Date()));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(() => {
    setTheme(getTimeOfDayTheme(new Date()));
  }, []);

  const scheduleNextBoundary = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const delay = getMsUntilNextPhaseChange(new Date()) + BOUNDARY_TICK_MS;
    timeoutRef.current = setTimeout(() => {
      sync();
      scheduleNextBoundary();
    }, delay);
  }, [sync]);

  useEffect(() => {
    scheduleNextBoundary();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scheduleNextBoundary]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      sync();
      scheduleNextBoundary();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [sync, scheduleNextBoundary]);

  useFocusEffect(
    useCallback(() => {
      sync();
      scheduleNextBoundary();
    }, [sync, scheduleNextBoundary]),
  );

  return theme;
}
