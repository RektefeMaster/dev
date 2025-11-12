import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';

export interface OdometerSummaryProps {
  estimate?: {
    displayKm: number;
    lastTrueKm: number;
    lastTrueTsUtc: string;
    sinceDays: number;
    rateKmPerDay: number;
    confidence: number;
    isApproximate: boolean;
    status?: {
      code: 'OK' | 'NO_BASELINE' | 'STALE' | 'LOW_CONFIDENCE';
      severity: 'info' | 'warning' | 'critical';
      message: string;
    };
    warnings?: string[];
  };
  verification?: {
    status?: 'verified' | 'missing' | 'failed';
    message?: string;
    warnings?: string[];
  };
  loading?: boolean;
  onUpdatePress?: () => void;
  hasOfflineSubmission?: boolean;
  initialMileage?: number;
  initialMileageUpdatedAt?: string;
}

const formatDate = (isoString: string) => {
  if (!isoString) {
    return '-';
  }
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const formatKm = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  return Math.round(value).toLocaleString('tr-TR');
};

const formatDailyRate = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  return Math.round(value).toLocaleString('tr-TR');
};

const statusSeverityStyles: Record<
  'info' | 'warning' | 'critical',
  { container: { backgroundColor: string }; icon: string; text: string }
> = {
  info: {
    container: { backgroundColor: '#E6F0FF' },
    icon: '#1D4ED8',
    text: '#1D4ED8',
  },
  warning: {
    container: { backgroundColor: '#FFF6E6' },
    icon: '#B15D00',
    text: '#B15D00',
  },
  critical: {
    container: { backgroundColor: '#FDECEC' },
    icon: '#D7263D',
    text: '#D7263D',
  },
};

const statusIconMap: Record<'OK' | 'NO_BASELINE' | 'STALE' | 'LOW_CONFIDENCE', string> = {
  OK: 'check-circle-outline',
  NO_BASELINE: 'alert-circle-outline',
  STALE: 'clock-alert',
  LOW_CONFIDENCE: 'shield-alert',
};

