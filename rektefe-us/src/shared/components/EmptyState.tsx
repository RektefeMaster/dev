import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { spacing, borderRadius, shadows } from '@/shared/theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
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
  const { themeColors, isDark } = useTheme();
  const styles = createStyles(themeColors, isDark);

  return (
    <View style={[styles.container, style]}>
      {/* Icon Container with subtle background */}
      <View style={styles.iconWrapper}>
      <View style={styles.iconContainer}>
          <Ionicons 
            name={icon} 
            size={iconSize} 
            color={themeColors.text.tertiary} 
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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
      ? colors.background.tertiary 
      : colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
    opacity: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    ...shadows.button,
    marginTop: spacing.sm,
  },
  actionText: {
    color: colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default EmptyState;
