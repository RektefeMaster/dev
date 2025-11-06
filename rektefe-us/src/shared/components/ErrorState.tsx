import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { spacing, borderRadius, shadows } from '@/shared/theme';

export interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryText?: string;
  style?: ViewStyle;
  errorType?: 'network' | 'server' | 'generic';
}

const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  title = 'Bir Hata Oluştu',
  onRetry,
  retryText = 'Tekrar Dene',
  style,
  errorType = 'generic',
}) => {
  const { themeColors, isDark } = useTheme();
  const styles = createStyles(themeColors, isDark);

  const getIcon = () => {
    switch (errorType) {
      case 'network':
        return 'wifi-outline';
      case 'server':
        return 'server-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Icon Container */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getIcon()} 
            size={56} 
            color={themeColors.error.main} 
          />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Retry Button */}
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="refresh" 
            size={18} 
            color={themeColors.text.inverse} 
            style={styles.retryIcon}
          />
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    minHeight: 300,
  },
  iconWrapper: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: isDark 
      ? colors.error.ultraLight
      : colors.error.light,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.error.main,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 28,
  },
  message: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    maxWidth: '90%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    ...shadows.button,
    marginTop: spacing.sm,
  },
  retryIcon: {
    marginRight: spacing.sm,
  },
  retryText: {
    color: colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ErrorState;

