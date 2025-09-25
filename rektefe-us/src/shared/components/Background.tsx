import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/context/ThemeContext';

interface BackgroundProps {
  children: React.ReactNode;
  style?: any;
}

const Background: React.FC<BackgroundProps> = ({ children, style }) => {
  const { theme } = useTheme();

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.background.primary },
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
