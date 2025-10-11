import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';
import { Ionicons } from '@expo/vector-icons';
import { colors as themeColors, typography, spacing, borderRadius, shadows } from '@/shared/theme';

const { width } = Dimensions.get('window');

// Modern renk paleti
const COLORS = {
  primary: '#2563EB',
  secondary: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  border: '#E2E8F0',
  shadow: 'rgba(0, 0, 0, 0.08)',
};

interface Appointment {
  _id: string;
  customer: {
    name: string;
    surname: string;
    phone: string;
  };
  vehicle: {
    brand: string;
    modelName: string;
    plateNumber: string;
  };
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  description?: string;
  price?: number;
  createdAt: string;
}

interface StatusCount {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
}

const STATUS_CONFIG = {
  pending: { label: 'Bekleyen', color: COLORS.warning, icon: 'time-outline' },
  confirmed: { label: 'Onaylandı', color: COLORS.primary, icon: 'checkmark-circle-outline' },
  inProgress: { label: 'Devam Ediyor', color: COLORS.secondary, icon: 'construct-outline' },
  completed: { label: 'Tamamlandı', color: COLORS.success, icon: 'checkmark-done-outline' },
};

const AppointmentsScreen = () => {
  const { themeColors: colors } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigation = useNavigation();

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCount>({
    total: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
  });

  // Filtrelenmiş randevular
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Durum filtresi
    if (selectedStatus) {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.customer.name.toLowerCase().includes(query) ||
        app.customer.surname.toLowerCase().includes(query) ||
        app.vehicle.plateNumber.toLowerCase().includes(query) ||
        app.vehicle.brand.toLowerCase().includes(query) ||
        app.vehicle.modelName.toLowerCase().includes(query) ||
        app.serviceType.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [appointments, selectedStatus, searchQuery]);

  // Veri yükleme
  const loadAppointments = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await apiService.getMechanicAppointments();
      if (response.success && response.data) {
        const appointmentsData = Array.isArray(response.data) ? response.data : [];
        setAppointments(appointmentsData);

        // Durum sayılarını hesapla
        const counts = appointmentsData.reduce((acc, app) => {
          acc.total++;
          if (app.status === 'pending') acc.pending++;
          else if (app.status === 'confirmed') acc.confirmed++;
          else if (app.status === 'inProgress') acc.inProgress++;
          else if (app.status === 'completed') acc.completed++;
          return acc;
        }, { total: 0, pending: 0, confirmed: 0, inProgress: 0, completed: 0 });

        setStatusCounts(counts);
      }
    } catch (error) {
      console.error('Randevular yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  // Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAppointments();
  }, [loadAppointments]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments])
  );

  // Randevu kartı render
  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
    const appointmentDate = new Date(item.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return (
      <TouchableOpacity style={styles.appointmentCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {item.customer.name} {item.customer.surname}
            </Text>
            <Text style={styles.customerPhone}>{item.customer.phone}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Vehicle Info */}
        <View style={styles.vehicleInfo}>
          <Ionicons name="car-outline" size={20} color={COLORS.secondary} />
          <View style={styles.vehicleDetails}>
            <Text style={styles.vehicleText}>
              {item.vehicle.brand} {item.vehicle.modelName}
            </Text>
            <Text style={styles.plateText}>{item.vehicle.plateNumber}</Text>
          </View>
        </View>

        {/* Service Info */}
        <View style={styles.serviceInfo}>
          <Ionicons name="construct-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.serviceText}>{item.serviceType}</Text>
        </View>

        {/* Date & Time */}
        <View style={styles.dateTimeInfo}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.dateTimeText}>
            {formattedDate} - {item.timeSlot}
          </Text>
        </View>

        {/* Price */}
        {item.price && (
          <View style={styles.priceInfo}>
            <Ionicons name="cash-outline" size={20} color={COLORS.success} />
            <Text style={styles.priceText}>{item.price.toLocaleString('tr-TR')} ₺</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Durum filtresi render
  const renderStatusFilter = () => {
    const statuses = [
      { key: null, label: 'Tümü', count: statusCounts.total },
      { key: 'pending', label: 'Bekleyen', count: statusCounts.pending },
      { key: 'confirmed', label: 'Onaylandı', count: statusCounts.confirmed },
      { key: 'inProgress', label: 'Devam Ediyor', count: statusCounts.inProgress },
      { key: 'completed', label: 'Tamamlandı', count: statusCounts.completed },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statusFilter}
        contentContainerStyle={styles.statusFilterContent}
      >
        {statuses.map((status) => (
          <TouchableOpacity
            key={status.key || 'all'}
            style={[
              styles.statusButton,
              selectedStatus === status.key && styles.statusButtonActive
            ]}
            onPress={() => setSelectedStatus(status.key)}
          >
            <Text style={[
              styles.statusButtonText,
              selectedStatus === status.key && styles.statusButtonTextActive
            ]}>
              {status.label}
            </Text>
            <View style={[
              styles.statusCount,
              selectedStatus === status.key && styles.statusCountActive
            ]}>
              <Text style={[
                styles.statusCountText,
                selectedStatus === status.key && styles.statusCountTextActive
              ]}>
                {status.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Randevular yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tamir İşleri</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Müşteri, plaka veya hizmet ara..."
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filter */}
      {renderStatusFilter()}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Yeni</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="calendar-outline" size={24} color={COLORS.secondary} />
          <Text style={styles.actionButtonText}>Planlandı</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="construct-outline" size={24} color={COLORS.secondary} />
          <Text style={styles.actionButtonText}>Seç</Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>Randevu bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Arama kriterlerinize uygun randevu bulunamadı' : 'Henüz randevu kaydı bulunmuyor'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: COLORS.text.primary,
  },
  filterButton: {
    padding: spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body.fontSize,
    color: COLORS.text.primary,
  },
  statusFilter: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusFilterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusButtonText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginRight: spacing.xs,
  },
  statusButtonTextActive: {
    color: COLORS.surface,
  },
  statusCount: {
    backgroundColor: COLORS.text.tertiary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCountActive: {
    backgroundColor: COLORS.surface,
  },
  statusCountText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: COLORS.surface,
  },
  statusCountTextActive: {
    color: COLORS.primary,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginLeft: spacing.xs,
  },
  listContainer: {
    padding: spacing.lg,
  },
  appointmentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: COLORS.text.primary,
    marginBottom: spacing.xs,
  },
  customerPhone: {
    fontSize: typography.body.fontSize,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vehicleDetails: {
    marginLeft: spacing.sm,
  },
  vehicleText: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  plateText: {
    fontSize: typography.caption.fontSize,
    color: COLORS.text.secondary,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceText: {
    fontSize: typography.body.fontSize,
    color: COLORS.text.secondary,
    marginLeft: spacing.sm,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateTimeText: {
    fontSize: typography.body.fontSize,
    color: COLORS.text.secondary,
    marginLeft: spacing.sm,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: COLORS.success,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body.fontSize,
    color: COLORS.text.secondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: COLORS.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.body.fontSize,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default AppointmentsScreen;