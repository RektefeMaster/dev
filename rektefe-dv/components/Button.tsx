import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Animated,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../theme/theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  children,
}) => {
  const [scaleValue] = useState(new Animated.Value(1));
  const [isPressed, setIsPressed] = useState(false);

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    setIsPressed(true);
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    setIsPressed(false);
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.button,
      ...theme.shadows.sm,
    };

    // Size styles
    const sizeStyles = {
      sm: {
        height: theme.components.button.height.sm,
        paddingHorizontal: theme.components.button.padding.sm.horizontal,
        paddingVertical: theme.components.button.padding.sm.vertical,
      },
      md: {
        height: theme.components.button.height.md,
        paddingHorizontal: theme.components.button.padding.md.horizontal,
        paddingVertical: theme.components.button.padding.md.vertical,
      },
      lg: {
        height: theme.components.button.height.lg,
        paddingHorizontal: theme.components.button.padding.lg.horizontal,
        paddingVertical: theme.components.button.padding.lg.vertical,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary.main,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: theme.colors.secondary.main,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary.main,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      danger: {
        backgroundColor: theme.colors.error.main,
        borderWidth: 0,
      },
    };

    // Disabled styles
    const disabledStyle = disabled ? {
      opacity: 0.5,
      backgroundColor: theme.colors.neutral[300],
    } : {};

    // Full width
    const widthStyle = fullWidth ? { width: '100%' as const } : {};

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...disabledStyle,
      ...widthStyle,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: theme.typography.fontWeights.semibold,
      textAlign: 'center',
    };

    // Size-based text styles
    const sizeTextStyles = {
      sm: { fontSize: theme.typography.fontSizes.sm },
      md: { fontSize: theme.typography.fontSizes.md },
      lg: { fontSize: theme.typography.fontSizes.lg },
    };

    // Variant-based text colors
    const variantTextStyles = {
      primary: { color: theme.colors.primary.contrast },
      secondary: { color: theme.colors.secondary.contrast },
      outline: { color: theme.colors.primary.main },
      ghost: { color: theme.colors.primary.main },
      danger: { color: theme.colors.error.contrast },
    };

    // Disabled text style
    const disabledTextStyle = disabled ? {
      color: theme.colors.text.disabled.light,
    } : {};

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
      ...disabledTextStyle,
      ...textStyle,
    };
  };

  const getIconStyle = () => {
    const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
    const iconColor = getTextStyle().color;
    
    return {
      size: iconSize,
      color: iconColor,
      marginLeft: iconPosition === 'right' ? theme.spacing.sm : 0,
      marginRight: iconPosition === 'left' ? theme.spacing.sm : 0,
    };
  };

  const renderIcon = () => {
    if (!icon) return null;
    
    const iconStyle = getIconStyle();
    
    return (
      <MaterialCommunityIcons
        name={icon as any}
        size={iconStyle.size}
        color={iconStyle.color}
        style={{
          marginLeft: iconStyle.marginLeft,
          marginRight: iconStyle.marginRight,
        }}
      />
    );
  };

  const renderContent = () => {
    if (children) return children;
    
    if (loading) {
      return (
        <>
          <ActivityIndicator
            size="small"
            color={getTextStyle().color}
            style={{ marginRight: theme.spacing.sm }}
          />
          <Text style={getTextStyle()}>Yükleniyor...</Text>
        </>
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        <Text style={getTextStyle()}>{title}</Text>
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled, busy: loading }}
      >
        {renderContent()}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default Button;
