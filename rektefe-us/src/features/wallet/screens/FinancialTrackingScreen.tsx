import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, borderRadius, shadows, typography, dimensions } from '@/shared/theme';
import { BackButton, LoadingSpinner, EmptyState } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

export default function FinancialTrackingScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [activePeriod, setActivePeriod] = useState<'thisMonth' | 'lastMonth' | 'allTime'>('thisMonth');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalJobs: 0,
    averageEarnings: 0,
    pendingPayments: 0,
    allTimeTotal: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFinancialData();
    }
  }, [isAuthenticated, activePeriod]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchFinancialData();
      }
    }, [isAuthenticated, activePeriod])
  );

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Yeni API endpoint'i kullan - gerçek appointment verilerine dayalı
      const [statsRes, transactionsRes] = await Promise.all([
        apiService.getEarningsSummaryByPeriod(activePeriod),
        apiService.getRecentTransactions(20),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats({
          totalEarnings: statsRes.data.totalEarnings || 0,
          totalJobs: statsRes.data.totalJobs || 0,
          averageEarnings: statsRes.data.averageEarnings || 0,
          pendingPayments: statsRes.data.pendingPayments || 0,
          allTimeTotal: statsRes.data.allTimeTotal || 0,
        });
      } else {
        console.warn('📊 Stats response:', statsRes);
        setStats({
          totalEarnings: 0,
          totalJobs: 0,
          averageEarnings: 0,
          pendingPayments: 0,
          allTimeTotal: 0,
        });
      }

      if (transactionsRes.success) {
        const transactions = Array.isArray(transactionsRes.data) 
          ? transactionsRes.data 
          : [];
        setTransactions(transactions);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('❌ Fetch financial data error:', error);
      setStats({
        totalEarnings: 0,
        totalJobs: 0,
        averageEarnings: 0,
        pendingPayments: 0,
        allTimeTotal: 0,
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFinancialData();
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction: any) => {
    // İşlem detayına git
    (navigation as any).navigate('AppointmentDetail', { appointmentId: transaction.appointmentId });
  };

  const getPeriodText = () => {
    switch (activePeriod) {
      case 'thisMonth': return 'Bu Ay';
      case 'lastMonth': return 'Geçen Ay';
      case 'allTime': return 'Tüm Zamanlar';
      default: return 'Bu Ay';
    }
  };

  const renderPeriodButton = (period: 'thisMonth' | 'lastMonth' | 'allTime') => {
    const isActive = activePeriod === period;
    const text = period === 'thisMonth' ? 'Bu Ay' : period === 'lastMonth' ? 'Geçen Ay' : 'Tüm Zamanlar';
    
    return (
      <TouchableOpacity
        style={[styles.periodButton, isActive && styles.activePeriodButton]}
        onPress={() => setActivePeriod(period)}
      >
        <Text style={[styles.periodButtonText, isActive && styles.activePeriodButtonText]}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSummaryCard = (iconName: keyof typeof Ionicons.glyphMap, value: string, label: string, color: string) => (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={20} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTransactionCard = (transaction: any) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleTransactionPress(transaction)}
      activeOpacity={0.8}
    >
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionTitle}>
          {transaction.customerName}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(transaction.status) }
        ]}>
          <Text style={styles.statusText}>
            {getStatusText(transaction.status)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.transactionService}>
        {transaction.serviceType} • {transaction.vehicleInfo}
      </Text>
      
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
        <Text style={styles.transactionAmount}>
          +₺{transaction.amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success.main;
      case 'pending': return colors.warning.main;
      case 'failed': return colors.error.main;
      default: return colors.text.tertiary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'pending': return 'Bekliyor';
      case 'failed': return 'Başarısız';
      default: return 'Bilinmiyor';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Kazançlarınız yükleniyor...</Text>
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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Kazançlarım</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={refreshing ? colors.text.tertiary : colors.text.secondary} 
            />
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
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
      >
        {/* Period Selection */}
        <View style={styles.periodContainer}>
          {renderPeriodButton('thisMonth')}
          {renderPeriodButton('lastMonth')}
          {renderPeriodButton('allTime')}
        </View>

        {/* Total Earnings Card */}
        <LinearGradient
          colors={[colors.primary.main, colors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalEarningsCard}
        >
          <Ionicons name="wallet" size={32} color="rgba(255, 255, 255, 0.9)" style={styles.earningsIcon} />
          <Text style={styles.totalEarningsLabel}>Toplam Kazanç</Text>
          <Text style={styles.totalEarningsValue}>₺{stats.totalEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <View style={styles.periodBadge}>
            <Text style={styles.totalEarningsPeriod}>{getPeriodText()}</Text>
          </View>
        </LinearGradient>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          {renderSummaryCard('briefcase', `${stats.totalJobs}`, 'Toplam İş', colors.primary.main)}
          {renderSummaryCard('trending-up', `₺${stats.averageEarnings.toLocaleString('tr-TR')}`, 'Ortalama', colors.success.main)}
          {renderSummaryCard('time', `₺${stats.pendingPayments.toLocaleString('tr-TR')}`, 'Bekleyen', colors.warning.main)}
          {renderSummaryCard('stats-chart', `₺${stats.allTimeTotal.toLocaleString('tr-TR')}`, 'Tüm Zamanlar', colors.secondary.main)}
        </View>

        {/* Latest Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son İşlemler</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => (navigation as any).navigate('Appointments')}
            >
              <Text style={styles.viewAllText}>Tümünü Gör</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary.main} />
            </TouchableOpacity>
          </View>
          
          {transactions.length > 0 ? (
            transactions.map((item, index) => (
              <View key={item._id || index}>
                {renderTransactionCard(item)}
              </View>
            ))
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="Henüz işlem yok"
              subtitle="Tamamlanan işleriniz burada görünecek"
            />
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
    backgroundColor: colors.background.primary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
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
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: dimensions.screenPadding,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  activePeriodButton: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  periodButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activePeriodButtonText: {
    color: colors.primary.main,
    fontWeight: '700',
  },
  totalEarningsCard: {
    marginHorizontal: dimensions.screenPadding,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.large,
  },
  earningsIcon: {
    marginBottom: spacing.sm,
  },
  totalEarningsLabel: {
    fontSize: typography.body2.fontSize,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  totalEarningsValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  periodBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  totalEarningsPeriod: {
    fontSize: typography.body3.fontSize,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summarySection: {
    flexDirection: 'row',
    paddingHorizontal: dimensions.screenPadding,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
    ...shadows.small,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  transactionsSection: {
    paddingHorizontal: dimensions.screenPadding,
    paddingBottom: spacing.xl,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },
  transactionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    ...shadows.small,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  transactionTitle: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionService: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  transactionDate: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.tertiary,
  },
  transactionAmount: {
    fontSize: typography.body2.fontSize,
    fontWeight: '700',
    color: colors.success.main,
  },
});
