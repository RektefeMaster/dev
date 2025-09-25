/**
 * Modern theme color hook using the new theme system
 */

import { useColorScheme } from 'react-native';
import theme from '@/theme/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof theme.colors.primary
) {
  const colorScheme = useColorScheme() ?? 'light';
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return theme.colors.primary[colorName];
  }
} 