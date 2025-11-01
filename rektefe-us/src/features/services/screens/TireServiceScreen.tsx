import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { serviceNameMapping } from '@/shared/utils/serviceTranslator';

import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { typography, spacing, borderRadius, shadows, dimensions } from '@/shared/theme';
import apiService from '@/shared/services';
import TirePriceQuoteModal from '../components/TirePriceQuoteModal';

interface TireJob {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  vehicleType: 'car' | 'motorcycle' | 'truck' | 'van' | 'suv';
  vehicleYear: number;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  serviceType: 'tire_change' | 'tire_repair' | 'tire_balance' | 'tire_alignment' | 'tire_inspection' | 'tire_purchase';
  tireSize: string;
  tireBrand?: string;
  tireModel?: string;
  tireCondition: 'new' | 'used' | 'damaged' | 'worn';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: string;
  estimatedTime?: string;
  estimatedDuration?: number; // dakika
  price?: number;
  notes?: string;
  parts?: Array<{
    name: string;
    quantity: number;
    price: number;
    status: 'needed' | 'ordered' | 'received' | 'installed';
    brand?: string;
    model?: string;
  }>;
  customerLocation?: { lat: number; lng: number };
  mechanicLocation?: { lat: number; lng: number };
  photos?: string[];
  specialRequests?: string[];
  warrantyInfo?: {
    duration: number; // ay
    conditions: string[];
  };
}

