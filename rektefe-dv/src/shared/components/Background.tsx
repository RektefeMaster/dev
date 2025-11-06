import { BlurView } from 'expo-blur';
import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface BackgroundProps {
  children: React.ReactNode;
  gradientColors?: string[];
  withImage?: boolean;
  imageSource?: any;
}

const getGradientColors = (theme: any, isDark: boolean): readonly [string, string, string] => {
  if (isDark) {
    // Koyu tema - modern gradient
    return [
      theme?.colors?.background?.quaternary || '#000000',
      theme?.colors?.background?.tertiary || '#1C1C1E',
      theme?.colors?.primary?.main || '#4B6382'
    ] as const;
  } else {
    // Açık tema - göz yormayan, gradient benzeri renkler
    return [
      theme?.colors?.background?.primary || '#F2F2F7',
      theme?.colors?.background?.secondary || '#FFFFFF',
      theme?.colors?.primary?.light || '#5AC8FA'
    ] as const;
  }
};

const Background: React.FC<BackgroundProps> = ({
  children,
  gradientColors,
  withImage = false,
  imageSource,
}) => {
  const { isDark, theme } = useTheme();
  const appliedColors = gradientColors || getGradientColors(theme, isDark);
  
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