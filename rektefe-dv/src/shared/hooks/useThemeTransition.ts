import { useEffect } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

// Android için LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Tema değişikliklerinde yumuşak geçiş animasyonu sağlar
 * Component'lerde kullanılabilir
 */
export const useThemeTransition = () => {
  const { isDark, theme } = useTheme();

  useEffect(() => {
    // Tema değiştiğinde layout animasyonu tetikle
    LayoutAnimation.configureNext({
      duration: theme.animations.duration.normal, // 300ms
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, [isDark, theme.animations.duration.normal]);

  return { isDark, theme };
};

