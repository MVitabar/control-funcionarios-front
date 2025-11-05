/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Professional color palette
const primaryColorLight = '#2563EB';    // Blue-600
const primaryColorDark = '#3B82F6';     // Blue-500
const dangerColor = '#EF4444';          // Red-500
const successColor = '#10B981';         // Green-500
const warningColor = '#F59E0B';         // Amber-500

const tintColorLight = primaryColorLight;
const tintColorDark = '#EFF6FF';        // Light blue-50

interface ThemeColors {
  // Base colors
  text: string;
  background: string;
  card: string;
  border: string;
  
  // Brand colors
  primary: string;
  tint: string;
  
  // Status colors
  success: string;
  warning: string;
  danger: string;
  
  // UI elements
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  secondaryText: string;
  
  // Input fields
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;
  
  // Feedback colors
  successLight: string;
  warningLight: string;
  dangerLight: string;
}

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    // Base colors
    text: '#1F2937',                  // Gray-800
    background: '#F9FAFB',            // Gray-50
    card: '#FFFFFF',                  // White
    border: '#E5E7EB',                // Gray-200
    
    // Brand colors
    primary: primaryColorLight,
    tint: tintColorLight,
    
    // Status colors
    success: successColor,
    warning: warningColor,
    danger: dangerColor,
    
    // UI elements
    icon: '#4B5563',                  // Gray-600
    tabIconDefault: '#9CA3AF',        // Gray-400
    tabIconSelected: primaryColorLight,
    secondaryText: '#6B7280',         // Gray-500
    
    // Additional UI colors
    inputBackground: '#FFFFFF',
    inputBorder: '#D1D5DB',           // Gray-300
    inputPlaceholder: '#9CA3AF',      // Gray-400
    
    // Feedback colors
    successLight: '#D1FAE5',          // Green-100
    warningLight: '#FEF3C7',          // Amber-100
    dangerLight: '#FEE2E2',           // Red-100
  },
  dark: {
    // Base colors
    text: '#F3F4F6',                 // Gray-100
    background: '#111827',            // Gray-900
    card: '#1F2937',                 // Gray-800
    border: '#374151',                // Gray-700
    
    // Brand colors
    primary: primaryColorDark,
    tint: tintColorDark,
    
    // Status colors
    success: successColor,
    warning: warningColor,
    danger: dangerColor,
    
    // UI elements
    icon: '#9CA3AF',                 // Gray-400
    tabIconDefault: '#6B7280',       // Gray-500
    tabIconSelected: tintColorDark,
    secondaryText: '#9CA3AF',        // Gray-400
    
    // Additional UI colors
    inputBackground: '#1F2937',      // Gray-800
    inputBorder: '#4B5563',          // Gray-600
    inputPlaceholder: '#6B7280',     // Gray-500
    
    // Feedback colors
    successLight: '#065F46',         // Green-900
    warningLight: '#92400E',         // Amber-900
    dangerLight: '#991B1B',          // Red-900
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
