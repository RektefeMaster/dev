import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/theme/theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-outline',
  title,
  subtitle,
  actionText,
  onActionPress,
  style,
  iconSize = 64,
}) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);

  return (
    <View style={[styles.container, style]}>
      {/* Icon Container with subtle background */}
      <View style={styles.iconWrapper}>
      <View style={styles.iconContainer}>
          <Ionicons 
            name={icon} 
            size={iconSize} 
            color={theme.colors.text.tertiary} 
          />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {/* Action Button */}
      {actionText && onActionPress && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: any, isDark: boolean) => {
  // Theme null check
  if (!theme) {
    return StyleSheet.create({
      container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 300 },
      iconWrapper: { marginBottom: spacing.lg },
      iconContainer: { width: 96, height: 96, borderRadius: 48, opacity: 0.8 },
      title: { fontSize: 22, fontWeight: '600', marginBottom: spacing.sm },
      subtitle: { fontSize: 15, marginBottom: spacing.lg, paddingHorizontal: spacing.lg },
      actionButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.button, marginTop: spacing.sm },
      actionText: { fontSize: 15, fontWeight: '600' },
    });
  }
  
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
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
        ? (theme.colors?.background?.tertiary || '#1C1C1E')
        : (theme.colors?.background?.secondary || '#F2F2F7'),
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.small,
      opacity: 0.8,
    },
    title: {
      fontSize: theme.typography?.h3?.fontSize || 22,
      fontWeight: '600',
      color: theme.colors?.text?.primary || '#000000',
      textAlign: 'center',
      marginBottom: spacing.sm,
      lineHeight: theme.typography?.h3?.lineHeight || 28,
    },
    subtitle: {
      fontSize: theme.typography?.body2?.fontSize || 15,
      color: theme.colors?.text?.secondary || '#8E8E93',
      textAlign: 'center',
      marginBottom: spacing.lg,
      lineHeight: theme.typography?.body2?.lineHeight || 20,
      paddingHorizontal: spacing.lg,
    },
    actionButton: {
      backgroundColor: theme.colors?.primary?.main || '#007AFF',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.button,
      ...shadows.button,
      marginTop: spacing.sm,
    },
    actionText: {
      color: theme.colors?.text?.inverse || '#FFFFFF',
      fontSize: theme.typography?.button?.medium?.fontSize || 15,
      fontWeight: '600',
    },
  });
};

export default EmptyState; 
