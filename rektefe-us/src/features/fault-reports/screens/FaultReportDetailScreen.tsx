import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Linking,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';

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
    year?: number;
    color?: string;
    engineType?: string;
    transmissionType?: string;
    fuelType?: string;
    engineSize?: number;
    mileage?: number;
    vehicleCondition?: string;
  };
  serviceCategory: string;
  faultDescription: string;
  photos: string[];
  video?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'quoted' | 'accepted' | 'payment_pending' | 'paid' | 'in_progress' | 'completed' | 'cancelled';
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
  selectedQuoteIndex?: number;
  selectedQuote?: {
    mechanicId: string;
    quoteAmount: number;
    selectedAt: string;
  };
  payment?: {
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    paymentMethod: string;
    paymentDate?: string;
    transactionId?: string;
  };
  mechanicResponses: Array<{
    mechanicId: string;
    responseType: 'quote' | 'not_available' | 'check_tomorrow' | 'contact_me';
    message?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const FaultReportDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isAuthenticated } = useAuth();
  const [faultReport, setFaultReport] = useState<FaultReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [hasResponded, setHasResponded] = useState(false);
  const [hasQuoted, setHasQuoted] = useState(false);
  const [selectedResponseType, setSelectedResponseType] = useState<'not_available' | 'check_tomorrow' | 'contact_me' | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { faultReportId } = route.params as { faultReportId: string };

  useEffect(() => {
    fetchFaultReportDetail();
  }, [faultReportId]);

  const fetchFaultReportDetail = async () => {
    try {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      // Bu endpoint'i backend'de oluşturmamız gerekiyor
      const response = await apiService.getFaultReportById(faultReportId);
      
      if (response.success && response.data) {
        setFaultReport(response.data);
        
        // Ustanın zaten yanıt verip vermediğini kontrol et
        const currentMechanicId = user?._id;
        const hasMechanicResponded = response.data.mechanicResponses?.some(
          (response: any) => response.mechanicId === currentMechanicId
        );
        setHasResponded(hasMechanicResponded || false);
        
        // Ustanın zaten teklif verip vermediğini kontrol et
        const hasMechanicQuoted = response.data.quotes?.some(
          (quote: any) => quote.mechanicId === currentMechanicId
        );
        setHasQuoted(hasMechanicQuoted || false);
        
        } else {
        Alert.alert('Hata', 'Arıza bildirimi detayı getirilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Arıza bildirimi detayı getirilemedi');
    } finally {
      setLoading(false);
    }
  };

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

  // İşi finalize etme
  const finalizeWork = async () => {
    Alert.alert(
      'İşi Tamamla',
      'Bu arıza bildirimi için işi tamamladığınızı onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Tamamla',
          onPress: async () => {
            try {
              const response = await apiService.finalizeWork(faultReportId, {
                notes: 'İş tamamlandı'
              });

              if (response.success) {
                Alert.alert('Başarılı', 'İş başarıyla tamamlandı');
                fetchFaultReportDetail();
              } else {
                Alert.alert('Hata', response.message || 'İş tamamlanamadı');
              }
            } catch (error) {
              Alert.alert('Hata', 'İş tamamlanırken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6B7280';
      case 'quoted': return '#3B82F6';
      case 'accepted': return '#10B981';
      case 'payment_pending': return '#F59E0B';
      case 'paid': return '#10B981';
      case 'in_progress': return '#8B5CF6';
      case 'completed': return '#059669';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'quoted': return 'Teklif Verildi';
      case 'accepted': return 'Kabul Edildi';
      case 'payment_pending': return 'Ödeme Bekleniyor';
      case 'paid': return 'Ödendi';
      case 'in_progress': return 'İşlemde';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  };

  const handleQuoteSubmit = () => {
    setShowQuoteForm(true);
  };

  const handleMechanicResponse = (responseType: 'not_available' | 'check_tomorrow' | 'contact_me') => {
    setSelectedResponseType(responseType);
    setShowOptionsModal(false);
    setShowConfirmModal(true);
  };

  const confirmMechanicResponse = async () => {
    if (!selectedResponseType) return;

    try {
      const response = await apiService.submitMechanicResponse(faultReportId, {
        responseType: selectedResponseType,
        message: responseMessage.trim() || undefined
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Yanıtınız gönderildi');
        setShowConfirmModal(false);
        setResponseMessage('');
        setSelectedResponseType(null);
        setHasResponded(true); // Yanıt verildi olarak işaretle
        // Sayfayı yenile
        fetchFaultReportDetail();
      } else {
        Alert.alert('Hata', response.message || 'Yanıt gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Yanıt gönderilirken bir hata oluştu');
    }
  };

  const handleQuoteFormSubmit = async () => {
    if (!quoteAmount || isNaN(Number(quoteAmount))) {
      Alert.alert('Hata', 'Geçerli bir fiyat giriniz');
      return;
    }

    try {
      const response = await apiService.submitQuote(faultReportId, {
        quoteAmount: Number(quoteAmount),
        estimatedDuration: estimatedDuration || 'Belirtilmedi',
        notes: notes || 'Not eklenmedi'
      });

      if (response.success) {
        Alert.alert('Başarılı', 'Fiyat teklifiniz gönderildi');
        setShowQuoteForm(false);
        setQuoteAmount('');
        setEstimatedDuration('');
        setNotes('');
        setHasQuoted(true); // Teklif verildi olarak işaretle
        fetchFaultReportDetail();
      } else {
        Alert.alert('Hata', 'Teklif gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Teklif gönderilemedi');
    }
  };

  const handleCallCustomer = () => {
    if (faultReport?.userId.phone) {
      Alert.alert(
        'Müşteriyi Ara',
        `${faultReport.userId.phone} numaralı telefonu aramak istediğinizden emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Ara', onPress: () => {
            Linking.openURL(`tel:${faultReport.userId.phone}`);
          }}
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!faultReport) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Arıza bildirimi bulunamadı</Text>
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
        <Text style={styles.headerTitle}>Arıza Detayı</Text>
        <TouchableOpacity onPress={handleCallCustomer}>
          <Ionicons name="call" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Status ve Priority */}
        <View style={styles.statusContainer}>
          <View style={styles.priorityContainer}>
            <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(faultReport.priority) }]} />
            <Text style={[styles.priorityText, { color: getPriorityColor(faultReport.priority) }]}>
              {getPriorityText(faultReport.priority)} Öncelik
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(faultReport.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(faultReport.status) }]}>
              {getStatusText(faultReport.status)}
            </Text>
          </View>
        </View>

        {/* Müşteri Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
          <View style={styles.customerCard}>
            <Text style={styles.customerName}>
              {faultReport.userId.name} {faultReport.userId.surname}
            </Text>
            <Text style={styles.customerPhone}>{faultReport.userId.phone}</Text>
          </View>
        </View>

        {/* Araç Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Araç Bilgileri</Text>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <Text style={styles.vehicleText}>
                {faultReport.vehicleId.brand} {faultReport.vehicleId.modelName}
              </Text>
              <Text style={styles.plateText}>{faultReport.vehicleId.plateNumber}</Text>
            </View>
            
            <View style={styles.vehicleDetails}>
              <View style={styles.vehicleDetailRow}>
                <Text style={styles.vehicleDetailLabel}>Yıl:</Text>
                <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.year}</Text>
              </View>
              
              {faultReport.vehicleId.color && (
                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Renk:</Text>
                  <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.color}</Text>
                </View>
              )}
              
              {faultReport.vehicleId.engineType && (
                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Motor Tipi:</Text>
                  <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.engineType}</Text>
                </View>
              )}
              
              {faultReport.vehicleId.transmissionType && (
                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Vites Tipi:</Text>
                  <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.transmissionType}</Text>
                </View>
              )}
              
              {faultReport.vehicleId.fuelType && (
                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Yakıt Tipi:</Text>
                  <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.fuelType}</Text>
                </View>
              )}
              
              {faultReport.vehicleId.engineSize && (
                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Motor Hacmi:</Text>
                  <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.engineSize}L</Text>
                </View>
              )}
              
              {faultReport.vehicleId.mileage && (
                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Kilometre:</Text>
                  <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.mileage.toLocaleString('tr-TR')} km</Text>
                </View>
              )}
              
              {faultReport.vehicleId.vehicleCondition && (
                <View style={styles.vehicleDetailRow}>
                  <Text style={styles.vehicleDetailLabel}>Araç Durumu:</Text>
                  <Text style={styles.vehicleDetailValue}>{faultReport.vehicleId.vehicleCondition}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Hizmet Kategorisi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hizmet Kategorisi</Text>
          <View style={styles.categoryCard}>
            <Text style={styles.categoryText}>{faultReport.serviceCategory}</Text>
          </View>
        </View>

        {/* Arıza Açıklaması */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arıza Açıklaması</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{faultReport.faultDescription}</Text>
          </View>
        </View>

        {/* Fotoğraflar */}
        {faultReport.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {faultReport.photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.photo} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Video */}
        {faultReport.video && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video</Text>
            <View style={styles.videoContainer}>
              <Ionicons name="play-circle" size={48} color="#3B82F6" />
              <Text style={styles.videoText}>Video Oynat</Text>
            </View>
          </View>
        )}

        {/* Mevcut Teklifler */}
        {faultReport.quotes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mevcut Teklifler</Text>
            {faultReport.quotes.map((quote, index) => (
              <View key={index} style={styles.quoteCard}>
                <View style={styles.quoteHeader}>
                  <Text style={styles.quoteMechanic}>Teklif #{index + 1}</Text>
                  <Text style={styles.quoteAmount}>{quote.quoteAmount}₺</Text>
                </View>
                <Text style={styles.quoteDate}>
                  {new Date(quote.createdAt).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tarih Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarih Bilgileri</Text>
          <View style={styles.dateCard}>
            <Text style={styles.dateText}>
              Oluşturulma: {new Date(faultReport.createdAt).toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.dateText}>
              Güncellenme: {new Date(faultReport.updatedAt).toLocaleString('tr-TR')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Alt Butonlar */}
      {faultReport.status === 'pending' && !hasResponded && !hasQuoted && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.quoteButton} onPress={handleQuoteSubmit}>
            <Ionicons name="cash" size={20} color="#FFFFFF" />
            <Text style={styles.quoteButtonText}>Fiyat Teklifi Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionsButton} onPress={() => setShowOptionsModal(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
            <Text style={styles.optionsButtonText}>Diğer Seçenekler</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Usta zaten teklif vermişse bilgi göster */}
      {faultReport.status === 'pending' && hasQuoted && !hasResponded && (
        <View style={styles.bottomButtonContainer}>
          <View style={styles.respondedInfo}>
            <Ionicons name="cash-outline" size={24} color="#3B82F6" />
            <Text style={styles.respondedText}>Bu arıza için zaten teklif verdiniz</Text>
          </View>
        </View>
      )}

      {/* Usta zaten yanıt vermişse bilgi göster */}
      {faultReport.status === 'pending' && hasResponded && !hasQuoted && (
        <View style={styles.bottomButtonContainer}>
          <View style={styles.respondedInfo}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.respondedText}>Bu arıza için zaten yanıt verdiniz</Text>
          </View>
        </View>
      )}

      {/* Finalize Butonu - Sadece paid durumunda */}
      {faultReport.status === 'paid' && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity style={styles.finalizeButton} onPress={finalizeWork}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.finalizeButtonText}>İşi Tamamla</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* İş tamamlandı bilgisi */}
      {faultReport.status === 'completed' && (
        <View style={styles.bottomButtonContainer}>
          <View style={styles.completedInfo}>
            <Ionicons name="checkmark-circle" size={24} color="#059669" />
            <Text style={styles.completedText}>İş tamamlandı</Text>
          </View>
        </View>
      )}

      {/* Fiyat Teklifi Formu Modal */}
      <Modal
        visible={showQuoteForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuoteForm(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Fiyat Teklifi Ver</Text>
                    <TouchableOpacity onPress={() => setShowQuoteForm(false)}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={styles.formContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Fiyat (₺) *</Text>
                      <TextInput
                        style={styles.input}
                        value={quoteAmount}
                        onChangeText={setQuoteAmount}
                        placeholder="Fiyat giriniz"
                        keyboardType="numeric"
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Süre (Opsiyonel)</Text>
                      <TextInput
                        style={styles.input}
                        value={estimatedDuration}
                        onChangeText={setEstimatedDuration}
                        placeholder="Örn: 2-3 gün, 1 hafta"
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Usta Notu</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Müşteriye gönderilecek not..."
                        multiline
                        numberOfLines={3}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => setShowQuoteForm(false)}
                      >
                        <Text style={styles.cancelButtonText}>İptal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.submitButton]}
                        onPress={handleQuoteFormSubmit}
                      >
                        <Text style={styles.submitButtonText}>Gönder</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Usta Seçenekleri Modal */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Usta Seçenekleri</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.optionButton}
                onPress={() => handleMechanicResponse('not_available')}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Müsait Değilim</Text>
                  <Text style={styles.optionDescription}>Şu anda müsait değilim</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionButton}
                onPress={() => handleMechanicResponse('check_tomorrow')}
              >
                <Ionicons name="time" size={24} color="#F59E0B" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Yarın Bakarım</Text>
                  <Text style={styles.optionDescription}>Yarın kontrol edeceğim</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionButton}
                onPress={() => handleMechanicResponse('contact_me')}
              >
                <Ionicons name="chatbubble" size={24} color="#3B82F6" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Benimle İletişime Geç</Text>
                  <Text style={styles.optionDescription}>Mesajlaşma ekranına yönlendir</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.messageContainer}>
              <Text style={styles.messageLabel}>Mesaj (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={responseMessage}
                onChangeText={setResponseMessage}
                placeholder="Müşteriye gönderilecek mesaj..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowOptionsModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Onay Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yanıtı Onayla</Text>
              <TouchableOpacity onPress={() => {
                setShowConfirmModal(false);
                setSelectedResponseType(null);
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.confirmContainer}>
              <View style={styles.confirmIcon}>
                <Ionicons name="help-circle" size={48} color="#F59E0B" />
              </View>
              
              <Text style={styles.confirmTitle}>
                {selectedResponseType === 'not_available' && 'Müsait Değilim'}
                {selectedResponseType === 'check_tomorrow' && 'Yarın Bakarım'}
                {selectedResponseType === 'contact_me' && 'Benimle İletişime Geç'}
              </Text>
              
              <Text style={styles.confirmDescription}>
                Bu yanıtı göndermek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </Text>

              {responseMessage.trim() && (
                <View style={styles.messagePreview}>
                  <Text style={styles.messagePreviewLabel}>Mesajınız:</Text>
                  <Text style={styles.messagePreviewText}>"{responseMessage}"</Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowConfirmModal(false);
                  setSelectedResponseType(null);
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={confirmMechanicResponse}
              >
                <Text style={styles.submitButtonText}>Onayla ve Gönder</Text>
              </TouchableOpacity>
            </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 16,
    color: '#6B7280',
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  vehicleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  plateText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  vehicleDetails: {
    gap: 8,
  },
  vehicleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  vehicleDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  vehicleDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  videoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoText: {
    fontSize: 16,
    color: '#3B82F6',
    marginTop: 8,
    fontWeight: '600',
  },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteMechanic: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  quoteAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  quoteDuration: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  quoteNotes: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  quoteDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  bottomButtonContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12,
  },
  quoteButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
  },
  quoteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  optionsButton: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
  },
  optionsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
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
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Options Modal Styles
  optionsContainer: {
    padding: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionText: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageContainer: {
    padding: 20,
    paddingTop: 0,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  respondedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  respondedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  // Confirm Modal Styles
  confirmContainer: {
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  messagePreview: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  messagePreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  messagePreviewText: {
    fontSize: 16,
    color: '#1F2937',
    fontStyle: 'italic',
  },
  finalizeButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  finalizeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  completedText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FaultReportDetailScreen;
