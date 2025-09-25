import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, borderRadius, spacing, shadows } from '@/theme/theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  margin?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  onPress,
  style,
  disabled = false,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.card,
      backgroundColor: colors.background.card,
      overflow: 'hidden',
    };

    // Variant styles
    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          ...shadows.card,
        };
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: colors.border.primary,
        };
      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: colors.background.tertiary,
        };
      default:
        return baseStyle;
    }
  };

  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return {};
      case 'small':
        return { padding: spacing.sm };
      case 'medium':
        return { padding: spacing.md };
      case 'large':
        return { padding: spacing.lg };
      default:
        return { padding: spacing.md };
    }
  };

  const getMarginStyle = (): ViewStyle => {
    switch (margin) {
      case 'none':
        return {};
      case 'small':
        return { margin: spacing.sm };
      case 'medium':
        return { margin: spacing.md };
      case 'large':
        return { margin: spacing.lg };
      default:
        return {};
    }
  };

  const cardStyle = [
    getCardStyle(),
    getPaddingStyle(),
    getMarginStyle(),
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6,
  },
});

export default Card;
