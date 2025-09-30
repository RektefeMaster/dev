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
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BackButton from '@/shared/components/BackButton';

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
      
      const response = await apiService.getMechanicAppointments(mapTRtoEN(durum), {});
      
      if (response.success) {
        const data = (response.data as any) || [];
        const list = Array.isArray(data) ? data : [];
        
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
      const response = await apiService.updateAppointmentStatus(randevuId, { status: newStatus });
      
      if (response.success) {
        Alert.alert('Başarılı', 'Randevu durumu güncellendi');
        fetchRandevular(selectedDurum);
      } else {
        Alert.alert('Hata', response.message || 'Durum güncellenirken bir hata oluştu');
      }
    } catch (error: any) {
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
      <View
        key={randevu._id}
        style={[
          styles.modernCard,
          { 
            backgroundColor: colors.background.primary,
            borderColor: colors.neutral[200],
            shadowColor: isUrgent ? durumColor : colors.shadow.dark,
          }
        ]}
      >
        {/* Card Header */}
        <View style={[styles.modernCardHeader, { borderBottomColor: colors.neutral[100] }]}>
          <View style={styles.customerSection}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary.ultraLight }]}>
              <MaterialCommunityIcons name="account" size={24} color={colors.primary.main} />
            </View>
            <View style={styles.customerDetails}>
              <Text style={[styles.modernCustomerName, { color: colors.text.primary }]}>
                {randevu.customer?.name} {randevu.customer?.surname}
              </Text>
              <Text style={[styles.modernCustomerPhone, { color: colors.text.secondary }]}>
                {randevu.customer?.phone}
              </Text>
            </View>
          </View>
          <View style={[styles.modernStatusBadge, { backgroundColor: durumColor }]}>
            <MaterialCommunityIcons 
              name={DURUM_TABLARI.find(t => t.key === randevu.durum)?.icon as any || 'circle'} 
              size={14} 
              color="#FFFFFF" 
            />
            <Text style={[styles.modernStatusText, { color: '#FFFFFF' }]}>
              {getDurumText(randevu.durum)}
            </Text>
          </View>
        </View>

        {/* Vehicle & Service Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.success.ultraLight }]}>
              <MaterialCommunityIcons name="car" size={18} color={colors.success.main} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Araç</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {randevu.vehicle?.brand} {randevu.vehicle?.modelName}
              </Text>
              <Text style={[styles.infoSubValue, { color: colors.text.tertiary }]}>
                {randevu.vehicle?.plateNumber}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.warning.ultraLight }]}>
              <MaterialCommunityIcons name="wrench" size={18} color={colors.warning.main} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Hizmet</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {randevu.isTuru}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.primary.ultraLight }]}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary.main} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Tarih & Saat</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {formatTarih(randevu.appointmentDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {randevu.description && (
          <View style={[styles.descriptionSection, { borderTopColor: colors.neutral[100] }]}>
            <View style={styles.descriptionHeader}>
              <MaterialCommunityIcons name="text-box-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.descriptionLabel, { color: colors.text.secondary }]}>Açıklama</Text>
            </View>
            <Text style={[styles.modernDescriptionText, { color: colors.text.primary }]} numberOfLines={3}>
              {randevu.description}
            </Text>
          </View>
        )}

        {/* Price Section */}
        <View style={[styles.priceSection, { backgroundColor: colors.success.ultraLight, borderTopColor: colors.neutral[100] }]}>
          <View style={styles.priceInfo}>
            <MaterialCommunityIcons name="currency-try" size={20} color={colors.success.main} />
            <View style={styles.priceDetails}>
              <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>Toplam Tutar</Text>
              <Text style={[styles.modernPriceText, { color: colors.success.main }]}>
                {randevu.price && randevu.price > 0
                  ? new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: 'TRY',
                    }).format(Number(randevu.price))
                  : 'Fiyat Belirtilmemiş'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[styles.modernActions, { borderTopColor: colors.neutral[100] }]}>
          {randevu.durum === 'TALEP_EDILDI' && (
            <>
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: colors.success.main }]}
                onPress={() => handleStatusChange(randevu._id, 'PLANLANDI')}
              >
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.modernActionText}>Kabul Et</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: colors.error.main }]}
                onPress={() => handleStatusChange(randevu._id, 'IPTAL')}
              >
                <MaterialCommunityIcons name="close" size={18} color="#FFFFFF" />
                <Text style={styles.modernActionText}>Reddet</Text>
              </TouchableOpacity>
            </>
          )}
          
          {randevu.durum === 'PLANLANDI' && (
            <TouchableOpacity
              style={[styles.modernActionButton, { backgroundColor: colors.primary.main }]}
              onPress={() => handleStatusChange(randevu._id, 'SERVISTE')}
            >
              <MaterialCommunityIcons name="play" size={18} color="#FFFFFF" />
              <Text style={styles.modernActionText}>Başlat</Text>
            </TouchableOpacity>
          )}
          
          {randevu.durum === 'SERVISTE' && (
            <>
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: colors.warning.main }]}
                onPress={() => openPriceModal(randevu)}
              >
                <MaterialCommunityIcons name="currency-try" size={18} color="#FFFFFF" />
                <Text style={styles.modernActionText}>Fiyat Artır</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: colors.success.main }]}
                onPress={() => handleStatusChange(randevu._id, 'ODEME_BEKLIYOR')}
              >
                <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.modernActionText}>Tamamla</Text>
              </TouchableOpacity>
            </>
          )}
          
          {randevu.durum === 'ODEME_BEKLIYOR' && (
            <TouchableOpacity
              style={[styles.modernActionButton, { backgroundColor: colors.success.main }]}
              onPress={() => handleStatusChange(randevu._id, 'TAMAMLANDI')}
            >
              <MaterialCommunityIcons name="check-all" size={18} color="#FFFFFF" />
              <Text style={styles.modernActionText}>Finalize Et</Text>
            </TouchableOpacity>
          )}
          
          {/* İptal butonu - TAMAMLANDI hariç tüm durumlarda */}
          {randevu.durum !== 'TAMAMLANDI' && randevu.durum !== 'IPTAL' && (
            <TouchableOpacity
              style={[styles.modernActionButton, { backgroundColor: colors.error.main }]}
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
              <MaterialCommunityIcons name="close-circle" size={18} color="#FFFFFF" />
              <Text style={styles.modernActionText}>İptal Et</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
      <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <Text style={[styles.title, { color: colors.text.primary }]}>Randevularım</Text>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.neutral[100] }]}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialCommunityIcons name="filter" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.neutral[50], borderColor: colors.neutral[200] }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary.main }]}>
                <MaterialCommunityIcons name="calendar-multiple" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.statNumber, { color: colors.text.primary }]}>
                {Object.values(counts).reduce((a, b) => a + b, 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Toplam</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.success.ultraLight, borderColor: colors.success.light }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.success.main }]}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.statNumber, { color: colors.success.main }]}>
                {counts.SERVISTE + counts.ODEME_BEKLIYOR}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Aktif</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.warning.ultraLight, borderColor: colors.warning.light }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.warning.main }]}>
                <MaterialCommunityIcons name="clock" size={20} color="#FFFFFF" />
              </View>
              <Text style={[styles.statNumber, { color: colors.warning.main }]}>
                {counts.TALEP_EDILDI}
              </Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Bekleyen</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.neutral[50], borderColor: colors.neutral[200] }]}>
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
      <View style={[styles.tabsContainer, { backgroundColor: colors.background.primary }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {DURUM_TABLARI.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                {
                  backgroundColor: selectedDurum === tab.key ? tab.color : colors.neutral[50],
                  borderColor: selectedDurum === tab.key ? tab.color : colors.neutral[200],
                  borderWidth: selectedDurum === tab.key ? 2 : 1,
                }
              ]}
              onPress={() => {
                setSelectedDurum(tab.key as RandevuDurum);
                fetchRandevular(tab.key as RandevuDurum);
              }}
            >
              <View style={styles.tabContent}>
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={20}
                  color={selectedDurum === tab.key ? colors.text.inverse : colors.text.primary}
                />
                <Text style={[
                  styles.tabText,
                  { color: selectedDurum === tab.key ? colors.text.inverse : colors.text.primary }
                ]}>
                  {tab.label}
                </Text>
                {counts[tab.key as RandevuDurum] > 0 && (
                  <View style={[
                    styles.tabBadge,
                    { backgroundColor: selectedDurum === tab.key ? colors.text.inverse : colors.error.main }
                  ]}>
                    <Text style={[
                      styles.tabBadgeText,
                      { color: selectedDurum === tab.key ? tab.color : colors.text.inverse }
                    ]}>
                      {counts[tab.key as RandevuDurum]}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <View style={[styles.errorIconContainer, { backgroundColor: colors.error.ultraLight }]}>
              <MaterialCommunityIcons name="alert-circle" size={48} color={colors.error.main} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Bir Hata Oluştu</Text>
            <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary.main }]}
              onPress={() => fetchRandevular(selectedDurum)}
            >
              <MaterialCommunityIcons name="refresh" size={20} color={colors.text.inverse} />
              <Text style={[styles.retryButtonText, { color: colors.text.inverse }]}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : filteredRandevular.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.neutral[50] }]}>
              <MaterialCommunityIcons 
                name={search ? "magnify" : "calendar-blank"} 
                size={64} 
                color={colors.text.secondary} 
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              {search ? 'Arama sonucu bulunamadı' : 'Bu kategoride randevu yok'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              {search ? 'Farklı anahtar kelimeler deneyin' : 'Yeni randevular geldiğinde burada görünecek'}
            </Text>
            {search && (
              <TouchableOpacity
                style={[styles.clearSearchButton, { backgroundColor: colors.neutral[100] }]}
                onPress={() => setSearch('')}
              >
                <Text style={[styles.clearSearchText, { color: colors.text.primary }]}>Aramayı Temizle</Text>
              </TouchableOpacity>
            )}
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
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
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
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: 20,
  },
  // Modern Card Styles
  modernCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  modernCustomerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modernCustomerPhone: {
    fontSize: 14,
    fontWeight: '500',
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modernStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoSubValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  modernDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  priceSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F8FAFC',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceDetails: {
    marginLeft: 12,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modernPriceText: {
    fontSize: 20,
    fontWeight: '700',
  },
  modernActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modernActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 48,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptAction: {
    backgroundColor: '#10B981',
  },
  rejectAction: {
    backgroundColor: '#EF4444',
  },
  startAction: {
    backgroundColor: '#3B82F6',
  },
  completeAction: {
    backgroundColor: '#10B981',
  },
  priceAction: {
    backgroundColor: '#F59E0B',
  },
  finalizeAction: {
    backgroundColor: '#10B981',
  },
  cancelAction: {
    backgroundColor: '#EF4444',
  },
  modernActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    gap: 20,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    gap: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  clearSearchButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AppointmentsScreen;