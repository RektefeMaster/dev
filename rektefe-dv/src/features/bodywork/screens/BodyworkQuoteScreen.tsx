import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';
import { RootStackParamList } from '@/navigation/AppNavigator';

interface QuoteBreakdown {
  partsToReplace: Array<{
    partName: string;
    brand: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  partsToRepair: Array<{
    partName: string;
    laborHours: number;
    laborRate: number;
    totalPrice: number;
    notes?: string;
  }>;
  paintMaterials: Array<{
    materialName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  laborCost: number;
  materialCost: number;
  totalCost: number;
}

interface BodyworkJob {
  _id: string;
  quote: {
    totalAmount: number;
    breakdown: QuoteBreakdown;
    status: string;
    validityDays?: number;
    createdAt?: string;
  };
  status: string;
}

type BodyworkQuoteNavigationProp = StackNavigationProp<RootStackParamList, 'BodyworkQuote'>;
type BodyworkQuoteRouteProp = RouteProp<RootStackParamList, 'BodyworkQuote'>;

export default function BodyworkQuoteScreen() {
  const navigation = useNavigation<BodyworkQuoteNavigationProp>();
  const route = useRoute<BodyworkQuoteRouteProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);

  const { jobId } = route.params as { jobId: string };

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<BodyworkJob | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBodyworkJobById(jobId);

      if (response.success && response.data) {
        setJob(response.data);
      } else {
        Alert.alert('Hata', 'Teklif bilgisi yüklenemedi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Fetch quote error:', error);
      Alert.alert('Hata', 'Teklif bilgisi yüklenirken bir hata oluştu');
      navigation.goBack();
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
              setProcessing(true);
              const response = await apiService.respondToQuote(jobId, 'accept');
              if (response.success) {
                Alert.alert(
                  'Başarılı',
                  'Teklif kabul edildi. Ödeme ekranına yönlendiriliyorsunuz.',
                  [
                    {
                      text: 'Tamam',
                      onPress: () => {
                        navigation.goBack();
                        // İş detayına geri dön - oradan ödeme yapılacak
                        setTimeout(() => {
                          navigation.navigate('BodyworkJobDetail', { jobId });
                        }, 500);
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Hata', response.message || 'Teklif kabul edilemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'Teklif kabul edilirken bir hata oluştu');
            } finally {
              setProcessing(false);
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
      setProcessing(true);
      const response = await apiService.respondToQuote(jobId, 'reject', rejectionReason);
      if (response.success) {
        Alert.alert(
          'Başarılı',
          'Teklif reddedildi. Usta yeni bir teklif hazırlayabilir.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setShowRejectModal(false);
                setRejectionReason('');
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Teklif reddedilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif reddedilirken bir hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const { quote } = job;
  const { breakdown } = quote;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teklif Detayı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Quote Status */}
        <View style={styles.statusCard}>
          <Ionicons
            name={quote.status === 'sent' ? 'time' : quote.status === 'accepted' ? 'checkmark-circle' : 'close-circle'}
            size={24}
            color={quote.status === 'sent' ? '#FF9800' : quote.status === 'accepted' ? '#4CAF50' : '#F44336'}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {quote.status === 'sent' ? 'Onay Bekliyor' : quote.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
            </Text>
            {quote.validityDays && (
              <Text style={styles.validityText}>
                Geçerlilik: {quote.validityDays} gün
              </Text>
            )}
            {quote.createdAt && (
              <Text style={styles.dateText}>
                Tarih: {new Date(quote.createdAt).toLocaleDateString('tr-TR')}
              </Text>
            )}
          </View>
        </View>

        {/* Parts to Replace */}
        {breakdown.partsToReplace && breakdown.partsToReplace.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Değişecek Parçalar</Text>
            {breakdown.partsToReplace.map((part, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{part.partName}</Text>
                  <Text style={styles.itemDetails}>
                    {part.brand} x {part.quantity} adet
                  </Text>
                  {part.notes && (
                    <Text style={styles.itemNotes}>{part.notes}</Text>
                  )}
                </View>
                <View style={styles.itemPrice}>
                  <Text style={styles.priceText}>{formatCurrency(part.totalPrice)}₺</Text>
                  <Text style={styles.unitPriceText}>
                    {formatCurrency(part.unitPrice)}₺ / adet
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Parts to Repair */}
        {breakdown.partsToRepair && breakdown.partsToRepair.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Onarılacak Parçalar</Text>
            {breakdown.partsToRepair.map((repair, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{repair.partName}</Text>
                  <Text style={styles.itemDetails}>
                    {repair.laborHours} saat x {formatCurrency(repair.laborRate)}₺/saat
                  </Text>
                  {repair.notes && (
                    <Text style={styles.itemNotes}>{repair.notes}</Text>
                  )}
                </View>
                <View style={styles.itemPrice}>
                  <Text style={styles.priceText}>{formatCurrency(repair.totalPrice)}₺</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Paint Materials */}
        {breakdown.paintMaterials && breakdown.paintMaterials.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boya Malzemeleri</Text>
            {breakdown.paintMaterials.map((material, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{material.materialName}</Text>
                  <Text style={styles.itemDetails}>
                    {material.quantity} adet/birim
                  </Text>
                  {material.notes && (
                    <Text style={styles.itemNotes}>{material.notes}</Text>
                  )}
                </View>
                <View style={styles.itemPrice}>
                  <Text style={styles.priceText}>{formatCurrency(material.totalPrice)}₺</Text>
                  <Text style={styles.unitPriceText}>
                    {formatCurrency(material.unitPrice)}₺ / birim
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cost Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>İşçilik Maliyeti</Text>
            <Text style={styles.summaryValue}>{formatCurrency(breakdown.laborCost)}₺</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Malzeme Maliyeti</Text>
            <Text style={styles.summaryValue}>{formatCurrency(breakdown.materialCost)}₺</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalValue}>{formatCurrency(quote.totalAmount)}₺</Text>
          </View>
        </View>

        {/* Actions */}
        {quote.status === 'sent' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptQuote}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Teklifi Kabul Et</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setShowRejectModal(true)}
              disabled={processing}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Teklifi Reddet</Text>
            </TouchableOpacity>
          </View>
        )}

        {quote.status === 'accepted' && (
          <View style={styles.acceptedCard}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.acceptedText}>Bu teklif kabul edilmiştir</Text>
            <Text style={styles.acceptedSubtext}>
              Ödeme yapmak için iş detayı sayfasına dönebilirsiniz.
            </Text>
          </View>
        )}

        {quote.status === 'rejected' && (
          <View style={styles.rejectedCard}>
            <Ionicons name="close-circle" size={48} color="#F44336" />
            <Text style={styles.rejectedText}>Bu teklif reddedilmiştir</Text>
            <Text style={styles.rejectedSubtext}>
              Usta yeni bir teklif hazırlayabilir.
            </Text>
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
            <Text style={styles.modalSubtitle}>
              Red sebebini belirtin (opsiyonel). Bu bilgi ustaya iletilecektir.
            </Text>
            
            <TextInput
              style={styles.rejectionInput}
              placeholder="Örn: Fiyat yüksek, süre uzun, başka usta tercih ediyorum..."
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
                disabled={processing}
              >
                <Text style={styles.modalCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleRejectQuote}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Reddet</Text>
                )}
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
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  validityText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  itemNotes: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  itemPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  unitPriceText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.main,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  acceptedCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  acceptedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  acceptedSubtext: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  rejectedCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C62828',
    marginTop: 16,
    marginBottom: 8,
  },
  rejectedSubtext: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
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
    lineHeight: 20,
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

