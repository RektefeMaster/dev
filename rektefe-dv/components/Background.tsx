import React from 'react';
import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withGradient?: boolean;
}

const BG_IMAGE = require('../assets/arkaplan-all.png');

const Background: React.FC<BackgroundProps> = ({ children, style, withGradient = true }) => {
  return (
    <ImageBackground
      source={BG_IMAGE}
      style={[styles.bg, style]}
      resizeMode="cover"
    >
      {withGradient ? (
        <LinearGradient
          colors={["rgba(10,20,40,0.7)", "rgba(30,40,60,0.85)"]}
          style={styles.gradient}
        >
          {children}
        </LinearGradient>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
});

export default Background; 