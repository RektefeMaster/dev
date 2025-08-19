import React, { useState, useRef, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import theme from '../theme/theme';

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  type?: 'text' | 'email' | 'password' | 'number' | 'phone';
  disabled?: boolean;
  error?: string;
  success?: boolean;
  required?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  testID?: string;
}

const Input = forwardRef<TextInput, InputProps>(({
  label,
  placeholder,
  value,
  onChangeText,
  variant = 'default',
  size = 'md',
  type = 'text',
  disabled = false,
  error,
  success = false,
  required = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  secureTextEntry = false,
  autoCapitalize = 'none',
  autoCorrect = false,
  keyboardType = 'default',
  returnKeyType = 'done',
  onSubmitEditing,
  blurOnSubmit = true,
  onFocus,
  onBlur,
  testID,
}, ref) => {
  const { isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const labelAnimatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
    
    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(labelAnimatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
    
    if (!value) {
      Animated.timing(labelAnimatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
    
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const getInputStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      borderRadius: theme.borderRadius.input,
      borderWidth: variant === 'outlined' ? 2 : 0,
      ...theme.shadows.xs,
    };

    // Size styles
    const sizeStyles = {
      sm: {
        minHeight: 40,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
      },
      md: {
        minHeight: 48,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      },
      lg: {
        minHeight: 56,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
      },
    };

    // Variant styles with dark mode support
    const variantStyles = {
      default: {
        backgroundColor: isDark ? theme.colors.background.default.dark : theme.colors.background.default.light,
        borderColor: isFocused ? theme.colors.primary.main : (isDark ? theme.colors.border.dark : theme.colors.border.light),
      },
      outlined: {
        backgroundColor: isDark ? theme.colors.background.default.dark : theme.colors.background.default.light,
        borderColor: isFocused ? theme.colors.primary.main : (isDark ? theme.colors.border.dark : theme.colors.border.light),
      },
      filled: {
        backgroundColor: isDark ? theme.colors.background.surface.dark : theme.colors.background.surface.light,
        borderColor: 'transparent',
      },
    };

    // State styles
    const stateStyles = {
      focused: {
        borderColor: theme.colors.primary.main,
        ...theme.shadows.sm,
      },
      error: {
        borderColor: theme.colors.error.main,
      },
      success: {
        borderColor: theme.colors.success.main,
      },
      disabled: {
        backgroundColor: isDark ? theme.colors.background.surface.dark : theme.colors.background.surface.light,
        opacity: 0.6,
      },
    };

    // Multiline styles
    const multilineStyles = multiline ? {
      paddingTop: theme.spacing.md,
      alignItems: 'flex-start' as const,
    } : {};

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(isFocused && stateStyles.focused),
      ...(error && stateStyles.error),
      ...(success && stateStyles.success),
      ...(disabled && stateStyles.disabled),
      ...multilineStyles,
    };
  };

  const getLabelStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: theme.typography.fontSizes.sm,
      fontWeight: theme.typography.fontWeights.medium,
      color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light,
      marginBottom: theme.spacing.xs,
    };

    const animatedStyle = {
      transform: [{
        translateY: labelAnimatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -20],
        }),
      }],
      fontSize: labelAnimatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.typography.fontSizes.sm, theme.typography.fontSizes.xs],
      }) as any,
      color: labelAnimatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [
          isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light,
          theme.colors.primary.main
        ],
      }) as any,
    };

    return {
      ...baseStyle,
      ...animatedStyle,
      ...labelStyle,
    };
  };

  const getTextInputStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      flex: 1,
      fontSize: theme.typography.fontSizes.md,
      color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light,
      paddingVertical: 0,
    };

    // Size-based text styles
    const sizeTextStyles = {
      sm: { fontSize: theme.typography.fontSizes.sm },
      md: { fontSize: theme.typography.fontSizes.md },
      lg: { fontSize: theme.typography.fontSizes.lg },
    };

    // Multiline styles
    const multilineStyles = multiline ? {
      textAlignVertical: 'top' as const,
      paddingTop: 0,
    } : {};

    return {
      ...baseStyle,
      ...sizeTextStyles[size],
      ...multilineStyles,
      ...inputStyle,
    };
  };

  const getErrorStyle = (): TextStyle => {
    return {
      fontSize: theme.typography.fontSizes.xs,
      color: theme.colors.error.main,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
      ...errorStyle,
    };
  };

  const getIconStyle = () => {
    const iconSize = size === 'sm' ? 18 : size === 'md' ? 20 : 24;
    const iconColor = error ? theme.colors.error.main : 
                     success ? theme.colors.success.main : 
                     isFocused ? theme.colors.primary.main : 
                     (isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light);
    
    return {
      size: iconSize,
      color: iconColor,
      marginRight: theme.spacing.sm,
    };
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    
    const iconStyle = getIconStyle();
    
    return (
      <MaterialCommunityIcons
        name={leftIcon as any}
        size={iconStyle.size}
        color={iconStyle.color}
        style={{ marginRight: iconStyle.marginRight }}
      />
    );
  };

  const renderRightIcon = () => {
    if (!rightIcon && type !== 'password') return null;
    
    const iconStyle = getIconStyle();
    
    if (type === 'password') {
      return (
        <TouchableOpacity
          onPress={togglePasswordVisibility}
          style={{ marginLeft: theme.spacing.sm }}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          <MaterialCommunityIcons
            name={isPasswordVisible ? 'eye-off' : 'eye'}
            size={iconStyle.size}
            color={iconStyle.color}
          />
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity
        onPress={onRightIconPress}
        style={{ marginLeft: theme.spacing.sm }}
        accessibilityRole="button"
        accessibilityLabel="Sağ ikon"
      >
        <MaterialCommunityIcons
          name={rightIcon as any}
          size={iconStyle.size}
          color={iconStyle.color}
        />
      </TouchableOpacity>
    );
  };

  const getKeyboardType = () => {
    if (keyboardType !== 'default') return keyboardType;
    
    switch (type) {
      case 'email':
        return 'email-address';
      case 'number':
        return 'numeric';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  const getSecureTextEntry = () => {
    if (type === 'password') {
      return !isPasswordVisible;
    }
    return secureTextEntry;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Animated.Text style={getLabelStyle()}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Animated.Text>
      )}
      
      <View style={getInputStyle()}>
        {renderLeftIcon()}
        
        <TextInput
          ref={ref}
          style={getTextInputStyle()}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? theme.colors.text.disabled.dark : theme.colors.text.disabled.light}
          secureTextEntry={getSecureTextEntry()}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={getKeyboardType()}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={!disabled}
          testID={testID}
          accessibilityRole="text"
          accessibilityLabel={label || placeholder}
          accessibilityState={{ disabled }}
        />
        
        {renderRightIcon()}
      </View>
      
      {error && (
        <Text style={getErrorStyle()}>
          {error}
        </Text>
      )}
      
      {maxLength && (
        <Text style={[styles.characterCount, { color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light }]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  required: {
    color: theme.colors.error.main,
  },
  characterCount: {
    fontSize: theme.typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
});

Input.displayName = 'Input';

export default Input;
