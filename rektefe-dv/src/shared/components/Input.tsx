import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { borderRadius, spacing } from '@/theme/theme';

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  error,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => {
    if (!error) {
      setIsFocused(true);
    }
  };
  const handleBlur = () => setIsFocused(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getBorderColor = () => {
    if (error) return theme.colors.error.main;
    if (isFocused) return theme.colors.primary.main;
    if (disabled) return theme.colors.border.tertiary;
    return theme.colors.border.primary;
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.background.quaternary;
    return theme.colors.background.card;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, disabled && styles.labelDisabled, error && styles.labelError]}>
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons
              name={leftIcon}
              size={20}
              color={disabled ? theme.colors.text.quaternary : (error ? theme.colors.error.main : theme.colors.text.tertiary)}
            />
          </View>
        )}

        {/* Text Input */}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.quaternary}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={!disabled && !error}
          onFocus={error ? undefined : handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={accessibilityHint || (error ? `Hata: ${error}` : undefined)}
          accessibilityState={{ disabled: disabled || !!error }}
        />

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            disabled={disabled}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={disabled ? theme.colors.text.quaternary : (error ? theme.colors.error.main : theme.colors.text.tertiary)}
            />
          </TouchableOpacity>
        )}

        {/* Password Toggle Icon */}
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.passwordToggleContainer}
            onPress={togglePasswordVisibility}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            accessibilityHint="Şifre görünürlüğünü değiştir"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={disabled ? theme.colors.text.quaternary : theme.colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.error.main} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: theme.typography.label.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: spacing.sm,
  },
  labelDisabled: {
    color: theme.colors.text.quaternary,
  },
  labelError: {
    color: theme.colors.error.main,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.input,
    backgroundColor: theme.colors.background.card,
    ...theme.shadows.small,
  },
  inputContainerFocused: {
    ...theme.shadows.medium,
  },
  inputContainerError: {
    borderWidth: 2,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  leftIconContainer: {
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  rightIconContainer: {
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
  },
  passwordToggleContainer: {
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.body2.fontSize,
    color: theme.colors.text.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    lineHeight: theme.typography.body2.lineHeight,
    minHeight: 44, // WCAG 2.1 AA: Minimum 44px touch target height
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.caption.large.fontSize,
    color: theme.colors.error.main,
    fontWeight: '500',
  },
});

export default Input;
