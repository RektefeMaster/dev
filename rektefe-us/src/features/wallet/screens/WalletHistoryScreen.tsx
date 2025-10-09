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
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, shadows, dimensions } from '@/shared/theme';
import { BackButton, LoadingSpinner, EmptyState } from '@/shared/components';
import apiService from '@/shared/services/api';
import { useAuth } from '@/shared/context';

export default function WalletHistoryScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactionHistory();
    }
  }, [isAuthenticated, filter]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchTransactionHistory();
      }
    }, [isAuthenticated, filter])
  );

  const fetchTransactionHistory = async () => {
    try {
      setLoading(true);
      console.log('🔄 [WalletHistory] İşlem geçmişi yükleniyor...');
      
      const response = await apiService.getWalletTransactions(50); // Daha fazla işlem getir
      
      console.log('📝 [WalletHistory] Transactions response:', response);

      if (response.success) {
        let filteredTransactions = response.data || [];
        
        // Filtreleme uygula
        if (filter === 'income') {
          filteredTransactions = filteredTransactions.filter(t => t.type === 'credit');
        } else if (filter === 'expense') {
          filteredTransactions = filteredTransactions.filter(t => t.type === 'debit');
        }
        
        console.log('📊 [WalletHistory] Filtrelenmiş işlemler:', filteredTransactions.length);
        setTransactions(filteredTransactions);
      } else {
        console.warn('⚠️ [WalletHistory] Transactions response success: false');
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('❌ [WalletHistory] Fetch error:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactionHistory();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'credit') {
      return status === 'completed' ? 'checkmark-circle' : 'time';
    } else {
      return 'arrow-up';
    }
  };

  const getTransactionColor = (type: string, status: string) => {
    if (type === 'credit') {
      return status === 'completed' ? colors.success : colors.warning;
    } else {
      return colors.error;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'pending': return 'Bekliyor';
      case 'failed': return 'Başarısız';
      case 'cancelled': return 'İptal';
      default: return 'Bilinmiyor';
    }
  };

  const renderFilterButton = (filterType: 'all' | 'income' | 'expense', label: string) => {
    const isActive = filter === filterType;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => setFilter(filterType)}
      >
        <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTransactionItem = ({ item }: { item: any }) => {
    const isCredit = item.type === 'credit';
    const iconName = getTransactionIcon(item.type, item.status);
    const iconColor = getTransactionColor(item.type, item.status);
    
    return (
      <TouchableOpacity style={styles.transactionCard} activeOpacity={0.7}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionIcon}>
            <Ionicons 
              name={iconName as any} 
              size={20} 
              color={iconColor} 
            />
          </View>
          
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {item.description || item.serviceType || 'İşlem'}
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
              {isCredit ? '+' : '-'}₺{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.transactionStatus}>
              {getStatusText(item.status)}
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
          <Text style={styles.loadingText}>İşlem geçmişi yükleniyor...</Text>
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
            <Text style={styles.headerTitle}>İşlem Geçmişi</Text>
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

      {/* Filter Buttons */}
      <View style={styles.filterSection}>
        {renderFilterButton('all', 'Tümü')}
        {renderFilterButton('income', 'Gelirler')}
        {renderFilterButton('expense', 'Giderler')}
      </View>

      {/* Transactions List */}
      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item._id || item.appointmentId}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="receipt-outline"
              title="Henüz işlem yok"
              subtitle="İşlemleriniz burada görünecek"
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: dimensions.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  activeFilterButton: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeFilterButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: dimensions.screenPadding,
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
