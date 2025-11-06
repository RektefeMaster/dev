import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

// Spacing ve borderRadius'u doğrudan tanımla (modül yükleme sırasından bağımsız)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 12,
  iconSpacing: 8,
};

const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  round: 50,
  card: 16,
  button: 12,
  input: 12,
  modal: 20,
  avatar: 25,
  full: 9999,
};

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  children,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.button,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Shadow sadece outline ve ghost variant'larda olmamalı
    if (variant !== 'outline' && variant !== 'ghost') {
      Object.assign(baseStyle, theme.shadows.button);
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Size styles - Minimum 44x44 touch target (WCAG 2.1 AA standardı)
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 44; // WCAG 2.1 AA: Minimum 44x44px touch target
        baseStyle.minWidth = 44;
        break;
      case 'medium':
        baseStyle.paddingHorizontal = spacing.lg;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 48; // 48px already meets requirement
        baseStyle.minWidth = 44;
        break;
      case 'large':
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.lg;
        baseStyle.minHeight = 56; // 56px already meets requirement
        baseStyle.minWidth = 44;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary.main,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.secondary.main,
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.success.main,
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.warning.main,
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.error.main,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.colors.primary.main,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size text styles
    switch (size) {
      case 'small':
        baseTextStyle.fontSize = theme.typography.button.small.fontSize;
        baseTextStyle.lineHeight = theme.typography.button.small.lineHeight;
        break;
      case 'medium':
        baseTextStyle.fontSize = theme.typography.button.medium.fontSize;
        baseTextStyle.lineHeight = theme.typography.button.medium.lineHeight;
        break;
      case 'large':
        baseTextStyle.fontSize = theme.typography.button.large.fontSize;
        baseTextStyle.lineHeight = theme.typography.button.large.lineHeight;
        break;
    }

    // Variant text styles
    switch (variant) {
      case 'outline':
        baseTextStyle.color = theme.colors.primary.main;
        break;
      case 'ghost':
        baseTextStyle.color = theme.colors.primary.main;
        break;
      default:
        baseTextStyle.color = theme.colors.text.inverse;
        break;
    }

    if (disabled) {
      baseTextStyle.color = theme.colors.text.tertiary;
    }

    return baseTextStyle;
  };

  const getIconColor = (): string => {
    if (disabled) return theme.colors.text.tertiary;
    
    switch (variant) {
      case 'outline':
      case 'ghost':
        return theme.colors.primary.main;
      default:
        return theme.colors.text.inverse;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={getIconColor()} 
            style={styles.loadingSpinner}
          />
          <Text style={[getTextStyle(), styles.loadingText]}>
            Yükleniyor...
          </Text>
        </View>
      );
    }

    if (children) {
      return children;
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <Ionicons
            name={icon}
            size={getIconSize()}
            color={getIconColor()}
            style={styles.leftIcon}
          />
        )}
        
        <Text style={[getTextStyle(), textStyle]}>
          {title}
        </Text>
        
        {icon && iconPosition === 'right' && (
          <Ionicons
            name={icon}
            size={getIconSize()}
            color={getIconColor()}
            style={styles.rightIcon}
          />
        )}
      </>
    );
  };

  const buttonStyle = [
    getButtonStyle(),
    disabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    marginRight: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.xs,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
