import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, colorStrings, typography, borderRadius, spacing, shadows } from '@/shared/theme';
import { serviceNameMapping } from '@/shared/utils/serviceTranslator';

export interface ScheduleCardProps {
  time: string;
  serviceType: string;
  customerName: string;
  vehicleInfo: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  onPress?: () => void;
  style?: ViewStyle;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  time,
  serviceType,
  customerName,
  vehicleInfo,
  status,
  priority = 'medium',
  onPress,
  style,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          color: colorStrings.warning,
          backgroundColor: colorStrings.background.tertiary,
          icon: 'time' as const,
          text: 'Bekliyor',
        };
      case 'in-progress':
        return {
          color: colorStrings.primary,
          backgroundColor: colorStrings.background.tertiary,
          icon: 'refresh' as const,
          text: 'Devam Ediyor',
        };
      case 'completed':
        return {
          color: colorStrings.success,
          backgroundColor: colorStrings.background.tertiary,
          icon: 'checkmark-circle' as const,
          text: 'Tamamlandı',
        };
      case 'cancelled':
        return {
          color: colorStrings.error,
          backgroundColor: colorStrings.background.tertiary,
          icon: 'close-circle' as const,
          text: 'İptal Edildi',
        };
      default:
        return {
          color: colorStrings.text.tertiary,
          backgroundColor: colorStrings.background.tertiary,
          icon: 'help-circle' as const,
          text: 'Bilinmiyor',
        };
    }
  };

  const getPriorityConfig = () => {
    switch (priority) {
      case 'high':
        return {
          color: colorStrings.error,
          backgroundColor: colorStrings.background.tertiary,
          text: 'Yüksek',
        };
      case 'medium':
        return {
          color: colorStrings.warning,
          backgroundColor: colorStrings.background.tertiary,
          text: 'Orta',
        };
      case 'low':
        return {
          color: colorStrings.success,
          backgroundColor: colorStrings.background.tertiary,
          text: 'Düşük',
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  const priorityConfig = getPriorityConfig();

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Time Badge */}
      <View style={[styles.timeContainer, { backgroundColor: colorStrings.primary }]}>
        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Service Type */}
        <Text style={styles.serviceType}>{serviceNameMapping[serviceType] || serviceType}</Text>
        
        {/* Customer and Vehicle Info */}
        <Text style={styles.details}>
          {customerName} • {vehicleInfo}
        </Text>
        
        {/* Status and Priority Row */}
        <View style={styles.bottomRow}>
          {/* Status */}
          <View style={[styles.statusContainer, { backgroundColor: statusConfig.backgroundColor }]}>
            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>

          {/* Priority Badge */}
          {priorityConfig && (
            <View style={[styles.priorityContainer, { backgroundColor: priorityConfig.backgroundColor }]}>
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                {priorityConfig.text}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Button */}
      {onPress && (
        <View style={styles.actionButton}>
          <Ionicons name="chevron-forward" size={20} color={colorStrings.text.tertiary} />
        </View>
      )}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colorStrings.background.secondary,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.card,
  },
  timeContainer: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  timeText: {
    color: colorStrings.text.inverse,
    fontWeight: '700',
    fontSize: typography.caption.large.fontSize,
  },
  content: {
    flex: 1,
  },
  serviceType: {
    color: colorStrings.text.primary,
    fontWeight: '600',
    fontSize: typography.body2.fontSize,
    marginBottom: spacing.xs,
  },
  details: {
    color: colorStrings.text.tertiary,
    fontSize: typography.caption.large.fontSize,
    marginBottom: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
  },
  priorityContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
  },
  actionButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});

export default ScheduleCard;
