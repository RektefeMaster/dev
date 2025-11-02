import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
  Modal,
  TextInput,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';
import { getServiceCategory, getNotificationTypeText } from '@/shared/utils/serviceTypeHelpers';

const { width } = Dimensions.get('window');

interface FaultReport {
  _id: string;
  userId: {
    name: string;
    surname: string;
    phone: string;
  };
  vehicleId: {
    brand: string;
    modelName: string;
    plateNumber: string;
  };
  serviceCategory: string;
  faultDescription: string;
  photos: string[];
  video?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'quoted' | 'accepted' | 'rejected' | 'completed';
  quotes: Array<{
    mechanicId: string;
    mechanicName: string;
    mechanicPhone: string;
    quoteAmount: number;
    estimatedDuration: string;
    notes: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
  }>;
  selectedQuote?: {
    mechanicId: string;
    quoteAmount: number;
    selectedAt: string;
  };
  selectedQuoteIndex?: number;
  createdAt: string;
  updatedAt: string;
}

const FaultReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const [faultReports, setFaultReports] = useState<FaultReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'quoted' | 'accepted' | 'responded'>('all');
  
  // Teklif verme modal state'leri
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedFaultReport, setSelectedFaultReport] = useState<FaultReport | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const fetchFaultReports = async (showLoading = true, statusFilter?: string) => {
    try {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      
      // Backend'e status filtresi gönder
      const response = await apiService.FaultReportService.getMechanicFaultReports(statusFilter);
      
      if (response.success && response.data) {
        // Backend data olarak direkt array dönüyor
        const reports = Array.isArray(response.data) ? response.data : (response.data.faultReports || []);
        setFaultReports(reports);
      } else {
        setFaultReports([]);
      }
    } catch (error) {
      setFaultReports([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user) {
        fetchFaultReports(true, filter === 'all' ? undefined : filter);
      }
    }, [isAuthenticated, user, filter])
  );

  // İlk veri yükleme
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFaultReports(true, filter === 'all' ? undefined : filter);
    }
  }, [isAuthenticated, user, filter]);

  // Arıza bildirimleri için otomatik yenileme (polling) - optimize edildi
  useEffect(() => {
    if (isAuthenticated && user) {
      // Her 15 dakikada bir arıza bildirimlerini yenile (optimize edildi)
      const interval = setInterval(() => {
        fetchFaultReports(false, filter === 'all' ? undefined : filter);
      }, 900000); // 15 dakika (900 saniye)

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, filter, fetchFaultReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFaultReports(false, filter === 'all' ? undefined : filter).finally(() => setRefreshing(false));
  }, [filter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#EAB308';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Acil';
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6B7280';
      case 'quoted': return '#3B82F6';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'completed': return '#059669';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'quoted': return 'Teklif Verildi';
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      case 'completed': return 'Tamamlandı';
      default: return 'Bilinmiyor';
    }
  };

  const handleQuoteSubmit = (faultReport: FaultReport) => {
    setSelectedFaultReport(faultReport);
    setQuoteAmount('');
    setEstimatedDuration('');
    setQuoteNotes('');
    setQuoteModalVisible(true);
  };

  const submitQuote = async () => {
    if (!selectedFaultReport) return;

    if (!quoteAmount || isNaN(Number(quoteAmount)) || Number(quoteAmount) <= 0) {
      Alert.alert('Hata', 'Geçerli bir fiyat giriniz');
      return;
    }

    if (!estimatedDuration.trim()) {
      Alert.alert('Hata', 'Tahmini süre giriniz');
      return;
    }

    setSubmittingQuote(true);

    try {
      const response = await apiService.FaultReportService.submitQuote(selectedFaultReport._id, {
        quoteAmount: Number(quoteAmount),
        estimatedDuration: estimatedDuration.trim(),
        notes: quoteNotes.trim() || 'Detaylı inceleme sonrası kesin süre belirlenecek'
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Fiyat teklifiniz gönderildi');
        setQuoteModalVisible(false);
        fetchFaultReports(false);
      } else {
        Alert.alert('Hata', response.message || 'Teklif gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif gönderilemedi');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const closeQuoteModal = () => {
    setQuoteModalVisible(false);
    setSelectedFaultReport(null);
    setQuoteAmount('');
    setEstimatedDuration('');
    setQuoteNotes('');
  };

  // Backend'de filtreleme yapıldığı için frontend'de ek filtreleme gerekmiyor
  const filteredReports = faultReports;

  const renderFaultReport = (report: FaultReport) => (
    <TouchableOpacity
      key={report._id}
      style={styles.faultReportCard}
      onPress={() => (navigation as any).navigate('FaultReportDetail', { faultReportId: report._id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.priorityContainer}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(report.priority) }]} />
          <Text style={[styles.priorityText, { color: getPriorityColor(report.priority) }]}>
            {getPriorityText(report.priority)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
            {getStatusText(report.status)}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>
          {report.userId.name} {report.userId.surname}
        </Text>
        <Text style={styles.customerPhone}>{report.userId.phone}</Text>
      </View>

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleText}>
          {report.vehicleId.brand} {report.vehicleId.modelName} - {report.vehicleId.plateNumber}
        </Text>
      </View>

      <View style={styles.serviceInfo}>
        <Text style={styles.serviceCategory}>{report.serviceCategory}</Text>
        <Text style={styles.faultDescription} numberOfLines={2}>
          {report.faultDescription}
        </Text>
      </View>

      {/* Fiyat Bilgisi */}
      {report.quotes && report.quotes.length > 0 && (
        <View style={styles.quotesContainer}>
          <Text style={styles.quotesTitle}>Teklifler:</Text>
          {report.quotes.slice(0, 2).map((quote, index) => (
            <View key={index} style={styles.quoteItem}>
              <View style={styles.quoteInfo}>
                <Text style={styles.quoteMechanic}>{quote.mechanicName}</Text>
                <Text style={styles.quoteAmount}>₺{quote.quoteAmount.toLocaleString('tr-TR')}</Text>
              </View>
              <Text style={styles.quoteDuration}>{quote.estimatedDuration}</Text>
            </View>
          ))}
          {report.quotes.length > 2 && (
            <Text style={styles.moreQuotesText}>+{report.quotes.length - 2} teklif daha</Text>
          )}
        </View>
      )}

      {report.photos.length > 0 && (
        <View style={styles.photosContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {report.photos.slice(0, 3).map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.photo} />
            ))}
            {report.photos.length > 3 && (
              <View style={styles.morePhotosContainer}>
                <Text style={styles.morePhotosText}>+{report.photos.length - 3}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {new Date(report.createdAt).toLocaleDateString('tr-TR')}
        </Text>
        {report.status === 'pending' && (
          <TouchableOpacity
            style={styles.quoteButton}
            onPress={() => handleQuoteSubmit(report)}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.quoteButtonText}>Teklif Ver</Text>
          </TouchableOpacity>
        )}
        
        {report.status === 'quoted' && (
          <View style={styles.quotedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
            <Text style={styles.quotedText}>Teklif Verildi</Text>
          </View>
        )}
        
        {report.status === 'accepted' && report.selectedQuote?.mechanicId === user?._id && (
          <View style={styles.acceptedBadge}>
            <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 4 }} />
            <Text style={styles.acceptedText}>Kabul Edildi</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Hizmet kategorisine göre başlık
  const serviceCategory = getServiceCategory(user?.serviceCategories);
  const faultReportTitle = getNotificationTypeText(serviceCategory, 'fault_report');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{faultReportTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {filteredReports.length} bildirim
          </Text>
        </View>
        <TouchableOpacity onPress={() => fetchFaultReports(false, filter === 'all' ? undefined : filter)}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {['all', 'pending', 'quoted', 'accepted', 'responded'].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterButton,
              filter === filterType && styles.activeFilterButton
            ]}
            onPress={() => setFilter(filterType as any)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === filterType && styles.activeFilterButtonText
            ]}>
              {filterType === 'all' ? 'Tümü' : 
               filterType === 'pending' ? 'Yeni' :
               filterType === 'quoted' ? 'Teklif Verildi' : 
               filterType === 'accepted' ? 'Kabul Edildi' : 'Yanıt Verildi'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="warning-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Arıza Bildirimi Yok</Text>
            <Text style={styles.emptyDescription}>
              {filter === 'all' 
                ? 'Henüz size gelen arıza bildirimi bulunmuyor.'
                : 'Bu kategoride arıza bildirimi bulunmuyor.'
              }
            </Text>
          </View>
        ) : (
          filteredReports.map(renderFaultReport)
        )}
      </ScrollView>

      {/* Teklif Verme Modal */}
      <Modal
        visible={quoteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeQuoteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fiyat Teklifi Ver</Text>
              <TouchableOpacity onPress={closeQuoteModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedFaultReport && (
              <View style={styles.modalContent}>
                <View style={styles.faultInfo}>
                  <Text style={styles.faultInfoTitle}>Arıza Detayları</Text>
                  <Text style={styles.faultInfoText}>
                    {selectedFaultReport.vehicleId.brand} {selectedFaultReport.vehicleId.modelName}
                  </Text>
                  <Text style={styles.faultInfoText}>
                    {selectedFaultReport.serviceCategory}
                  </Text>
                  <Text style={styles.faultDescriptionText} numberOfLines={3}>
                    {selectedFaultReport.faultDescription}
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Fiyat (₺)</Text>
                  <TextInput
                    style={styles.input}
                    value={quoteAmount}
                    onChangeText={setQuoteAmount}
                    placeholder="Örn: 1500"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Tahmini Süre</Text>
                  <TextInput
                    style={styles.input}
                    value={estimatedDuration}
                    onChangeText={setEstimatedDuration}
                    placeholder="Örn: 2-3 gün, 1 hafta"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Notlar (Opsiyonel)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={quoteNotes}
                    onChangeText={setQuoteNotes}
                    placeholder="Müşteriye özel notlarınız..."
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeQuoteModal}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.submitButton, submittingQuote && styles.submitButtonDisabled]}
                    onPress={submitQuote}
                    disabled={submittingQuote}
                  >
                    {submittingQuote ? (
                      <Text style={styles.submitButtonText}>Gönderiliyor...</Text>
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.submitButtonText}>Teklif Gönder</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  faultReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  customerInfo: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  vehicleInfo: {
    marginBottom: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  serviceInfo: {
    marginBottom: 12,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 4,
  },
  faultDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  quotesContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  quotesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  quoteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  quoteInfo: {
    flex: 1,
  },
  quoteMechanic: {
    fontSize: 13,
    color: '#6B7280',
  },
  quoteAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  quoteDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  moreQuotesText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  photosContainer: {
    marginBottom: 12,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  morePhotosContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  quoteButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quoteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quotedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  quotedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  acceptedText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalContent: {
    padding: 20,
  },
  faultInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  faultInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  faultInfoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  faultDescriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FaultReportsScreen;
