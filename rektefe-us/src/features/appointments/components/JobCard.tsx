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

export interface JobCardProps {
  serviceType: string;
  customerName: string;
  vehicleInfo: string;
  completedDate: string;
  earnings: number;
  status: 'completed' | 'in-progress' | 'cancelled';
  onPress?: () => void;
  style?: ViewStyle;
}

const JobCard: React.FC<JobCardProps> = ({
  serviceType,
  customerName,
  vehicleInfo,
  completedDate,
  earnings,
  status,
  onPress,
  style,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          color: colorStrings.success,
          backgroundColor: colorStrings.background.tertiary,
          icon: 'checkmark-circle' as const,
          text: 'Tamamlandı',
        };
      case 'in-progress':
        return {
          color: colorStrings.primary,
          backgroundColor: colorStrings.background.tertiary,
          icon: 'refresh' as const,
          text: 'Devam Ediyor',
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

  const statusConfig = getStatusConfig();
  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.jobIconContainer}>
          <Ionicons name="checkmark-circle" size={24} color={colorStrings.success} />
        </View>
        
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{serviceNameMapping[serviceType] || serviceType}</Text>
          <Text style={styles.jobCustomer}>
            {customerName} • {vehicleInfo}
          </Text>
          <Text style={styles.jobDateTime}>{completedDate}</Text>
        </View>
        
        <View style={styles.jobEarnings}>
          <Text style={styles.jobEarningsText}>+₺{earnings}</Text>
        </View>
      </View>

      {/* Status Badge */}
      <View style={[styles.jobStatus, { backgroundColor: statusConfig.backgroundColor }]}>
        <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
        <Text style={[styles.jobStatusText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorStrings.background.secondary,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  jobIconContainer: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    color: colorStrings.text.primary,
    fontWeight: '600',
    fontSize: typography.body2.fontSize,
    marginBottom: spacing.xs,
  },
  jobCustomer: {
    color: colorStrings.text.tertiary,
    fontSize: typography.caption.large.fontSize,
    marginBottom: spacing.xs,
  },
  jobDateTime: {
    color: colorStrings.text.tertiary,
    fontSize: typography.caption.small.fontSize,
  },
  jobEarnings: {
    alignItems: 'flex-end',
  },
  jobEarningsText: {
    color: colorStrings.success,
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
  },
  jobStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  jobStatusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
  },
});

export default JobCard;
