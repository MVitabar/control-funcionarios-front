import { useColorScheme as _useColorScheme } from 'react-native';

/**
 * A custom hook that returns the current color scheme of the device.
 * @returns 'light' | 'dark' | null
 */
export function useColorScheme() {
  return _useColorScheme();
}
