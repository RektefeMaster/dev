import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';
import {
  translateElectricalSystemType,
  translateElectricalProblemType,
  translateElectricalUrgencyLevel,
  getUrgencyLevelBadgeStyle,
  getRecurringBadgeStyle,
  getUrgencyLevelIcon,
  getElectricalSystemIcon
} from '@/shared/utils/electricalHelpers';
import { ElectricalJob } from '@/shared/types';

export default function ElectricalJobDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const { jobId } = route.params as { jobId: string };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [job, setJob] = useState<ElectricalJob | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (jobId) {
        fetchJobDetail();
      }
    }, [jobId])
  );

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      const response = await apiService.ElectricalService.getElectricalJobById(jobId);

      if (response.success && response.data) {
        setJob(response.data);
      } else {
        Alert.alert('Hata', response.message || 'İş detayı yüklenemedi', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Fetch job detail error:', error);
      Alert.alert('Hata', 'İş detayı yüklenirken bir hata oluştu', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobDetail();
    setRefreshing(false);
  };

  const handlePrepareQuote = () => {
    (navigation as any).navigate('ElectricalService');
  };

  const handleSendQuote = async () => {
    try {
      const response = await apiService.ElectricalService.sendQuote(jobId);
      if (response.success) {
        Alert.alert('Başarılı', 'Teklif müşteriye gönderildi');
        await fetchJobDetail();
      } else {
        Alert.alert('Hata', response.message || 'Teklif gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif gönderilirken bir hata oluştu');
    }
  };

  const handleCallCustomer = () => {
    if (job?.customer?.phone) {
      Linking.openURL(`tel:${job.customer.phone}`);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      quote_preparation: 'Teklif Hazırlanıyor',
      quote_sent: 'Teklif Gönderildi',
      quote_accepted: 'Teklif Kabul Edildi',
      work_started: 'İş Başladı',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
      pending_mechanic: 'Usta Bekleniyor',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      quote_preparation: '#FF9800',
      quote_sent: '#2196F3',
      quote_accepted: '#4CAF50',
      work_started: '#4CAF50',
      in_progress: '#4CAF50',
      completed: '#4CAF50',
      cancelled: '#F44336',
      pending_mechanic: '#9E9E9E',
    };
    return colorMap[status] || '#666';
  };

  const getStageText = (stage: string) => {
    const stages: Record<string, string> = {
      quote_preparation: 'Teklif Hazırlama',
      diagnosis: 'Teşhis/Kontrol',
      part_ordering: 'Parça Siparişi',
      repair: 'Onarım',
      replacement: 'Parça Değişimi',
      testing: 'Test/Kontrol',
      quality_check: 'Kalite Kontrol',
      completed: 'Tamamlandı'
    };
    return stages[stage] || stage;
  };

  const getStageStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      pending: 'Bekliyor',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      skipped: 'Atlandı'
    };
    return statuses[status] || status;
  };

  const getStageStatusColor = (status: string) => {
    const colorsMap: Record<string, string> = {
      pending: '#9E9E9E',
      in_progress: '#2196F3',
      completed: '#4CAF50',
      skipped: '#FF9800'
    };
    return colorsMap[status] || '#666';
  };

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const urgencyBadgeStyle = getUrgencyLevelBadgeStyle(job.electricalInfo.urgencyLevel);
  const recurringBadgeStyle = getRecurringBadgeStyle();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Elektrik İş Detayı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Status Badge */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(job.status) + '20' }]}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(job.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
            {getStatusText(job.status)}
          </Text>
        </View>

        {/* Customer & Vehicle Info */}
        <Card variant="elevated" style={styles.infoCard}>
          <Text style={styles.cardTitle}>Bilgiler</Text>
          
          {job.customer && (
            <View style={styles.infoRow}>
              <Ionicons name="person-circle" size={20} color={colors.primary.main} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Müşteri</Text>
                <Text style={styles.infoValue}>
                  {job.customer.name} {job.customer.surname}
                </Text>
                {job.customer.phone && (
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={handleCallCustomer}
                  >
                    <Ionicons name="call" size={16} color={colors.primary.main} />
                    <Text style={styles.phoneText}>{job.customer.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {job.vehicle && (
            <View style={styles.infoRow}>
              <Ionicons name="car" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Araç</Text>
                <Text style={styles.infoValue}>
                  {job.vehicle.brand} {job.vehicle.modelName} - {job.vehicle.plateNumber}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Electrical Info */}
        <Card variant="elevated" style={styles.infoCard}>
          <View style={styles.electricalHeader}>
            <Ionicons name="flash" size={20} color={colors.primary.main} />
            <Text style={styles.cardTitle}>Elektrik Detayları</Text>
          </View>

          <View style={styles.electricalBadges}>
            <View style={[styles.electricalBadge, { backgroundColor: colors.background.tertiary }]}>
              <Ionicons name={getElectricalSystemIcon(job.electricalInfo.systemType) as any} size={16} color={colors.primary.main} />
              <Text style={styles.electricalBadgeText}>
                {translateElectricalSystemType(job.electricalInfo.systemType)}
              </Text>
            </View>
            <View style={[styles.electricalBadge, { backgroundColor: colors.background.tertiary }]}>
              <Ionicons name="construct-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.electricalBadgeText}>
                {translateElectricalProblemType(job.electricalInfo.problemType)}
              </Text>
            </View>
            {job.electricalInfo.urgencyLevel === 'acil' && (
              <View style={[styles.electricalBadge, urgencyBadgeStyle]}>
                <Ionicons name={getUrgencyLevelIcon(job.electricalInfo.urgencyLevel) as any} size={14} color={urgencyBadgeStyle.color} />
                <Text style={[styles.electricalBadgeText, { color: urgencyBadgeStyle.color }]}>
                  Acil
                </Text>
              </View>
            )}
            {job.electricalInfo.isRecurring && (
              <View style={[styles.electricalBadge, recurringBadgeStyle]}>
                <Ionicons name="repeat" size={14} color={recurringBadgeStyle.color} />
                <Text style={[styles.electricalBadgeText, { color: recurringBadgeStyle.color }]}>
                  Tekrarlayan
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.descriptionText}>{job.electricalInfo.description}</Text>

          {job.electricalInfo.lastWorkingCondition && (
            <View style={styles.lastWorkingContainer}>
              <Text style={styles.lastWorkingTitle}>Son Çalışma Durumu:</Text>
              <Text style={styles.lastWorkingText}>{job.electricalInfo.lastWorkingCondition}</Text>
            </View>
          )}

          {job.electricalInfo.photos && job.electricalInfo.photos.length > 0 && (
            <View style={styles.photosContainer}>
              <Text style={styles.sectionTitle}>Arıza Fotoğrafları</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {job.electricalInfo.photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.damagePhoto} />
                ))}
              </ScrollView>
            </View>
          )}
        </Card>

        {/* Quote Info */}
        {job.quote && (
          <Card variant="elevated" style={styles.infoCard}>
            <View style={styles.quoteHeader}>
              <Text style={styles.cardTitle}>Teklif</Text>
              {job.quote.status === 'sent' && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Müşteri Onayı Bekleniyor</Text>
                </View>
              )}
            </View>
            
            {job.quote.totalAmount > 0 ? (
              <>
                <View style={styles.quoteSummary}>
                  <Text style={styles.quoteAmountLabel}>Toplam</Text>
                  <Text style={styles.quoteAmount}>{job.quote.totalAmount.toLocaleString('tr-TR')} ₺</Text>
                </View>

                {job.quote.breakdown && (
                  <View style={styles.breakdownContainer}>
                    {job.quote.breakdown.partsToReplace && job.quote.breakdown.partsToReplace.length > 0 && (
                      <View style={styles.breakdownSection}>
                        <Text style={styles.breakdownTitle}>Değişecek Parçalar:</Text>
                        {job.quote.breakdown.partsToReplace.map((part, index) => (
                          <Text key={index} style={styles.breakdownItem}>
                            • {part.partName} ({part.brand}) - {part.quantity}x {part.unitPrice.toLocaleString('tr-TR')} ₺ = {(part.quantity * part.unitPrice).toLocaleString('tr-TR')} ₺
                          </Text>
                        ))}
                      </View>
                    )}
                    {job.quote.breakdown.diagnosisCost > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Teşhis Ücreti:</Text>
                        <Text style={styles.breakdownValue}>{job.quote.breakdown.diagnosisCost.toLocaleString('tr-TR')} ₺</Text>
                      </View>
                    )}
                    {job.quote.breakdown.testingCost > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Test/Kontrol Ücreti:</Text>
                        <Text style={styles.breakdownValue}>{job.quote.breakdown.testingCost.toLocaleString('tr-TR')} ₺</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noQuoteText}>Henüz teklif hazırlanmamış</Text>
            )}

            {job.status === 'quote_preparation' && (
              <Button
                title="Teklif Hazırla"
                onPress={handlePrepareQuote}
                variant="primary"
                icon="document-text"
                style={styles.actionButton}
              />
            )}

            {job.status === 'quote_preparation' && job.quote.totalAmount > 0 && (
              <Button
                title="Teklifi Gönder"
                onPress={handleSendQuote}
                variant="primary"
                icon="send"
                style={styles.actionButton}
              />
            )}
          </Card>
        )}

        {/* Workflow Progress */}
        {job.workflow && (
          <Card variant="elevated" style={styles.infoCard}>
            <Text style={styles.cardTitle}>İş Akışı</Text>
            <Text style={styles.currentStageText}>
              Mevcut Aşama: {getStageText(job.workflow.currentStage)}
            </Text>
            <View style={styles.workflowStages}>
              {job.workflow.stages.map((stage, index) => (
                <View key={index} style={styles.workflowStageItem}>
                  <View style={[styles.stageDot, { backgroundColor: getStageStatusColor(stage.status) }]} />
                  <View style={styles.stageContent}>
                    <Text style={styles.stageName}>{getStageText(stage.stage)}</Text>
                    <Text style={[styles.stageStatusText, { color: getStageStatusColor(stage.status) }]}>
                      {getStageStatusText(stage.status)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  phoneText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.main,
    fontWeight: '500',
  },
  electricalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  electricalBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  electricalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  electricalBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.text.primary,
  },
  descriptionText: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  lastWorkingContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  lastWorkingTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  lastWorkingText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  photosContainer: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  damagePhoto: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    backgroundColor: colors.background.secondary,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pendingBadge: {
    backgroundColor: colors.warning?.main + '20' || '#F59E0B20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.warning?.main || '#F59E0B',
  },
  quoteSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: spacing.md,
  },
  quoteAmountLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  quoteAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.primary.main,
  },
  breakdownContainer: {
    marginBottom: spacing.md,
  },
  breakdownSection: {
    marginBottom: spacing.md,
  },
  breakdownTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  breakdownLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  breakdownValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  breakdownItem: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  noQuoteText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: spacing.md,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  currentStageText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  workflowStages: {
    gap: spacing.md,
  },
  workflowStageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stageContent: {
    flex: 1,
  },
  stageName: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  stageStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});

