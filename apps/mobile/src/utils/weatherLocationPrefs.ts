import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@pmk_weather_location_opt_in';

/** User enabled location from Troubleshoot (not automatic on app open). */
export async function getWeatherLocationOptIn(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function setWeatherLocationOptIn(enabled: boolean): Promise<void> {
  if (enabled) await AsyncStorage.setItem(KEY, '1');
  else await AsyncStorage.removeItem(KEY);
}
