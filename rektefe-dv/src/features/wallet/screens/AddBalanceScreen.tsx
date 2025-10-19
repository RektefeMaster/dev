import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/theme';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import { apiService } from '@/shared/services/api';
import { useCreditCards } from '../hooks/useCreditCards';

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000, 2000];

const AddBalanceScreen = ({ navigation }: any) => {
  const { isDark, colors: themeColors } = useTheme();
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { cards, isLoading: cardsLoading } = useCreditCards();
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Başlangıç animasyonları
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePresetSelect = (value: number) => {
    setSelectedPreset(value);
    setAmount(value.toString());
    Keyboard.dismiss();
  };

  const handleAmountChange = (text: string) => {
    // Sadece sayı kabul et
    const cleanText = text.replace(/[^0-9]/g, '');
    setAmount(cleanText);
    setSelectedPreset(null);
  };

  const formatAmount = (value: string) => {
    if (!value) return '';
    const numValue = parseInt(value);
    return numValue.toLocaleString('tr-TR');
  };

  const validateAmount = () => {
    const numAmount = parseInt(amount);
    
    if (!amount || numAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir miktar giriniz');
      return false;
    }
    
    if (numAmount < 10) {
      Alert.alert('Hata', 'Minimum yükleme tutarı 10 TL\'dir');
      return false;
    }
    
    if (numAmount > 50000) {
      Alert.alert('Hata', 'Maksimum yükleme tutarı 50.000 TL\'dir');
      return false;
    }
    
    if (cards.length === 0) {
      Alert.alert('Hata', 'Lütfen önce bir kart ekleyiniz');
      return false;
    }
    
    return true;
  };

  const simulatePaymentProcess = () => {
    return new Promise((resolve) => {
      // 3 saniyelik gerçekçi ödeme simülasyonu
      setTimeout(() => {
        resolve(true);
      }, 3000);
    });
  };

  const handleAddBalance = async () => {
    if (!validateAmount()) return;
    
    const numAmount = parseInt(amount);
    
    Alert.alert(
      'Bakiye Yükleme',
      `${formatAmount(amount)} TL yüklemek istediğinizden emin misiniz?\n\nÖdeme Yöntemi: ${cards[selectedCard]?.bankName} (****${cards[selectedCard]?.cardNumber.slice(-4)})`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Gerçekçi ödeme işlemi simülasyonu
              await simulatePaymentProcess();
              
              // Backend'e bakiye ekleme isteği gönder
              const response = await apiService.addBalance(numAmount);
              
              if (response.success) {
                setIsLoading(false);
                
                // Başarı animasyonu
                setShowSuccess(true);
                Animated.parallel([
                  Animated.spring(successScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                  }),
                  Animated.timing(successOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }),
                ]).start();
                
                // 2 saniye sonra geri dön
                setTimeout(() => {
                  navigation.goBack();
                }, 2000);
              } else {
                setIsLoading(false);
                Alert.alert('Hata', response.message || 'Bakiye yüklenirken hata oluştu');
              }
            } catch (error: any) {
              setIsLoading(false);
              Alert.alert('Hata', error.message || 'Bakiye yüklenirken hata oluştu');
            }
          },
        },
      ]
    );
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar 
          barStyle={isDark ? 'light-content' : 'dark-content'} 
          backgroundColor="transparent" 
          translucent 
        />
        <Background>
          <View style={styles.successContainer}>
            <Animated.View 
              style={[
                styles.successContent,
                {
                  opacity: successOpacity,
                  transform: [{ scale: successScale }],
                }
              ]}
            >
              <View style={[styles.successIcon, { backgroundColor: themeColors.success.main }]}>
                <MaterialCommunityIcons name="check" size={64} color="white" />
              </View>
              <Text style={[styles.successTitle, { color: themeColors.text.primary }]}>
                Başarılı!
              </Text>
              <Text style={[styles.successMessage, { color: themeColors.text.secondary }]}>
                {formatAmount(amount)} TL bakiye yüklendi
              </Text>
              <View style={styles.successDetails}>
                <View style={styles.successDetailRow}>
                  <Text style={[styles.successDetailLabel, { color: themeColors.text.tertiary }]}>
                    Yüklenen Tutar
                  </Text>
                  <Text style={[styles.successDetailValue, { color: themeColors.text.primary }]}>
                    {formatAmount(amount)} TL
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={[styles.successDetailLabel, { color: themeColors.text.tertiary }]}>
                    Ödeme Yöntemi
                  </Text>
                  <Text style={[styles.successDetailValue, { color: themeColors.text.primary }]}>
                    {cards[selectedCard]?.bankName}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={[styles.successDetailLabel, { color: themeColors.text.tertiary }]}>
                    İşlem Zamanı
                  </Text>
                  <Text style={[styles.successDetailValue, { color: themeColors.text.primary }]}>
                    {new Date().toLocaleString('tr-TR')}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </Background>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      <Background>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <BackButton />
              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
                  Bakiye Yükle
                </Text>
                <Text style={[styles.headerSubtitle, { color: themeColors.text.secondary }]}>
                  Cüzdanınıza bakiye ekleyin
                </Text>
              </View>
              <View style={{ width: 44 }} />
            </View>

            <Animated.View 
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              {/* Amount Input Section */}
              <LinearGradient
                colors={isDark 
                  ? ['rgba(103, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']
                  : ['rgba(103, 126, 234, 0.05)', 'rgba(118, 75, 162, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.amountCard]}
              >
                <View style={styles.amountCardInner}>
                  <Text style={[styles.sectionLabel, { color: themeColors.text.secondary }]}>
                    Yüklenecek Tutar
                  </Text>
                  
                  <View style={styles.amountDisplayContainer}>
                    <TextInput
                      style={[
                        styles.amountInput,
                        { 
                          color: themeColors.primary.main,
                        }
                      ]}
                      value={formatAmount(amount)}
                      onChangeText={handleAmountChange}
                      placeholder="0"
                      placeholderTextColor={isDark ? 'rgba(103, 126, 234, 0.3)' : 'rgba(103, 126, 234, 0.4)'}
                      keyboardType="number-pad"
                      maxLength={9}
                    />
                    <Text style={[styles.currencySymbol, { color: themeColors.primary.main }]}>
                      TL
                    </Text>
                  </View>

                  <View style={[styles.amountHintContainer, {
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                  }]}>
                    <Text style={[styles.amountHint, { color: themeColors.text.tertiary }]}>
                      Min: 10 TL • Maks: 50.000 TL
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Preset Amounts */}
              <View style={styles.presetsSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
                  Hızlı Seçim
                </Text>
                
                <View style={styles.presetsGrid}>
                  {PRESET_AMOUNTS.map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetButton,
                        {
                          backgroundColor: selectedPreset === preset 
                            ? themeColors.primary.main 
                            : isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                          borderColor: selectedPreset === preset 
                            ? themeColors.primary.main 
                            : isDark ? themeColors.border.tertiary : themeColors.border.primary,
                        }
                      ]}
                      onPress={() => handlePresetSelect(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.presetAmount,
                        { 
                          color: selectedPreset === preset 
                            ? 'white' 
                            : themeColors.text.primary 
                        }
                      ]}>
                        {preset.toLocaleString('tr-TR')} TL
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.paymentSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
                  Ödeme Yöntemi
                </Text>
                
                {cardsLoading ? (
                  <ActivityIndicator size="small" color={themeColors.primary.main} />
                ) : cards.length === 0 ? (
                  <View style={[
                    styles.noCardsContainer,
                    {
                      backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                      borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                    }
                  ]}>
                    <MaterialCommunityIcons 
                      name="credit-card-off" 
                      size={48} 
                      color={themeColors.text.tertiary} 
                    />
                    <Text style={[styles.noCardsText, { color: themeColors.text.primary }]}>
                      Kayıtlı kart bulunmuyor
                    </Text>
                    <Text style={[styles.noCardsSubtext, { color: themeColors.text.tertiary }]}>
                      Lütfen önce bir kart ekleyin
                    </Text>
                  </View>
                ) : (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cardsContainer}
                  >
                    {cards.map((card, index) => (
                      <TouchableOpacity
                        key={card.id}
                        style={[
                          styles.miniCard,
                          {
                            borderColor: selectedCard === index 
                              ? themeColors.primary.main 
                              : 'transparent',
                          }
                        ]}
                        onPress={() => setSelectedCard(index)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={card.gradient as any}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.miniCardGradient}
                        >
                          <View style={styles.miniCardHeader}>
                            <Text style={styles.miniBankName}>{card.bankName}</Text>
                            <MaterialCommunityIcons 
                              name={card.type === 'visa' ? 'credit-card' : 'credit-card-outline'} 
                              size={20} 
                              color="rgba(255, 255, 255, 0.9)" 
                            />
                          </View>
                          <Text style={styles.miniCardNumber}>
                            **** {card.cardNumber.slice(-4)}
                          </Text>
                          {selectedCard === index && (
                            <View style={styles.selectedCheckmark}>
                              <MaterialCommunityIcons name="check-circle" size={24} color="white" />
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Info Box */}
              <View style={[
                styles.infoBox,
                {
                  backgroundColor: isDark ? 'rgba(103, 126, 234, 0.1)' : 'rgba(103, 126, 234, 0.05)',
                  borderColor: isDark ? 'rgba(103, 126, 234, 0.3)' : 'rgba(103, 126, 234, 0.2)',
                }
              ]}>
                <MaterialCommunityIcons 
                  name="information" 
                  size={20} 
                  color={themeColors.primary.main} 
                />
                <Text style={[styles.infoText, { color: themeColors.text.secondary }]}>
                  Yüklediğiniz bakiye anında hesabınıza tanımlanacaktır. Bakiye yükleme işleminde herhangi bir ek ücret alınmamaktadır.
                </Text>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={[
            styles.bottomContainer,
            {
              backgroundColor: isDark ? themeColors.background.secondary : themeColors.background.primary,
              borderTopColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
            }
          ]}>
            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: themeColors.primary.main,
                  opacity: amount && parseInt(amount) >= 10 && cards.length > 0 ? 1 : 0.5,
                }
              ]}
              onPress={handleAddBalance}
              disabled={!amount || parseInt(amount) < 10 || cards.length === 0 || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="wallet-plus" size={24} color="white" />
                  <Text style={styles.addButtonText}>
                    {amount ? `${formatAmount(amount)} TL Yükle` : 'Bakiye Yükle'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Background>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={[
            styles.loadingCard,
            {
              backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
            }
          ]}>
            <ActivityIndicator size="large" color={themeColors.primary.main} />
            <Text style={[styles.loadingText, { color: themeColors.text.primary }]}>
              Ödeme işleniyor...
            </Text>
            <Text style={[styles.loadingSubtext, { color: themeColors.text.tertiary }]}>
              Lütfen bekleyin
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  amountCard: {
    borderRadius: borderRadius.xxl,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    ...shadows.large,
  },
  amountCardInner: {
    padding: spacing.xxl,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  amountDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: '900',
    textAlign: 'center',
    minWidth: 200,
    letterSpacing: 2,
  },
  currencySymbol: {
    fontSize: 40,
    fontWeight: '800',
    marginLeft: spacing.md,
  },
  amountHintContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.round,
    alignSelf: 'center',
  },
  amountHint: {
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  presetsSection: {
    marginBottom: spacing.lg,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetButton: {
    width: '31%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    ...shadows.small,
  },
  presetAmount: {
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
  },
  paymentSection: {
    marginBottom: spacing.lg,
  },
  cardsContainer: {
    gap: spacing.md,
  },
  miniCard: {
    width: 180,
    height: 100,
    borderRadius: borderRadius.lg,
    borderWidth: 3,
    overflow: 'hidden',
    ...shadows.medium,
  },
  miniCardGradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  miniCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniBankName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
  },
  miniCardNumber: {
    color: 'white',
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  noCardsContainer: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  noCardsText: {
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  noCardsSubtext: {
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.medium,
  },
  addButtonText: {
    color: 'white',
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    padding: spacing.xxl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  loadingSubtext: {
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.large,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  successMessage: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '600',
    marginBottom: spacing.xl,
  },
  successDetails: {
    width: '100%',
    gap: spacing.md,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  successDetailLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: '500',
  },
  successDetailValue: {
    fontSize: typography.fontSizes.md,
    fontWeight: '700',
  },
});

export default AddBalanceScreen;

