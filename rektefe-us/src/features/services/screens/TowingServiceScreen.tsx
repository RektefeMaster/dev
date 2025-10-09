import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { typography, spacing, borderRadius, shadows, dimensions } from '@/shared/theme';
import apiService from '@/shared/services';

// Haversine mesafe hesaplama (km)
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

interface TowingJob {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  vehicleType: 'car' | 'motorcycle' | 'truck' | 'van';
  vehicleYear: number;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  destination: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: string;
  estimatedTime?: string;
  estimatedDistance?: number; // km
  price?: number;
  notes?: string;
  emergencyLevel: 'low' | 'medium' | 'high';
  towingType: 'flatbed' | 'wheel_lift' | 'integrated';
  customerLocation?: { lat: number; lng: number };
  mechanicLocation?: { lat: number; lng: number };
}

export default function TowingServiceScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<TowingJob[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [onlyEmergency, setOnlyEmergency] = useState<boolean>(false);

  useEffect(() => {
    fetchTowingJobs();
  }, []);

  const fetchTowingJobs = async () => {
    try {
      setLoading(true);
      const [profileRes, requestsRes] = await Promise.all([
        apiService.getMechanicProfile(),
        apiService.getMechanicServiceRequests(),
      ]);

      const mechLoc = profileRes?.data?.location?.coordinates;
      const mechLat = mechLoc?.latitude ?? mechLoc?.lat ?? null;
      const mechLng = mechLoc?.longitude ?? mechLoc?.lng ?? null;

      const items: TowingJob[] = (requestsRes.success && Array.isArray(requestsRes.data) ? requestsRes.data : [])
        .filter((a: any) => a.serviceType === 'towing')
        .map((a: any) => {
          const pu = a.pickupLocation?.coordinates || a.pickupLocation;
          const dp = a.dropoffLocation?.coordinates || a.dropoffLocation;
          const puLat = pu?.latitude ?? pu?.lat ?? null;
          const puLng = pu?.longitude ?? pu?.lng ?? null;
          const dpLat = dp?.latitude ?? dp?.lat ?? null;
          const dpLng = dp?.longitude ?? dp?.lng ?? null;

          let estDist: number | undefined;
          if (mechLat != null && mechLng != null && puLat != null && puLng != null) {
            estDist = Math.round(haversine(mechLat, mechLng, puLat, puLng) * 10) / 10;
          }

          const mapStatus = (s: string) => {
            switch (s) {
              case 'TALEP_EDILDI': return 'pending';
              case 'PLANLANDI': return 'accepted';
              case 'SERVISTE': return 'in_progress';
              case 'TAMAMLANDI': return 'completed';
              case 'IPTAL': return 'cancelled';
              default: return 'pending';
            }
          };

          return {
            id: a._id,
            customerName: a.userId ? `${a.userId.name || ''} ${a.userId.surname || ''}`.trim() : 'Müşteri',
            customerPhone: a.userId?.phone || '',
            vehicleInfo: a.description || '',
            vehicleType: (a.vehicleType || 'car'),
            vehicleYear: a.vehicleInfo?.year || 0,
            vehicleBrand: a.vehicleInfo?.brand || '',
            vehicleModel: a.vehicleInfo?.modelName || '',
            vehiclePlate: a.vehicleInfo?.plateNumber || '',
            location: {
              address: a.pickupLocation?.address || 'Alış adresi',
              coordinates: { lat: puLat || 0, lng: puLng || 0 }
            },
            destination: {
              address: a.dropoffLocation?.address || 'Varış adresi',
              coordinates: { lat: dpLat || 0, lng: dpLng || 0 }
            },
            status: mapStatus(a.status),
            requestedAt: a.createdAt,
            estimatedTime: undefined,
            estimatedDistance: estDist,
            price: a.estimatedPrice || a.price,
            notes: a.description,
            emergencyLevel: a.emergencyLevel === 'high' ? 'high' : (a.emergencyLevel === 'low' ? 'low' : 'medium'),
            towingType: a.towingType === 'flatbed' ? 'flatbed' : (a.towingType === 'integrated' ? 'integrated' : 'wheel_lift'),
            customerLocation: puLat && puLng ? { lat: puLat, lng: puLng } : undefined,
            mechanicLocation: mechLat && mechLng ? { lat: mechLat, lng: mechLng } : undefined,
          } as TowingJob;
        });

      items.sort((a, b) => {
        const pri = (lvl: string) => (lvl === 'high' ? 2 : lvl === 'medium' ? 1 : 0);
        const pd = pri(b.emergencyLevel) - pri(a.emergencyLevel);
        if (pd !== 0) return pd;
        const da = a.estimatedDistance ?? Number.POSITIVE_INFINITY;
        const db = b.estimatedDistance ?? Number.POSITIVE_INFINITY;
        return da - db;
      });

      setJobs(items);
    } catch (error) {
      Alert.alert('Hata', 'Çekici işleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTowingJobs();
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
      // API çağrısı burada yapılacak
      
      // Mock güncelleme
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: action === 'accept' ? 'accepted' : 
                     action === 'start' ? 'in_progress' : 
                     action === 'complete' ? 'completed' : 'cancelled'
            }
          : job
      ));
      
      Alert.alert('Başarılı', 'İşlem tamamlandı');
    } catch (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'accepted': return '#007AFF';
      case 'in_progress': return '#FF6B35';
      case 'completed': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'accepted': return 'Kabul Edildi';
      case 'in_progress': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getEmergencyColor = (level: string) => {
    switch (level) {
      case 'low': return colors.success;
      case 'medium': return colors.warning;
      case 'high': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const getEmergencyText = (level: string) => {
    switch (level) {
      case 'low': return 'Normal';
      case 'medium': return 'Acil';
      case 'high': return 'Çok Acil';
      default: return level;
    }
  };

  const getTowingTypeText = (type: string) => {
    switch (type) {
      case 'flatbed': return 'Düz Platform';
      case 'wheel_lift': return 'Tekerlek Kaldırma';
      case 'integrated': return 'Entegre';
      default: return type;
    }
  };

  const openMaps = (coordinates: { lat: number; lng: number }, label: string) => {
    const lat = coordinates.lat;
    const lng = coordinates.lng;
    const apple = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    const google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(apple).catch(() => {
      Linking.openURL(google).catch(() => {
        Alert.alert('Hata', 'Harita uygulaması açılamadı');
      });
    });
  };

  const callCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Hata', 'Telefon uygulaması açılamadı');
    });
  };

  const shareLocation = (job: TowingJob) => {
    const message = `Çekici konumu: ${job.mechanicLocation ? 
      `https://maps.google.com/?q=${job.mechanicLocation.lat},${job.mechanicLocation.lng}` : 
      'Konum bilgisi mevcut değil'}`;
    
    Alert.alert('Konum Paylaş', message, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Paylaş', onPress: () => {
        // Burada konum paylaşımı yapılacak
      }}
    ]);
  };

  const renderJobCard = (job: TowingJob) => (
    <Card key={job.id} variant="elevated" style={styles.jobCard}>
      {/* Emergency Level Badge */}
      <View style={styles.emergencyContainer}>
        <View style={[styles.emergencyBadge, { backgroundColor: getEmergencyColor(job.emergencyLevel) }]}>
          <Ionicons name="warning" size={14} color="#FFFFFF" />
          <Text style={styles.emergencyText}>{getEmergencyText(job.emergencyLevel)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusText}>{getStatusText(job.status)}</Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.jobHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{job.customerName}</Text>
          <TouchableOpacity onPress={() => callCustomer(job.customerPhone)}>
            <Text style={styles.customerPhone}>{job.customerPhone}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle Details */}
      <View style={styles.vehicleDetails}>
        <View style={styles.vehicleInfo}>
          <Ionicons name="car" size={16} color={colors.text.secondary} />
          <Text style={styles.vehicleText}>{job.vehicleBrand} {job.vehicleModel} ({job.vehicleYear})</Text>
        </View>
        <View style={styles.vehicleInfo}>
          <Ionicons name="card" size={16} color={colors.text.secondary} />
          <Text style={styles.vehicleText}>{job.vehiclePlate}</Text>
        </View>
        <View style={styles.vehicleInfo}>
          <Ionicons name="construct" size={16} color={colors.text.secondary} />
          <Text style={styles.vehicleText}>{getTowingTypeText(job.towingType)}</Text>
        </View>
      </View>

      {/* Location Info with Maps */}
      <View style={styles.locationInfo}>
        <TouchableOpacity 
          style={styles.locationItem}
          onPress={() => openMaps(job.location.coordinates, 'Alış Konumu')}
        >
          <Ionicons name="location" size={16} color={colors.error} />
          <Text style={styles.locationText}>{job.location.address}</Text>
          <Ionicons name="navigate" size={14} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.distanceInfo}>
          <Ionicons name="arrow-down" size={16} color={colors.text.tertiary} />
          {job.estimatedDistance && (
            <Text style={styles.distanceText}>{job.estimatedDistance} km</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.locationItem}
          onPress={() => openMaps(job.destination.coordinates, 'Varış Konumu')}
        >
          <Ionicons name="flag" size={16} color={colors.success} />
          <Text style={styles.locationText}>{job.destination.address}</Text>
          <Ionicons name="navigate" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Job Details */}
      <View style={styles.jobDetailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={14} color={colors.text.secondary} />
          <Text style={styles.detailText}>{new Date(job.requestedAt).toLocaleString('tr-TR')}</Text>
        </View>
        {job.estimatedTime && (
          <View style={styles.detailRow}>
            <Ionicons name="hourglass" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>Tahmini süre: {job.estimatedTime}</Text>
          </View>
        )}
        {job.price && (
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>Fiyat: {job.price} TL</Text>
          </View>
        )}
      </View>

      {job.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{job.notes}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <View style={styles.actionButtons}>
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
                title="İptal"
                onPress={() => handleJobAction(job.id, 'cancel')}
                variant="outline"
                size="small"
                style={styles.actionButton}
              />
            </>
          )}
          {job.status === 'accepted' && (
            <Button
              title="Başlat"
              onPress={() => handleJobAction(job.id, 'start')}
              variant="primary"
              size="small"
              style={styles.actionButton}
            />
          )}
          {job.status === 'in_progress' && (
            <>
              <Button
                title="Konum Paylaş"
                onPress={() => shareLocation(job)}
                variant="outline"
                size="small"
                style={styles.actionButton}
              />
              <Button
                title="Tamamla"
                onPress={() => handleJobAction(job.id, 'complete')}
                variant="primary"
                size="small"
                style={styles.actionButton}
              />
            </>
          )}
        </View>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => callCustomer(job.customerPhone)}
          >
            <Ionicons name="call" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => openMaps(job.location.coordinates, 'Alış Konumu')}
          >
            <Ionicons name="navigate" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const activeJobsAll = jobs.filter(job => ['pending', 'accepted', 'in_progress'].includes(job.status));
  const activeJobs = onlyEmergency ? activeJobsAll.filter(j => j.emergencyLevel === 'high') : activeJobsAll;
  const historyJobs = jobs.filter(job => ['completed', 'cancelled'].includes(job.status));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Çekici işleri yükleniyor...</Text>
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
            <Text style={styles.headerTitle}>Çekici Hizmetleri</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'active' ? `${activeJobs.length} aktif iş` : `${historyJobs.length} geçmiş iş`}
            </Text>
          </View>
        </View>

        {/* Sadece Acil filtre */}
        <View style={styles.emergencyFilterRow}>
          <TouchableOpacity
            style={[styles.emergencyFilterBtn, onlyEmergency && { backgroundColor: colors.error, borderColor: colors.error }]}
            onPress={() => setOnlyEmergency(v => !v)}
          >
            <Ionicons name="warning" size={16} color={onlyEmergency ? '#fff' : colors.error} />
            <Text style={[styles.emergencyFilterText, onlyEmergency && { color: '#fff' }]}>Sadece Acil</Text>
          </TouchableOpacity>
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
                <Ionicons name="car" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>Aktif çekici işi yok</Text>
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
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  emergencyFilterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: dimensions.screenPadding,
    marginTop: spacing.sm,
  },
  emergencyFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'transparent',
  },
  emergencyFilterText: {
    color: colors.error,
    fontWeight: '700',
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
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTabButton: {
    backgroundColor: colors.background.primary,
    ...shadows.small,
  },
  tabText: {
    fontSize: typography.button.medium.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.primary,
  },
  jobsContainer: {
    paddingHorizontal: dimensions.screenPadding,
    paddingBottom: spacing.xxl,
  },
  jobCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  emergencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  emergencyText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: spacing.xs,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  vehicleDetails: {
    marginBottom: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  customerPhone: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vehicleText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  locationInfo: {
    marginBottom: spacing.sm,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
  },
  locationText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  distanceText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  jobDetailsContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  notesContainer: {
    backgroundColor: colors.background.secondary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  actionButton: {
    minWidth: 80,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