export const OdometerSummary: React.FC<OdometerSummaryProps> = memo(
  ({
    estimate,
    verification,
    loading,
    onUpdatePress,
    hasOfflineSubmission,
    initialMileage,
    initialMileageUpdatedAt,
  }) => {
    if (loading) {
      return (
        <View style={styles.container}>
          <LoadingSkeleton height={56} style={{ borderRadius: 16 }} />
        </View>
      );
    }

    const hasInitialMileage =
      typeof initialMileage === 'number' && Number.isFinite(initialMileage) && initialMileage >= 0;

    if (!estimate) {
      if (hasInitialMileage) {
        return (
          <View style={[styles.container, styles.baselineCard]}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.baselineLabel}>Manuel kilometre</Text>
                <Text style={styles.baselineValue}>{formatKm(initialMileage)} km</Text>
                {initialMileageUpdatedAt && (
                  <Text style={styles.metaText}>
                    Kaydedildi: {formatDate(initialMileageUpdatedAt)}
                  </Text>
                )}
              </View>
              {onUpdatePress && (
                <TouchableOpacity
                  style={[styles.updateButton, hasOfflineSubmission && styles.offlineButton]}
                  onPress={onUpdatePress}
                  accessibilityRole="button"
                  accessibilityLabel="Kilometre güncelle"
                >
                  <MaterialCommunityIcons name="plus-circle" size={18} color="#fff" />
                  <Text style={styles.updateButtonText}>Güncelle</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.baselineHint}>
              Henüz doğrulanmış kilometre kaydı bulunmuyor. Yeni bir kilometre girerek tahminleri
              başlatabilirsiniz.
            </Text>
          </View>
        );
      }

      return (
        <View style={[styles.container, styles.emptyState]}>
          <Text style={styles.emptyTitle}>Kilometre verisi bulunamadı</Text>
          <Text style={styles.emptySubtitle}>
            İlk gerçek kilometreyi girerek akıllı tahminleri başlatabilirsiniz.
          </Text>
          {onUpdatePress && (
            <TouchableOpacity style={styles.smallButton} onPress={onUpdatePress}>
              <Text style={styles.smallButtonText}>Kilometre Gir</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    const approxLabel = estimate.isApproximate ? 'yaklaşık' : 'doğrulanmış';
    const verificationStatus = verification?.status;
    const estimateWarnings = estimate.warnings ?? [];
    const combinedWarnings = Array.from(
      new Set([...estimateWarnings, ...(verification?.warnings ?? [])])
    );
    const status = estimate.status;
    const statusSeverity = status?.severity ?? 'info';
    const statusStyles = statusSeverityStyles[statusSeverity];
    const statusIcon = statusIconMap[status?.code ?? 'OK'];

    return (
      <View
        style={[styles.container, status?.severity === 'critical' && styles.criticalOutline]}
        accessible
        accessibilityRole="summary"
      >
        {status && status.code !== 'OK' && (
          <View style={[styles.statusAlert, statusStyles.container]}>
            <MaterialCommunityIcons
              name={statusIcon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={18}
              color={statusStyles.icon}
            />
            <Text style={[styles.statusAlertText, { color: statusStyles.text }]}>{status.message}</Text>
          </View>
        )}
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text
              style={styles.estimate}
              accessibilityLabel={`Araç kilometresi ${approxLabel} ${formatKm(estimate.displayKm)} kilometre`}
            >
              {(status?.code !== 'OK' || estimate.isApproximate) && (
                <Text style={styles.approxSymbol}>≈</Text>
              )}
              {formatKm(estimate.displayKm)} km
            </Text>
            <Text style={styles.metaText}>
              Son doğrulama: {formatDate(estimate.lastTrueTsUtc)} · Günlük ~
              {formatDailyRate(estimate.rateKmPerDay)} km
            </Text>
          </View>
          {onUpdatePress && (
            <View style={styles.updateButtonContainer}>
              <TouchableOpacity
                style={[styles.updateButton, hasOfflineSubmission && styles.offlineButton]}
                onPress={onUpdatePress}
                accessibilityRole="button"
                accessibilityLabel="Kilometre güncelle"
              >
                <MaterialCommunityIcons name="plus-circle" size={18} color="#fff" style={styles.updateButtonIcon} />
                <Text style={styles.updateButtonText}>Kilometreyi Güncelle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {verificationStatus && (
          <View style={[styles.verificationBadge, styles[`verification_${verificationStatus}`]]}>
            <MaterialCommunityIcons
              name={
                verificationStatus === 'verified'
                  ? 'check-circle'
                  : verificationStatus === 'missing'
                  ? 'alert-circle-outline'
                  : 'shield-alert'
              }
              size={16}
              color={
                verificationStatus === 'verified'
                  ? '#0A8754'
                  : verificationStatus === 'missing'
                  ? '#FF9F1C'
                  : '#D7263D'
              }
            />
            <Text
              style={[
                styles.verificationText,
                verificationStatus === 'verified'
                  ? styles.verificationTextSuccess
                  : verificationStatus === 'missing'
                  ? styles.verificationTextWarning
                  : styles.verificationTextDanger,
              ]}
            >
              {verification?.message ||
                (verificationStatus === 'verified'
                  ? 'Kilometre doğrulandı'
                  : verificationStatus === 'missing'
                  ? 'Servis kilometresi bekleniyor'
                  : 'Kilometre incelemede')}
            </Text>
          </View>
        )}

        {combinedWarnings.length > 0 && (
          <View style={styles.warningContainer}>
            {combinedWarnings.map((warning, index) => (
              <Text key={warning + index} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
          </View>
        )}

        {hasOfflineSubmission && (
          <View style={styles.offlineBadge}>
            <MaterialCommunityIcons name='cloud-alert' size={16} color='#FF9F1C' />
            <Text style={styles.offlineBadgeText}>Gönderim bekliyor</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E1E7F0',
  },
  criticalOutline: {
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  baselineCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4DEEA',
  },
  baselineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  baselineValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  baselineHint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    flex: 1,
    paddingRight: 12,
  },
  approxSymbol: {
    fontSize: 20,
    color: '#007AFF',
    marginRight: 4,
  },
  estimate: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2933',
  },
  metaText: {
    marginTop: 4,
    fontSize: 13,
    color: '#52606D',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 180,
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  updateButtonIcon: {
    marginRight: 8,
  },
  updateButtonContainer: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  verificationBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verification_verified: {
    backgroundColor: '#E6F8EE',
  },
  verification_missing: {
    backgroundColor: '#FFF6E6',
  },
  verification_failed: {
    backgroundColor: '#FDECEC',
  },
  verificationText: {
    fontSize: 13,
  },
  verificationTextSuccess: {
    color: '#0A8754',
    fontWeight: '600',
  },
  verificationTextWarning: {
    color: '#FF9F1C',
    fontWeight: '600',
  },
  verificationTextDanger: {
    color: '#D7263D',
    fontWeight: '600',
  },
  warningContainer: {
    marginTop: 8,
    backgroundColor: '#FFF7E7',
    borderRadius: 12,
    padding: 8,
  },
  warningText: {
    color: '#8A4B08',
    fontSize: 12,
  },
  statusAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusAlertText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  emptyState: {
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2933',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#52606D',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  offlineBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF6E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  offlineBadgeText: {
    color: '#B15D00',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineButton: {
    backgroundColor: '#4B5563',
  },
});

export default OdometerSummary;


