import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { triggerTefePointEarning } from '@/shared/utils/tefePointIntegration';
import { useWalletData } from '../hooks/useWalletData';
import { NotificationService } from '../../notifications/services/notificationService';

const { width } = Dimensions.get('window');

interface PaymentScreenProps {
  route: {
    params: {
      faultReportId?: string;
      appointmentId?: string;
      amount: number;
      mechanicName: string;
      serviceCategory?: string;
      serviceType?: string;
      price?: number;
    };
  };
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { token } = useAuth();
  const { faultReportId, appointmentId, amount, mechanicName, serviceCategory, serviceType, price } = route.params;
  const { addTransaction, refreshWalletData } = useWalletData();
  
  // Debug için log ekle
  // Null değer kontrolleri
  const safeMechanicName = mechanicName || 'Usta';
  const safeServiceCategory = serviceCategory || 'Hizmet';
  const safeAmount = amount || 0;

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credit_card' | 'bank_transfer' | 'cash'>('credit_card');
  const [cardNumber, setCardNumber] = useState('4532 1234 5678 9012');
  const [expiryDate, setExpiryDate] = useState('12/25');
  const [cvv, setCvv] = useState('123');
  const [cardHolderName, setCardHolderName] = useState('Ahmet Yılmaz');
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'credit_card',
      name: 'Kredi Kartı',
      icon: 'card',
      color: '#3B82F6',
      description: 'Visa, Mastercard, American Express'
    },
    {
      id: 'bank_transfer',
      name: 'Banka Havalesi',
      icon: 'business',
      color: '#10B981',
      description: 'EFT/Havale ile ödeme'
    },
    {
      id: 'cash',
      name: 'Nakit Ödeme',
      icon: 'cash',
      color: '#F59E0B',
      description: 'Usta ile buluştuğunuzda'
    }
  ];

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handlePayment = async () => {
    if (selectedPaymentMethod === 'credit_card') {
      if (!cardNumber || !expiryDate || !cvv || !cardHolderName) {
        Alert.alert('Hata', 'Lütfen tüm kart bilgilerini doldurun');
        return;
      }
      
      // Kart numarası validasyonu
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        Alert.alert('Hata', 'Geçerli bir kart numarası girin');
        return;
      }
      
      // CVV validasyonu
      if (cvv.length < 3) {
        Alert.alert('Hata', 'Geçerli bir CVV kodu girin');
        return;
      }
    }

    setIsProcessing(true);

    try {
      let paymentResponse;
      let finalAppointmentId = appointmentId;
      
      // Debug için log ekle
      // Eğer appointmentId yoksa ama faultReportId varsa, o faultReportId'ye ait randevuyu bul
      if (!appointmentId && faultReportId) {
        try {
          const response = await axios.get(`${API_URL}/appointments/by-fault-report/${faultReportId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success && response.data.data) {
            finalAppointmentId = response.data.data._id;
            }
        } catch (error) {
          }
      }
      
      // Randevu ödemesi
      if (finalAppointmentId) {
        paymentResponse = await axios.post(
          `${API_URL}/appointments/${finalAppointmentId}/payment`,
          { 
            paymentMethod: selectedPaymentMethod,
            cardDetails: selectedPaymentMethod === 'credit_card' ? {
              cardNumber: cardNumber.replace(/\s/g, ''),
              expiryDate,
              cvv,
              cardHolderName
            } : undefined
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        throw new Error('Ödeme için gerekli randevu ID bulunamadı');
      }

      if (paymentResponse.data.success) {
        // Ödeme onayla
        const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        let confirmResponse;
        
        if (finalAppointmentId) {
        confirmResponse = await axios.post(
          `${API_URL}/appointments/${finalAppointmentId}/confirm-payment`,
          { 
            transactionId,
            amount: safeAmount // TefePuan hesaplama için gerekli
          },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          throw new Error('Ödeme onaylama için randevu ID bulunamadı');
        }

        if (confirmResponse.data.success) {
          // TefePuan kazanımını tetikle
          let tefePointAmount = 0;
          try {
            const tefePointResult = await triggerTefePointEarning(
              finalAppointmentId,
              safeServiceCategory || 'maintenance',
              safeAmount,
              `${safeMechanicName} ile ${safeServiceCategory} hizmeti`
            );
            
            if (tefePointResult.success && tefePointResult.earnedPoints) {
              tefePointAmount = tefePointResult.earnedPoints;
              }
          } catch (error) {
            tefePointAmount = Math.floor(safeAmount * 0.01); // Fallback %1 TefePuan
          }

          // Cüzdana ödeme işlemini ekle
          try {
            // Backend'e transaction gönder
            const transactionResponse = await axios.post(
              `${API_URL}/wallet/transactions`,
              {
                type: 'debit',
                amount: safeAmount,
                description: `${safeMechanicName} - ${safeServiceCategory} hizmeti ödemesi`,
                appointmentId: finalAppointmentId,
                serviceCategory: safeServiceCategory
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (transactionResponse.data.success) {
              // Local state'i de güncelle
              await addTransaction({
                type: 'debit',
                amount: safeAmount,
                description: `${safeMechanicName} - ${safeServiceCategory} hizmeti ödemesi`
              });
            }
            
          // Cüzdan verilerini yenile
          await refreshWalletData();
          // 1 saat sonra puanlama bildirimi planla
          try {
            const notificationService = NotificationService.getInstance();
            await notificationService.scheduleRatingNotification(
              finalAppointmentId,
              safeMechanicName,
              safeServiceCategory,
              new Date().toISOString()
            );
            // Transaction recorded successfully
          } catch (error) {
            // Transaction error - handled silently
          }
        } catch (error) {
            // Backend hatası durumunda sadece local state'i güncelle
            try {
              await addTransaction({
                type: 'debit',
                amount: safeAmount,
                description: `${safeMechanicName} - ${safeServiceCategory} hizmeti ödemesi`
              });
              // Local transaction added successfully
            } catch (localError) {
              // Local transaction error - handled silently
            }
          }

          // Usta bildirimi gönder (yerel bildirim)
          try {
            const notificationService = NotificationService.getInstance();
            await notificationService.scheduleLocalNotification(
              'Ödeme Onaylandı',
              `${safeMechanicName} ile ${safeServiceCategory} hizmeti için ödeme alındı. İşe başlayabilirsiniz.`,
              {
                type: 'payment_confirmed',
                appointmentId: finalAppointmentId,
                amount: safeAmount,
                serviceCategory: safeServiceCategory
              }
            );
            // Test için ek bildirim
            setTimeout(() => {
              notificationService.scheduleLocalNotification(
                'Test Bildirimi',
                'Bildirim sistemi çalışıyor!',
                { type: 'test' }
              );
            }, 2000);
          } catch (error) {
            }

          // Backend'e bildirim gönder (usta için)
          try {
            await axios.post(
              `${API_URL}/notifications/send`,
              {
                title: 'Ödeme Onaylandı',
                message: `${safeMechanicName} ile ${safeServiceCategory} hizmeti için ödeme alındı. İşe başlayabilirsiniz.`,
                type: 'payment_confirmation',
                data: {
                  appointmentId: finalAppointmentId,
                  amount: safeAmount,
                  serviceCategory: safeServiceCategory
                },
                // Usta ID'si burada olmalı - şimdilik genel bildirim
                targetUserType: 'mechanic'
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            } catch (error) {
            }

          Alert.alert(
            'Ödeme Başarılı',
            `Ödemeniz başarıyla tamamlandı. Usta işe başlayabilir.\n\n🎉 ${tefePointAmount} TefePuan kazandınız!`,
            [
              {
                text: 'Tamam',
                onPress: () => {
                  // Önce bir önceki ekrana git, sonra tekrar FaultReportDetail'e git
                  navigation.goBack();
                  // Kısa bir gecikme sonra durumu güncelle
                  setTimeout(() => {
                    (navigation as any).navigate('FaultReportDetail', { faultReportId });
                  }, 100);
                }
              }
            ]
          );
        } else {
          throw new Error(confirmResponse.data.message || 'Ödeme onaylanamadı');
        }
      } else {
        throw new Error(paymentResponse.data.message || 'Ödeme oluşturulamadı');
      }
    } catch (error: any) {
      let errorMessage = 'Ödeme işlemi sırasında bir hata oluştu';
      
      if (error.response?.status === 404) {
        errorMessage = 'Ödeme endpoint\'i bulunamadı. Lütfen backend servisinin çalıştığından emin olun.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Bu işlem için yetkiniz bulunmuyor.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Ödeme Hatası',
        errorMessage,
        [
          {
            text: 'Tekrar Dene',
            onPress: () => setIsProcessing(false)
          },
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } finally {
      if (!isProcessing) {
        setIsProcessing(false);
      }
    }
  };

  const renderCreditCardForm = () => (
    <View style={styles.paymentForm}>
      <Text style={[styles.formTitle, { color: theme.colors.text.primary }]}>
        Kart Bilgileri
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
          Kart Numarası
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.primary
          }]}
          placeholder="1234 5678 9012 3456"
          placeholderTextColor={theme.colors.text.tertiary}
          value={cardNumber}
          onChangeText={(text) => setCardNumber(formatCardNumber(text))}
          keyboardType="numeric"
          maxLength={19}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            Son Kullanma
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.primary
            }]}
            placeholder="MM/YY"
            placeholderTextColor={theme.colors.text.tertiary}
            value={expiryDate}
            onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
            CVV
          </Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.primary
            }]}
            placeholder="123"
            placeholderTextColor={theme.colors.text.tertiary}
            value={cvv}
            onChangeText={setCvv}
            keyboardType="numeric"
            maxLength={3}
            secureTextEntry
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
          Kart Sahibi Adı
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.primary
          }]}
          placeholder="Ad Soyad"
          placeholderTextColor={theme.colors.text.tertiary}
          value={cardHolderName}
          onChangeText={setCardHolderName}
          autoCapitalize="words"
        />
      </View>
    </View>
  );

  const renderBankTransferInfo = () => (
    <View style={styles.paymentInfo}>
      <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
        Banka Havalesi Bilgileri
      </Text>
      <View style={styles.bankInfo}>
        <Text style={[styles.bankText, { color: theme.colors.text.secondary }]}>
          <Text style={styles.bankLabel}>Banka:</Text> Türkiye İş Bankası
        </Text>
        <Text style={[styles.bankText, { color: theme.colors.text.secondary }]}>
          <Text style={styles.bankLabel}>IBAN:</Text> TR33 0006 4000 0011 2345 6789 01
        </Text>
        <Text style={[styles.bankText, { color: theme.colors.text.secondary }]}>
          <Text style={styles.bankLabel}>Açıklama:</Text> {faultReportId || 'N/A'}
        </Text>
        <Text style={[styles.bankText, { color: theme.colors.text.secondary }]}>
          <Text style={styles.bankLabel}>Tutar:</Text> {safeAmount}₺
        </Text>
      </View>
      <Text style={[styles.noteText, { color: theme.colors.text.tertiary }]}>
        Havale yaptıktan sonra "Ödemeyi Onayla" butonuna basın.
      </Text>
    </View>
  );

  const renderCashInfo = () => (
    <View style={styles.paymentInfo}>
      <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
        Nakit Ödeme
      </Text>
      <Text style={[styles.cashText, { color: theme.colors.text.secondary }]}>
        Ödemenizi usta ile buluştuğunuzda nakit olarak yapabilirsiniz.
      </Text>
      <Text style={[styles.cashText, { color: theme.colors.text.secondary }]}>
        Usta işe başlamadan önce ödemenizi alacaktır.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Ödeme
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ödeme Özeti */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.background.secondary }]}>
          <Text style={[styles.summaryTitle, { color: theme.colors.text.primary }]}>
            Ödeme Özeti
          </Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>
              Hizmet:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
              {safeServiceCategory}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>
              Usta:
            </Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
              {safeMechanicName}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: theme.colors.text.primary }]}>
              Toplam:
            </Text>
            <Text style={[styles.totalValue, { color: theme.colors.primary.main }]}>
              {safeAmount}₺
            </Text>
          </View>
        </View>

        {/* Ödeme Yöntemi Seçimi */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Ödeme Yöntemi
          </Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethodCard,
                { 
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: selectedPaymentMethod === method.id ? theme.colors.primary.main : theme.colors.border.primary
                }
              ]}
              onPress={() => setSelectedPaymentMethod(method.id as any)}
            >
              <View style={styles.paymentMethodInfo}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: method.color }]}>
                  <Ionicons name={method.icon as any} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.paymentMethodText}>
                  <Text style={[styles.paymentMethodName, { color: theme.colors.text.primary }]}>
                    {method.name}
                  </Text>
                  <Text style={[styles.paymentMethodDescription, { color: theme.colors.text.secondary }]}>
                    {method.description}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.radioButton,
                { 
                  borderColor: selectedPaymentMethod === method.id ? theme.colors.primary.main : theme.colors.border.primary,
                  backgroundColor: selectedPaymentMethod === method.id ? theme.colors.primary.main : 'transparent'
                }
              ]}>
                {selectedPaymentMethod === method.id && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ödeme Formu */}
        {selectedPaymentMethod === 'credit_card' && renderCreditCardForm()}
        {selectedPaymentMethod === 'bank_transfer' && renderBankTransferInfo()}
        {selectedPaymentMethod === 'cash' && renderCashInfo()}
      </ScrollView>

      {/* Ödeme Butonu */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background.primary, borderTopColor: theme.colors.border.primary }]}>
        <TouchableOpacity
          style={[
            styles.payButton,
            { 
              backgroundColor: theme.colors.primary.main,
              opacity: isProcessing ? 0.7 : 1
            }
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          <Ionicons name="card" size={20} color="#FFFFFF" />
          <Text style={styles.payButtonText}>
            {isProcessing ? 'İşleniyor...' : `${safeAmount}₺ Öde`}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  paymentMethodText: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 14,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentForm: {
    marginTop: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  paymentInfo: {
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  bankInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  bankText: {
    fontSize: 14,
    marginBottom: 8,
  },
  bankLabel: {
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  cashText: {
    fontSize: 14,
    marginBottom: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PaymentScreen;