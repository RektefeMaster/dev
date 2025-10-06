import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, colorStrings, typography, borderRadius, spacing } from '@/shared/theme';

export interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  text: string;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'ghost';
  style?: ViewStyle;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showIcon = true,
  size = 'medium',
  variant = 'filled',
  style,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          color: colorStrings.success,
          backgroundColor: colorStrings.background.tertiary,
          borderColor: colorStrings.success,
        };
      case 'warning':
        return {
          color: colorStrings.warning,
          backgroundColor: colorStrings.background.tertiary,
          borderColor: colorStrings.warning,
        };
      case 'error':
        return {
          color: colorStrings.error,
          backgroundColor: colorStrings.background.tertiary,
          borderColor: colorStrings.error,
        };
      case 'info':
        return {
          color: colorStrings.info,
          backgroundColor: colorStrings.background.tertiary,
          borderColor: colorStrings.info,
        };
      case 'neutral':
        return {
          color: colorStrings.text.tertiary,
          backgroundColor: colorStrings.background.tertiary,
          borderColor: colorStrings.border.primary,
        };
      default:
        return {
          color: colorStrings.text.tertiary,
          backgroundColor: colorStrings.background.tertiary,
          borderColor: colorStrings.border.primary,
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          fontSize: typography.caption.small.fontSize,
          iconSize: 12,
        };
      case 'medium':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: typography.caption.large.fontSize,
          iconSize: 14,
        };
      case 'large':
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          fontSize: typography.body3.fontSize,
          iconSize: 16,
        };
      default:
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: typography.caption.large.fontSize,
          iconSize: 14,
        };
    }
  };

  const getVariantStyle = () => {
    const statusConfig = getStatusConfig();
    
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: statusConfig.borderColor,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: statusConfig.backgroundColor,
          borderWidth: 0,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();
  const variantStyle = getVariantStyle();

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: sizeConfig.paddingHorizontal,
          paddingVertical: sizeConfig.paddingVertical,
          ...variantStyle,
        },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name="checkmark-circle"
          size={sizeConfig.iconSize}
          color={statusConfig.color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            fontSize: sizeConfig.fontSize,
            color: statusConfig.color,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
});

export default StatusBadge;
