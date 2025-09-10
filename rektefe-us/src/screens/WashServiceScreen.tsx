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

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components';
import { typography, spacing, borderRadius, shadows, dimensions } from '../theme/theme';
import apiService from '../services/api';

interface WashJob {
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
  washType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'interior' | 'exterior';
  washLevel: 'light' | 'medium' | 'heavy' | 'extreme';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: string;
  estimatedTime?: string;
  estimatedDuration?: number; // dakika
  price?: number;
  notes?: string;
  services?: Array<{
    name: string;
    price: number;
    duration: number;
    completed: boolean;
  }>;
  customerLocation?: { lat: number; lng: number };
  mechanicLocation?: { lat: number; lng: number };
  photos?: string[];
  specialRequests?: string[];
}

export default function WashServiceScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<WashJob[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Helper functions
  const getWashTypeText = (type: string) => {
    const types = {
      basic: 'Temel Yıkama',
      premium: 'Premium Yıkama',
      deluxe: 'Deluxe Yıkama',
      detailing: 'Detay Temizlik',
      interior: 'İç Temizlik',
      exterior: 'Dış Temizlik'
    };
    return types[type as keyof typeof types] || type;
  };

  const getWashTypeColor = (type: string) => {
    const colors = {
      basic: '#4CAF50',
      premium: '#2196F3',
      deluxe: '#FF9800',
      detailing: '#9C27B0',
      interior: '#607D8B',
      exterior: '#795548'
    };
    return colors[type as keyof typeof colors] || '#666';
  };

  const getWashLevelText = (level: string) => {
    const levels = {
      light: 'Hafif',
      medium: 'Orta',
      heavy: 'Ağır',
      extreme: 'Aşırı Kirli'
    };
    return levels[level as keyof typeof levels] || level;
  };

  const getWashLevelColor = (level: string) => {
    const colors = {
      light: '#4CAF50',
      medium: '#FF9800',
      heavy: '#F44336',
      extreme: '#9C27B0'
    };
    return colors[level as keyof typeof colors] || '#666';
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

  useEffect(() => {
    fetchWashJobs();
  }, []);

  const fetchWashJobs = async () => {
    try {
      setLoading(true);
      // API çağrısı - şimdilik mock data
      const mockJobs: WashJob[] = [
        {
          id: '1',
          customerName: 'Zeynep Arslan',
          customerPhone: '+90 555 777 8899',
          vehicleInfo: '2021 BMW 3 Series - 34 JKL 012',
          vehicleType: 'car',
          vehicleYear: 2021,
          vehicleBrand: 'BMW',
          vehicleModel: '3 Series',
          vehiclePlate: '34 JKL 012',
          location: {
            address: 'Kadıköy, İstanbul',
            coordinates: { lat: 40.9923, lng: 29.0234 }
          },
          washType: 'detailing',
          washLevel: 'heavy',
          status: 'pending',
          requestedAt: '2024-01-15T16:00:00Z',
          estimatedTime: '1 saat',
          estimatedDuration: 60,
          price: 150,
          notes: 'Araç çok kirli, detaylı temizlik gerekli',
          services: [
            { name: 'Dış Yıkama', price: 50, duration: 25, completed: false },
            { name: 'İç Temizlik', price: 40, duration: 20, completed: false },
            { name: 'Cila', price: 60, duration: 15, completed: false }
          ],
          specialRequests: ['Özel şampuan kullanın', 'Koltukları detaylı temizleyin']
        },
        {
          id: '2',
          customerName: 'Can Yıldız',
          customerPhone: '+90 555 333 4455',
          vehicleInfo: '2019 Mercedes C-Class - 06 MNO 345',
          vehicleType: 'car',
          vehicleYear: 2019,
          vehicleBrand: 'Mercedes',
          vehicleModel: 'C-Class',
          vehiclePlate: '06 MNO 345',
          location: {
            address: 'Beşiktaş, İstanbul',
            coordinates: { lat: 41.0428, lng: 29.0077 }
          },
          washType: 'basic',
          washLevel: 'light',
          status: 'in_progress',
          requestedAt: '2024-01-15T13:30:00Z',
          estimatedTime: '30 dakika',
          estimatedDuration: 30,
          price: 80,
          notes: 'Sadece dış yıkama',
          services: [
            { name: 'Dış Yıkama', price: 50, duration: 20, completed: true },
            { name: 'Kurulama', price: 30, duration: 10, completed: false }
          ]
        }
      ];
      setJobs(mockJobs);
    } catch (error) {
      console.error('Yıkama işleri yüklenemedi:', error);
      Alert.alert('Hata', 'Yıkama işleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWashJobs();
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
      console.log(`${action} action for job ${jobId}`);
      
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

  const renderJobCard = (job: WashJob) => (
    <Card key={job.id} variant="elevated" style={styles.jobCard}>
      {/* Yıkama Türü ve Seviye Badge'leri */}
      <View style={styles.washTypeContainer}>
        <View style={[styles.washTypeBadge, { backgroundColor: getWashTypeColor(job.washType) }]}>
          <Ionicons name="water" size={14} color="#FFFFFF" />
          <Text style={styles.washTypeText}>{getWashTypeText(job.washType)}</Text>
        </View>
        <View style={[styles.washLevelBadge, { backgroundColor: getWashLevelColor(job.washLevel) }]}>
          <Text style={styles.washLevelText}>{getWashLevelText(job.washLevel)}</Text>
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

      {/* Konum Bilgisi */}
      <View style={styles.locationInfo}>
        <TouchableOpacity 
          style={styles.locationRow}
          onPress={() => openMaps(job.location)}
        >
          <Ionicons name="location" size={16} color={colors.primary.main} />
          <Text style={styles.locationText}>{job.location.address}</Text>
          <Ionicons name="open-outline" size={14} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Hizmetler Listesi */}
      {job.services && job.services.length > 0 && (
        <View style={styles.servicesContainer}>
          <Text style={styles.servicesTitle}>Hizmetler:</Text>
          {job.services.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDuration}>{service.duration} dk</Text>
              </View>
              <View style={styles.servicePriceContainer}>
                <Text style={styles.servicePrice}>{service.price} TL</Text>
                {service.completed && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.success.main} />
                )}
              </View>
            </View>
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
              title="İptal"
              onPress={() => handleJobAction(job.id, 'cancel')}
              variant="secondary"
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
          <Ionicons name="call" size={16} color={colors.primary.main} />
          <Text style={styles.quickActionText}>Ara</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => openMaps(job.location)}
        >
          <Ionicons name="map" size={16} color={colors.primary.main} />
          <Text style={styles.quickActionText}>Harita</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const activeJobs = jobs.filter(job => ['pending', 'accepted', 'in_progress'].includes(job.status));
  const historyJobs = jobs.filter(job => ['completed', 'cancelled'].includes(job.status));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Yıkama işleri yükleniyor...</Text>
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
            <Text style={styles.headerTitle}>Yıkama Hizmetleri</Text>
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
                <Ionicons name="water-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>Aktif yıkama işi yok</Text>
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
    borderBottomColor: colors.border.light,
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
    backgroundColor: colors.primary.main,
  },
  tabText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  jobsContainer: {
    paddingHorizontal: dimensions.screenPadding,
    paddingBottom: spacing.xl,
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
  washTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  washTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  washTypeText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: spacing.xs,
  },
  washLevelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  washLevelText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
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
  locationInfo: {
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary.main,
    marginLeft: spacing.xs,
    flex: 1,
  },
  servicesContainer: {
    marginBottom: spacing.md,
  },
  servicesTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
  },
  serviceDuration: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
  },
  servicePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
    marginRight: spacing.xs,
  },
  specialRequestsContainer: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
  },
  specialRequestsTitle: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
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
    borderTopColor: colors.border.light,
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
    borderTopColor: colors.border.light,
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
    color: colors.primary.main,
    marginLeft: spacing.xs,
  },
});