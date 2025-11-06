import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/theme/theme';

export interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryText?: string;
  style?: StyleProp<ViewStyle>;
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
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);

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
            color={theme.colors.error.main} 
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
            color={theme.colors.text.inverse} 
            style={styles.retryIcon}
          />
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
  </View>
);
};

const createStyles = (theme: any, isDark: boolean) => {
  // Theme null check
  if (!theme) {
    return StyleSheet.create({
      container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
      iconWrapper: { marginBottom: spacing.lg },
      iconContainer: { width: 96, height: 96, borderRadius: 48 },
      title: { fontSize: 22, fontWeight: '600', marginBottom: spacing.sm },
      message: { fontSize: 15, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
      retryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.button, marginTop: spacing.sm },
      retryIcon: { marginRight: spacing.sm },
      retryText: { fontSize: 15, fontWeight: '600' },
    });
  }
  
  return StyleSheet.create({
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
        ? (theme.colors?.error?.ultraLight || '#1C1C1E')
        : (theme.colors?.error?.light || '#FEE2E2'),
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.small,
    },
    title: {
      fontSize: theme.typography?.h3?.fontSize || 22,
      fontWeight: '600',
      color: theme.colors?.error?.main || '#FF3B30',
      textAlign: 'center',
      marginBottom: spacing.sm,
      lineHeight: theme.typography?.h3?.lineHeight || 28,
    },
    message: {
      fontSize: theme.typography?.body2?.fontSize || 15,
      color: theme.colors?.text?.secondary || '#8E8E93',
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: theme.typography?.body2?.lineHeight || 20,
      paddingHorizontal: spacing.lg,
      maxWidth: '90%',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors?.error?.main || '#FF3B30',
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
      color: theme.colors?.text?.inverse || '#FFFFFF',
      fontSize: theme.typography?.button?.medium?.fontSize || 15,
      fontWeight: '600',
    },
  });
};

export default ErrorState; 