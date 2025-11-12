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
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';
import { RootStackParamList } from '@/navigation/AppNavigator';

interface BodyworkJob {
  _id: string;
  status: string;
  damageInfo: {
    description: string;
    photos: string[];
    videos?: string[];
    damageType: string;
    severity: string;
    affectedAreas: string[];
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
      paintMaterials: Array<{
        materialName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
      laborCost: number;
      materialCost: number;
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
  payment: {
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
  };
  createdAt: string;
}

type BodyworkJobDetailNavigationProp = StackNavigationProp<RootStackParamList, 'BodyworkJobDetail'>;
type BodyworkJobDetailRouteProp = RouteProp<RootStackParamList, 'BodyworkJobDetail'>;

export default function BodyworkJobDetailScreen() {
  const navigation = useNavigation<BodyworkJobDetailNavigationProp>();
  const route = useRoute<BodyworkJobDetailRouteProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);

  const { jobId } = route.params as { jobId: string };

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<BodyworkJob | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  // Ekran her açıldığında verileri yenile (teklif onayı gibi işlemlerden sonra)
  useFocusEffect(
    useCallback(() => {
      if (jobId) {
        fetchJobDetail();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId])
  );

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBodyworkJobById(jobId);

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
              const response = await apiService.respondToQuote(jobId, 'accept');
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
      const response = await apiService.respondToQuote(jobId, 'reject', rejectionReason);
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

    // Teklif onaylanmış mı kontrol et
    if (job.quote?.status !== 'accepted') {
      Alert.alert('Uyarı', 'Ödeme yapabilmek için önce teklifi onaylamalısınız');
      return;
    }

    // Ödenecek tutar
    const remainingAmount = job.payment.totalAmount - job.payment.paidAmount;
    if (remainingAmount <= 0) {
      Alert.alert('Bilgi', 'Bu iş için ödeme tamamlanmış');
      return;
    }

    // Ödeme onayı
    Alert.alert(
      'Ödeme Onayı',
      `${remainingAmount.toFixed(2)}₺ ödeme yapmak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ödemeyi Yap',
          onPress: async () => {
            try {
              const response = await apiService.processBodyworkPayment(jobId, remainingAmount, 'card');
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
                      onPress: () => navigation.navigate('AddBalance')
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

  const handleViewWorkflow = () => {
    navigation.navigate('BodyworkWorkflow', { jobId });
  };

  const handleViewQuote = () => {
    navigation.navigate('BodyworkQuote', { jobId });
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
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
    const colorMap: { [key: string]: string } = {
      'quote_preparation': '#FF9800',
      'quote_sent': '#2196F3',
      'quote_accepted': '#4CAF50',
      'work_started': '#4CAF50',
      'in_progress': '#4CAF50',
      'completed': '#8B5CF6',
      'cancelled': '#F44336',
      'pending_mechanic': '#FF9800',
    };
    return colorMap[status] || '#9E9E9E';
  };

  const getDamageTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'collision': 'Çarpışma',
      'scratch': 'Çizik',
      'dent': 'Göçük',
      'rust': 'Pas',
      'paint_damage': 'Boya Hasarı',
      'other': 'Diğer',
    };
    return typeMap[type] || type;
  };

  const getSeverityText = (severity: string) => {
    const severityMap: { [key: string]: string } = {
      'minor': 'Hafif',
      'moderate': 'Orta',
      'major': 'Ağır',
      'severe': 'Ciddi',
    };
    return severityMap[severity] || severity;
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İş Detayı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
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
                    onPress={() => {
                      // TODO: Telefon arama fonksiyonu
                      Alert.alert('Telefon', job.mechanicId?.phone);
                    }}
                  >
                    <Ionicons name="call" size={16} color={theme.colors.primary.main} />
                    <Text style={styles.phoneText}>{job.mechanicId.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Damage Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Hasar Bilgileri</Text>
          
          <View style={styles.damageInfoRow}>
            <View style={styles.damageTag}>
              <Text style={styles.damageTagText}>{getDamageTypeText(job.damageInfo.damageType)}</Text>
            </View>
            <View style={styles.damageTag}>
              <Text style={styles.damageTagText}>{getSeverityText(job.damageInfo.severity)}</Text>
            </View>
          </View>

          <Text style={styles.descriptionText}>{job.damageInfo.description}</Text>

          {job.damageInfo.affectedAreas && job.damageInfo.affectedAreas.length > 0 && (
            <View style={styles.affectedAreasContainer}>
              <Text style={styles.affectedAreasTitle}>Etkilenen Alanlar:</Text>
              <View style={styles.affectedAreasList}>
                {job.damageInfo.affectedAreas.map((area, index) => (
                  <View key={index} style={styles.areaChip}>
                    <Text style={styles.areaChipText}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {job.damageInfo.photos && job.damageInfo.photos.length > 0 && (
            <View style={styles.photosContainer}>
              <Text style={styles.sectionTitle}>Hasar Fotoğrafları</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {job.damageInfo.photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.damagePhoto} />
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Quote Info */}
        {job.quote.totalAmount > 0 && (
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
                onPress={handleViewQuote}
              >
                <Ionicons name="document-text" size={20} color={theme.colors.primary.main} />
                <Text style={[styles.actionButtonText, { color: theme.colors.primary.main }]}>
                  Teklif Detayını Görüntüle
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Workflow Preview */}
        {job.workflow && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>İş Akışı</Text>
            <Text style={styles.currentStageText}>
              Mevcut Aşama: {job.workflow.currentStage}
            </Text>
            <TouchableOpacity
              style={styles.viewWorkflowButton}
              onPress={handleViewWorkflow}
            >
              <Text style={styles.viewWorkflowText}>Detaylı İş Akışını Görüntüle</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary.main} />
            </TouchableOpacity>
          </View>
        )}

        {/* Payment */}
        {job.quote.status === 'accepted' && job.payment.paymentStatus !== 'paid' && (
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
    marginBottom: 20,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
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
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
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
  damageInfoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  damageTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary.light + '20',
    borderRadius: 16,
  },
  damageTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.main,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 16,
  },
  affectedAreasContainer: {
    marginTop: 12,
  },
  affectedAreasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  affectedAreasList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  areaChipText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  photosContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  damagePhoto: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.background.primary,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF9800',
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
    borderBottomWidth: 1,
    borderColor: colors.border.light,
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
  quoteActions: {
    flexDirection: 'row',
    gap: 12,
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
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  currentStageText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  viewWorkflowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  viewWorkflowText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.main,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.main,
  },
  paymentButton: {
    backgroundColor: colors.primary.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 24,
    width: '90%',
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
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
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

