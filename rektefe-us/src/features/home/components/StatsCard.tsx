import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '@/shared/theme';

export interface StatsCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  value,
  label,
  variant = 'primary',
  trend,
  trendValue,
  onPress,
  style,
}) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return {
          iconBg: colors.primary.ultraLight,
          iconColor: colors.primary,
          valueColor: colors.text.primary,
        };
      case 'secondary':
        return {
          iconBg: colors.secondary.ultraLight,
          iconColor: colors.secondary,
          valueColor: colors.text.primary,
        };
      case 'success':
        return {
          iconBg: colors.success.ultraLight,
          iconColor: colors.success,
          valueColor: colors.text.primary,
        };
      case 'warning':
        return {
          iconBg: colors.warning.ultraLight,
          iconColor: colors.warning,
          valueColor: colors.text.primary,
        };
      case 'error':
        return {
          iconBg: colors.error.ultraLight,
          iconColor: colors.error,
          valueColor: colors.text.primary,
        };
      default:
        return {
          iconBg: colors.primary.ultraLight,
          iconColor: colors.primary,
          valueColor: colors.text.primary,
        };
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return { name: 'trending-up' as const, color: colors.success };
      case 'down':
        return { name: 'trending-down' as const, color: colors.error };
      case 'neutral':
        return { name: 'remove' as const, color: colors.text.tertiary };
      default:
        return null;
    }
  };

  const variantColors = getVariantColors();
  const trendIcon = getTrendIcon();

  return (
    <View style={[styles.container, style]}>
      {/* Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: variantColors.iconBg }]}>
        <Ionicons name={icon} size={24} color={variantColors.iconColor} />
      </View>

      {/* Value */}
      <Text style={[styles.value, { color: variantColors.valueColor }]}>
        {value}
      </Text>

      {/* Label */}
      <Text style={styles.label}>
        {label}
      </Text>

      {/* Trend Indicator */}
      {trend && trendIcon && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trendIcon.name} 
            size={16} 
            color={trendIcon.color} 
          />
          {trendValue && (
            <Text style={[styles.trendValue, { color: trendIcon.color }]}>
              {trendValue}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
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
  },
  value: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    lineHeight: typography.h3.lineHeight,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  label: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendValue: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
  },
});

export default StatsCard;
