import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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

  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'card' | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvedMechanicName, setResolvedMechanicName] = useState<string>(mechanicName || 'Usta');
  const [resolvedPrice, setResolvedPrice] = useState<number>(typeof price === 'number' ? price : 0);

  useEffect(() => {
    const fetchAppointmentDetail = async () => {
      try {
        // Eğer isim veya fiyat boşsa, randevu detayını getir
        if ((!mechanicName || !mechanicName.trim()) || !(typeof price === 'number' && price > 0)) {
          const res = await fetch(`${API_URL}/maintenance-appointments/${appointmentId}`, {
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
              if (typeof apt?.price === 'number') setResolvedPrice(apt.price);
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
      // Ödeme durumunu backend'de güncelle
      const response = await fetch(`${API_URL}/maintenance-appointments/${appointmentId}/payment-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentDate: new Date().toISOString(),
          status: 'paid' // Status'ü de güncelle
        })
      });

      if (response.ok) {
        console.log('✅ Ödeme durumu güncellendi');
        
        if (method === 'qr') {
          // QR kod okutma simülasyonu
          Alert.alert(
            'QR Kod Okutuldu',
            'Ödeme işlemi başarıyla tamamlandı!',
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
          // Kart ile ödeme simülasyonu
          Alert.alert(
            'Kart ile Ödeme',
            'Ödeme işlemi başarıyla tamamlandı!',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  setShowRatingModal(true);
                }
              }
            ]
          );
        }
      } else {
        console.error('❌ Ödeme durumu güncellenemedi:', response.status);
        Alert.alert('Hata', 'Ödeme tamamlandı ama durum güncellenemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('❌ Ödeme durumu güncellenirken hata:', error);
      Alert.alert('Hata', 'Ödeme tamamlandı ama durum güncellenemedi. Lütfen tekrar deneyin.');
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
                // Drawer navigation ile MyRatings ekranına yönlendir
                navigation.navigate('MyRatings');
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
          >
            <MaterialCommunityIcons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? '#FFD700' : theme.colors.textSecondary}
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
              <Text style={[styles.infoValue, { color: theme.colors.primary, fontSize: 24, fontWeight: 'bold' }]}>₺{resolvedPrice}</Text>
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
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Ustanızı Değerlendirin
            </Text>
            
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              {resolvedMechanicName} ustasının hizmet kalitesi hakkında puan verin
            </Text>

            {renderStars()}

            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border
                }
              ]}
              placeholder="Yorumunuzu yazın (opsiyonel)"
              placeholderTextColor={theme.colors.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#8E8E93' }]}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                  loading && { opacity: 0.6 }
                ]}
                onPress={handleRatingSubmit}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {loading ? 'Gönderiliyor...' : 'Gönder'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666666',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  starButton: {
    padding: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    textAlignVertical: 'top',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5EA',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentScreen;
