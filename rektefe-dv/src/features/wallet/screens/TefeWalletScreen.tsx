import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Background from '@/shared/components/Background';
import { useTheme } from '@/context/ThemeContext';
import { colors, spacing, borderRadius, typography, shadows } from '@/theme/theme';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';
import ErrorState from '@/shared/components/ErrorState';
import { BackButton } from '@/shared/components';
import { tefePointService, TefePointBalance, TefePointTransaction, ServiceCategory } from '../services/tefePointService';

const { width: screenWidth } = Dimensions.get('window');

// Interfaces are now imported from tefePointService

const TefeWalletScreen = () => {
  const { isDark, colors: themeColors } = useTheme();
  
  // State
  const [balance, setBalance] = useState<TefePointBalance>({
    totalPoints: 0,
    availablePoints: 0,
    usedPoints: 0,
    expiredPoints: 0
  });
  const [transactions, setTransactions] = useState<TefePointTransaction[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // Animasyon değerleri
  const balanceScale = useRef(new Animated.Value(0.8)).current;
  const cardSlideAnim = useRef(new Animated.Value(50)).current;
  const transactionFadeAnim = useRef(new Animated.Value(0)).current;
  const headerScrollAnim = useRef(new Animated.Value(0)).current;

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

  // Ekran odaklandığında TefePuan verilerini güncelle
  useFocusEffect(
    React.useCallback(() => {
      loadTefePointData();
    }, [])
  );

  // TefePuan verilerini yükle
  const loadTefePointData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // API'den verileri çek
      const [balanceData, historyData, categoriesData] = await Promise.all([
        tefePointService.getBalance(),
        tefePointService.getHistory({ limit: 20 }),
        tefePointService.getServiceCategories()
      ]);

      setBalance(balanceData);
      setTransactions(historyData.transactions);
      setServiceCategories(categoriesData);
    } catch (err: any) {
      console.error('TefePuan verileri yüklenirken hata:', err);
      setError(err.message || 'Veriler yüklenirken bir hata oluştu');
      
      // Hata durumunda boş veriler
      setBalance({
        totalPoints: 0,
        availablePoints: 0,
        usedPoints: 0,
        expiredPoints: 0
      });
      setTransactions([]);
      setServiceCategories([]);
      
      // Sadece gerçek API hatası durumunda error state göster
      if (err.response?.status >= 500) {
        setError('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Yenileme
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTefePointData();
    setIsRefreshing(false);
  };

  // Component mount olduğunda verileri yükle
  useEffect(() => {
    loadTefePointData();
  }, []);

  // Tarih formatla
  const formatDate = (dateString: string): string => {
    return tefePointService.formatDate(dateString);
  };

  // İşlem türü ikonu
  const getTransactionIcon = (type: string, status: string) => {
    return tefePointService.getTransactionIcon(type, status);
  };

  // İşlem türü rengi
  const getTransactionColor = (type: string, status: string) => {
    return tefePointService.getTransactionColor(type, status);
  };

  // Hizmet kategorisi açıklaması
  const getServiceDescription = (category?: string): string => {
    if (!category) return 'Bilinmeyen Hizmet';
    return tefePointService.getServiceDescription(category);
  };

  // Dönem metni
  const getPeriodText = (period: string) => {
    switch (period) {
      case 'week': return 'Bu Hafta';
      case 'month': return 'Bu Ay';
      case 'year': return 'Bu Yıl';
      default: return 'Bu Ay';
    }
  };

  // Yükleme durumu
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Background>
          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <LoadingSkeleton />
          </ScrollView>
        </Background>
      </SafeAreaView>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Background>
          <ErrorState 
            message={error}
          />
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
              refreshing={isRefreshing} 
              onRefresh={handleRefresh}
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
              <BackButton />
              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { 
                  color: themeColors.text.primary 
                }]}>
                  TefeCüzdan
                </Text>
                <Text style={[styles.headerSubtitle, { 
                  color: isDark ? themeColors.text.tertiary : themeColors.text.secondary 
                }]}>
                  TefePuanlarınızı yönetin
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* TefePuan Balance Card */}
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
                  <Text style={styles.balanceLabel}>TefePuan Bakiyeniz</Text>
                  <Text style={styles.balanceSubtitle}>Kullanılabilir puanlar</Text>
                </View>
                <View style={styles.tefeIcon}>
                  <MaterialCommunityIcons name="star" size={24} color="rgba(255, 255, 255, 0.9)" />
                </View>
              </View>
              
              <Text style={styles.balanceAmount}>
                {balance.availablePoints.toLocaleString()}
              </Text>
              
              <View style={styles.balanceStats}>
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <MaterialCommunityIcons name="trending-up" size={16} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Toplam Kazanım</Text>
                    <Text style={styles.statValue}>{balance.totalPoints.toLocaleString()}</Text>
                  </View>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <View style={styles.statIcon}>
                    <MaterialCommunityIcons name="trending-down" size={16} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                  <View>
                    <Text style={styles.statLabel}>Kullanılan</Text>
                    <Text style={styles.statValue}>{balance.usedPoints.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Hızlı İşlemler */}
          <Animated.View style={[
            styles.quickActionsSection,
            { transform: [{ translateY: cardSlideAnim }] }
          ]}>
            <Text style={[styles.sectionTitle, { 
              color: themeColors.text.primary 
            }]}> 
              Hızlı İşlemler
            </Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                key="use-tefe-points"
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
                onPress={() => Alert.alert('Bilgi', 'TefePuan kullanım özelliği yakında eklenecek!')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.primary.main }]}>
                  <MaterialCommunityIcons name="star-minus" size={24} color="white" />
                </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}>
                  TefePuan Kullan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                key="transfer-tefe-points"
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
                onPress={() => Alert.alert('Bilgi', 'TefePuan transfer özelliği yakında eklenecek!')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.success.main }]}>
                  <MaterialCommunityIcons name="swap-horizontal" size={24} color="white" />
                </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}>
                  TefePuan Transfer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                key="gift-tefe-points"
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
                onPress={() => Alert.alert('Bilgi', 'TefePuan hediye özelliği yakında eklenecek!')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.warning.main }]}>
                  <MaterialCommunityIcons name="gift" size={24} color="white" />
          </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}>
                  TefePuan Hediye
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                key="tefe-statistics"
                style={[styles.quickActionButton, { 
                  backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                  borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                }]}
                onPress={() => Alert.alert('Bilgi', 'TefePuan istatistikleri yakında eklenecek!')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: themeColors.secondary.main }]}>
                  <MaterialCommunityIcons name="chart-line" size={24} color="white" />
                </View>
                <Text style={[styles.quickActionText, { 
                  color: themeColors.text.primary 
                }]}> 
                  İstatistikler
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* TefePuan Geçmişi */}
          <Animated.View style={[
            styles.transactionsSection,
            { opacity: transactionFadeAnim }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { 
                  color: themeColors.text.primary 
                }]}>
                  TefePuan Geçmişi
                </Text>
                <Text style={[styles.sectionSubtitle, { 
                  color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                }]}>
                  {getPeriodText(selectedPeriod)} işlemleri
                </Text>
              </View>
            </View>
            
            <View style={styles.transactionsList}>
              {transactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <MaterialCommunityIcons 
                    name="star-outline" 
                    size={48} 
                    color={isDark ? themeColors.text.quaternary : themeColors.text.tertiary} 
                  />
                  <Text style={[styles.emptyTransactionsText, { 
                    color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                  }]}>
                    Henüz TefePuan işlemi bulunmuyor
                  </Text>
                  <Text style={[styles.emptyTransactionsSubtext, { 
                    color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                  }]}>
                    İlk hizmet satın alımınızda TefePuan kazanmaya başlayacaksınız
                  </Text>
                </View>
              ) : (
                transactions.map((transaction, index) => (
                  <View 
                    key={transaction.id || index}
                    style={[
                      styles.transactionItem,
                      { 
                        backgroundColor: isDark ? themeColors.background.tertiary : themeColors.background.secondary,
                        borderColor: isDark ? themeColors.border.tertiary : themeColors.border.primary,
                      }
                    ]}
                  >
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: getTransactionColor(transaction.type, transaction.status) + '20' }
                    ]}>
                      <MaterialCommunityIcons 
                        name={getTransactionIcon(transaction.type, transaction.status) as any} 
                        size={20} 
                        color={getTransactionColor(transaction.type, transaction.status)} 
                      />
                    </View>
                    
                    <View style={styles.transactionContent}>
                      <Text style={[styles.transactionTitle, { 
                        color: themeColors.text.primary 
                      }]}> 
                        {transaction.description}
                      </Text>
                      <Text style={[styles.transactionDate, { 
                        color: isDark ? themeColors.text.quaternary : themeColors.text.tertiary 
                      }]}>
                        {formatDate(transaction.date)}
                      </Text>
                    </View>
                    
                    <View style={styles.transactionPoints}>
                      <Text style={[
                        styles.transactionPointsText,
                        { color: getTransactionColor(transaction.type, transaction.status) }
                      ]}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </Text>
                      <View style={styles.transactionTypeIndicator}>
                        <MaterialCommunityIcons 
                          name="star" 
                          size={12} 
                          color={getTransactionColor(transaction.type, transaction.status)} 
                        />
                        <Text style={[styles.transactionTypeText, { 
                          color: getTransactionColor(transaction.type, transaction.status) 
                        }]}>
                          TefePuan
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
          </View>
          </Animated.View>

          {/* Bottom Spacing */}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </Background>
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
  tefeIcon: {
    padding: spacing.sm,
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
  quickActionsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
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
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    opacity: 0.7,
  },
  transactionsSection: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeaderLeft: {
    flex: 1,
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
  transactionDate: {
    fontSize: typography.fontSizes.sm,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  transactionPoints: {
    alignItems: 'flex-end',
  },
  transactionPointsText: {
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
});

export default TefeWalletScreen; 
