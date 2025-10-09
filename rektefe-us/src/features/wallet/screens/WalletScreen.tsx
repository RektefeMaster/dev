import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, shadows, dimensions } from '@/shared/theme';
import { Button, Card, LoadingSpinner, EmptyState, BackButton } from '@/shared/components';
import StatsCard from '@/features/home/components/StatsCard';
import apiService from '@/shared/services/api';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState({
    balance: 0,
    totalEarnings: 0,
    pendingAmount: 0,
    thisMonthEarnings: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletData();
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchWalletData();
      }
    }, [isAuthenticated])
  );

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      console.log('🔄 [WalletScreen] Cüzdan verileri yükleniyor...');
      
      const [walletRes, transactionsRes, debugRes] = await Promise.all([
        apiService.getMechanicWallet(),
        apiService.getRecentTransactions(),
        apiService.getWalletDebugInfo(),
      ]);

      console.log('🔍 [WalletScreen] Wallet response:', walletRes);
      console.log('🔍 [WalletScreen] Transactions response:', transactionsRes);
      console.log('🔍 [WalletScreen] Debug bilgisi:', debugRes);

      if (walletRes.success) {
        const newWalletData = {
          balance: walletRes.data?.balance || 0,
          totalEarnings: walletRes.data?.totalEarnings || 0,
          pendingAmount: walletRes.data?.pendingAmount || 0,
          thisMonthEarnings: walletRes.data?.thisMonthEarnings || 0,
        };
        console.log('💰 [WalletScreen] Wallet data set ediliyor:', newWalletData);
        setWalletData(newWalletData);
      } else {
        console.warn('⚠️ [WalletScreen] Wallet response success: false');
        setWalletData({
          balance: 0,
          totalEarnings: 0,
          pendingAmount: 0,
          thisMonthEarnings: 0,
        });
      }

      if (transactionsRes.success) {
        console.log('📝 [WalletScreen] Transactions set ediliyor:', transactionsRes.data?.length || 0, 'adet');
        setTransactions(transactionsRes.data || []);
      } else {
        console.warn('⚠️ [WalletScreen] Transactions response success: false');
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('❌ [WalletScreen] Fetch error:', error);
      setWalletData({
        balance: 0,
        totalEarnings: 0,
        pendingAmount: 0,
        thisMonthEarnings: 0,
      });
      setTransactions([]);
    } finally {
      setLoading(false);
      console.log('✅ [WalletScreen] Loading tamamlandı');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const handleWithdraw = () => {
    if (walletData.balance <= 0) {
      Alert.alert('Uyarı', 'Çekilecek bakiye bulunmuyor');
      return;
    }
    
    navigation.navigate('WithdrawMoney' as never);
  };

  const renderTransactionItem = ({ item }: { item: any }) => {
    const isCredit = item.type === 'credit';
    
    // Tarih formatını düzenle
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'Dün';
      } else if (diffDays < 7) {
        return `${diffDays} gün önce`;
      } else {
        return date.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    };
    
    // Saat formatını düzenle
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    return (
      <TouchableOpacity style={styles.transactionCard} activeOpacity={0.7}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIcon}>
            <Ionicons 
              name={isCredit ? "checkmark-circle" : "arrow-up"} 
              size={20} 
              color={isCredit ? colors.success : colors.error} 
            />
          </View>
          
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {item.description || 'İşlem'}
            </Text>
            <Text style={styles.transactionSubtitle}>
              {item.customerName} • {item.vehicleInfo}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDate(item.date)} • {formatTime(item.date)}
            </Text>
          </View>
          
          <View style={styles.transactionAmount}>
            <Text style={[
              styles.amountText,
              { color: isCredit ? colors.success : colors.error }
            ]}>
              {isCredit ? '+' : '-'}₺{item.amount}
            </Text>
            <Text style={styles.transactionStatus}>
              {item.status === 'pending' ? 'Bekliyor' : 
               item.status === 'paid' ? 'Ödendi' : 'Tamamlandı'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Cüzdan yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Cüzdan</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons name="refresh" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Mevcut Bakiye</Text>
            <Text style={styles.balanceAmount}>₺{walletData.balance.toFixed(2)}</Text>
          </View>
          
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={handleWithdraw}
              disabled={walletData.balance <= 0}
              activeOpacity={0.7}
            >
              <Ionicons name="wallet" size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Para Çek</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.historyButton]}
              onPress={() => Alert.alert('Bilgi', 'İşlem geçmişi yakında eklenecek')}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={20} color={colors.text.primary.main} />
              <Text style={[styles.actionButtonText, styles.historyButtonText]}>Geçmiş</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <StatsCard
            icon="trending-up"
            value={`₺${walletData.thisMonthEarnings.toFixed(2)}`}
            label="Bu Ay"
            variant="success"
          />
          <StatsCard
            icon="time"
            value={`₺${walletData.pendingAmount.toFixed(2)}`}
            label="Bekleyen"
            variant="warning"
          />
          <StatsCard
            icon="cash"
            value={`₺${walletData.totalEarnings.toFixed(2)}`}
            label="Toplam"
            variant="primary"
          />
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son İşlemler ({transactions.length})</Text>
            <TouchableOpacity
              onPress={() => Alert.alert('Bilgi', 'İşlem geçmişi yakında eklenecek')}
            >
              <Text style={styles.viewAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          {transactions.length > 0 ? (
            transactions.slice(0, 10).map((item, index) => (
              <View key={item._id || index}>
                {renderTransactionItem({ item })}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon="receipt-outline"
                title="Henüz işlem yok"
                subtitle="İlk işleminizi tamamladığınızda burada görünecek"
                actionText="İşlem Geçmişi"
                onActionPress={() => Alert.alert('Bilgi', 'İşlem geçmişi yakında eklenecek')}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  header: {
    paddingHorizontal: dimensions.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    margin: dimensions.screenPadding,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  balanceAmount: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  withdrawButton: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary,
  },
  historyButton: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.secondary,
  },
  actionButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.primary,
  },
  historyButtonText: {
    color: colors.text.primary.main,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: dimensions.screenPadding,
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  transactionsSection: {
    flex: 1,
    paddingHorizontal: dimensions.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
  },
  viewAllText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },
  transactionsList: {
    paddingBottom: spacing.xxl,
  },
  transactionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  transactionSubtitle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.tertiary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  transactionStatus: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
});
