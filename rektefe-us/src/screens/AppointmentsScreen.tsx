import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  Linking,
  Clipboard,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

// Randevu durumları
type RandevuDurum = 'TALEP_EDILDI' | 'PLANLANDI' | 'SERVISTE' | 'ODEME_BEKLIYOR' | 'TAMAMLANDI' | 'IPTAL' | 'NO_SHOW';

interface Randevu {
  _id: string;
  musteri: { ad: string; tel: string };
  arac: { plaka: string; marka: string; model: string; km?: number };
  isTuru: string;
  randevuZamani: string;
  durum: RandevuDurum;
  parcaBekleniyor?: boolean;
  notlar?: string[];
  medya?: { foto: number; video: number; ses: number };
  kalemler?: any[];
  kdvDahil?: boolean;
  araOnaylar?: { aciklama: string; tutar: number; onay: 'BEKLIYOR' | 'KABUL' | 'RET' }[];
  odemeLink?: string;
  odemeRef?: string;
  olusturmaZamani: string;
  kapatmaZamani?: string;
  price?: number;
  customer?: { name: string; surname: string; phone: string };
  vehicle?: { brand: string; modelName: string; plateNumber: string };
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  description?: string;
  mechanicNotes?: string;
  createdAt: string;
}

const DURUM_TABLARI = [
  { key: 'TALEP_EDILDI', label: 'Yeni', color: '#FF9500', icon: 'clock-outline' },
  { key: 'PLANLANDI', label: 'Planlandı', color: '#007AFF', icon: 'calendar-check' },
  { key: 'SERVISTE', label: 'Serviste', color: '#FF6B35', icon: 'wrench' },
  { key: 'ODEME_BEKLIYOR', label: 'Ödeme', color: '#9C27B0', icon: 'credit-card' },
  { key: 'TAMAMLANDI', label: 'Tamamlandı', color: '#34C759', icon: 'check-circle' },
];

