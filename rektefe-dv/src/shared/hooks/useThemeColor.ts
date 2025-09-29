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
    // Fallback to theme colors
    return themeColors[colorName] || themeColors.primary?.main || '#4B6382';
  }
} 