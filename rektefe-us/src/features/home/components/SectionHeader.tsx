import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/shared/theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  showDivider?: boolean;
  style?: ViewStyle;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionText,
  onActionPress,
  showDivider = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Header Content */}
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
        
        {actionText && onActionPress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onActionPress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{actionText}</Text>
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Divider */}
      {showDivider && (
        <View style={styles.divider} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    lineHeight: typography.h3.lineHeight,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body3.fontSize,
    lineHeight: typography.body3.lineHeight,
    color: colors.text.tertiary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.quaternary,
  },
  actionText: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.primary,
    marginRight: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.primary,
    opacity: 0.3,
  },
});

export default SectionHeader;