const AppointmentsScreen = () => {
  const { themeColors: colors } = useTheme();
  const { isAuthenticated, user, token } = useAuth();
  const [randevular, setRandevular] = useState<Randevu[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDurum, setSelectedDurum] = useState<RandevuDurum>('TALEP_EDILDI');
  const [counts, setCounts] = useState<Record<RandevuDurum, number>>({
    TALEP_EDILDI: 0,
    PLANLANDI: 0,
    SERVISTE: 0,
    ODEME_BEKLIYOR: 0,
    TAMAMLANDI: 0,
    IPTAL: 0,
    NO_SHOW: 0,
  });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Price Increase Modal States
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Randevu | null>(null);
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [priceModalLoading, setPriceModalLoading] = useState(false);

  const predefinedReasons = [
    { id: 'extra_parts', title: 'Ek Parça Gerekli', icon: 'cog', color: '#FF9500' },
    { id: 'additional_work', title: 'Ek İş Gerekli', icon: 'wrench', color: '#007AFF' },
    { id: 'complexity', title: 'İş Karmaşıklığı', icon: 'alert-circle', color: '#FF3B30' },
    { id: 'time_extension', title: 'Süre Uzaması', icon: 'clock', color: '#34C759' },
    { id: 'material_cost', title: 'Malzeme Maliyeti', icon: 'package-variant', color: '#AF52DE' },
    { id: 'labor_cost', title: 'İşçilik Maliyeti', icon: 'account-hard-hat', color: '#FFCC00' },
    { id: 'custom', title: 'Diğer', icon: 'text-box', color: '#8E8E93' }
  ];

  // Tarihe göre sıralanmış randevular
  const sortedRandevular = useMemo(() => {
    return [...randevular].sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  }, [randevular]);

  // Filtrelenmiş randevular
  const filteredRandevular = useMemo(() => {
    if (!search.trim()) return sortedRandevular;
    
    const searchTerm = search.toLowerCase();
    return sortedRandevular.filter(randevu => {
      const customerName = `${randevu.customer?.name || ''} ${randevu.customer?.surname || ''}`.toLowerCase();
      const vehiclePlate = randevu.vehicle?.plateNumber?.toLowerCase() || '';
      const serviceType = randevu.serviceType?.toLowerCase() || '';
      
      return customerName.includes(searchTerm) || 
             vehiclePlate.includes(searchTerm) || 
             serviceType.includes(searchTerm);
    });
  }, [sortedRandevular, search]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRandevular(selectedDurum);
      fetchCounts();
    }
  }, [isAuthenticated, selectedDurum]);

  const mapTRtoEN = (d: RandevuDurum): string => ({
    TALEP_EDILDI: 'pending',
    PLANLANDI: 'confirmed',
    SERVISTE: 'in-progress',
    ODEME_BEKLIYOR: 'payment-pending',
    TAMAMLANDI: 'completed',
    IPTAL: 'cancelled',
    NO_SHOW: 'no-show'
  }[d] || d.toLowerCase());

  const normalizeServiceType = (raw?: string) => {
    if (!raw) return '';
    const key = raw.toLowerCase().trim();
    const map: Record<string, string> = {
      'agir-bakim': 'Ağır Bakım',
      'ağır bakım': 'Ağır Bakım',
      'genel-bakim': 'Genel Bakım',
      'genel bakım': 'Genel Bakım',
      'motor-bakimi': 'Motor Bakımı',
      'fren-bakimi': 'Fren Bakımı',
      'elektrik-bakimi': 'Elektrik Bakımı',
      'kaporta-bakimi': 'Kaporta Bakımı',
      'klima-bakimi': 'Klima Bakımı',
      'lastik': 'Lastik Servisi',
      'yikama': 'Yıkama',
      'cekici': 'Çekici',
    };
    return map[key] || raw;
  };

  const fetchRandevular = async (durum: RandevuDurum) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 AppointmentsScreen: fetchRandevular çağrıldı', { durum, mapTRtoEN: mapTRtoEN(durum) });
      
      const response = await apiService.getMechanicAppointments(mapTRtoEN(durum), {});
      
      console.log('📡 AppointmentsScreen: API yanıtı', { response, success: response.success });
      
      if (response.success) {
        const data = (response.data as any) || [];
        const list = Array.isArray(data) ? data : [];
        
        console.log('📊 AppointmentsScreen: Veri işlendi', { data, list, listLength: list.length });
        
        const mapped: Randevu[] = list.map((a: any) => ({
          _id: a._id,
          musteri: { ad: a.customer?.name || '', tel: a.customer?.phone || '' },
          arac: { plaka: a.vehicle?.plateNumber || '', marka: a.vehicle?.brand || '', model: a.vehicle?.modelName || '' },
          isTuru: normalizeServiceType(a.serviceType),
          randevuZamani: a.appointmentDate,
          durum: ({
            pending: 'TALEP_EDILDI',
            confirmed: 'PLANLANDI',
            'in-progress': 'SERVISTE',
            'payment-pending': 'ODEME_BEKLIYOR',
            completed: 'TAMAMLANDI',
            cancelled: 'IPTAL',
            'no-show': 'TALEP_EDILDI' // no-show'u da TALEP_EDILDI olarak göster
          } as any)[a.status] || 'TALEP_EDILDI',
          parcaBekleniyor: a.parcaBekleniyor,
          price: a.price,
          customer: a.customer,
          vehicle: a.vehicle,
          serviceType: a.serviceType,
          appointmentDate: a.appointmentDate,
          timeSlot: a.timeSlot,
          description: a.description,
          mechanicNotes: a.mechanicNotes,
          olusturmaZamani: a.createdAt,
          createdAt: a.createdAt,
          odemeLink: a.odemeLink,
          odemeRef: a.odemeRef
        } as Randevu));
        setRandevular(mapped);
      } else {
        setRandevular([]);
        setError(response.message || 'Veri alınamadı');
      }
    } catch (e: any) {
      console.error('Randevular yüklenirken hata:', e);
      setError('Randevular yüklenirken bir hata oluştu');
      setRandevular([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const response = await apiService.getMechanicAppointmentCounts();
      
      if (response.success && response.data) {
        setCounts({
          TALEP_EDILDI: response.data.pending || 0,
          PLANLANDI: response.data.confirmed || 0,
          SERVISTE: response.data['in-progress'] || 0,
          ODEME_BEKLIYOR: response.data['payment-pending'] || 0,
          TAMAMLANDI: response.data.completed || 0,
          IPTAL: response.data.cancelled || 0,
          NO_SHOW: response.data['no-show'] || 0,
        });
      }
    } catch (error) {
      console.error('Counts yüklenirken hata:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRandevular(selectedDurum);
    fetchCounts();
  };

  const getDurumColor = (durum: RandevuDurum) => {
    const tab = DURUM_TABLARI.find(t => t.key === durum);
    return tab?.color || colors.text.secondary;
  };

  const getDurumText = (durum: RandevuDurum) => {
    const tab = DURUM_TABLARI.find(t => t.key === durum);
    return tab?.label || durum;
  };

  const formatTarih = (tarih: string) => {
    const date = new Date(tarih);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSaat = (tarih: string) => {
    const date = new Date(tarih);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = async (randevuId: string, newStatus: RandevuDurum) => {
    try {
      console.log('🔄 Status değiştiriliyor:', { randevuId, newStatus, token: token ? 'Mevcut' : 'Yok' });
      
      const response = await apiService.updateAppointmentStatus(randevuId, { status: newStatus });
      
      if (response.success) {
        Alert.alert('Başarılı', 'Randevu durumu güncellendi');
        fetchRandevular(selectedDurum);
      } else {
        Alert.alert('Hata', response.message || 'Durum güncellenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('❌ Status değiştirme hatası:', error);
      Alert.alert('Bağlantı Hatası', 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
    }
  };

  const openPriceModal = (randevu: Randevu) => {
    setSelectedAppointment(randevu);
    setAdditionalAmount('');
    setSelectedReason('');
    setCustomReason('');
    setShowPriceModal(true);
  };

  const closePriceModal = () => {
    setShowPriceModal(false);
    setSelectedAppointment(null);
    setAdditionalAmount('');
    setSelectedReason('');
    setCustomReason('');
  };

  const handlePriceIncrease = async () => {
    if (!selectedAppointment) return;

    if (!additionalAmount || parseFloat(additionalAmount) <= 0) {
      Alert.alert('Hata', 'Geçerli bir ek tutar giriniz');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Hata', 'Lütfen fiyat artırma sebebini seçiniz');
      return;
    }

    if (selectedReason === 'custom' && !customReason.trim()) {
      Alert.alert('Hata', 'Lütfen özel sebep açıklaması yazınız');
      return;
    }

    try {
      setPriceModalLoading(true);

      const requestBody = {
        additionalAmount: parseFloat(additionalAmount),
        reason: selectedReason === 'custom' ? undefined : selectedReason,
        customReason: selectedReason === 'custom' ? customReason : undefined
      };

      const response = await apiService.updateAppointmentPriceIncrease(selectedAppointment._id, requestBody);

      if (response.data.success) {
        const responseData = response.data;
        const newTotalPrice = responseData.data.priceIncrease.newTotalPrice;
        
        Alert.alert(
          '💰 Fiyat Başarıyla Artırıldı!',
          `Ek tutar: ${parseFloat(additionalAmount).toLocaleString('tr-TR')} TL\nYeni toplam: ${newTotalPrice.toLocaleString('tr-TR')} TL`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                closePriceModal();
                fetchRandevular(selectedDurum);
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.data.message || 'Fiyat artırılırken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Fiyat artırma hatası:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setPriceModalLoading(false);
    }
  };

  const renderRandevuCard = (randevu: Randevu) => {
    const durumColor = getDurumColor(randevu.durum);
    const isUrgent = randevu.durum === 'TALEP_EDILDI' && new Date(randevu.appointmentDate) < new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    return (
      <TouchableOpacity
        key={randevu._id}
        style={[
          styles.randevuCard,
          { 
            backgroundColor: colors.background.primary,
            borderLeftColor: durumColor,
            borderColor: colors.border.light,
            shadowColor: isUrgent ? durumColor : colors.shadow,
          }
        ]}
        onPress={() => {
          // Randevu detayına git
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.text.primary }]}>
              {randevu.customer?.name} {randevu.customer?.surname}
            </Text>
            <Text style={[styles.customerPhone, { color: colors.text.secondary }]}>
              {randevu.customer?.phone}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: durumColor }]}>
            <Text style={[styles.statusText, { color: colors.text.inverse }]}>
              {getDurumText(randevu.durum)}
            </Text>
          </View>
        </View>

        <View style={styles.vehicleInfo}>
          <MaterialCommunityIcons name="car" size={16} color={colors.text.secondary} />
          <Text style={[styles.vehicleText, { color: colors.text.primary }]}>
            {randevu.vehicle?.brand} {randevu.vehicle?.modelName} - {randevu.vehicle?.plateNumber}
          </Text>
        </View>

        <View style={styles.serviceInfo}>
          <MaterialCommunityIcons name="wrench" size={16} color={colors.text.secondary} />
          <Text style={[styles.serviceText, { color: colors.text.primary }]}>
            {randevu.isTuru}
          </Text>
        </View>

        <View style={styles.timeInfo}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.text.secondary} />
          <Text style={[styles.timeText, { color: colors.text.primary }]}>
            {formatTarih(randevu.appointmentDate)}
          </Text>
        </View>

        {randevu.description && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionText, { color: colors.text.secondary }]} numberOfLines={2}>
              {randevu.description}
            </Text>
          </View>
        )}

        <View style={styles.priceContainer}>
          <MaterialCommunityIcons name="currency-try" size={16} color={colors.success} />
          <Text style={[styles.priceText, { color: colors.success }]}>
            {randevu.price && randevu.price > 0
              ? new Intl.NumberFormat('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                }).format(Number(randevu.price))
              : 'Fiyat Belirtilmemiş'
            }
          </Text>
        </View>

        <View style={styles.cardActions}>
          
          {randevu.durum === 'TALEP_EDILDI' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton, { backgroundColor: '#10B981' }]}
                onPress={() => handleStatusChange(randevu._id, 'PLANLANDI')}
              >
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Kabul Et</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleStatusChange(randevu._id, 'IPTAL')}
              >
                <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Reddet</Text>
              </TouchableOpacity>
            </>
          )}
          
          {randevu.durum === 'PLANLANDI' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => handleStatusChange(randevu._id, 'SERVISTE')}
            >
              <MaterialCommunityIcons name="play" size={16} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Başlat</Text>
            </TouchableOpacity>
          )}
          
          {randevu.durum === 'SERVISTE' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.priceButton, { backgroundColor: '#F59E0B' }]}
                onPress={() => openPriceModal(randevu)}
              >
                <MaterialCommunityIcons name="currency-try" size={16} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Fiyat Artır</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton, { backgroundColor: '#10B981' }]}
                onPress={() => handleStatusChange(randevu._id, 'ODEME_BEKLIYOR')}
              >
                <MaterialCommunityIcons name="check-circle" size={16} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Tamamla</Text>
              </TouchableOpacity>
            </>
          )}
          
          {randevu.durum === 'ODEME_BEKLIYOR' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.finalizeButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleStatusChange(randevu._id, 'TAMAMLANDI')}
            >
              <MaterialCommunityIcons name="check-all" size={16} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Finalize Et</Text>
            </TouchableOpacity>
          )}
          
          {/* İptal butonu - TAMAMLANDI hariç tüm durumlarda */}
          {randevu.durum !== 'TAMAMLANDI' && randevu.durum !== 'IPTAL' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, { backgroundColor: '#EF4444' }]}
              onPress={() => {
                Alert.alert(
                  'Randevuyu İptal Et',
                  'Bu randevuyu iptal etmek istediğinizden emin misiniz?',
                  [
                    { text: 'Hayır', style: 'cancel' },
                    { 
                      text: 'Evet, İptal Et', 
                      style: 'destructive',
                      onPress: () => handleStatusChange(randevu._id, 'IPTAL')
                    }
                  ]
                );
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>İptal Et</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Randevular yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background.secondary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Randevularım</Text>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.background.primary }]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialCommunityIcons name="filter" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {Object.values(counts).reduce((a, b) => a + b, 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Toplam</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.success }]}>
                {counts.SERVISTE + counts.ODEME_BEKLIYOR}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Aktif</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.warning }]}>
                {counts.TALEP_EDILDI}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Bekleyen</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background.secondary }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background.primary }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Müşteri, plaka veya hizmet ara..."
            placeholderTextColor={colors.text.secondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.background.secondary }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {DURUM_TABLARI.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: selectedDurum === tab.key ? tab.color : colors.background.primary,
                  borderColor: selectedDurum === tab.key ? tab.color : colors.border.light,
                }
              ]}
              onPress={() => {
                setSelectedDurum(tab.key as RandevuDurum);
                fetchRandevular(tab.key as RandevuDurum);
              }}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={18}
                color={selectedDurum === tab.key ? colors.text.inverse : tab.color}
              />
              <Text style={[
                styles.tabText,
                { color: selectedDurum === tab.key ? colors.text.inverse : tab.color }
              ]}>
                {tab.label}
              </Text>
              {counts[tab.key as RandevuDurum] > 0 && (
                <View style={[
                  styles.tabBadge,
                  { backgroundColor: selectedDurum === tab.key ? colors.text.inverse : tab.color }
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    { color: selectedDurum === tab.key ? tab.color : colors.text.inverse }
                  ]}>
                    {counts[tab.key as RandevuDurum]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => fetchRandevular(selectedDurum)}
            >
              <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : filteredRandevular.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color={colors.text.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {search ? 'Arama sonucu bulunamadı' : 'Bu kategoride randevu yok'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              {search ? 'Farklı anahtar kelimeler deneyin' : 'Yeni randevular geldiğinde burada görünecek'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredRandevular.map(renderRandevuCard)}
          </ScrollView>
        )}
      </View>

      {/* Price Increase Modal */}
      <Modal
        visible={showPriceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closePriceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.primary }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Fiyat Artırma
              </Text>
              <TouchableOpacity onPress={closePriceModal} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Current Price */}
            {selectedAppointment && (
              <View style={[styles.currentPriceCard, { backgroundColor: colors.background.card }]}>
                <MaterialCommunityIcons name="currency-try" size={20} color={colors.primary} />
                <Text style={[styles.currentPriceText, { color: colors.text.primary }]}>
                  Mevcut Fiyat: {selectedAppointment.price && selectedAppointment.price > 0 
                    ? new Intl.NumberFormat('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                      }).format(Number(selectedAppointment.price))
                    : 'Fiyat Belirtilmemiş'
                  }
                </Text>
              </View>
            )}

            {/* Additional Amount */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.text.primary }]}>
                Ek Tutar (TL)
              </Text>
              <TextInput
                style={[styles.modalInput, { 
                  backgroundColor: colors.background.card,
                  color: colors.text.primary,
                  borderColor: colors.border.primary
                }]}
                placeholder="Ek tutarı giriniz..."
                placeholderTextColor={colors.text.secondary}
                value={additionalAmount}
                onChangeText={setAdditionalAmount}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {/* Reason Selection */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.text.primary }]}>
                Fiyat Artırma Sebebi
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reasonScroll}>
                {predefinedReasons.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[
                      styles.reasonChip,
                      { backgroundColor: colors.background.card },
                      selectedReason === reason.id && {
                        backgroundColor: reason.color,
                        borderColor: reason.color
                      }
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                  >
                    <MaterialCommunityIcons
                      name={reason.icon as any}
                      size={16}
                      color={selectedReason === reason.id ? '#FFFFFF' : reason.color}
                    />
                    <Text style={[
                      styles.reasonChipText,
                      { color: selectedReason === reason.id ? '#FFFFFF' : colors.text.primary }
                    ]}>
                      {reason.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Custom Reason */}
            {selectedReason === 'custom' && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.text.primary }]}>
                  Özel Sebep
                </Text>
                <TextInput
                  style={[styles.modalTextArea, { 
                    backgroundColor: colors.background.card,
                    color: colors.text.primary,
                    borderColor: colors.border.primary
                  }]}
                  placeholder="Fiyat artırma sebebini açıklayın..."
                  placeholderTextColor={colors.text.secondary}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            )}

            {/* Summary */}
            {additionalAmount && parseFloat(additionalAmount) > 0 && selectedAppointment && (
              <View style={[styles.priceSummary, { backgroundColor: colors.background.card }]}>
                <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>Özet</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Mevcut:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
                    {selectedAppointment.price && selectedAppointment.price > 0 
                      ? new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        }).format(Number(selectedAppointment.price))
                      : 'Fiyat Belirtilmemiş'
                    }
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>Ek Tutar:</Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    +{new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: 'TRY',
                    }).format(parseFloat(additionalAmount))}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={[styles.summaryLabel, { color: colors.text.primary, fontWeight: 'bold' }]}>Yeni Toplam:</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: 'bold' }]}>
                    {new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: 'TRY',
                    }).format((selectedAppointment.price || 0) + parseFloat(additionalAmount || '0'))}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: '#F3F4F6' }]}
                onPress={closePriceModal}
              >
                <Text style={[styles.modalButtonText, { color: '#374151' }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.confirmButton, 
                  { backgroundColor: additionalAmount && parseFloat(additionalAmount) > 0 && selectedReason && (selectedReason !== 'custom' || customReason.trim()) ? '#10B981' : '#D1D5DB' }
                ]}
                onPress={handlePriceIncrease}
                disabled={priceModalLoading || !additionalAmount || parseFloat(additionalAmount) <= 0 || !selectedReason || (selectedReason === 'custom' && !customReason.trim())}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {priceModalLoading ? 'Gönderiliyor...' : 'Fiyatı Artır'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    paddingVertical: 16,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  randevuCard: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    flex: 1,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  serviceText: {
    fontSize: 14,
    flex: 1,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    flex: 1,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    minHeight: 48,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  acceptButton: {
    // backgroundColor set dynamically
  },
  rejectButton: {
    // backgroundColor set dynamically
  },
  startButton: {
    // backgroundColor set dynamically
  },
  completeButton: {
    // backgroundColor set dynamically
  },
  priceButton: {
    // backgroundColor set dynamically
  },
  finalizeButton: {
    // backgroundColor set dynamically
  },
  cancelButton: {
    // backgroundColor set dynamically
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  currentPriceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentPriceText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
  },
  reasonScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  reasonChipText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  priceSummary: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // backgroundColor set dynamically
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AppointmentsScreen;