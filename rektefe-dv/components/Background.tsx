import { BlurView } from 'expo-blur';
import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/theme';

interface BackgroundProps {
  children: React.ReactNode;
  gradientColors?: string[];
  withImage?: boolean;
  imageSource?: any;
}

const getGradientColors = (): readonly [string, string, string] => {
  // Modern tema renkleri kullan
  return [theme.colors.background.default.dark, theme.colors.background.surface.dark, theme.colors.primary.main] as const;
};

const Background: React.FC<BackgroundProps> = ({
  children,
  gradientColors,
  withImage = false,
  imageSource,
}) => {
  const appliedColors = gradientColors || getGradientColors();
  
  if (withImage && imageSource) {
    return (
      <ImageBackground source={imageSource} style={styles.bg} resizeMode="cover" imageStyle={{ opacity: 0.9 }}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}>
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