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
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';
import { Ionicons } from '@expo/vector-icons';
import { colors as themeColors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import { serviceNameMapping } from '@/shared/utils/serviceTranslator';
import { BackButton } from '@/shared/components';

const { width } = Dimensions.get('window');

// Hizmet tipini Türkçe'ye çeviren fonksiyon
const translateServiceType = (serviceType: string): string => {
  // Önce mapping'den bak
  if (serviceNameMapping[serviceType]) {
    return serviceNameMapping[serviceType];
  }
  
  // Mapping'de yoksa, yaygın hataları düzelt
  const corrections: { [key: string]: string } = {
    'agir-bakim': 'Ağır Bakım',
    'kaporta-boya': 'Kaporta & Boya',
    'genel-bakim': 'Genel Bakım',
    'alt-takim': 'Alt Takım',
    'ust-takim': 'Üst Takım',
    'elektrik-elektronik': 'Elektrik-Elektronik',
    'yedek-parca': 'Yedek Parça',
    'arac-yikama': 'Araç Yıkama',
    'egzoz-emisyon': 'Egzoz & Emisyon',
    'cekici': 'Çekici',
    'tamir': 'Genel Onarım',
    'bakim': 'Genel Bakım',
    'yikama': 'Araç Yıkama',
    'lastik': 'Lastik Servisi',
    'motor': 'Motor Bakımı',
    'fren': 'Fren Servisi',
    'klima': 'Klima Servisi',
    'elektrik': 'Elektrik Servisi',
    'suspansiyon': 'Süspansiyon',
    'egzoz': 'Egzoz Servisi',
    'bodywork': 'Kaporta & Boya',
    'carwash': 'Araç Yıkama',
    'tirehotel': 'Lastik Servisi',
    'maintenance': 'Genel Bakım',
    'repair': 'Genel Onarım',
    'towing': 'Çekici Hizmeti',
    'wash': 'Araç Yıkama',
    'tire': 'Lastik Servisi'
  };
  
  if (corrections[serviceType]) {
    return corrections[serviceType];
  }
  
  // Hiçbiri yoksa, orijinal ismi döndür
  return serviceType;
};

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
  // Backend'den gelen Türkçe status değerleri
  IPTAL: {
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
  // Backend'den gelen Türkçe status değerleri
  IPTAL: 'İptal',
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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'IPTAL';
  appointmentDate: string;
  price?: number;
  createdAt: string;
}

export default function AppointmentsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [faultReports, setFaultReports] = useState<any[]>([]);
  const [filteredFaultReports, setFilteredFaultReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'IPTAL'>('all');
  const [activeTab, setActiveTab] = useState<'appointments' | 'faults'>('appointments');

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
    }
  }, []);

  // Arıza bildirimlerini yükle
  const fetchFaultReports = useCallback(async () => {
    try {
      const response = await apiService.FaultReportService.getMechanicFaultReports();
      if (response.success && response.data) {
        const faultReportsData = Array.isArray(response.data) ? response.data : [];
        setFaultReports(faultReportsData);
      }
    } catch (error) {
      console.error('Arıza bildirimleri yüklenirken hata:', error);
    }
  }, []);

  // Tüm verileri yükle
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchFaultReports()
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchAppointments, fetchFaultReports]);

  // Ekran açıldığında yükle
  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [fetchAllData])
  );

  // Yenile
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
  }, [fetchAllData]);

  // Randevuları filtrele
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
        apt.customer?.name?.toLowerCase().includes(query) ||
        apt.customer?.surname?.toLowerCase().includes(query) ||
        apt.vehicle?.brand?.toLowerCase().includes(query) ||
        apt.vehicle?.model?.toLowerCase().includes(query) ||
        apt.vehicle?.plate?.toLowerCase().includes(query) ||
        translateServiceType(apt.serviceType).toLowerCase().includes(query)
      );
    }

    // Tarihe göre sırala (en yeni en üstte)
    filtered.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

    setFilteredAppointments(filtered);
  }, [appointments, searchQuery, selectedStatus]);

  // Arıza bildirimlerini filtrele
  useEffect(() => {
    let filtered = [...faultReports];

    // Durum filtresi - arıza bildirimleri için status mapping
    if (selectedStatus !== 'all') {
      const statusMapping: { [key: string]: string } = {
        'pending': 'pending',
        'confirmed': 'quoted',
        'completed': 'completed',
        'cancelled': 'rejected'
      };
      const faultStatus = statusMapping[selectedStatus];
      if (faultStatus) {
        filtered = filtered.filter(fault => fault.status === faultStatus);
      }
    }

    // Arama
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fault =>
        fault.userId?.name?.toLowerCase().includes(query) ||
        fault.userId?.surname?.toLowerCase().includes(query) ||
        fault.vehicleId?.brand?.toLowerCase().includes(query) ||
        fault.vehicleId?.modelName?.toLowerCase().includes(query) ||
        fault.vehicleId?.plateNumber?.toLowerCase().includes(query) ||
        fault.faultDescription?.toLowerCase().includes(query) ||
        fault.serviceCategory?.toLowerCase().includes(query)
      );
    }

    // Tarihe göre sırala (en yeni en üstte)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredFaultReports(filtered);
  }, [faultReports, searchQuery, selectedStatus]);

  // İstatistikler
  const stats = useMemo(() => {
    const currentData = activeTab === 'appointments' ? appointments : faultReports;
    return {
      total: currentData.length,
      pending: currentData.filter(item => 
        activeTab === 'appointments' 
          ? item.status === 'pending' 
          : item.status === 'pending'
      ).length,
      confirmed: currentData.filter(item => 
        activeTab === 'appointments' 
          ? item.status === 'confirmed' 
          : item.status === 'quoted'
      ).length,
      completed: currentData.filter(item => 
        activeTab === 'appointments' 
          ? item.status === 'completed' 
          : item.status === 'completed'
      ).length,
      cancelled: currentData.filter(item => 
        activeTab === 'appointments' 
          ? (item.status === 'cancelled' || item.status === 'IPTAL')
          : item.status === 'rejected'
      ).length,
    };
  }, [appointments, faultReports, activeTab]);

  // Randevu kartı
  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    // Güvenli status erişimi
    const statusConfig = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
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
        onPress={() => (navigation as any).navigate('AppointmentDetail', { appointmentId: item._id })}
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
              {STATUS_TEXT[item.status] || 'Bilinmiyor'}
            </Text>
          </View>
        </View>

        {/* Araç bilgisi */}
        <View style={styles.vehicleInfo}>
          <Ionicons name="car-outline" size={18} color="#64748B" />
          <Text style={styles.vehicleText}>
            {item.vehicle.brand} {item.vehicle.model || ''} ({item.vehicle.year || 'Bilinmiyor'})
          </Text>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{item.vehicle.plate}</Text>
          </View>
        </View>

        {/* Hizmet tipi */}
        {item.serviceType && (
          <View style={styles.serviceInfo}>
            <Ionicons name="construct-outline" size={16} color="#94A3B8" />
            <Text style={styles.serviceText}>{translateServiceType(item.serviceType)}</Text>
          </View>
        )}

        {/* Alt kısım: Tarih ve fiyat */}
        <View style={styles.cardFooter}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Ionicons name="time-outline" size={16} color="#94A3B8" style={{ marginLeft: 12 }} />
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
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  // Boş durum
  // Arıza bildirimi kartı
  const renderFaultReportCard = ({ item }: { item: any }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return '#6B7280';
        case 'quoted': return '#3B82F6';
        case 'accepted': return '#10B981';
        case 'rejected': return '#EF4444';
        case 'completed': return '#059669';
        default: return '#6B7280';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return 'Beklemede';
        case 'quoted': return 'Teklif Verildi';
        case 'accepted': return 'Kabul Edildi';
        case 'rejected': return 'Reddedildi';
        case 'completed': return 'Tamamlandı';
        default: return status;
      }
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return '#EF4444';
        case 'high': return '#F97316';
        case 'medium': return '#EAB308';
        case 'low': return '#10B981';
        default: return '#6B7280';
      }
    };

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => (navigation as any).navigate('FaultReportDetail', { faultReportId: item._id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {item.userId?.name} {item.userId?.surname}
            </Text>
            <Text style={styles.customerPhone}>{item.userId?.phone}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.vehicleInfo}>
          <Ionicons name="car" size={16} color="#64748B" />
          <Text style={styles.vehicleText}>
            {item.vehicleId?.brand} {item.vehicleId?.modelName} - {item.vehicleId?.plateNumber}
          </Text>
        </View>

        <Text style={styles.faultDescription} numberOfLines={2}>
          {item.faultDescription}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.dateInfo}>
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString('tr-TR')}
            </Text>
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          
          <View style={styles.priorityContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityText}>
                {item.priority === 'urgent' ? 'Acil' : 
                 item.priority === 'high' ? 'Yüksek' :
                 item.priority === 'medium' ? 'Orta' : 'Düşük'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={styles.cardChevron} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#94A3B8" />
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

  const renderEmptyFaultState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="warning-outline" size={64} color="#94A3B8" />
      <Text style={styles.emptyTitle}>Arıza Bildirimi Yok</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'Arama kriterlerinize uygun arıza bildirimi bulunamadı'
          : selectedStatus !== 'all'
          ? `${STATUS_TEXT[selectedStatus]} arıza bildirimi bulunmuyor`
          : 'Henüz arıza bildirimi bulunmuyor'}
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
          <View style={styles.headerLeft}>
            <BackButton />
            <Text style={styles.headerTitle}>Tamir & Bakım</Text>
          </View>
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

        {/* Tab Seçimi */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'appointments' && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab('appointments')}
          >
            <Ionicons 
              name="calendar" 
              size={18} 
              color={activeTab === 'appointments' ? '#FFFFFF' : '#64748B'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === 'appointments' && styles.tabButtonTextActive
            ]}>
              Randevular
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'faults' && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab('faults')}
          >
            <Ionicons 
              name="warning" 
              size={18} 
              color={activeTab === 'faults' ? '#FFFFFF' : '#64748B'} 
            />
            <Text style={[
              styles.tabButtonText,
              activeTab === 'faults' && styles.tabButtonTextActive
            ]}>
              Arıza Bildirimleri
            </Text>
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
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Müşteri, araç veya plaka ara..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
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

      {/* İçerik Listesi */}
      {activeTab === 'appointments' ? (
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
      ) : (
        <FlatList
          data={filteredFaultReports}
          renderItem={renderFaultReportCard}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyFaultState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
    marginLeft: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: themeColors.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  faultDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '400',
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
