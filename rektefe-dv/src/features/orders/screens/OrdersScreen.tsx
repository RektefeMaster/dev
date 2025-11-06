import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { RootStackParamList } from '@/navigation/AppNavigator';
import ScreenHeader from '@/shared/components/ScreenHeader';
import EmptyState from '@/shared/components/NoDataCard';
import ErrorState from '@/shared/components/ErrorState';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';
import { spacing, borderRadius } from '@/theme/theme';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

type OrdersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Orders'>;

interface OrderItem {
  id: string;
  appointmentId?: string;
  serviceType: string;
  mechanicName?: string;
  date: string;
  status: string;
  price?: number;
  paymentStatus?: string;
}

const OrdersScreen = () => {
  const navigation = useNavigation<OrdersScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await apiService.getAppointments('driver');
      
      if (response.success && response.data) {
        const appointments = Array.isArray(response.data) ? response.data : [];
        const ordersData = appointments.map((apt: any) => ({
          id: apt._id || apt.id || apt.appointmentId,
          appointmentId: apt._id || apt.id || apt.appointmentId,
          serviceType: apt.serviceType || apt.serviceCategory || 'Bilinmeyen',
          mechanicName: apt.mechanic?.name 
            ? `${apt.mechanic.name} ${apt.mechanic.surname || ''}`.trim()
            : 'Bilinmeyen Usta',
          date: apt.appointmentDate || apt.createdAt,
          status: apt.status || 'pending',
          price: apt.price || apt.totalPrice || apt.estimatedPrice,
          paymentStatus: apt.paymentStatus || 'pending',
        }));
        
        // Filter orders
        let filteredOrders = ordersData;
        if (filter !== 'all') {
          filteredOrders = ordersData.filter((order: OrderItem) => {
            if (filter === 'pending') return order.status === 'pending' || order.status === 'confirmed';
            if (filter === 'completed') return order.status === 'completed';
            if (filter === 'cancelled') return order.status === 'cancelled';
            return true;
          });
        }
        
        // Sort by date (newest first) - güvenli date parsing
        filteredOrders.sort((a: OrderItem, b: OrderItem) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          // Invalid date kontrolü
          const validDateA = isNaN(dateA) ? 0 : dateA;
          const validDateB = isNaN(dateB) ? 0 : dateB;
          return validDateB - validDateA;
        });
        
        setOrders(filteredOrders);
      }
    } catch (err: any) {
      console.error('OrdersScreen: Error fetching orders:', err);
      setError('Siparişler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success.main;
      case 'pending':
      case 'confirmed':
        return theme.colors.warning.main;
      case 'cancelled':
        return theme.colors.error.main;
      default:
        return theme.colors.text.tertiary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Beklemede';
      case 'confirmed':
        return 'Onaylandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <TouchableOpacity
      style={[
        styles.orderCard,
        {
          backgroundColor: isDark ? theme.colors.background.secondary : '#FFFFFF',
          ...theme.shadows.card,
        }
      ]}
      onPress={() => {
        if (item.appointmentId) {
          navigation.navigate('Appointments');
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text
            style={[
              styles.serviceType,
              { color: theme.colors.text.primary }
            ]}
          >
            {translateServiceName(item.serviceType)}
          </Text>
          <Text
            style={[
              styles.mechanicName,
              { color: theme.colors.text.secondary }
            ]}
          >
            {item.mechanicName}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) }
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.orderDetailRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={theme.colors.text.tertiary}
          />
          <Text
            style={[
              styles.orderDetailText,
              { color: theme.colors.text.secondary }
            ]}
          >
            {format(new Date(item.date), 'dd MMMM yyyy, EEEE', { locale: tr })}
          </Text>
        </View>
        {item.price && (
          <View style={styles.orderDetailRow}>
            <Ionicons
              name="cash-outline"
              size={16}
              color={theme.colors.text.tertiary}
            />
            <Text
              style={[
                styles.orderDetailText,
                { color: theme.colors.text.primary, fontWeight: '600' }
              ]}
            >
              {item.price.toLocaleString('tr-TR')} ₺
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.orderFooter}>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.text.tertiary}
        />
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (
    filterValue: 'all' | 'pending' | 'completed' | 'cancelled',
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor:
            filter === filterValue
              ? theme.colors.primary.main
              : isDark
              ? theme.colors.background.secondary
              : '#FFFFFF',
          borderColor:
            filter === filterValue
              ? theme.colors.primary.main
              : theme.colors.border.primary,
        }
      ]}
      onPress={() => setFilter(filterValue)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterButtonText,
          {
            color:
              filter === filterValue
                ? '#FFFFFF'
                : theme.colors.text.primary,
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
        ]}
      >
        <ScreenHeader title="Siparişlerim" />
        <LoadingSkeleton variant="list" count={5} />
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
        ]}
      >
        <ScreenHeader title="Siparişlerim" />
        <ErrorState
          message={error}
          onRetry={fetchOrders}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
      ]}
    >
      {/* Header */}
      <ScreenHeader title="Siparişlerim" />

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {renderFilterButton('all', 'Tümü')}
          {renderFilterButton('pending', 'Bekleyen')}
          {renderFilterButton('completed', 'Tamamlanan')}
          {renderFilterButton('cancelled', 'İptal')}
        </ScrollView>
      </View>

      {/* Orders List */}
      {orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Sipariş Bulunamadı"
          subtitle={
            filter === 'all'
              ? 'Henüz siparişiniz bulunmuyor'
              : `${filter === 'pending' ? 'Bekleyen' : filter === 'completed' ? 'Tamamlanan' : 'İptal edilen'} sipariş bulunamadı`
          }
        />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary.main}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filters: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  orderCard: {
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  mechanicName: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderDetailText: {
    fontSize: 14,
  },
  orderFooter: {
    alignItems: 'flex-end',
  },
});

export default OrdersScreen;

