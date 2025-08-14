import { BlurView } from 'expo-blur';
import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BackgroundProps {
  children: React.ReactNode;
  gradientColors?: string[];
  withImage?: boolean;
  imageSource?: any;
}


const getGradientColors = () => {
  // Matte black to tech blue gradient
  return ['#0f0f0f', '#1c1c1e', '#0a84ff'];
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
          <LinearGradient colors={appliedColors} style={styles.bg}>
            {children}
          </LinearGradient>
        </BlurView>
      </ImageBackground>
    );
  }
  return (
    <LinearGradient colors={appliedColors} style={styles.bg}>
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