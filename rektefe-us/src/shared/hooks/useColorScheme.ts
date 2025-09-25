import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useTheme } from '@/shared/context';

export const useColorScheme = () => {
  const { isDark, themeColors } = useTheme();
  const systemColorScheme = useSystemColorScheme();
  
  // Kullanıcı tercihi varsa onu kullan, yoksa sistem temasını kullan
  const colorScheme = isDark !== undefined ? (isDark ? 'dark' : 'light') : systemColorScheme;
  
  return {
    colorScheme,
    isDark: colorScheme === 'dark',
    themeColors,
  };
};
