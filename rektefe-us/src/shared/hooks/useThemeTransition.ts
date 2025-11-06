import { useEffect } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTheme } from '@/shared/context';

// Android için LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Tema değişikliklerinde yumuşak geçiş animasyonu sağlar
 * Component'lerde kullanılabilir
 */
export const useThemeTransition = () => {
  const { isDark } = useTheme();
  // Theme'den animasyon süresini al (varsayılan 300ms)
  const animationDuration = 300;

  useEffect(() => {
    // Tema değiştiğinde layout animasyonu tetikle
    LayoutAnimation.configureNext({
      duration: animationDuration,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, [isDark, animationDuration]);

  return { isDark };
};

