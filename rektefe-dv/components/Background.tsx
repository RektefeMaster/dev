import { BlurView } from 'expo-blur';
import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import theme from '../theme/theme';

interface BackgroundProps {
  children: React.ReactNode;
  gradientColors?: string[];
  withImage?: boolean;
  imageSource?: any;
}

const getGradientColors = (isDark: boolean): readonly [string, string, string] => {
  if (isDark) {
    // Koyu tema - modern gradient
    return [
      theme.colors.background.default.dark,
      theme.colors.background.surface.dark,
      theme.colors.primary.main
    ] as const;
  } else {
    // Açık tema - göz yormayan, gradient benzeri renkler
    return [
      theme.colors.background.default.light,
      theme.colors.background.surface.light,
      theme.colors.primary.light
    ] as const;
  }
};

const Background: React.FC<BackgroundProps> = ({
  children,
  gradientColors,
  withImage = false,
  imageSource,
}) => {
  const { isDark } = useTheme();
  const appliedColors = gradientColors || getGradientColors(isDark);
  
  if (withImage && imageSource) {
    return (
      <ImageBackground source={imageSource} style={styles.bg} resizeMode="cover" imageStyle={{ opacity: 0.9 }}>
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
          <LinearGradient colors={appliedColors as any} style={styles.bg}>
            {children}
          </LinearGradient>
        </BlurView>
      </ImageBackground>
    );
  }
  
  return (
    <LinearGradient colors={appliedColors as any} style={styles.bg}>
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default Background; 