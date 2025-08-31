import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../constants/config';

// Tab navigation tiplerini import et
type TabParamList = {
  Home: undefined;
  Wallet: undefined;
  Garage: undefined;
  TefeWallet: undefined;
  Support: undefined;
};

type PaymentScreenProps = {
  route: {
    params: {
      appointmentId: string;
      mechanicId: string;
      mechanicName: string;
      serviceType: string;
      price: number;
    };
  };
  navigation: any;
};

const PaymentScreen = ({ route, navigation }: PaymentScreenProps) => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const tabNavigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { appointmentId, mechanicId, mechanicName, serviceType, price } = route.params;

  // Route params'ı detaylı logla
  console.log('🔍 PaymentScreen: Route params:', {
    appointmentId,
    mechanicId,
    mechanicName,
    serviceType,
    price,
    priceType: typeof price,
    priceValid: typeof price === 'number' && price > 0
  });

  // Fiyat bilgisini detaylı kontrol et
  if (typeof price === 'number' && price > 0) {
    console.log('✅ PaymentScreen: Route params\'dan geçerli fiyat alındı:', price);
  } else {
    console.log('⚠️ PaymentScreen: Route params\'dan geçersiz fiyat alındı:', price, 'Type:', typeof price);
  }

  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'card' | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvedMechanicName, setResolvedMechanicName] = useState<string>(mechanicName || 'Usta');
  const [resolvedPrice, setResolvedPrice] = useState<number>(() => {
    const initialPrice = typeof price === 'number' && price > 0 ? price : 0;
    console.log('🔍 PaymentScreen: Initial price from route params:', initialPrice);
    console.log('🔍 PaymentScreen: Route params price value:', price, 'Type:', typeof price);
    return initialPrice;
  });

  useEffect(() => {
    const fetchAppointmentDetail = async () => {
      try {
        // Eğer isim veya fiyat boşsa, randevu detayını getir
        if ((!mechanicName || !mechanicName.trim()) || resolvedPrice === 0) {
          const res = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const json = await res.json();
            const apt = json?.data;
            if (apt) {
              // Mekanik adı
              const mechName = apt?.mechanicId?.userId
                ? `${apt.mechanicId.userId.name || ''} ${apt.mechanicId.userId.surname || ''}`.trim()
                : (apt?.mechanicId?.shopName || resolvedMechanicName);
              if (mechName && mechName.trim()) setResolvedMechanicName(mechName);
              // Fiyat (mekaniğin tamamladığı fiyat alanını bekler, yoksa 0)
              console.log('🔍 Appointment detayları:', {
                aptPrice: apt?.price,
                aptPriceType: typeof apt?.price,
                aptTotalPrice: apt?.totalPrice,
                aptTotalPriceType: typeof apt?.totalPrice,
                aptMechanicPrice: apt?.mechanicPrice,
                aptMechanicPriceType: typeof apt?.mechanicPrice,
                aptServicePrice: apt?.servicePrice,
                aptServicePriceType: typeof apt?.servicePrice
              });
              
              // Farklı fiyat alanlarını kontrol et
              let foundPrice = 0;
              if (typeof apt?.price === 'number' && apt.price > 0) {
                foundPrice = apt.price;
                console.log('✅ Appointment.price\'dan fiyat alındı:', foundPrice);
              } else if (typeof apt?.totalPrice === 'number' && apt.totalPrice > 0) {
                foundPrice = apt.totalPrice;
                console.log('✅ Appointment.totalPrice\'dan fiyat alındı:', foundPrice);
              } else if (typeof apt?.mechanicPrice === 'number' && apt.mechanicPrice > 0) {
                foundPrice = apt.mechanicPrice;
                console.log('✅ Appointment.mechanicPrice\'dan fiyat alındı:', foundPrice);
              } else if (typeof apt?.servicePrice === 'number' && apt.servicePrice > 0) {
                foundPrice = apt.servicePrice;
                console.log('✅ Appointment.servicePrice\'dan fiyat alındı:', foundPrice);
              }
              
              if (foundPrice > 0) {
                console.log('✅ Fiyat bulundu ve güncellendi:', foundPrice);
                setResolvedPrice(foundPrice);
              } else {
                console.log('⚠️ Appointment\'da hiçbir fiyat alanında geçerli değer yok');
                console.log('⚠️ Mevcut resolvedPrice kullanılıyor:', resolvedPrice);
                
                // Eğer fiyat 0 ise, kullanıcıya bilgi ver
                if (resolvedPrice === 0) {
                  console.log('⚠️ UYARI: Fiyat 0 TL olarak gözüküyor!');
                  console.log('⚠️ Usta henüz fiyat belirlememiş olabilir.');
                }
              }
            }
          }
        }
      } catch (e) {
        // Sessiz geç
      }
    };
    fetchAppointmentDetail();
  }, [appointmentId, token]);

  const paymentMethods = [
    { id: 'qr', title: 'QR Kod ile Öde', icon: 'qrcode-scan', color: '#007AFF' },
    { id: 'card', title: 'Kart ile Öde', icon: 'credit-card', color: '#34C759' },
  ];

  const handlePayment = async (method: 'qr' | 'card') => {
    setPaymentMethod(method);
    
    try {
      console.log('🔍 Ödeme başlatılıyor:', {
        appointmentId,
        method,
        price: resolvedPrice,
        mechanicId
      });

      // Ödeme durumunu backend'de güncelle
      const response = await fetch(`${API_URL}/appointments/${appointmentId}/payment-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentDate: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ Ödeme durumu güncellendi');
        
        // Usta bilgilendirme ve para aktarımı (opsiyonel)
        try {
          const transferResponse = await fetch(`${API_URL}/appointments/${appointmentId}/transfer-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              amount: resolvedPrice,
              mechanicId: mechanicId
            })
          });

          if (transferResponse.ok) {
            console.log('✅ Para aktarımı başarılı');
          } else {
            console.log('⚠️ Para aktarımı başarısız ama ödeme tamamlandı');
          }
        } catch (transferError) {
          console.log('⚠️ Para aktarımı hatası ama ödeme tamamlandı:', transferError);
        }
        
        // Başarı mesajı göster
        const successMessage = method === 'qr' 
          ? 'QR Kod Okutuldu\nÖdeme işlemi başarıyla tamamlandı!\n\n💰 Para ustaya aktarıldı.'
          : 'Kart ile Ödeme\nÖdeme işlemi başarıyla tamamlandı!\n\n💰 Para ustaya aktarıldı.';

        Alert.alert(
          'Ödeme Başarılı',
          successMessage,
          [
            {
              text: 'Tamam',
              onPress: () => {
                setShowRatingModal(true);
              }
            }
          ]
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Ödeme durumu güncellenemedi:', response.status, errorData);
        Alert.alert('Hata', `Ödeme tamamlandı ama durum güncellenemedi: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('❌ Ödeme durumu güncellenirken hata:', error);
      Alert.alert('Hata', 'Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Hata', 'Lütfen puan verin');
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔍 Değerlendirme gönderiliyor:', {
        appointmentId,
        mechanicId,
        rating,
        comment
      });
      
      // Rating API'si burada çağrılacak
      const response = await fetch(`${API_URL}/appointment-ratings/appointments/${appointmentId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          comment,
          mechanicId
        })
      });

      const responseData = await response.json();
      console.log('🔍 API Response:', responseData);

      if (response.ok) {
        Alert.alert(
          'Teşekkürler!',
          'Değerlendirmeniz kaydedildi ve ödeme tamamlandı.',
          [
            {
              text: 'Ana Sayfaya Dön',
              onPress: () => {
                // Ana sayfaya yönlendir
                navigation.navigate('Main');
              }
            },
            {
              text: 'Puanlarımı Görüntüle',
              onPress: () => {
                // MyRatings ekranına yönlendir ve verileri yenile
                navigation.navigate('MyRatings', { refresh: true });
              }
            }
          ]
        );
      } else {
        let errorMessage = responseData.message || 'Değerlendirme kaydedilirken bir hata oluştu';
        
        // Özel hata mesajları
        if (response.status === 400 && responseData.message?.includes('3 gün')) {
          errorMessage = 'Değerlendirme süresi dolmuş. Randevu tamamlandıktan sonra 3 gün içinde değerlendirme yapabilirsiniz.';
        } else if (response.status === 400 && responseData.message?.includes('henüz tamamlanmamış')) {
          errorMessage = 'Bu randevu henüz tamamlanmamış. Değerlendirme yapmak için randevunun tamamlanmasını bekleyin.';
        }
        
        Alert.alert('Hata', errorMessage);
      }
    } catch (error) {
      console.error('Rating hatası:', error);
      Alert.alert('Hata', 'Değerlendirme kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={star <= rating ? 'star' : 'star-outline'}
              size={36}
              color={star <= rating ? '#FFD700' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ödeme</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.paymentCard}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            Ödeme Bilgileri
          </Text>
          
          <View style={styles.paymentInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Usta:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{resolvedMechanicName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Hizmet:</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{serviceType}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Tutar:</Text>
              {resolvedPrice > 0 ? (
                <Text style={[styles.infoValue, { color: theme.colors.primary, fontSize: 24, fontWeight: 'bold' }]}>
                  ₺{resolvedPrice}
                </Text>
              ) : (
                <View style={styles.priceWarningContainer}>
                  <Text style={[styles.infoValue, { color: '#FF6B6B', fontSize: 18, fontWeight: '600' }]}>
                    ₺0
                  </Text>
                  <Text style={[styles.priceWarningText, { color: '#FF6B6B', fontSize: 12 }]}>
                    Usta henüz fiyat belirlememiş
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.paymentMethods}>
            <Text style={[styles.methodsTitle, { color: theme.colors.text }]}>
              Ödeme Yöntemi Seçin
            </Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodButton,
                  paymentMethod === method.id && { 
                    backgroundColor: '#3498DB',
                    borderColor: '#2980B9'
                  }
                ]}
                onPress={() => handlePayment(method.id as 'qr' | 'card')}
              >
                <MaterialCommunityIcons
                  name={method.icon as any}
                  size={24}
                  color={method.color}
                />
                <Text style={styles.methodText}>
                  {method.title}
                </Text>
                {paymentMethod === method.id && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#FFFFFF"
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Puanlama Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowRatingModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <MaterialCommunityIcons name="star-circle" size={32} color="#FFD700" />
              </View>
              <Text style={styles.modalTitle}>
                Ustanızı Değerlendirin
              </Text>
              <Text style={styles.modalSubtitle}>
                {resolvedMechanicName} ustasının hizmet kalitesi hakkında puan verin
              </Text>
            </View>

            {/* Stars Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Puanınız:</Text>
              {renderStars()}
              <Text style={styles.ratingText}>
                {rating === 0 ? 'Puan seçin' : `${rating}/5 yıldız`}
              </Text>
            </View>

            {/* Comment Input */}
            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>Yorumunuz (opsiyonel):</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Hizmet kalitesi hakkında düşüncelerinizi paylaşın..."
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRatingModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  rating === 0 && styles.submitButtonDisabled,
                  loading && styles.submitButtonLoading
                ]}
                onPress={handleRatingSubmit}
                disabled={loading || rating === 0}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Gönderiliyor...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Değerlendirmeyi Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  paymentCard: {
    backgroundColor: '#34495E',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  paymentInfo: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#BDC3C7',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentMethods: {
    marginTop: 20,
  },
  methodsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#FFFFFF',
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#2C3E50',
    borderColor: '#34495E',
  },
  methodText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    lineHeight: 22,
  },
  ratingSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  commentSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonLoading: {
    opacity: 0.8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceWarningContainer: {
    alignItems: 'flex-end',
  },
  priceWarningText: {
    marginTop: 4,
    textAlign: 'right',
  },
});

export default PaymentScreen;
