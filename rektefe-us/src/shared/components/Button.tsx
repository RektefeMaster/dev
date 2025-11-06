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
import { useTheme } from '@/shared/context';
import { borderRadius, spacing } from '@/shared/theme';

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
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  children?: React.ReactNode;
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
}) => {
  const { themeColors, isDark } = useTheme();
  const { shadows } = require('@/shared/theme');
  const styles = createStyles(themeColors, isDark);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.button,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Shadow sadece outline ve ghost variant'larda olmamalı
    if (variant !== 'outline' && variant !== 'ghost') {
      Object.assign(baseStyle, shadows.button);
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case 'medium':
        baseStyle.paddingHorizontal = spacing.lg;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 48;
        break;
      case 'large':
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.lg;
        baseStyle.minHeight = 56;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: themeColors.primary.main,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: themeColors.secondary.main,
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: themeColors.success.main,
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: themeColors.warning.main,
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: themeColors.error.main,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: themeColors.primary.main,
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

    // Size text styles - US'de themeColors'da typography yok, direkt değerler kullanılıyor
    const { typography } = require('@/shared/theme');
    switch (size) {
      case 'small':
        baseTextStyle.fontSize = typography.button.small.fontSize;
        baseTextStyle.lineHeight = typography.button.small.lineHeight;
        break;
      case 'medium':
        baseTextStyle.fontSize = typography.button.medium.fontSize;
        baseTextStyle.lineHeight = typography.button.medium.lineHeight;
        break;
      case 'large':
        baseTextStyle.fontSize = typography.button.large.fontSize;
        baseTextStyle.lineHeight = typography.button.large.lineHeight;
        break;
    }

    // Variant text styles
    switch (variant) {
      case 'outline':
        baseTextStyle.color = themeColors.primary.main;
        break;
      case 'ghost':
        baseTextStyle.color = themeColors.primary.main;
        break;
      default:
        baseTextStyle.color = themeColors.text.inverse;
        break;
    }

    if (disabled) {
      baseTextStyle.color = themeColors.text.tertiary;
    }

    return baseTextStyle;
  };

  const getIconColor = (): string => {
    if (disabled) return themeColors.text.tertiary;
    
    switch (variant) {
      case 'outline':
      case 'ghost':
        return themeColors.primary.main;
      default:
        return themeColors.text.inverse;
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
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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