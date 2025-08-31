import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows } from '../theme/theme';
import { BackButton } from '../components';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

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

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, transactionsRes] = await Promise.all([
        apiService.getMechanicEarnings(),
        apiService.getRecentTransactions(),
      ]);

      if (statsRes.success) {
        setStats({
          totalEarnings: statsRes.data?.thisMonth || 0,
          totalJobs: statsRes.data?.completedJobs || 0,
          averageEarnings: statsRes.data?.averagePerJob || 0,
          pendingPayments: statsRes.data?.pendingPayments || 0,
          allTimeTotal: statsRes.data?.allTime || 0,
        });
      } else {
        console.log('Stats API Response:', statsRes);
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
        console.log('Transactions API Response:', transactionsRes);
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Financial data fetch error:', error);
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

  const renderSummaryCard = (icon: string, value: string, label: string, color: string) => (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: color }]}>
        <Text style={styles.summaryIconText}>{icon}</Text>
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );

  const renderTransactionCard = (transaction: any) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => handleTransactionPress(transaction)}
      activeOpacity={0.8}
    >
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionTitle}>
          {transaction.serviceType} - {transaction.customerName}
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
      
      <Text style={styles.transactionService}>{transaction.serviceType}</Text>
      
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDate}>{transaction.date}</Text>
        <Text style={styles.transactionAmount}>+₺{transaction.amount}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
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
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="card" size={40} color="#3B82F6" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Kazançlarım</Text>
              <Text style={styles.headerSubtitle}>Finansal durumunuzu takip edin</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Period Selection */}
      <View style={styles.periodContainer}>
        {renderPeriodButton('thisMonth')}
        {renderPeriodButton('lastMonth')}
        {renderPeriodButton('allTime')}
      </View>

      {/* Total Earnings Card */}
      <View style={styles.totalEarningsCard}>
        <Text style={styles.totalEarningsLabel}>Toplam Kazanç</Text>
        <Text style={styles.totalEarningsValue}>₺{stats.totalEarnings}</Text>
        <Text style={styles.totalEarningsPeriod}>{getPeriodText()}</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        {renderSummaryCard('🔧', `${stats.totalJobs}`, 'Toplam İş', '#3B82F6')}
        {renderSummaryCard('📊', `₺${stats.averageEarnings}`, 'Ortalama', '#10B981')}
        {renderSummaryCard('⏳', `₺${stats.pendingPayments}`, 'Bekleyen', '#F59E0B')}
        {renderSummaryCard('📁', `₺${stats.allTimeTotal}`, 'Toplam', '#8B5CF6')}
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
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={transactions}
          renderItem={({ item }) => renderTransactionCard(item)}
          keyExtractor={(item) => item._id}
          style={styles.transactionsList}
          contentContainerStyle={styles.transactionsContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="card" size={48} color="#6B7280" />
              <Text style={styles.emptyStateTitle}>Henüz işlem yok</Text>
              <Text style={styles.emptyStateText}>
                Tamamlanan işleriniz burada görünecek
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#000000',
    paddingTop: 0,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  totalEarningsCard: {
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  totalEarningsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  totalEarningsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  totalEarningsPeriod: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summarySection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryIconText: {
    fontSize: 20,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  transactionsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  transactionsList: {
    flex: 1,
  },
  transactionsContent: {
    paddingBottom: 40,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionService: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
