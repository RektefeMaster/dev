import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/shared/theme';

const { width } = Dimensions.get('window');

interface TowingDashboardProps {
  navigation: any;
  stats: any;
  appointments: any[];
  recentActivity: any[];
  onRefresh: () => void;
  refreshing: boolean;
  unreadNotificationCount: number;
  unreadMessagesCount: number;
  pendingAppointmentsCount: number;
  recentRatings: any[];
  user: any;
}

const TowingDashboard: React.FC<TowingDashboardProps> = ({
  navigation,
  stats,
  appointments,
  recentActivity,
  onRefresh,
  refreshing,
  unreadNotificationCount,
  unreadMessagesCount,
  pendingAppointmentsCount,
  recentRatings,
  user
}) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  // Çekici için özel istatistikler
  const towingStats = {
    ...stats,
    todayJobs: appointments.filter(apt => apt.serviceType === 'towing').length,
    completedJobs: appointments.filter(apt => apt.status === 'completed').length,
    averageResponseTime: '8.5', // dakika
    totalDistance: '127', // km
  };

  // Location permission ve konum alma
  useEffect(() => {
    getLocationPermission();
  }, []);

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        setLocationPermission(false);
        Alert.alert(
          'Konum İzni Gerekli',
          'Çekici hizmetleri için konum izni gereklidir. Lütfen ayarlardan izin verin.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location);
    } catch (error) {
      console.error('Get location error:', error);
    }
  };

  // Durum değiştirici
  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
    // API çağrısı burada yapılacak
    Alert.alert(
      'Durum Güncellendi',
      isAvailable ? 'Artık müsait değilsiniz' : 'Artık müsait durumdasınız'
    );
  };

  // Yeni iş kartı
  const renderNewJobCard = (job: any) => (
    <View style={styles.newJobCard} key={job._id}>
      <View style={styles.jobHeader}>
        <View style={styles.urgencyBadge}>
          <Text style={styles.urgencyText}>ACİL</Text>
        </View>
        <Text style={styles.jobTime}>2 dk önce</Text>
      </View>
      
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{job.customer?.name || 'Müşteri'}</Text>
        <Text style={styles.customerPhone}>{job.customer?.phone || 'Telefon yok'}</Text>
      </View>

      <View style={styles.locationInfo}>
        <View style={styles.locationItem}>
          <Ionicons name="location" size={16} color={colors.error.main} />
          <Text style={styles.locationText}>Olay Yeri: {job.incidentLocation || 'Konum bilgisi yok'}</Text>
        </View>
        <View style={styles.locationItem}>
          <Ionicons name="flag" size={16} color={colors.success.main} />
          <Text style={styles.locationText}>Hedef: {job.destination || 'Belirtilmemiş'}</Text>
        </View>
      </View>

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleText}>{job.vehicle?.brand} {job.vehicle?.modelName}</Text>
        <Text style={styles.plateText}>{job.vehicle?.plateNumber}</Text>
      </View>

      <View style={styles.jobDistance}>
        <Ionicons name="car" size={16} color={colors.text.secondary} />
        <Text style={styles.distanceText}>Tahmini mesafe: 3.2 km</Text>
        <Text style={styles.timeText}>• 8 dakika</Text>
      </View>

      <View style={styles.jobActions}>
        <TouchableOpacity style={styles.rejectButton} onPress={() => Alert.alert('İş Reddedildi')}>
          <Text style={styles.rejectButtonText}>Reddet</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.acceptButton} 
          onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: job._id })}
        >
          <Text style={styles.acceptButtonText}>İŞİ KABUL ET</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Durum kontrol paneli
  const renderStatusPanel = () => (
    <View style={styles.statusPanel}>
      <View style={styles.statusHeader}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success.main : colors.error.main }]} />
          <Text style={styles.statusText}>
            {isAvailable ? 'Müsait' : 'Meşgul'}
          </Text>
        </View>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleAvailability}>
          <Text style={styles.toggleButtonText}>
            {isAvailable ? 'Müsait Değil' : 'Müsait Ol'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.locationStatus}>
        <Ionicons name="location" size={16} color={colors.text.secondary} />
        <Text style={styles.locationStatusText}>Konum: Ankara, Çankaya</Text>
      </View>
    </View>
  );

  // Harita render fonksiyonu
  const renderMap = () => {
    if (!locationPermission) {
      return (
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="location-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.mapPlaceholderText}>Konum İzni Gerekli</Text>
            <Text style={styles.mapPlaceholderSubtitle}>
              Çekici hizmetleri için konum izni gereklidir
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={getLocationPermission}>
              <Text style={styles.permissionButtonText}>İzin Ver</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!currentLocation) {
      return (
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="location-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.mapPlaceholderText}>Konum Yükleniyor...</Text>
            <Text style={styles.mapPlaceholderSubtitle}>
              Mevcut konumunuz alınıyor
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
        >
          {/* Mevcut konum marker'ı */}
          <Marker
            coordinate={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            }}
            title="Mevcut Konumunuz"
            description={isAvailable ? 'Müsait' : 'Meşgul'}
            pinColor={isAvailable ? 'green' : 'red'}
          >
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>Çekici Ustası</Text>
                <Text style={styles.calloutSubtitle}>
                  Durum: {isAvailable ? 'Müsait' : 'Meşgul'}
                </Text>
              </View>
            </Callout>
          </Marker>

          {/* Yeni çekici talepleri (örnek) */}
          {activeJobs.map((job, index) => (
            <Marker
              key={job.id || index}
              coordinate={{
                latitude: job.latitude || currentLocation.coords.latitude + (Math.random() - 0.5) * 0.01,
                longitude: job.longitude || currentLocation.coords.longitude + (Math.random() - 0.5) * 0.01,
              }}
              title={job.customerName || 'Yeni Talep'}
              description={`${job.vehicleModel} - ${job.emergencyLevel}`}
              pinColor="orange"
            >
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{job.customerName || 'Yeni Talep'}</Text>
                  <Text style={styles.calloutSubtitle}>{job.vehicleModel}</Text>
                  <Text style={styles.calloutSubtitle}>{job.distance} km uzaklıkta</Text>
                  <TouchableOpacity 
                    style={styles.acceptJobButton}
                    onPress={() => handleAcceptJob(job.id)}
                  >
                    <Text style={styles.acceptJobButtonText}>İşi Kabul Et</Text>
                  </TouchableOpacity>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>
    );
  };

  // İş kabul etme fonksiyonu
  const handleAcceptJob = (jobId: string) => {
    Alert.alert(
      'İş Kabul Edildi',
      'Çekici işi başarıyla kabul edildi. Müşteriye yönlendiriliyorsunuz.',
      [
        {
          text: 'Tamam',
          onPress: () => navigation.navigate('TowingService', { jobId })
        }
      ]
    );
  };

  // İstatistik kartları
  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="car" size={24} color={colors.primary.main} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{towingStats.todayJobs}</Text>
          <Text style={styles.statLabel}>Bugünkü İşler</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success.main} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{towingStats.completedJobs}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="time" size={24} color={colors.warning.main} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{towingStats.averageResponseTime}d</Text>
          <Text style={styles.statLabel}>Ort. Süre</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="speedometer" size={24} color={colors.info.main} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{towingStats.totalDistance}km</Text>
          <Text style={styles.statLabel}>Toplam Mesafe</Text>
        </View>
      </View>
    </View>
  );

  // Hızlı eylemler
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Hızlı Eylemler</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('TowingService')}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="list" size={24} color={colors.primary.main} />
          </View>
          <Text style={styles.quickActionText}>Aktif İşler</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('Messages')}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="chatbubble" size={24} color={colors.info.main} />
          </View>
          <Text style={styles.quickActionText}>Mesajlar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('Reports')}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="analytics" size={24} color={colors.success.main} />
          </View>
          <Text style={styles.quickActionText}>Raporlar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('Profile')}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="person" size={24} color={colors.warning.main} />
          </View>
          <Text style={styles.quickActionText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Durum Kontrol Paneli */}
      {renderStatusPanel()}

      {/* Harita */}
      {renderMap()}

      {/* Yeni İş Kartı (Eğer varsa) */}
      {activeJobs.length > 0 && activeJobs.map(renderNewJobCard)}

      {/* İstatistik Kartları */}
      {renderStatsCards()}

      {/* Hızlı Eylemler */}
      {renderQuickActions()}

      {/* Boş Durum */}
      {activeJobs.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyStateTitle}>Yeni iş yok</Text>
          <Text style={styles.emptyStateSubtitle}>
            Yeni çekici talepleri geldiğinde burada görünecek
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  statusPanel: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  toggleButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  toggleButtonText: {
    color: colors.text.inverse,
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationStatusText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  newJobCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error.main,
    ...shadows.small,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  urgencyBadge: {
    backgroundColor: colors.error.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  urgencyText: {
    color: colors.text.inverse,
    fontSize: typography.caption.small.fontSize,
    fontWeight: 'bold',
  },
  jobTime: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
  },
  customerInfo: {
    marginBottom: spacing.md,
  },
  customerName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  customerPhone: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  locationInfo: {
    marginBottom: spacing.md,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  locationText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  vehicleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  vehicleText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  plateText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  jobDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  distanceText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  timeText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  jobActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  rejectButtonText: {
    color: colors.text.secondary,
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    backgroundColor: colors.success.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.text.inverse,
    fontSize: typography.body2.fontSize,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.small,
  },
  statIcon: {
    marginRight: spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  quickActionsContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '48%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  quickActionIcon: {
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Harita stilleri
  mapContainer: {
    height: 250,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.small,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  mapPlaceholderText: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  mapPlaceholderSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  permissionButtonText: {
    color: colors.text.inverse,
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  calloutContainer: {
    width: 200,
    padding: spacing.sm,
  },
  calloutTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  calloutSubtitle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  acceptJobButton: {
    backgroundColor: colors.success.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  acceptJobButtonText: {
    color: colors.text.inverse,
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
  },
});

export default TowingDashboard;
