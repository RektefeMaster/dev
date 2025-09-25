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
import { colors, typography, spacing, borderRadius } from '@/theme/theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-outline',
  title,
  subtitle,
  actionText,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color={colors.text.tertiary} />
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.body2.lineHeight,
  },
  actionButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
  },
  actionText: {
    color: colors.text.inverse,
    fontSize: typography.button.medium.fontSize,
    fontWeight: '600',
  },
});

export default EmptyState; 
