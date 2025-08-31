import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const ThemeToggle = () => {
  const { isDark, toggleTheme, themeColors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: themeColors.accent,
          borderColor: themeColors.border,
        }
      ]}
      onPress={toggleTheme}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
        size={20}
        color={themeColors.text}
      />
      <Text style={[styles.text, { color: themeColors.text }]}>
        {isDark ? 'Light Tema' : 'Dark Tema'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ThemeToggle;
