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

export interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  children,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 32,
      },
      medium: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        minHeight: 52,
      },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: '#007AFF',
      },
      secondary: {
        backgroundColor: '#8E8E93',
      },
      success: {
        backgroundColor: '#34C759',
      },
      warning: {
        backgroundColor: '#FF9500',
      },
      error: {
        backgroundColor: '#FF3B30',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#007AFF',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.6 }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    const sizeTextStyles: Record<string, TextStyle> = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantTextStyles: Record<string, TextStyle> = {
      primary: { color: '#FFFFFF' },
      secondary: { color: '#FFFFFF' },
      success: { color: '#FFFFFF' },
      warning: { color: '#FFFFFF' },
      error: { color: '#FFFFFF' },
      outline: { color: '#007AFF' },
      ghost: { color: '#007AFF' },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    };
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'ghost' ? '#007AFF' : '#FFFFFF'} 
        />
      ) : (
        <>
          {children || (
            <Text style={[getTextStyle(), textStyle]}>
              {title}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
