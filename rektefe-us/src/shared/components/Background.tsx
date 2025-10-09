import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context';

interface BackgroundProps {
  children: React.ReactNode;
  style?: any;
}

const Background: React.FC<BackgroundProps> = ({ children, style }) => {
  const { themeColors } = useTheme();

  return (
    <View style={[
      styles.container,
      { backgroundColor: themeColors.background.primary },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Background;
