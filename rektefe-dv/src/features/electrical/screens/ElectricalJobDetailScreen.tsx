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
  Modal,
  TextInput,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';
import {
  translateElectricalSystemType,
  translateElectricalProblemType,
  translateElectricalUrgencyLevel,
  getUrgencyLevelBadgeStyle,
  getRecurringBadgeStyle,
  getUrgencyLevelIcon,
  getElectricalSystemIcon,
} from '@/shared/utils/electricalHelpers';

interface ElectricalJob {
  _id: string;
  status: string;
  electricalInfo: {
    description: string;
    photos: string[];
    videos?: string[];
    systemType: string;
    problemType: string;
    urgencyLevel: string;
    isRecurring: boolean;
    lastWorkingCondition?: string;
    estimatedRepairTime: number;
  };
  quote: {
    totalAmount: number;
    breakdown: {
      partsToReplace: Array<{
        partName: string;
        brand: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      partsToRepair: Array<{
        partName: string;
        laborHours: number;
        laborRate: number;
        totalPrice: number;
      }>;
      diagnosisCost: number;
      testingCost: number;
      laborCost: number;
      totalCost: number;
    };
    status: string;
  };
  workflow: {
    currentStage: string;
    stages: Array<{
      stage: string;
      status: string;
      photos: string[];
      notes?: string;
    }>;
    estimatedCompletionDate: string;
  };
  mechanicId?: {
    _id: string;
    name: string;
    surname: string;
    phone?: string;
  };
  vehicleId?: {
    brand: string;
    modelName: string;
    plateNumber: string;
    year?: number;
  };
  payment?: {
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
  };
  createdAt: string;
}

export default function ElectricalJobDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);

  const { jobId } = route.params as { jobId: string };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [job, setJob] = useState<ElectricalJob | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

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
      const response = await apiService.getElectricalJobById(jobId);

      if (response.success && response.data) {
        setJob(response.data);
      } else {
        const errorMessage = response.message || 'İş detayı yüklenemedi';
        Alert.alert(
          'Hata',
          errorMessage,
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }
    } catch (error: any) {
      console.error('Fetch job detail error:', error);
      let errorMessage = 'İş detayı yüklenirken bir hata oluştu';
      
      if (error.response?.status === 401) {
        errorMessage = 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Bu iş bulunamadı veya size ait değil.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert(
        'Hata',
        errorMessage,
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobDetail();
    setRefreshing(false);
  };

  const handleAcceptQuote = async () => {
    Alert.alert(
      'Teklifi Kabul Et',
      'Bu teklifi kabul etmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kabul Et',
          onPress: async () => {
            try {
              const response = await apiService.respondToElectricalQuote(jobId, 'accept');
              if (response.success) {
                Alert.alert('Başarılı', 'Teklif kabul edildi');
                fetchJobDetail();
              } else {
                Alert.alert('Hata', response.message || 'Teklif kabul edilemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'Teklif kabul edilirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleRejectQuote = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Uyarı', 'Lütfen red sebebini belirtin');
      return;
    }

    try {
      const response = await apiService.respondToElectricalQuote(jobId, 'reject', rejectionReason);
      if (response.success) {
        Alert.alert('Başarılı', 'Teklif reddedildi');
        setShowRejectModal(false);
        setRejectionReason('');
        fetchJobDetail();
      } else {
        Alert.alert('Hata', response.message || 'Teklif reddedilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif reddedilirken bir hata oluştu');
    }
  };

  const handlePayment = async () => {
    if (!job) {
      Alert.alert('Hata', 'İş bilgisi yüklenemedi');
      return;
    }

    if (job.quote?.status !== 'accepted') {
      Alert.alert('Uyarı', 'Ödeme yapabilmek için önce teklifi onaylamalısınız');
      return;
    }

    if (!job.payment) {
      Alert.alert('Hata', 'Ödeme bilgileri bulunamadı');
      return;
    }

    const remainingAmount = job.payment.totalAmount - job.payment.paidAmount;
    if (remainingAmount <= 0) {
      Alert.alert('Bilgi', 'Bu iş için ödeme tamamlanmış');
      return;
    }

    Alert.alert(
      'Ödeme Onayı',
      `${remainingAmount.toFixed(2)}₺ ödeme yapmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ödemeyi Yap',
          onPress: async () => {
            try {
              const response = await apiService.processElectricalPayment(jobId, remainingAmount, 'card');
              if (response.success) {
                Alert.alert(
                  'Başarılı',
                  'Ödeme başarıyla tamamlandı',
                  [
                    {
                      text: 'Tamam',
                      onPress: () => fetchJobDetail()
                    }
                  ]
                );
              } else {
                Alert.alert('Hata', response.message || 'Ödeme başarısız oldu');
              }
            } catch (error: any) {
              if (error.response?.status === 400 && error.response?.data?.message?.includes('bakiye')) {
                Alert.alert(
                  'Yetersiz Bakiye',
                  'Cüzdanınızda yeterli bakiye yok. Lütfen bakiye yükleyin.',
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Bakiye Yükle',
                      onPress: () => navigation.navigate('AddBalance' as never)
                    }
                  ]
                );
              } else {
                Alert.alert('Hata', 'Ödeme işlemi sırasında bir hata oluştu');
              }
            }
          }
        }
      ]
    );
  };

  const handleCallMechanic = () => {
    if (job?.mechanicId?.phone) {
      Linking.openURL(`tel:${job.mechanicId.phone}`);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'quote_preparation': 'Teklif Hazırlanıyor',
      'quote_sent': 'Teklif Gönderildi',
      'quote_accepted': 'Teklif Kabul Edildi',
      'work_started': 'İş Başladı',
      'in_progress': 'Devam Ediyor',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi',
      'pending_mechanic': 'Usta Bekleniyor',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'quote_preparation': '#FF9800',
      'quote_sent': '#2196F3',
      'quote_accepted': '#4CAF50',
      'work_started': '#4CAF50',
      'in_progress': '#4CAF50',
      'completed': '#4CAF50',
      'cancelled': '#F44336',
      'pending_mechanic': '#FF9800',
    };
    return colorMap[status] || '#9E9E9E';
  };

  const getStageText = (stage: string) => {
    const stages: Record<string, string> = {
      'quote_preparation': 'Teklif Hazırlama',
      'diagnosis': 'Teşhis/Kontrol',
      'part_ordering': 'Parça Siparişi',
      'repair': 'Onarım',
      'replacement': 'Parça Değişimi',
      'testing': 'Test/Kontrol',
      'quality_check': 'Kalite Kontrol',
      'completed': 'Tamamlandı'
    };
    return stages[stage] || stage;
  };

  const getStageStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      'pending': 'Bekliyor',
      'in_progress': 'Devam Ediyor',
      'completed': 'Tamamlandı',
      'skipped': 'Atlandı'
    };
    return statuses[status] || status;
  };

  const getStageStatusColor = (status: string) => {
    const colorsMap: Record<string, string> = {
      'pending': '#9E9E9E',
      'in_progress': '#2196F3',
      'completed': '#4CAF50',
      'skipped': '#FF9800'
    };
    return colorsMap[status] || '#666';
  };

  if (loading || !job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
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
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
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
            colors={[theme.colors.primary.main]}
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

        {/* Vehicle & Mechanic Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Bilgiler</Text>
          
          {job.vehicleId && (
            <View style={styles.infoRow}>
              <Ionicons name="car" size={20} color={theme.colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Araç</Text>
                <Text style={styles.infoValue}>
                  {job.vehicleId.brand} {job.vehicleId.modelName} - {job.vehicleId.plateNumber}
                </Text>
              </View>
            </View>
          )}

          {job.mechanicId && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color={theme.colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Usta</Text>
                <Text style={styles.infoValue}>
                  {job.mechanicId.name} {job.mechanicId.surname}
                </Text>
                {job.mechanicId.phone && (
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={handleCallMechanic}
                  >
                    <Ionicons name="call" size={16} color={theme.colors.primary.main} />
                    <Text style={styles.phoneText}>{job.mechanicId.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Electrical Info */}
        <View style={styles.infoCard}>
          <View style={styles.electricalHeader}>
            <Ionicons name="flash" size={20} color={theme.colors.primary.main} />
            <Text style={styles.cardTitle}>Elektrik Arıza Bilgileri</Text>
          </View>

          <View style={styles.electricalBadges}>
            <View style={[styles.electricalBadge, { backgroundColor: theme.colors.background.tertiary }]}>
              <Ionicons name={getElectricalSystemIcon(job.electricalInfo.systemType) as any} size={16} color={theme.colors.primary.main} />
              <Text style={styles.electricalBadgeText}>
                {translateElectricalSystemType(job.electricalInfo.systemType)}
              </Text>
            </View>
            <View style={[styles.electricalBadge, { backgroundColor: theme.colors.background.tertiary }]}>
              <Ionicons name="construct-outline" size={16} color={theme.colors.text.secondary} />
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
        </View>

        {/* Quote Info */}
        {job.quote && job.quote.totalAmount > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.quoteHeader}>
              <Text style={styles.cardTitle}>Teklif</Text>
              {job.quote.status === 'sent' && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Onay Bekliyor</Text>
                </View>
              )}
            </View>
            
            <View style={styles.quoteSummary}>
              <Text style={styles.quoteAmountLabel}>Toplam</Text>
              <Text style={styles.quoteAmount}>{job.quote.totalAmount.toLocaleString('tr-TR')}₺</Text>
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
                {job.quote.breakdown.laborCost > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>İşçilik:</Text>
                    <Text style={styles.breakdownValue}>{job.quote.breakdown.laborCost.toLocaleString('tr-TR')} ₺</Text>
                  </View>
                )}
              </View>
            )}

            {job.quote.status === 'sent' && (
              <View style={styles.quoteActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleAcceptQuote}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Teklifi Kabul Et</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => setShowRejectModal(true)}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reddet</Text>
                </TouchableOpacity>
              </View>
            )}

            {job.quote.status === 'accepted' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.viewQuoteButton]}
                onPress={() => {
                  // TODO: Quote detay sayfasına yönlendir
                }}
              >
                <Ionicons name="document-text" size={20} color={theme.colors.primary.main} />
                <Text style={[styles.actionButtonText, { color: theme.colors.primary.main }]}>
                  Teklif Detayını Görüntüle
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Workflow Progress */}
        {job.workflow && (
          <View style={styles.infoCard}>
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
          </View>
        )}

        {/* Payment */}
        {job.quote?.status === 'accepted' && job.payment && job.payment.paymentStatus !== 'paid' && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Ödeme</Text>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>Ödenecek Tutar:</Text>
              <Text style={styles.paymentAmount}>{job.payment.totalAmount.toLocaleString('tr-TR')}₺</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.paymentButton]}
              onPress={handlePayment}
            >
              <Ionicons name="card" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Ödeme Yap</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Teklifi Reddet</Text>
            <Text style={styles.modalSubtitle}>Red sebebini belirtin (opsiyonel)</Text>
            
            <TextInput
              style={styles.rejectionInput}
              placeholder="Red sebebini yazın..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleRejectQuote}
              >
                <Text style={styles.modalConfirmButtonText}>Reddet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  electricalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  phoneText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
  },
  electricalBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  electricalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  electricalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: 16,
  },
  lastWorkingContainer: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  lastWorkingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  lastWorkingText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  photosContainer: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
  },
  damagePhoto: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.background.tertiary,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quoteSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 16,
  },
  quoteAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  quoteAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.main,
  },
  breakdownContainer: {
    marginBottom: 16,
  },
  breakdownSection: {
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  breakdownItem: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 6,
    paddingLeft: 12,
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  viewQuoteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary.main,
    marginTop: 12,
  },
  paymentButton: {
    backgroundColor: colors.primary.main,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  currentStageText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  workflowStages: {
    gap: 12,
  },
  workflowStageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  stageStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  rejectionInput: {
    minHeight: 100,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.secondary,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalConfirmButton: {
    backgroundColor: '#F44336',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

