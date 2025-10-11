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

// Durum renkleri
const STATUS_COLORS = {
  pending: {
    bg: '#FEF3C7',
    border: '#F59E0B',
    text: '#92400E',
    icon: 'time-outline' as const,
  },
  confirmed: {
    bg: '#DBEAFE',
    border: '#3B82F6',
    text: '#1E40AF',
    icon: 'checkmark-circle-outline' as const,
  },
  completed: {
    bg: '#D1FAE5',
    border: '#10B981',
    text: '#065F46',
    icon: 'checkmark-done-outline' as const,
  },
  cancelled: {
    bg: '#FEE2E2',
    border: '#EF4444',
    text: '#991B1B',
    icon: 'close-circle-outline' as const,
  },
};

// Durum metinleri
const STATUS_TEXT = {
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
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
    model: string;
    year: number;
    plate: string;
  };
  serviceType: string;
  description: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  appointmentDate: string;
  price?: number;
  createdAt: string;
}

export default function AppointmentsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  // Randevuları yükle
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await apiService.getMechanicAppointments();
      if (response.success && response.data) {
        const appointmentsData = Array.isArray(response.data) ? response.data : [];
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error('Randevular yüklenirken hata:', error);
      Alert.alert('Hata', 'Randevular yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Ekran açıldığında yükle
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments])
  );

  // Yenile
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments();
  }, [fetchAppointments]);

  // Arama ve filtreleme
  useEffect(() => {
    let filtered = [...appointments];

    // Durum filtresi
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === selectedStatus);
    }

    // Arama
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.customer.name.toLowerCase().includes(query) ||
        apt.customer.surname.toLowerCase().includes(query) ||
        apt.vehicle.brand.toLowerCase().includes(query) ||
        apt.vehicle.model.toLowerCase().includes(query) ||
        apt.vehicle.plate.toLowerCase().includes(query)
      );
    }

    // Tarihe göre sırala (en yeni en üstte)
    filtered.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

    setFilteredAppointments(filtered);
  }, [appointments, searchQuery, selectedStatus]);

  // İstatistikler
  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter(apt => apt.status === 'pending').length,
      confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
    };
  }, [appointments]);

  // Randevu kartı
  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const statusConfig = STATUS_COLORS[item.status];
    const date = new Date(item.appointmentDate);
    const formattedDate = date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('AppointmentDetail' as never, { appointmentId: item._id } as never)}
        activeOpacity={0.7}
      >
        {/* Üst kısım: Müşteri ve durum */}
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {item.customer.name.charAt(0)}{item.customer.surname.charAt(0)}
              </Text>
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>
                {item.customer.name} {item.customer.surname}
              </Text>
              <Text style={styles.customerPhone}>{item.customer.phone}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.text} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {STATUS_TEXT[item.status]}
            </Text>
          </View>
        </View>

        {/* Araç bilgisi */}
        <View style={styles.vehicleInfo}>
          <Ionicons name="car-outline" size={18} color={colors.text.secondary} />
          <Text style={styles.vehicleText}>
            {item.vehicle.brand} {item.vehicle.model} ({item.vehicle.year})
          </Text>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{item.vehicle.plate}</Text>
          </View>
        </View>

        {/* Hizmet tipi */}
        {item.serviceType && (
          <View style={styles.serviceInfo}>
            <Ionicons name="construct-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.serviceText}>{item.serviceType}</Text>
          </View>
        )}

        {/* Alt kısım: Tarih ve fiyat */}
        <View style={styles.cardFooter}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Ionicons name="time-outline" size={16} color={colors.text.tertiary} style={{ marginLeft: 12 }} />
            <Text style={styles.dateText}>{formattedTime}</Text>
          </View>

          {item.price && (
            <View style={styles.priceInfo}>
              <Text style={styles.priceText}>{item.price.toFixed(2)} ₺</Text>
            </View>
          )}
        </View>

        {/* Detaya git göstergesi */}
        <View style={styles.cardChevron}>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  // Boş durum
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>Randevu Bulunamadı</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'Arama kriterlerinize uygun randevu bulunamadı'
          : selectedStatus !== 'all'
          ? `${STATUS_TEXT[selectedStatus]} randevu bulunmuyor`
          : 'Henüz randevu bulunmuyor'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
          <Text style={styles.loadingText}>Randevular yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Tamir İşleri</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={themeColors.primary.main}
              style={refreshing ? { opacity: 0.5 } : {}}
            />
          </TouchableOpacity>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={[styles.statValue, { color: STATUS_COLORS.pending.border }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Bekliyor</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={[styles.statValue, { color: STATUS_COLORS.confirmed.border }]}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Onaylı</Text>
          </View>
          <View style={[styles.statItem, styles.statDivider]}>
            <Text style={[styles.statValue, { color: STATUS_COLORS.completed.border }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Tamamlandı</Text>
          </View>
        </View>

        {/* Arama */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Müşteri, araç veya plaka ara..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Durum filtreleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[styles.filterButton, selectedStatus === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedStatus('all')}
          >
            <Text style={[styles.filterText, selectedStatus === 'all' && styles.filterTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedStatus === 'pending' && styles.filterButtonActive,
              selectedStatus === 'pending' && { borderColor: STATUS_COLORS.pending.border },
            ]}
            onPress={() => setSelectedStatus('pending')}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === 'pending' && styles.filterTextActive,
                selectedStatus === 'pending' && { color: STATUS_COLORS.pending.border },
              ]}
            >
              Bekliyor ({stats.pending})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedStatus === 'confirmed' && styles.filterButtonActive,
              selectedStatus === 'confirmed' && { borderColor: STATUS_COLORS.confirmed.border },
            ]}
            onPress={() => setSelectedStatus('confirmed')}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === 'confirmed' && styles.filterTextActive,
                selectedStatus === 'confirmed' && { color: STATUS_COLORS.confirmed.border },
              ]}
            >
              Onaylı ({stats.confirmed})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedStatus === 'completed' && styles.filterButtonActive,
              selectedStatus === 'completed' && { borderColor: STATUS_COLORS.completed.border },
            ]}
            onPress={() => setSelectedStatus('completed')}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === 'completed' && styles.filterTextActive,
                selectedStatus === 'completed' && { color: STATUS_COLORS.completed.border },
              ]}
            >
              Tamamlandı ({stats.completed})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Randevular listesi */}
      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentCard}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // İstatistikler
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // Arama
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },

  // Filtreler
  filterContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#3B82F6',
  },

  // Liste
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Randevu kartı
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.medium,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  plateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  plateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  serviceText: {
    fontSize: 13,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  priceInfo: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  cardChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },

  // Boş durum
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