export default function TireServiceScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<TireJob[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [priceQuoteModalVisible, setPriceQuoteModalVisible] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Ustanın hizmet kategorilerini kontrol et
  const userServiceCategories = useMemo(() => {
    return user?.serviceCategories || [];
  }, [user?.serviceCategories]);

  const hasTireServiceAccess = useMemo(() => {
    if (!userServiceCategories || userServiceCategories.length === 0) return false;
    return userServiceCategories.some(cat => 
      ['tire', 'lastik', 'Lastik & Parça'].includes(cat)
    );
  }, [userServiceCategories]);

  // Eğer usta bu kategoride hizmet vermiyorsa, ekranı gösterme ve geri yönlendir
  useFocusEffect(
    React.useCallback(() => {
      if (!hasTireServiceAccess && isAuthenticated && user) {
        navigation.goBack();
        return;
      }
    }, [hasTireServiceAccess, isAuthenticated, user, navigation])
  );

  // Helper functions
  const getServiceTypeText = (type: string) => {
    // Önce serviceTranslator'dan bak
    if (serviceNameMapping[type]) {
      return serviceNameMapping[type];
    }
    
    // Sonra lokal mapping
    const types = {
      tire_change: 'Lastik Değişimi',
      tire_repair: 'Lastik Tamiri',
      tire_balance: 'Lastik Balansı',
      tire_alignment: 'Rot Balansı',
      tire_inspection: 'Lastik Kontrolü',
      tire_purchase: 'Lastik Satışı'
    };
    return types[type as keyof typeof types] || type;
  };

  const getServiceTypeColor = (type: string) => {
    const colors = {
      tire_change: '#4CAF50',
      tire_repair: '#FF9800',
      tire_balance: '#2196F3',
      tire_alignment: '#9C27B0',
      tire_inspection: '#607D8B',
      tire_purchase: '#795548'
    };
    return colors[type as keyof typeof colors] || '#666';
  };

  const getTireConditionText = (condition: string) => {
    const conditions = {
      new: 'Yeni',
      used: 'İkinci El',
      damaged: 'Hasarlı',
      worn: 'Aşınmış'
    };
    return conditions[condition as keyof typeof conditions] || condition;
  };

  const getTireConditionColor = (condition: string) => {
    const colors = {
      new: '#4CAF50',
      used: '#FF9800',
      damaged: '#F44336',
      worn: '#9E9E9E'
    };
    return colors[condition as keyof typeof colors] || '#666';
  };

  const getPartStatusText = (status: string) => {
    const statuses = {
      needed: 'Gerekli',
      ordered: 'Sipariş Edildi',
      received: 'Teslim Alındı',
      installed: 'Takıldı'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getPartStatusColor = (status: string) => {
    const colors = {
      needed: '#FF9800',
      ordered: '#2196F3',
      received: '#4CAF50',
      installed: '#4CAF50'
    };
    return colors[status as keyof typeof colors] || '#666';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: '#FF9800',
      accepted: '#2196F3',
      in_progress: '#4CAF50',
      completed: '#4CAF50',
      cancelled: '#F44336'
    };
    return colors[status as keyof typeof colors] || '#666';
  };

  const getStatusText = (status: string) => {
    const texts = {
      pending: 'Bekliyor',
      accepted: 'Kabul Edildi',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const openMaps = (location: { address: string; coordinates: { lat: number; lng: number } }) => {
    const { lat, lng } = location.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const callCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSendPriceQuote = (jobId: string) => {
    setSelectedJobId(jobId);
    setPriceQuoteModalVisible(true);
  };

  const handlePriceQuoteSuccess = () => {
    fetchTireJobs(); // Listeyi yenile
  };

  useEffect(() => {
    fetchTireJobs();
  }, []);

  const fetchTireJobs = async () => {
    try {
      setLoading(true);
      // Gerçek API çağrısı - lastik işleri
      const response = await apiService.getTireJobs();
      
      if (response.success && response.data) {
        // API'den gelen veriyi TireJob formatına çevir
        const formattedJobs = response.data.map((job: any) => ({
          id: job._id,
          customerName: job.userId?.name && job.userId?.surname 
            ? `${job.userId.name} ${job.userId.surname}` 
            : 'Bilinmiyor',
          customerPhone: job.userId?.phone || '',
          vehicleInfo: job.vehicleId 
            ? `${job.vehicleId.brand} ${job.vehicleId.model || job.vehicleId.modelName}`
            : job.vehicleInfo?.brand && job.vehicleInfo?.model
              ? `${job.vehicleInfo.brand} ${job.vehicleInfo.model}`
              : 'Araç bilgisi yok',
          vehicleType: job.vehicleId?.type || 'car',
          vehicleYear: job.vehicleId?.year || parseInt(job.vehicleInfo?.year) || new Date().getFullYear(),
          vehicleBrand: job.vehicleId?.brand || job.vehicleInfo?.brand || '',
          vehicleModel: job.vehicleId?.model || job.vehicleId?.modelName || job.vehicleInfo?.model || '',
          vehiclePlate: job.vehicleId?.plateNumber || '',
          location: job.location || { address: '', coordinates: { lat: 0, lng: 0 } },
          serviceType: job.tireServiceType || 'tire_change',
          tireSize: job.tireSize || '',
          tireBrand: job.tireBrand,
          tireModel: job.tireModel,
          tireCondition: job.tireCondition || 'used',
          status: job.status === 'TALEP_EDILDI' ? 'pending' 
                  : job.status === 'PLANLANDI' ? 'accepted'
                  : job.status === 'SERVISTE' ? 'in_progress'
                  : job.status === 'ODEME_BEKLIYOR' ? 'payment_pending'
                  : job.status === 'TAMAMLANDI' ? 'completed'
                  : job.status === 'IPTAL_EDILDI' ? 'cancelled'
                  : job.status === 'NO_SHOW' ? 'no_show'
                  // Eski status değerleri (geriye dönük uyumluluk)
                  : job.status === 'ONAYLANDI' ? 'accepted'
                  : job.status === 'DEVAM_EDIYOR' ? 'in_progress'
                  : 'pending',
          requestedAt: job.createdAt || new Date().toISOString(),
          estimatedTime: job.timeSlot || 'Belirtilmedi',
          estimatedDuration: job.estimatedDuration,
          price: job.price || job.quotedPrice,
          notes: job.description,
          parts: [],
          specialRequests: job.specialRequests ? [job.specialRequests] : [],
          warrantyInfo: job.warrantyInfo,
          isMobileService: job.isMobileService,
          isUrgent: job.isUrgent
        }));

        setJobs(formattedJobs);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('Lastik işleri yükleme hatası:', error);
      Alert.alert('Hata', 'Lastik işleri yüklenirken bir hata oluştu');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTireJobs();
    setRefreshing(false);
  };

  const handleJobAction = (jobId: string, action: 'accept' | 'start' | 'complete' | 'cancel') => {
    Alert.alert(
      'İşlem Onayı',
      `${action === 'accept' ? 'Kabul' : action === 'start' ? 'Başlat' : action === 'complete' ? 'Tamamla' : 'İptal'} etmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: () => performJobAction(jobId, action) }
      ]
    );
  };

  const performJobAction = async (jobId: string, action: string) => {
    try {
      let response;
      
      if (action === 'accept') {
        response = await apiService.acceptTireJob(jobId);
      } else if (action === 'start') {
        response = await apiService.startTireJob(jobId);
      } else if (action === 'complete') {
        response = await apiService.completeTireJob(jobId, {});
      } else if (action === 'cancel') {
        // İptal işlemi için appointment servisi kullan
        response = await apiService.cancelAppointment(jobId);
      }
      
      if (response?.success) {
        // İşlem başarılı - listeyi yenile
        await fetchTireJobs();
        Alert.alert('Başarılı', 'İşlem tamamlandı');
      } else {
        throw new Error(response?.message || 'İşlem başarısız');
      }
    } catch (error: any) {
      console.error('İş aksiyonu hatası:', error);
      Alert.alert('Hata', error.message || 'İşlem gerçekleştirilemedi');
    }
  };

  const renderJobCard = (job: TireJob) => (
    <Card key={job.id} variant="elevated" style={styles.jobCard}>
      {/* Hizmet Türü ve Lastik Durumu Badge'leri */}
      <View style={styles.serviceTypeContainer}>
        <View style={[styles.serviceTypeBadge, { backgroundColor: getServiceTypeColor(job.serviceType) }]}>
          <Ionicons name="car" size={14} color="#FFFFFF" />
          <Text style={styles.serviceTypeText}>{getServiceTypeText(job.serviceType)}</Text>
        </View>
        <View style={[styles.tireConditionBadge, { backgroundColor: getTireConditionColor(job.tireCondition) }]}>
          <Text style={styles.tireConditionText}>{getTireConditionText(job.tireCondition)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
        </View>
      </View>

      {/* Müşteri Bilgileri */}
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{job.customerName}</Text>
        <Text style={styles.customerPhone}>{job.customerPhone}</Text>
      </View>

      {/* Araç Detayları */}
      <View style={styles.vehicleDetails}>
        <View style={styles.vehicleRow}>
          <Ionicons name="car" size={16} color={colors.text.secondary} />
          <Text style={styles.vehicleText}>{job.vehicleBrand} {job.vehicleModel}</Text>
        </View>
        <View style={styles.vehicleRow}>
          <Ionicons name="calendar" size={16} color={colors.text.secondary} />
          <Text style={styles.vehicleText}>{job.vehicleYear}</Text>
        </View>
        <View style={styles.vehicleRow}>
          <Ionicons name="card" size={16} color={colors.text.secondary} />
          <Text style={styles.vehicleText}>{job.vehiclePlate}</Text>
        </View>
      </View>

      {/* Lastik Bilgileri */}
      <View style={styles.tireInfo}>
        <View style={styles.tireRow}>
          <Ionicons name="car" size={16} color={colors.primary} />
          <Text style={styles.tireText}>Lastik: {job.tireSize}</Text>
        </View>
        {job.tireBrand && (
          <View style={styles.tireRow}>
            <Ionicons name="star" size={16} color={colors.primary} />
            <Text style={styles.tireText}>Marka: {job.tireBrand} {job.tireModel}</Text>
          </View>
        )}
      </View>

      {/* Konum Bilgisi */}
      <View style={styles.locationInfo}>
        <TouchableOpacity 
          style={styles.locationRow}
          onPress={() => openMaps(job.location)}
        >
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.locationText}>{job.location.address}</Text>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Parça Listesi */}
      {job.parts && job.parts.length > 0 && (
        <View style={styles.partsContainer}>
          <Text style={styles.partsTitle}>Parçalar:</Text>
          {job.parts.map((part, index) => (
            <View key={index} style={styles.partItem}>
              <View style={styles.partInfo}>
                <Text style={styles.partName}>{part.name}</Text>
                <Text style={styles.partQuantity}>Adet: {part.quantity}</Text>
                {part.brand && (
                  <Text style={styles.partBrand}>{part.brand} {part.model}</Text>
                )}
              </View>
              <View style={styles.partPriceContainer}>
                <Text style={styles.partPrice}>{part.price} TL</Text>
                <View style={[styles.partStatusBadge, { backgroundColor: getPartStatusColor(part.status) }]}>
                  <Text style={styles.partStatusText}>{getPartStatusText(part.status)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Garanti Bilgisi */}
      {job.warrantyInfo && (
        <View style={styles.warrantyContainer}>
          <Text style={styles.warrantyTitle}>Garanti Bilgisi:</Text>
          <Text style={styles.warrantyText}>{job.warrantyInfo.duration} ay garanti</Text>
          {job.warrantyInfo.conditions.map((condition, index) => (
            <Text key={index} style={styles.warrantyCondition}>• {condition}</Text>
          ))}
        </View>
      )}

      {/* Özel İstekler */}
      {job.specialRequests && job.specialRequests.length > 0 && (
        <View style={styles.specialRequestsContainer}>
          <Text style={styles.specialRequestsTitle}>Özel İstekler:</Text>
          {job.specialRequests.map((request, index) => (
            <Text key={index} style={styles.specialRequestText}>• {request}</Text>
          ))}
        </View>
      )}

      {/* İş Detayları */}
      <View style={styles.jobDetailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={14} color={colors.text.secondary} />
          <Text style={styles.detailText}>{job.estimatedTime}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={14} color={colors.text.secondary} />
          <Text style={styles.detailText}>{job.price} TL</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={14} color={colors.text.secondary} />
          <Text style={styles.detailText}>{new Date(job.requestedAt).toLocaleDateString('tr-TR')}</Text>
        </View>
      </View>

      {/* Notlar */}
      {job.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{job.notes}</Text>
        </View>
      )}

      {/* Aksiyon Butonları */}
      <View style={styles.actionButtonsContainer}>
        {job.status === 'pending' && (
          <>
            <Button
              title="Kabul Et"
              onPress={() => handleJobAction(job.id, 'accept')}
              variant="primary"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title="Fiyat Teklifi"
              onPress={() => handleSendPriceQuote(job.id)}
              variant="secondary"
              size="small"
              style={styles.actionButton}
            />
          </>
        )}
        {job.status === 'accepted' && (
          <>
            <Button
              title="Başlat"
              onPress={() => handleJobAction(job.id, 'start')}
              variant="primary"
              size="small"
              style={styles.actionButton}
            />
            {!job.price && (
              <Button
                title="Fiyat Teklifi"
                onPress={() => handleSendPriceQuote(job.id)}
                variant="secondary"
                size="small"
                style={styles.actionButton}
              />
            )}
          </>
        )}
        {job.status === 'in_progress' && (
          <Button
            title="Tamamla"
            onPress={() => handleJobAction(job.id, 'complete')}
            variant="success"
            size="small"
            style={styles.actionButton}
          />
        )}
      </View>

      {/* Hızlı Aksiyonlar */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => callCustomer(job.customerPhone)}
        >
          <Ionicons name="call" size={16} color={colors.primary} />
          <Text style={styles.quickActionText}>Ara</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => openMaps(job.location)}
        >
          <Ionicons name="map" size={16} color={colors.primary} />
          <Text style={styles.quickActionText}>Harita</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  // Eğer usta bu kategoride hizmet vermiyorsa hiçbir şey gösterme
  if (!hasTireServiceAccess) {
    return null;
  }

  const activeJobs = jobs.filter(job => ['pending', 'accepted', 'in_progress'].includes(job.status));
  const historyJobs = jobs.filter(job => ['completed', 'cancelled'].includes(job.status));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Lastik işleri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Lastik Hizmetleri</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'active' ? `${activeJobs.length} aktif iş` : `${historyJobs.length} geçmiş iş`}
            </Text>
          </View>
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.activeTabButton]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
              Aktif İşler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              Geçmiş
            </Text>
          </TouchableOpacity>
        </View>

        {/* Jobs List */}
        <View style={styles.jobsContainer}>
          {activeTab === 'active' ? (
            activeJobs.length > 0 ? (
              activeJobs.map(renderJobCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>Aktif lastik işi yok</Text>
                <Text style={styles.emptySubtitle}>Yeni işler geldiğinde burada görünecek</Text>
              </View>
            )
          ) : (
            historyJobs.length > 0 ? (
              historyJobs.map(renderJobCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>Geçmiş iş yok</Text>
                <Text style={styles.emptySubtitle}>Tamamlanan işler burada görünecek</Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Fiyat Teklifi Modal */}
      {selectedJobId && (
        <TirePriceQuoteModal
          visible={priceQuoteModalVisible}
          jobId={selectedJobId}
          onClose={() => {
            setPriceQuoteModalVisible(false);
            setSelectedJobId(null);
          }}
          onSuccess={handlePriceQuoteSuccess}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: dimensions.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: dimensions.screenPadding,
    marginVertical: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.inverse,
    fontWeight: typography.body2.fontWeight,
  },
  jobsContainer: {
    paddingHorizontal: dimensions.screenPadding,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  jobCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  serviceTypeText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
    color: '#FFFFFF',
    marginLeft: spacing.xs,
  },
  tireConditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tireConditionText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
    color: '#FFFFFF',
  },
  customerInfo: {
    marginBottom: spacing.md,
  },
  customerName: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: colors.text.primary,
  },
  customerPhone: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  vehicleDetails: {
    marginBottom: spacing.md,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  vehicleText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  tireInfo: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  tireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tireText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: typography.body2.fontWeight,
  },
  locationInfo: {
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  partsContainer: {
    marginBottom: spacing.md,
  },
  partsTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
  },
  partQuantity: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
  },
  partBrand: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
  },
  partPriceContainer: {
    alignItems: 'flex-end',
  },
  partPrice: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  partStatusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  partStatusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: typography.caption.small.fontWeight,
    color: '#FFFFFF',
  },
  warrantyContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  warrantyTitle: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  warrantyText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary,
    fontWeight: typography.body2.fontWeight,
  },
  warrantyCondition: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  specialRequestsContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  specialRequestsTitle: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  specialRequestText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  jobDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  notesContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  notesText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.secondary,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});