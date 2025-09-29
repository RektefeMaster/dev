import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/ThemeContext';
import theme from '@/theme/theme';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md', 
  style 
}) => {
  const { isDark, toggleTheme } = useTheme();

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 20;
      case 'md': return 24;
      case 'lg': return 28;
      default: return 24;
    }
  };

  const getContainerSize = () => {
    switch (size) {
      case 'sm': return 40;
      case 'md': return 48;
      case 'lg': return 56;
      default: return 48;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: getContainerSize(),
          height: getContainerSize(),
          borderRadius: getContainerSize() / 2,
                  backgroundColor: isDark ? theme.colors.background.tertiary : theme.colors.background.secondary,
        borderColor: isDark ? theme.colors.border.tertiary : theme.colors.border.primary,
        },
        style
      ]}
      onPress={toggleTheme}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
    >
      <MaterialCommunityIcons
        name={isDark ? 'weather-sunny' : 'weather-night'}
        size={getIconSize()}
        color={isDark ? theme.colors.warning.main : theme.colors.primary.main}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    ...theme.shadows.small,
  },
});

export default ThemeToggle;
