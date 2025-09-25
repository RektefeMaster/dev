/**
 * Modern theme color hook using the new theme system
 */

import { useTheme } from '@/shared/context';
import { createTheme } from '@/shared/theme';

type ThemeColorKey = 'main' | 'light' | 'dark' | 'ultraLight';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorKey
) {
  const { isDark, themeColors } = useTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Tema renklerini kullan
    switch (colorName) {
      case 'main':
        return themeColors.accent;
      case 'light':
        return themeColors.surface;
      case 'dark':
        return themeColors.text;
      case 'ultraLight':
        return themeColors.background;
      default:
        return themeColors.accent;
    }
  }
}
