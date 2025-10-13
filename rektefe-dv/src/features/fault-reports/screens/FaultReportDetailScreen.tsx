import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useSocket } from '@/shared/hooks/useSocket';
import { NotificationService } from '../../notifications/services/notificationService';

type RootStackParamList = {
  FaultReportDetail: { faultReportId: string };
  Main: { screen?: string };
  BookAppointment: {
    mechanicId: string;
    mechanicName: string;
    mechanicSurname: string;
    vehicleId: string;
    serviceType: string;
    description: string;
    faultReportId: string;
    price?: number;
  };
  Payment: {
    faultReportId: string;
    appointmentId?: string;
    amount: number;
    mechanicName: string;
    serviceCategory: string;
  };
  NewMessage: {
    selectedUser: {
      _id: string;
      name: string;
      surname: string;
      userType: string;
    };
  };
  Rating: {
    appointmentId: string;
    mechanicId: string;
    mechanicName: string;
  };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: { faultReportId: string };
};

const { width } = Dimensions.get('window');

const FaultReportDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { faultReportId } = route.params;
  const { token } = useAuth();
  const { theme } = useTheme();
  const [faultReport, setFaultReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState<number | null>(null);
  const [appointmentStatus, setAppointmentStatus] = useState<'none' | 'created' | 'paid'>('none');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    fetchFaultReportDetail();
    checkAppointmentStatus();
  }, [faultReportId]);

  useFocusEffect(
    React.useCallback(() => {
      checkAppointmentStatus();
    }, [])
  );

  // Socket.io ile real-time güncelleme
  const { socket } = useSocket();
  
  useEffect(() => {
    if (socket) {
      // Teklif seçimi başarılı olduğunda
      const handleQuoteSelectionSuccess = (data: any) => {
        if (data.faultReportId === faultReportId) {
          console.log('🎉 Teklif seçimi başarılı:', data);
          // Sayfayı yenile
          fetchFaultReportDetail();
        }
      };

      // Usta yanıtı geldiğinde
      const handleMechanicResponse = (data: any) => {
        if (data.faultReportId === faultReportId) {
          console.log('🔧 Usta yanıtı geldi:', data);
          // Sayfayı yenile
          fetchFaultReportDetail();
        }
      };

      socket.on('quote_selection_success', handleQuoteSelectionSuccess);
      socket.on('mechanic_response', handleMechanicResponse);

      return () => {
        socket.off('quote_selection_success', handleQuoteSelectionSuccess);
        socket.off('mechanic_response', handleMechanicResponse);
      };
    }
  }, [socket, faultReportId]);

  const checkAppointmentStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/appointments/by-fault-report/${faultReportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.data) {
        const appointment = response.data.data;
        setAppointmentId(appointment._id);
        
        if (appointment.paymentStatus === 'completed') {
          setAppointmentStatus('paid');
        } else if (appointment._id) {
          setAppointmentStatus('created');
        } else {
          setAppointmentStatus('none');
        }
      } else {
        setAppointmentStatus('none');
      }
    } catch (error) {
      setAppointmentStatus('none');
    }
  };

  const sendQuoteNotification = async (faultReportData: any) => {
    try {
      const notificationService = NotificationService.getInstance();
      
      // En düşük fiyatı bul
      const minPrice = Math.min(...faultReportData.quotes.map((q: any) => q.quoteAmount));
      const maxPrice = Math.max(...faultReportData.quotes.map((q: any) => q.quoteAmount));
      
      const priceRange = minPrice === maxPrice 
        ? `${minPrice}₺` 
        : `${minPrice}₺ - ${maxPrice}₺`;
      
      const title = '🎉 Fiyat Teklifi Geldi!';
      const message = `${faultReportData.quotes.length} usta ${faultReportData.serviceCategory} hizmeti için teklif verdi. Fiyat aralığı: ${priceRange}`;
      
      // Yerel bildirim gönder
      await notificationService.scheduleLocalNotification(
        title,
        message,
        {
          type: 'quote_received',
          faultReportId: faultReportData._id,
          quoteCount: faultReportData.quotes.length,
          priceRange: priceRange,
          serviceCategory: faultReportData.serviceCategory
        }
      );
      
      // Backend'e bildirim gönder
      await axios.post(
        `${API_URL}/notifications/send`,
        {
          title: title,
          message: message,
          type: 'quote_received',
          data: {
            faultReportId: faultReportData._id,
            quoteCount: faultReportData.quotes.length,
            priceRange: priceRange,
            serviceCategory: faultReportData.serviceCategory,
            quotes: faultReportData.quotes.map((q: any) => ({
              mechanicName: q.mechanicName,
              quoteAmount: q.quoteAmount,
              description: q.description
            }))
          },
          targetUserType: 'driver'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      } catch (error) {
      }
  };

  const fetchFaultReportDetail = async () => {
    try {
      setLoading(true);
      console.log('🔍 API çağrısı yapılıyor:', `${API_URL}/fault-reports/${faultReportId}`);
      console.log('🔍 Token:', token ? 'Mevcut' : 'Yok');
      const response = await axios.get(`${API_URL}/fault-reports/${faultReportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('🔍 API Response:', response.data);
      if (response.data && response.data.success) {
        const newFaultReport = response.data.data;
        
        // Eğer önceki durumda teklif yoktu ama şimdi var ise bildirim gönder
        if (faultReport && 
            (!faultReport.quotes || faultReport.quotes.length === 0) && 
            newFaultReport.quotes && 
            newFaultReport.quotes.length > 0) {
          
          // Bildirim gönder - faultReport state'ini fonksiyon içinde al
          await sendQuoteNotification(newFaultReport);
        }
        
        setFaultReport(newFaultReport);
      }
    } catch (error) {
      console.error('Arıza bildirimi detayı getirme hatası:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Arıza bildirimi detayı getirilirken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectQuote = async (quoteIndex: number) => {
    try {
      console.log('🔍 selectQuote başlatıldı:', { quoteIndex, faultReportId });
      
      setLoading(true);

      // Input validation
      if (quoteIndex === undefined || quoteIndex === null) {
        Alert.alert('Hata', 'Teklif indeksi gerekli');
        return;
      }

      if (!faultReport.quotes || quoteIndex >= faultReport.quotes.length) {
        Alert.alert('Hata', 'Geçersiz teklif indeksi');
        return;
      }

      const selectedQuote = faultReport.quotes[quoteIndex];
      if (selectedQuote.status !== 'pending') {
        Alert.alert('Hata', 'Bu teklif zaten işleme alınmış');
        return;
      }

      const response = await axios.post(
        `${API_URL}/fault-reports/${faultReportId}/select-quote`,
        { quoteIndex },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000, // 15 saniye timeout
        }
      );

      console.log('✅ selectQuote response:', response.data);

      if (response.data && response.data.success) {
        // Başarılı işlem
        Alert.alert(
          'Başarılı', 
          'Teklif seçildi ve randevu oluşturuldu',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Sayfayı yenile
                fetchFaultReportDetail();
                
                // Randevu oluşturma ekranına yönlendir
                navigation.navigate('BookAppointment', {
                  mechanicId: selectedQuote.mechanicId._id || selectedQuote.mechanicId,
                  mechanicName: selectedQuote.mechanicName,
                  mechanicSurname: '',
                  vehicleId: faultReport.vehicleId._id || faultReport.vehicleId,
                  serviceType: faultReport.serviceCategory,
                  description: faultReport.faultDescription,
                  faultReportId: faultReport._id,
                  price: selectedQuote.quoteAmount,
                  appointmentId: response.data.data?.appointment?._id
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.data?.message || 'Teklif seçilemedi');
      }
    } catch (error: any) {
      console.error('❌ selectQuote error:', error);
      
      let errorMessage = 'Teklif seçilirken bir hata oluştu';
      let errorTitle = 'Hata';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Geçersiz istek';
        errorTitle = 'Geçersiz İşlem';
      } else if (error.response?.status === 404) {
        errorMessage = error.response.data?.message || 'Arıza bildirimi bulunamadı';
        errorTitle = 'Bulunamadı';
      } else if (error.response?.status === 500) {
        errorMessage = error.response.data?.message || 'Sunucu hatası. Lütfen tekrar deneyin.';
        errorTitle = 'Sunucu Hatası';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'İstek zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.';
        errorTitle = 'Zaman Aşımı';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
        errorTitle = 'Bağlantı Hatası';
      }
      
      Alert.alert(errorTitle, errorMessage, [
        {
          text: 'Tekrar Dene',
          onPress: () => selectQuote(quoteIndex)
        },
        {
          text: 'İptal',
          style: 'cancel'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Ödeme ekranına yönlendir
  const goToPayment = () => {
    if (faultReport.selectedQuote) {
      // Güvenli değer çıkarma
      const mechanicId = faultReport.selectedQuote.mechanicId;
      const mechanicName = typeof mechanicId === 'object' && mechanicId?.name 
        ? mechanicId.name 
        : typeof mechanicId === 'string' 
          ? 'Usta' 
          : 'Usta';
      
      const serviceCategory = faultReport.serviceCategory || 'Hizmet';
      const amount = faultReport.selectedQuote.quoteAmount || 0;
      
      navigation.navigate('Payment', {
        faultReportId: faultReport._id,
        appointmentId: appointmentId,
        amount: amount,
        mechanicName: mechanicName,
        serviceCategory: serviceCategory
      });
    }
  };

  // Ödeme onaylama
  const confirmPayment = async () => {
    try {
      // Simüle edilmiş transaction ID
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await axios.post(
        `${API_URL}/fault-reports/${faultReportId}/confirm-payment`,
        { transactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert('Ödeme Tamamlandı', 'Ödemeniz başarıyla tamamlandı. Usta işe başlayabilir.');
        fetchFaultReportDetail();
      }
    } catch (error) {
      Alert.alert('Hata', 'Ödeme onaylanırken bir hata oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors = {
      pending: theme.colors.warning.main,
      quoted: theme.colors.primary.main,
      accepted: theme.colors.success.main,
      payment_pending: theme.colors.warning.main,
      paid: theme.colors.success.main,
      in_progress: theme.colors.secondary.main,
      completed: theme.colors.success.main,
      cancelled: theme.colors.error.main,
    };
    return statusColors[status as keyof typeof statusColors] || theme.colors.text.secondary;
  };

  const getStatusName = (status: string) => {
    const statusNames = {
      pending: 'Beklemede',
      quoted: 'Teklif Alındı',
      accepted: 'Kabul Edildi',
      payment_pending: 'Ödeme Bekleniyor',
      paid: 'Ödendi',
      in_progress: 'İşlemde',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
    };
    return statusNames[status as keyof typeof statusNames] || status;
  };

  const getPriorityName = (priority: string) => {
    const priorityNames = {
      low: 'Düşük',
      medium: 'Orta',
      high: 'Yüksek',
      urgent: 'Acil',
    };
    return priorityNames[priority as keyof typeof priorityNames] || priority;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Arıza bildirimi yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!faultReport) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={64} 
            color={theme.colors.error.main} 
          />
          <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
            Arıza Bildirimi Bulunamadı
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary.main }]}
            onPress={fetchFaultReportDetail}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.background.card, borderBottomColor: theme.colors.border.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary.main} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Arıza Detayı</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Araç Bilgileri */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Araç Bilgileri</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Araç:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {faultReport.vehicleId?.brand} {faultReport.vehicleId?.modelName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Plaka:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {faultReport.vehicleId?.plateNumber}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Yıl:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {faultReport.vehicleId?.year}
            </Text>
          </View>
        </View>

        {/* Arıza Bilgileri */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Arıza Bilgileri</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Kategori:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {faultReport.serviceCategory}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Durum:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(faultReport.status) }]}>
              <Text style={styles.statusText}>{getStatusName(faultReport.status)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Öncelik:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {getPriorityName(faultReport.priority)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Tarih:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
              {formatDate(faultReport.createdAt)}
            </Text>
          </View>
        </View>

        {/* Arıza Açıklaması */}
        <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Açıklama</Text>
          <Text style={[styles.description, { color: theme.colors.text.primary }]}>
            {faultReport.faultDescription}
          </Text>
        </View>

        {/* Fotoğraflar */}
        {faultReport.photos && faultReport.photos.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Fotoğraflar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {faultReport.photos.map((photo: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.photo}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Videolar */}
        {faultReport.videos && faultReport.videos.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Videolar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {faultReport.videos.map((video: string, index: number) => (
                <View key={index} style={[styles.videoPlaceholder, { backgroundColor: theme.colors.background.secondary }]}>
                  <Ionicons name="play-circle" size={40} color={theme.colors.primary.main} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Usta Yanıtları */}
        {faultReport.mechanicResponses && faultReport.mechanicResponses.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Usta Yanıtları ({faultReport.mechanicResponses.length})
            </Text>
            {faultReport.mechanicResponses.map((response: any, index: number) => (
              <View key={index} style={[styles.responseCard, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}>
                <View style={styles.responseHeader}>
                  <View style={styles.responseIcon}>
                    <Ionicons 
                      name={
                        response.responseType === 'not_available' ? 'close-circle' :
                        response.responseType === 'check_tomorrow' ? 'time' :
                        response.responseType === 'contact_me' ? 'chatbubble' : 'help'
                      } 
                      size={20} 
                      color={
                        response.responseType === 'not_available' ? theme.colors.error.main :
                        response.responseType === 'check_tomorrow' ? theme.colors.warning.main :
                        response.responseType === 'contact_me' ? theme.colors.primary.main : theme.colors.text.secondary
                      } 
                    />
                  </View>
                  <View style={styles.responseInfo}>
                    <Text style={[styles.responseType, { color: theme.colors.text.primary }]}>
                      {response.responseType === 'not_available' ? 'Müsait Değil' :
                       response.responseType === 'check_tomorrow' ? 'Yarın Bakarım' :
                       response.responseType === 'contact_me' ? 'İletişime Geç' : 'Yanıt'}
                    </Text>
                    <Text style={[styles.responseDate, { color: theme.colors.text.secondary }]}>
                      {formatDate(response.createdAt)}
                    </Text>
                  </View>
                </View>
                {response.message && (
                  <Text style={[styles.responseMessage, { color: theme.colors.text.secondary }]}>
                    {response.message}
                  </Text>
                )}
                {response.responseType === 'contact_me' && (
                  <TouchableOpacity
                    style={[styles.contactButton, { backgroundColor: theme.colors.primary.main }]}
                    onPress={() => {
                      // Mesajlaşma ekranına yönlendir
                      navigation.navigate('NewMessage', {
                        selectedUser: {
                          _id: response.mechanicId,
                          name: 'Usta',
                          surname: '',
                          userType: 'mechanic'
                        }
                      });
                    }}
                  >
                    <Ionicons name="chatbubble" size={16} color="#fff" />
                    <Text style={styles.contactButtonText}>Mesaj Gönder</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Fiyat Teklifleri */}
        {faultReport.quotes && faultReport.quotes.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Fiyat Teklifleri ({faultReport.quotes.length})
            </Text>
            {faultReport.quotes.map((quote: any, index: number) => (
              <View key={index} style={[styles.quoteCard, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}>
                <View style={styles.quoteHeader}>
                  <View style={styles.mechanicInfo}>
                    <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                      {quote.mechanicName || `Usta ${index + 1}`}
                    </Text>
                    <Text style={[styles.mechanicPhone, { color: theme.colors.text.secondary }]}>
                      {quote.mechanicPhone || 'Telefon bilgisi yok'}
                    </Text>
                  </View>
                  <View style={[styles.priceBadge, { backgroundColor: theme.colors.success.main }]}>
                    <Text style={styles.priceText}>{formatPrice(quote.quoteAmount)}</Text>
                  </View>
                </View>

                <View style={styles.quoteDetails}>
                  <View style={styles.quoteDetailRow}>
                    <Ionicons name="time" size={16} color={theme.colors.text.secondary} />
                    <Text style={[styles.quoteDetailText, { color: theme.colors.text.secondary }]}>
                      {quote.estimatedDuration || 'Süre belirtilmemiş'}
                    </Text>
                  </View>
                  {quote.notes && quote.notes !== '***' && (
                    <Text style={[styles.quoteNotes, { color: theme.colors.text.primary }]}>
                      {quote.notes}
                    </Text>
                  )}
                  <Text style={[styles.quoteDate, { color: theme.colors.text.secondary }]}>
                    {formatDate(quote.createdAt)}
                  </Text>
                </View>

                {faultReport.status === 'quoted' && !faultReport.selectedQuote && (
                  <TouchableOpacity
                    style={[styles.selectButton, { backgroundColor: theme.colors.primary.main }]}
                    onPress={() => selectQuote(index)}
                  >
                    <Text style={styles.selectButtonText}>Bu Teklifi Seç</Text>
                  </TouchableOpacity>
                )}

                {faultReport.selectedQuote && faultReport.selectedQuote.mechanicId && quote.mechanicId && faultReport.selectedQuote.mechanicId.toString() === quote.mechanicId.toString() && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.colors.success.main }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.selectedText}>Seçilen Teklif</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Seçilen Teklif Bilgileri */}
        {faultReport.selectedQuote && (
          <View style={[styles.section, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Seçilen Teklif</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Usta:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                {faultReport.selectedQuote.mechanicId?.name} {faultReport.selectedQuote.mechanicId?.surname}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Fiyat:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                {formatPrice(faultReport.selectedQuote.quoteAmount)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>Seçim Tarihi:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>
                {formatDate(faultReport.selectedQuote.selectedAt)}
              </Text>
            </View>
            
            {/* Randevu Oluşturma Butonu */}
            {faultReport.status === 'accepted' && faultReport.selectedQuote && appointmentStatus === 'none' && (
              <TouchableOpacity
                style={[styles.createAppointmentButton, { backgroundColor: theme.colors.primary.main }]}
                onPress={() => {
                  // Randevu oluşturma ekranına yönlendir
                  navigation.navigate('BookAppointment', {
                    mechanicId: faultReport.selectedQuote.mechanicId._id || faultReport.selectedQuote.mechanicId,
                    mechanicName: faultReport.selectedQuote.mechanicId.name || 'Usta',
                    mechanicSurname: faultReport.selectedQuote.mechanicId.surname || '',
                    vehicleId: faultReport.vehicleId._id || faultReport.vehicleId,
                    serviceType: faultReport.serviceCategory,
                    description: faultReport.faultDescription,
                    faultReportId: faultReport._id,
                    price: faultReport.selectedQuote.quoteAmount
                  });
                }}
              >
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.createAppointmentButtonText}>Randevu Oluştur</Text>
              </TouchableOpacity>
            )}

            {/* Randevu Oluşturuldu Mesajı */}
            {appointmentStatus === 'created' && (
              <View style={[styles.statusMessage, { backgroundColor: theme.colors.info.light }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.info.main} />
                <Text style={[styles.statusMessageText, { color: theme.colors.info.main }]}>
                  Randevu oluşturuldu
                </Text>
              </View>
            )}

            {/* Ödeme Butonları */}
            {appointmentStatus === 'created' && (
              <TouchableOpacity
                style={[styles.paymentButton, { backgroundColor: theme.colors.success.main }]}
                onPress={goToPayment}
              >
                <Ionicons name="card" size={20} color="#fff" />
                <Text style={styles.paymentButtonText}>
                  Ödeme Yap ({faultReport.selectedQuote.quoteAmount}₺)
                </Text>
              </TouchableOpacity>
            )}

            {faultReport.status === 'payment_pending' && faultReport.payment && (
              <TouchableOpacity
                style={[styles.paymentButton, { backgroundColor: theme.colors.primary.main }]}
                onPress={confirmPayment}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.paymentButtonText}>
                  Ödemeyi Onayla ({faultReport.payment.amount}₺)
                </Text>
              </TouchableOpacity>
            )}

            {appointmentStatus === 'paid' && (
              <View style={styles.paymentStatusContainer}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success.main} />
                <Text style={[styles.paymentStatusText, { color: theme.colors.success.main }]}>
                  Ödeme Tamamlandı ({faultReport.selectedQuote.quoteAmount}₺)
                </Text>
                <TouchableOpacity
                  style={[styles.ratingButton, { backgroundColor: theme.colors.warning.main }]}
                  onPress={() => {
                    // Rating ekranına yönlendir
                    navigation.navigate('Rating', {
                      appointmentId: appointmentId,
                      mechanicId: faultReport.selectedQuote.mechanicId._id || faultReport.selectedQuote.mechanicId,
                      mechanicName: faultReport.selectedQuote.mechanicId.name || 'Usta'
                    });
                  }}
                >
                  <Ionicons name="star" size={16} color="#fff" />
                  <Text style={styles.ratingButtonText}>Puan Ver</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  videoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteCard: {
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    padding: 16,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mechanicPhone: {
    fontSize: 14,
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quoteDetails: {
    marginBottom: 12,
  },
  quoteDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteDetailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  quoteNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  quoteDate: {
    fontSize: 12,
  },
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  createAppointmentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  selectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Usta Yanıtları Stilleri
  responseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  responseInfo: {
    flex: 1,
  },
  responseType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  responseDate: {
    fontSize: 12,
  },
  responseMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  statusMessageText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  ratingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  paymentStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FaultReportDetailScreen;
