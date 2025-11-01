import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';

/**
 * PLAN.md'ye göre çekici hizmetleri ekranı
 * - Anlık talep sistemi (CekiciYolla benzeri)
 * - Acil/Normal önceliklendirme
 * - Gerçek zamanlı mesafe hesaplama
 * - Konum paylaşımı ve navigasyon
 */

// Haversine formülü ile mesafe hesaplama (km)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Dünya'nın yarıçapı (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.asin(Math.sqrt(a));
  return Math.round(R * c * 10) / 10; // 1 ondalık basamak
};

interface TowingRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
  };
  vehicleId?: {
    brand: string;
    modelName: string;
    plateNumber: string;
    year: number;
  };
  serviceType: string;
  pickupLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  dropoffLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  description: string;
  status: 'TALEP_EDILDI' | 'PLANLANDI' | 'SERVISTE' | 'TAMAMLANDI' | 'IPTAL';
  emergencyLevel: 'low' | 'medium' | 'high';
  towingType?: 'flatbed' | 'wheel_lift' | 'integrated';
  estimatedPrice?: number;
  createdAt: string;
  updatedAt: string;
  distance?: number; // Hesaplanan mesafe
}

export default function TowingServiceScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<TowingRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');

  // Ustanın konumu
  const [mechanicLocation, setMechanicLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Ustanın hizmet kategorilerini kontrol et
  const userServiceCategories = useMemo(() => {
    return user?.serviceCategories || [];
  }, [user?.serviceCategories]);

  const hasTowingServiceAccess = useMemo(() => {
    if (!userServiceCategories || userServiceCategories.length === 0) return false;
    return userServiceCategories.some(cat => 
      ['towing', 'cekici', 'Çekici'].includes(cat)
    );
  }, [userServiceCategories]);

  useFocusEffect(
    useCallback(() => {
      // Eğer usta bu kategoride hizmet vermiyorsa, ekranı gösterme ve geri yönlendir
      if (!hasTowingServiceAccess && isAuthenticated && user) {
        navigation.goBack();
        return;
      }
      if (hasTowingServiceAccess) {
        fetchTowingRequests();
      }
    }, [statusFilter, hasTowingServiceAccess, isAuthenticated, user, navigation])
  );

  const fetchTowingRequests = async () => {
    try {
      setLoading(true);

      // Usta profilinden konum bilgisini al
      const profileResponse = await apiService.getMechanicProfile();
      if (profileResponse.success && profileResponse.data?.location?.coordinates) {
        const coords = profileResponse.data.location.coordinates;
        const mechLat = coords.latitude ?? coords.lat;
        const mechLng = coords.longitude ?? coords.lng;
        if (mechLat && mechLng) {
          setMechanicLocation({ lat: mechLat, lng: mechLng });
        }
      }

      // Çekici taleplerini getir
      const response = await apiService.getMechanicServiceRequests();
      
      if (response.success && Array.isArray(response.data)) {
        // Sadece çekici (towing) taleplerini filtrele
        let towingRequests = response.data.filter(
          (req: any) => req.serviceType === 'towing' || req.serviceType === 'cekici'
        );

        // Duruma göre filtrele
        if (statusFilter === 'active') {
          towingRequests = towingRequests.filter(
            (req: any) => ['TALEP_EDILDI', 'PLANLANDI', 'SERVISTE'].includes(req.status)
          );
        } else {
          towingRequests = towingRequests.filter(
            (req: any) => ['TAMAMLANDI', 'IPTAL'].includes(req.status)
          );
        }

        // Mesafe hesapla ve ekle
        const enrichedRequests = towingRequests.map((req: any) => {
          let distance: number | undefined;
          
          if (mechanicLocation && req.pickupLocation?.coordinates) {
            const pickup = req.pickupLocation.coordinates;
            const pickupLat = pickup.latitude ?? pickup.lat;
            const pickupLng = pickup.longitude ?? pickup.lng;
            
            if (pickupLat && pickupLng) {
              distance = calculateDistance(
                mechanicLocation.lat,
                mechanicLocation.lng,
                pickupLat,
                pickupLng
              );
            }
          }

          return {
            ...req,
            distance,
          };
        });

        // Öncelik sıralaması: 1) Acil seviyesi, 2) Mesafe
        enrichedRequests.sort((a: any, b: any) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.emergencyLevel || 'low'];
          const bPriority = priorityOrder[b.emergencyLevel || 'low'];
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Yüksek öncelik önce
          }
          
          // Eşit öncelikte mesafeye göre sırala
          const aDistance = a.distance ?? Infinity;
          const bDistance = b.distance ?? Infinity;
          return aDistance - bDistance; // Yakın mesafe önce
        });

        setRequests(enrichedRequests);
      }
    } catch (error) {
      console.error('❌ Çekici talepleri yüklenirken hata:', error);
      Alert.alert('Hata', 'Çekici talepleri yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Eğer usta bu kategoride hizmet vermiyorsa hiçbir şey gösterme
  if (!hasTowingServiceAccess) {
    return null;
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchTowingRequests();
  };

  const handleAcceptRequest = async (requestId: string) => {
    Alert.alert(
      'Talebi Kabul Et',
      'Bu çekici talebini kabul etmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kabul Et',
          onPress: async () => {
            try {
              const response = await apiService.updateAppointmentStatus(requestId, 'PLANLANDI');
              
              if (response.success) {
                Alert.alert('Başarılı', 'Talep kabul edildi');
                fetchTowingRequests();
              } else {
                Alert.alert('Hata', response.message || 'Talep kabul edilemedi');
              }
            } catch (error) {
              console.error('❌ Talep kabul hatası:', error);
              Alert.alert('Hata', 'Bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleStartJob = async (requestId: string) => {
    try {
      const response = await apiService.updateAppointmentStatus(requestId, 'SERVISTE');
      
      if (response.success) {
        Alert.alert('Başarılı', 'İş başlatıldı');
        fetchTowingRequests();
      } else {
        Alert.alert('Hata', response.message || 'İş başlatılamadı');
      }
    } catch (error) {
      console.error('❌ İş başlatma hatası:', error);
      Alert.alert('Hata', 'Bir hata oluştu');
    }
  };

  const handleCompleteJob = async (requestId: string) => {
    Alert.alert(
      'İşi Tamamla',
      'Bu işi tamamlamak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tamamla',
          onPress: async () => {
            try {
              const response = await apiService.updateAppointmentStatus(requestId, 'TAMAMLANDI');
              
              if (response.success) {
                Alert.alert('Başarılı', 'İş tamamlandı');
                fetchTowingRequests();
              } else {
                Alert.alert('Hata', response.message || 'İş tamamlanamadı');
              }
            } catch (error) {
              console.error('❌ İş tamamlama hatası:', error);
              Alert.alert('Hata', 'Bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleCancelJob = async (requestId: string) => {
    Alert.alert(
      'İptal Et',
      'Bu işi iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.updateAppointmentStatus(requestId, 'IPTAL');
              
              if (response.success) {
                Alert.alert('Başarılı', 'İş iptal edildi');
                fetchTowingRequests();
              } else {
                Alert.alert('Hata', response.message || 'İş iptal edilemedi');
              }
            } catch (error) {
              console.error('❌ İş iptal hatası:', error);
              Alert.alert('Hata', 'Bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const openNavigation = (latitude: number, longitude: number, label: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Hata', 'Harita uygulaması açılamadı');
    });
  };

  const callCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Hata', 'Telefon uygulaması açılamadı');
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'TALEP_EDILDI':
        return { text: 'Yeni Talep', color: '#FF9500', icon: 'hourglass-outline' };
      case 'PLANLANDI':
        return { text: 'Kabul Edildi', color: '#007AFF', icon: 'checkmark-circle-outline' };
      case 'SERVISTE':
        return { text: 'Devam Ediyor', color: '#FF6B35', icon: 'car-sport-outline' };
      case 'TAMAMLANDI':
        return { text: 'Tamamlandı', color: '#34C759', icon: 'checkmark-done-outline' };
      case 'IPTAL':
        return { text: 'İptal Edildi', color: '#FF3B30', icon: 'close-circle-outline' };
      default:
        return { text: status, color: '#8E8E93', icon: 'help-circle-outline' };
    }
  };

  const getEmergencyInfo = (level: string) => {
    switch (level) {
      case 'high':
        return { text: 'Çok Acil', color: '#FF3B30', icon: 'warning' };
      case 'medium':
        return { text: 'Acil', color: '#FF9500', icon: 'alert-circle' };
      case 'low':
        return { text: 'Normal', color: '#34C759', icon: 'information-circle' };
      default:
        return { text: 'Normal', color: '#8E8E93', icon: 'information-circle' };
    }
  };

  const getTowingTypeText = (type?: string) => {
    switch (type) {
      case 'flatbed':
        return 'Düz Platform';
      case 'wheel_lift':
        return 'Tekerlek Kaldırma';
      case 'integrated':
        return 'Entegre';
      default:
        return 'Standart';
    }
  };

  const renderRequestCard = (request: TowingRequest) => {
    const statusInfo = getStatusInfo(request.status);
    const emergencyInfo = getEmergencyInfo(request.emergencyLevel);
    const pickupCoords = request.pickupLocation.coordinates;
    const dropoffCoords = request.dropoffLocation.coordinates;

    return (
      <View key={request._id} style={styles.card}>
        {/* Header: Emergency & Status */}
        <View style={styles.cardHeader}>
          <View style={[styles.emergencyBadge, { backgroundColor: emergencyInfo.color }]}>
            <Ionicons name={emergencyInfo.icon as any} size={16} color="#FFFFFF" />
            <Text style={styles.emergencyText}>{emergencyInfo.text}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon as any} size={14} color="#FFFFFF" />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfo}>
            <Ionicons name="person" size={20} color="#3B82F6" />
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>
                {request.userId.name} {request.userId.surname}
              </Text>
              <TouchableOpacity onPress={() => callCustomer(request.userId.phone)}>
                <Text style={styles.customerPhone}>{request.userId.phone}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {request.distance !== undefined && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={14} color="#3B82F6" />
              <Text style={styles.distanceText}>{request.distance} km</Text>
            </View>
          )}
        </View>

        {/* Vehicle Info */}
        {request.vehicleId && (
          <View style={styles.vehicleSection}>
            <Ionicons name="car-sport" size={18} color="#64748B" />
            <Text style={styles.vehicleText}>
              {request.vehicleId.brand} {request.vehicleId.modelName} ({request.vehicleId.year})
            </Text>
            <Text style={styles.plateText}>{request.vehicleId.plateNumber}</Text>
          </View>
        )}

        {/* Towing Type */}
        {request.towingType && (
          <View style={styles.towingTypeSection}>
            <Ionicons name="construct" size={16} color="#64748B" />
            <Text style={styles.towingTypeText}>{getTowingTypeText(request.towingType)}</Text>
          </View>
        )}

        {/* Location Section */}
        <View style={styles.locationSection}>
          {/* Pickup */}
          <TouchableOpacity
            style={styles.locationItem}
            onPress={() =>
              openNavigation(
                pickupCoords.latitude ?? pickupCoords.lat,
                pickupCoords.longitude ?? pickupCoords.lng,
                'Alış Konumu'
              )
            }
          >
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={20} color="#EF4444" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Alış Konumu</Text>
              <Text style={styles.locationAddress}>{request.pickupLocation.address}</Text>
            </View>
            <Ionicons name="navigate-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>

          {/* Arrow */}
          <View style={styles.locationArrow}>
            <Ionicons name="arrow-down" size={20} color="#CBD5E1" />
          </View>

          {/* Dropoff */}
          <TouchableOpacity
            style={styles.locationItem}
            onPress={() =>
              openNavigation(
                dropoffCoords.latitude ?? dropoffCoords.lat,
                dropoffCoords.longitude ?? dropoffCoords.lng,
                'Bırakma Konumu'
              )
            }
          >
            <View style={styles.locationIcon}>
              <Ionicons name="flag" size={20} color="#10B981" />
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Bırakma Konumu</Text>
              <Text style={styles.locationAddress}>{request.dropoffLocation.address}</Text>
            </View>
            <Ionicons name="navigate-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Description */}
        {request.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Açıklama:</Text>
            <Text style={styles.descriptionText}>{request.description}</Text>
          </View>
        )}

        {/* Price & Time */}
        <View style={styles.infoSection}>
          {request.estimatedPrice && (
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={16} color="#64748B" />
              <Text style={styles.infoText}>₺{request.estimatedPrice}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.infoText}>
              {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {request.status === 'TALEP_EDILDI' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptRequest(request._id)}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Kabul Et</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleCancelJob(request._id)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reddet</Text>
              </TouchableOpacity>
            </View>
          )}

          {request.status === 'PLANLANDI' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => handleStartJob(request._id)}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>İşe Başla</Text>
            </TouchableOpacity>
          )}

          {request.status === 'SERVISTE' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleCompleteJob(request._id)}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Tamamla</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Filtreleme
  const filteredRequests = requests.filter((req) => {
    if (activeFilter === 'urgent') {
      return req.emergencyLevel === 'high' || req.emergencyLevel === 'medium';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Çekici Hizmetleri</Text>
          <Text style={styles.headerSubtitle}>
            {statusFilter === 'active' ? 'Aktif İşler' : 'Tamamlanan İşler'}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Status Filter */}
        <View style={styles.statusFilterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === 'active' && styles.filterTabActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text
              style={[styles.filterTabText, statusFilter === 'active' && styles.filterTabTextActive]}
            >
              Aktif
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, statusFilter === 'completed' && styles.filterTabActive]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text
              style={[
                styles.filterTabText,
                statusFilter === 'completed' && styles.filterTabTextActive,
              ]}
            >
              Geçmiş
            </Text>
          </TouchableOpacity>
        </View>

        {/* Urgent Filter */}
        <TouchableOpacity
          style={[styles.urgentFilter, activeFilter === 'urgent' && styles.urgentFilterActive]}
          onPress={() => setActiveFilter(activeFilter === 'urgent' ? 'all' : 'urgent')}
        >
          <Ionicons
            name="warning"
            size={16}
            color={activeFilter === 'urgent' ? '#FFFFFF' : '#EF4444'}
          />
          <Text
            style={[
              styles.urgentFilterText,
              activeFilter === 'urgent' && styles.urgentFilterTextActive,
            ]}
          >
            Sadece Acil
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="hourglass-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>Yükleniyor...</Text>
          </View>
        ) : filteredRequests.length > 0 ? (
          filteredRequests.map(renderRequestCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-sport-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {statusFilter === 'active' ? 'Aktif çekici işi yok' : 'Geçmiş iş yok'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'active'
                ? 'Yeni talepler geldiğinde burada görünecek'
                : 'Tamamlanan işler burada listelenir'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusFilterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#1E293B',
  },
  urgentFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
  },
  urgentFilterActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  urgentFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  urgentFilterTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  customerPhone: {
    fontSize: 14,
    color: '#3B82F6',
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },
  vehicleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  towingTypeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  towingTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  locationSection: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  locationArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  descriptionSection: {
    marginBottom: 16,
    backgroundColor: '#FEF9F3',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  actionSection: {
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  startButton: {
    backgroundColor: '#3B82F6',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
});
