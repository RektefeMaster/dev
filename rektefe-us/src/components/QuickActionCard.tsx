import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '../theme/theme';

export interface QuickActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  title,
  subtitle,
  variant = 'primary',
  onPress,
  style,
  disabled = false,
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary.ultraLight,
          iconBg: colors.primary.main,
          iconColor: colors.text.inverse,
          titleColor: colors.text.primary,
          subtitleColor: colors.text.secondary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary.ultraLight,
          iconBg: colors.secondary.main,
          iconColor: colors.text.inverse,
          titleColor: colors.text.primary,
          subtitleColor: colors.text.secondary,
        };
      case 'success':
        return {
          backgroundColor: colors.success.ultraLight,
          iconBg: colors.success.main,
          iconColor: colors.text.inverse,
          titleColor: colors.text.primary,
          subtitleColor: colors.text.secondary,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning.ultraLight,
          iconBg: colors.warning.main,
          iconColor: colors.text.inverse,
          titleColor: colors.text.primary,
          subtitleColor: colors.text.secondary,
        };
      case 'error':
        return {
          backgroundColor: colors.error.ultraLight,
          iconBg: colors.error.main,
          iconColor: colors.text.inverse,
          titleColor: colors.text.primary,
          subtitleColor: colors.text.secondary,
        };
      default:
        return {
          backgroundColor: colors.primary.ultraLight,
          iconBg: colors.primary.main,
          iconColor: colors.text.inverse,
          titleColor: colors.text.primary,
          subtitleColor: colors.text.secondary,
        };
    }
  };

  const variantConfig = getVariantConfig();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: variantConfig.backgroundColor },
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      {/* Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: variantConfig.iconBg }]}>
        <Ionicons name={icon} size={28} color={variantConfig.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: variantConfig.titleColor }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: variantConfig.subtitleColor }]}>{subtitle}</Text>
        )}
      </View>

      {/* Arrow Icon */}
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    position: 'relative',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  content: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.caption.large.fontSize,
    textAlign: 'center',
  },
  arrowContainer: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    opacity: 0.7,
  },
});

export default QuickActionCard;
