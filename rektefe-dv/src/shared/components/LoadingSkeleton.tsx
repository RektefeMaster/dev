import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import theme from '@/theme/theme';

const LoadingSkeleton = () => (
  <View style={styles.container}>
    <LottieView
      source={require('../../../assets/loading.json')}
      autoPlay
      loop
      style={{ width: 120, height: 120 }}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: theme.spacing.xxl,
    backgroundColor: theme.colors.background.quaternary,
  }
});

export default LoadingSkeleton; 