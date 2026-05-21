/**
 * Detects current weather (rain / snow) from device location via Open-Meteo.
 *
 * Location is opt-in only (Troubleshoot → Turn on location). Never requests permission
 * or calls getCurrentPositionAsync (that triggers Android “Location Accuracy” sheets).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { getWeatherLocationOptIn } from './weatherLocationPrefs';
import { isLocationFullyReady } from './locationPermission';

export type WeatherKind = 'clear' | 'rain' | 'snow';

export interface WeatherCondition {
  kind: WeatherKind;
  weatherCode?: number;
  loading: boolean;
}

const MIN_RAIN_MM = 0.15;
const MIN_SNOW_CM = 0.08;

interface OpenMeteoCurrent {
  weather_code?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  temperature_2m?: number;
}

function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
}

function isRainCode(code: number): boolean {
  return (
    (code >= 61 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  );
}

function isDrizzleCode(code: number): boolean {
  return code >= 51 && code <= 57;
}

export function classifyCurrentWeather(current: OpenMeteoCurrent): WeatherKind {
  const code = current.weather_code ?? 0;
  const precip = current.precipitation ?? 0;
  const rainMm = (current.rain ?? 0) + (current.showers ?? 0);
  const waterMm = Math.max(precip, rainMm);
  const snowfall = current.snowfall ?? 0;
  const temp = current.temperature_2m ?? 15;

  if (snowfall >= MIN_SNOW_CM) return 'snow';
  if (temp <= 1.5 && waterMm >= MIN_RAIN_MM && isSnowCode(code)) return 'snow';
  if (waterMm < MIN_RAIN_MM) return 'clear';
  if (isSnowCode(code) && temp <= 3) return 'snow';
  if (isRainCode(code)) return 'rain';
  if (isDrizzleCode(code) && waterMm >= MIN_RAIN_MM) return 'rain';
  if (waterMm >= 0.35 && temp > 1) return 'rain';
  return 'clear';
}

const REFRESH_INTERVAL_MS = 10 * 60 * 1_000;
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Cached coordinates only — never starts a fresh GPS fix (avoids Location Accuracy modal).
 */
async function readCachedCoords(): Promise<{ lat: number; lon: number } | null> {
  try {
    const servicesOn = await Location.hasServicesEnabledAsync();
    if (!servicesOn) return null;

    const last = await Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000 });
    if (last?.coords) {
      return { lat: last.coords.latitude, lon: last.coords.longitude };
    }
  } catch {
    /* no coords */
  }
  return null;
}

async function fetchWeatherKind(lat: number, lon: number): Promise<WeatherKind> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&current=weather_code,precipitation,rain,showers,snowfall,temperature_2m` +
    `&timezone=auto&forecast_days=1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return 'clear';
    const data = (await res.json()) as { current?: OpenMeteoCurrent };
    const current = data?.current;
    if (!current || typeof current.weather_code !== 'number') return 'clear';
    return classifyCurrentWeather(current);
  } catch {
    return 'clear';
  } finally {
    clearTimeout(timeout);
  }
}

export function useWeatherCondition(): WeatherCondition {
  const [state, setState] = useState<WeatherCondition>({ kind: 'clear', loading: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const optedIn = await getWeatherLocationOptIn();
      if (!optedIn) {
        if (mountedRef.current) setState({ kind: 'clear', loading: false });
        return;
      }

      if (!(await isLocationFullyReady())) {
        if (mountedRef.current) setState({ kind: 'clear', loading: false });
        return;
      }

      const coords = await readCachedCoords();
      if (!coords) {
        if (mountedRef.current) setState({ kind: 'clear', loading: false });
        return;
      }

      const kind = await fetchWeatherKind(coords.lat, coords.lon);
      if (mountedRef.current) setState({ kind, loading: false });
    } catch {
      if (mountedRef.current) setState({ kind: 'clear', loading: false });
    }
  }, []);

  const startPolling = useCallback(() => {
    void refresh();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
  }, [refresh]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setState((s) => ({ ...s, loading: true }));
    startPolling();
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') startPolling();
      else stopPolling();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [startPolling, stopPolling]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return state;
}
