/**
 * Modern theme color hook using the new theme system
 */

import { useTheme } from '@/shared/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: string
) {
  const { isDark, themeColors } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Fallback to theme colors - try to access nested color values
    const colorKeys = colorName.split('.');
    let colorValue: string | undefined;
    
    if (colorKeys.length === 1) {
      // Direct property access - safe property lookup
      const themeColorsRecord = themeColors as Record<string, unknown>;
      if (colorName in themeColorsRecord) {
        const value = themeColorsRecord[colorName];
        colorValue = typeof value === 'string' ? value : undefined;
      }
    }
    
    return colorValue || themeColors.primary?.main || '#4B6382';
  }
} 