import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import Background from '@/shared/components/Background';
// @ts-ignore
// import * as Sharing from 'expo-sharing';
import { useTheme } from '@/context/ThemeContext';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useWalletData } from '../hooks/useWalletData';
import { useCreditCards } from '../hooks/useCreditCards';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';
import ErrorState from '@/shared/components/ErrorState';

const { width: screenWidth } = Dimensions.get('window');

const WalletScreen = ({ navigation }: any) => {
  const { isDark, colors: themeColors } = useTheme();
  const [showQR, setShowQR] = useState(false);
  const [qrOpacity] = useState(new Animated.Value(0));
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [tefePoints, setTefePoints] = useState(0);
  
  // Hooks
  const { 
    balance, 
    transactions, 
    totalSpent, 
    monthlySavings, 
    isLoading: walletLoading, 
    error: walletError, 
    refreshWalletData 
  } = useWalletData();
  
  const { 
    cards, 
    isLoading: cardsLoading, 
    error: cardsError, 
    refreshCreditCards 
  } = useCreditCards();
  
  // Animasyon değerleri
  const balanceScale = useRef(new Animated.Value(0.8)).current;
  const cardSlideAnim = useRef(new Animated.Value(50)).current;
  const transactionFadeAnim = useRef(new Animated.Value(0)).current;
  const headerScrollAnim = useRef(new Animated.Value(0)).current;
  
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const [selectedCard, setSelectedCard] = useState(0);
  const qrRef = useRef<any>(null);

  // Ekran odaklandığında verileri güncelle
  useFocusEffect(
    React.useCallback(() => {
      refreshWalletData();
    }, [])
  );

  // Animasyonları başlat
  useEffect(() => {
    Animated.parallel([
      Animated.spring(balanceScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(transactionFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleAddCard = () => {
    Alert.alert('Bilgi', 'Kart ekleme özelliği yakında eklenecek!');
  };

  const handleAddBalance = () => {
    Alert.alert('Bilgi', 'Bakiye yükleme özelliği yakında eklenecek!');
  };

  const handleShowQR = () => {
    setShowQR(true);
    qrOpacity.setValue(0);
    Animated.timing(qrOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handleShareQR = async () => {
    if (qrRef.current) {
      qrRef.current.toDataURL(async (data: string) => {
        const fileUri = FileSystem.cacheDirectory + 'qr.png';
        await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.Base64 });
        // await Sharing.shareAsync(fileUri);
        });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'debit': return 'arrow-down';
      case 'credit': return 'arrow-up';
      default: return 'swap-horizontal';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'debit': return '#FF3B30';
      case 'credit': return '#34C759';
      default: return '#007AFF';
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)} ₺`;
  };

  const getPeriodText = (period: string) => {
    switch (period) {
      case 'week': return 'Bu Hafta';
      case 'month': return 'Bu Ay';
      case 'year': return 'Bu Yıl';
      default: return 'Bu Ay';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'servis': return 'wrench';
      case 'market': return 'shopping';
      case 'yükleme': return 'bank-plus';
      case 'bonus': return 'gift';
      case 'yemek': return 'food';
      case 'ulaşım': return 'car';
      default: return 'cash';
    }
  };

  const getTransactionCategory = (description: string): string => {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('servis') || lowerDesc.includes('usta') || lowerDesc.includes('garaj')) return 'servis';
    if (lowerDesc.includes('market') || lowerDesc.includes('alışveriş')) return 'market';
    if (lowerDesc.includes('yükleme') || lowerDesc.includes('bakiye')) return 'yükleme';
    if (lowerDesc.includes('bonus') || lowerDesc.includes('tefe')) return 'bonus';
    if (lowerDesc.includes('yemek') || lowerDesc.includes('restoran')) return 'yemek';
    if (lowerDesc.includes('ulaşım') || lowerDesc.includes('otobüs') || lowerDesc.includes('metro')) return 'ulaşım';
    return 'diğer';
  };

  const getTransactionMerchant = (description: string): string => {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('garanti')) return 'Garanti BBVA';
    if (lowerDesc.includes('iş bankası')) return 'İş Bankası';
    if (lowerDesc.includes('tefe')) return 'TEFE';
    if (lowerDesc.includes('migros')) return 'Migros';
    if (lowerDesc.includes('usta')) return 'Ahmet Usta';
    if (lowerDesc.includes('garaj')) return 'Oto Garaj';
    return 'Bilinmeyen';
  };

  const getTransactionLocation = (description: string): string => {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('istanbul')) return 'İstanbul';
    if (lowerDesc.includes('ankara')) return 'Ankara';
    if (lowerDesc.includes('izmir')) return 'İzmir';
    if (lowerDesc.includes('tefe') || lowerDesc.includes('bonus')) return 'Sistem';
    return 'Türkiye';
  };

  const formatTransactionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'servis': return '#FF6B35';
      case 'market': return '#4ECDC4';
      case 'yükleme': return '#45B7D1';
      case 'bonus': return '#96CEB4';
      case 'yemek': return '#FFEAA7';
      case 'ulaşım': return '#DDA0DD';
      default: return '#A8E6CF';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent 
      />
      <Background>
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: headerScrollAnim } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl 
              refreshing={walletLoading || cardsLoading} 
              onRefresh={() => {
                refreshWalletData();
                refreshCreditCards();
              }}
              colors={[themeColors.primary.main]}
              tintColor={themeColors.primary.main}
            />
          }
        >
          {/* Header Section */}
          <Animated.View style={[
            styles.headerSection,
            {
              transform: [{
                translateY: headerScrollAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -50],
                  extrapolate: 'clamp'
                })
              }],
              opacity: headerScrollAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0.8],
                extrapolate: 'clamp'
              })
            }
          ]}>
            <View style={styles.headerTop}>
              <TouchableOpacity 
                style={[styles.headerButton, { 
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
                }]}
                onPress={() => navigation.goBack()}
              >
                <MaterialCommunityIcons 
                  name="arrow-left" 
                  size={20} 
                  color={themeColors.text.primary} 
                />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { 
                  color: themeColors.text.primary 
                }]}>
                  Cüzdan
                </Text>
                <Text style={[styles.headerSubtitle, { 
                  color: isDark ? themeColors.text.tertiary : themeColors.text.secondary 
                }]}>
                  Finansal durumunuzu takip edin
                </Text>
              </View>
              <TouchableOpacity style={[styles.headerButton, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
              }]}>
                <MaterialCommunityIcons 
                  name="dots-horizontal" 
                  size={20} 
                  color={themeColors.text.primary} 
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Balance Overview Card */}
          <Animated.View style={[
            styles.balanceCard,
            { 
              transform: [{ scale: balanceScale }],
            }
          ]}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceGradient}
            >
              <View style={styles.balanceHeader}>
                <View style={styles.balanceHeaderLeft}>
                  <Text style={styles.balanceLabel}>Toplam Bakiye</Text>
                  <Text style={styles.balanceSubtitle}>Güncel durum</Text>
                </View>
                <TouchableOpacity style={styles.eyeButton}>
                  <MaterialCommunityIcons name="eye" size={20} color="rgba(255, 255, 255, 0.8)" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.balanceAmount}>
                {balance.toFixed(2)} ₺
              </Text>
              
              <View style={styles.balanceStats}>
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <MaterialCommunityIcons name="trending-down" size={16} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Bu Ay Harcanan</Text>
                    <Text style={styles.statValue}>{totalSpent.toFixed(2)} ₺</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <MaterialCommunityIcons name="trending-up" size={16} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Tasarruf</Text>
                    <Text style={styles.statValue}>{monthlySavings.toFixed(2)} ₺</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.periodSelector}>
                <TouchableOpacity 
                  style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
                  onPress={() => setSelectedPeriod('week')}
                >
                  <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
                    Hafta
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
                  onPress={() => setSelectedPeriod('month')}
                >
                  <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
                    Ay
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
                  onPress={() => setSelectedPeriod('year')}
                >
                  <Text style={[styles.periodText, selectedPeriod === 'year' && styles.periodTextActive]}>
                    Yıl
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={[styles.sectionTitle, { 
              color: themeColors.text.primary 
            }]}> 
              Hızlı İşlemler
            </Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
                onPress={handleAddBalance}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.primary.main }]}>
                  <MaterialCommunityIcons name="plus" size={24} color="white" />
                </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}>
                  Bakiye Yükle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
                onPress={handleShowQR}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.success.main }]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={24} color="white" />
                </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}>
                  QR ile Öde
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
                onPress={handleAddCard}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.warning.main }]}>
                  <MaterialCommunityIcons name="credit-card-plus" size={24} color="white" />
                </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}>
                  Kart Ekle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.secondary.main }]}>
                  <MaterialCommunityIcons name="chart-line" size={24} color="white" />
                </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}> 
                  Raporlar
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Credit Cards Section */}
          <Animated.View style={[
            styles.cardsSection,
            { transform: [{ translateY: cardSlideAnim }] }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { 
                  color: themeColors.text.primary 
                }]}> 
                  Kredi Kartlarım
                </Text>
                <Text style={[styles.sectionSubtitle, { 
                  color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                }]}>
                  {cards.length} kart aktif
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.toggleButton, { 
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
                }]}
                onPress={() => setShowCardNumbers(!showCardNumbers)}
              >
                <MaterialCommunityIcons 
                  name={showCardNumbers ? 'eye-off' : 'eye'} 
                  size={18} 
                  color={themeColors.text.primary} 
                />
                <Text style={[styles.toggleText, { 
                  color: themeColors.text.primary 
                }]}>
                  {showCardNumbers ? 'Gizle' : 'Göster'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
              decelerationRate="fast"
              snapToInterval={320}
            >
              {cards.map((card, index) => (
                <TouchableOpacity 
                  key={card.id}
                  style={[
                    styles.creditCard,
                    { 
                      transform: [{ scale: selectedCard === index ? 1.05 : 1 }]
                    }
                  ]}
                  onPress={() => setSelectedCard(index)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={card.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={styles.bankName}>{card.bankName}</Text>
                        <Text style={styles.cardType}>{card.type.toUpperCase()}</Text>
                      </View>
                      <MaterialCommunityIcons
                        name={card.type === 'visa' ? 'credit-card' : 'credit-card-outline'}
                        size={28}
                        color="rgba(255, 255, 255, 0.9)"
                      />
                    </View>
                    
                    <View style={styles.cardBody}>
                      <Text style={styles.cardBalance}>
                        {card.balance.toFixed(2)} ₺
                      </Text>
                      <Text style={styles.cardNumber}>
                        {showCardNumbers ? card.cardNumber : '**** **** **** ****'}
                      </Text>
                    </View>
                    
                    <View style={styles.cardFooter}>
                      <View>
                        <Text style={styles.cardLabel}>Kart Sahibi</Text>
                        <Text style={styles.cardValue}>{card.cardHolder}</Text>
                      </View>
                      <View>
                        <Text style={styles.cardLabel}>Son Kullanma</Text>
                        <Text style={styles.cardValue}>{card.expiryDate}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.cardCreditInfo}>
                      <View style={styles.creditItem}>
                        <Text style={styles.creditLabel}>Kart Limiti</Text>
                        <Text style={styles.creditValue}>{card.cardLimit.toLocaleString()} ₺</Text>
                      </View>
                      <View style={styles.creditItem}>
                        <Text style={styles.creditLabel}>Kullanılabilir</Text>
                        <Text style={styles.creditValue}>{card.availableCredit.toLocaleString()} ₺</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Recent Transactions */}
          <Animated.View style={[
            styles.transactionsSection,
            { opacity: transactionFadeAnim }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { 
                  color: themeColors.text.primary 
                }]}>
                  Son İşlemler
                </Text>
                <Text style={[styles.sectionSubtitle, { 
                  color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                }]}>
                  {getPeriodText(selectedPeriod)} işlemleri
                </Text>
              </View>
              <TouchableOpacity style={[styles.viewAllButton, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
              }]}>
                <Text style={[styles.viewAllText, { 
                  color: themeColors.text.primary 
                }]}>
                  Tümünü Gör
                </Text>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={16} 
                  color={themeColors.text.primary} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.transactionsList}>
              {transactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <MaterialCommunityIcons 
                    name="wallet-outline" 
                    size={48} 
                    color={isDark ? themeColors.text.quaternary : themeColors.text.tertiary} 
                  />
                  <Text style={[styles.emptyTransactionsText, { 
                    color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                  }]}>
                    Henüz işlem bulunmuyor
                  </Text>
                  <Text style={[styles.emptyTransactionsSubtext, { 
                    color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                  }]}>
                    İlk işleminizi yaptığınızda burada görünecek
                  </Text>
                </View>
              ) : (
                transactions.map((transaction) => (
                  <TouchableOpacity 
                    key={transaction._id} 
                    style={[
                      styles.transactionItem,
                      { 
                        backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                        borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                      }
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: getCategoryColor(getTransactionCategory(transaction.description)) + '20' }
                    ]}>
                      <MaterialCommunityIcons 
                        name={getCategoryIcon(getTransactionCategory(transaction.description)) as any} 
                        size={20} 
                        color={getCategoryColor(getTransactionCategory(transaction.description))} 
                      />
                    </View>
                    
                    <View style={styles.transactionContent}>
                      <Text style={[styles.transactionTitle, { 
                        color: themeColors.text.primary 
                      }]}> 
                        {transaction.description}
                      </Text>
                      <Text style={[styles.transactionSubtitle, { 
                        color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                      }]}>
                        {transaction.type === 'credit' ? 'Gelir' : 'Gider'}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <View style={styles.transactionMetaLeft}>
                          <Text style={[styles.transactionMerchant, { 
                            color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                          }]}>
                            {getTransactionMerchant(transaction.description)}
                          </Text>
                          <Text style={[styles.transactionLocation, { 
                            color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                          }]}>
                            📍 {getTransactionLocation(transaction.description)}
                          </Text>
                        </View>
                        <Text style={[styles.transactionDate, { 
                          color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                        }]}>
                          {formatTransactionDate(transaction.date)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.transactionAmount}>
                      <Text style={[
                        styles.transactionAmountText,
                        { color: getTransactionColor(transaction.type) }
                      ]}>
                        {formatCurrency(transaction.type === 'credit' ? transaction.amount : -transaction.amount)}
                      </Text>
                      <View style={styles.transactionTypeIndicator}>
                        <MaterialCommunityIcons 
                          name={getTransactionIcon(transaction.type)} 
                          size={14} 
                          color={getTransactionColor(transaction.type)} 
                        />
                        <Text style={[styles.transactionTypeText, { 
                          color: getTransactionColor(transaction.type) 
                        }]}>
                          {transaction.type === 'credit' ? 'Gelir' : 'Gider'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Animated.View>

          {/* Bottom Spacing */}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </Background>

      {/* QR Modal */}
      {showQR && (
        <Animated.View style={[styles.qrModal, { opacity: qrOpacity }]}>
          <View style={[
            styles.qrContainer,
            { 
              backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
              borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
            }
          ]}>
            <View style={styles.qrHeader}>
              <Text style={[styles.qrTitle, { 
                color: themeColors.text.primary 
              }]}> 
                Ödeme QR Kodu
              </Text>
              <TouchableOpacity 
                style={styles.qrCloseButton}
                onPress={() => setShowQR(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrCodeContainer}>
              <QRCode
                value="REKTEFE_PAYMENT_123456"
                size={200}
                backgroundColor="white"
                getRef={ref => qrRef.current = ref}
              />
            </View>
            
            <Text style={[styles.qrDescription, { 
              color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
            }]}>
              Ödeme yapmak için QR kodu gösterin
            </Text>
            
            <View style={styles.qrActions}>
              <TouchableOpacity 
                style={[styles.qrActionButton, { backgroundColor: themeColors.primary.main }]}
                onPress={handleShareQR}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="white" />
                <Text style={styles.qrActionText}>Paylaş</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.qrActionButton, { backgroundColor: themeColors.success.main }]}
              >
                <MaterialCommunityIcons name="download" size={20} color="white" />
                <Text style={styles.qrActionText}>İndir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
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
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.round,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    opacity: 0.7,
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: spacing.xl,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  balanceHeaderLeft: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.xs,
  },
  balanceSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  eyeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: 'white',
    marginBottom: spacing.lg,
  },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  statLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    color: 'white',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  periodText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  periodTextActive: {
    color: 'white',
  },
  quickActionsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (screenWidth - spacing.lg * 2 - spacing.md) / 2,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardsSection: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  toggleText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
  },
  cardsContainer: {
    paddingHorizontal: spacing.lg,
  },
  creditCard: {
    width: 320,
    height: 200,
    borderRadius: borderRadius.lg,
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: spacing.lg,
    height: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  bankName: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardType: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: typography.fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cardBalance: {
    color: 'white',
    fontSize: typography.fontSizes.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  cardNumber: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  cardValue: {
    color: 'white',
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
  },
  cardCreditInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  creditItem: {
    alignItems: 'center',
  },
  creditLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  creditValue: {
    color: 'white',
    fontSize: typography.fontSizes.sm,
    fontWeight: '700',
  },
  transactionsSection: {
    paddingHorizontal: spacing.lg,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
  },
  transactionsList: {
    gap: spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  transactionSubtitle: {
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.xs,
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  transactionMetaLeft: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  transactionLocation: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '500',
    textAlign: 'right',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: typography.fontSizes.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  transactionTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transactionTypeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: '600',
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyTransactionsText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyTransactionsSubtext: {
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    opacity: 0.7,
  },
  qrModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qrContainer: {
    width: screenWidth * 0.85,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
  },
  qrCloseButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
  },
  qrDescription: {
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.7,
  },
  qrActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    minWidth: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  qrActionText: {
    color: 'white',
    fontSize: typography.fontSizes.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});

export default WalletScreen;
