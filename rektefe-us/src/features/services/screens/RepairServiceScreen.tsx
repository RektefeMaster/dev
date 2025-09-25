import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';

const { width } = Dimensions.get('window');

interface RepairJob {
  _id: string;
  customerId: {
    name: string;
    surname: string;
    phone: string;
  };
  vehicleId: {
    brand: string;
    modelName: string;
    plateNumber: string;
  };
  serviceType: string;
  description: string;
  photos: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  estimatedDuration: string;
  price: number;
  location: {
    address: string;
    city: string;
    coordinates: [number, number];
  };
  scheduledDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function RepairServiceScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'in_progress' | 'completed'>('all');

  const fetchRepairJobs = async (showLoading = true) => {
    try {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      
      // Backend'de repair jobs endpoint'i yok, şimdilik boş array döndür
      setRepairJobs([]);
    } catch (error) {
      setRepairJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        fetchRepairJobs();
      }
    }, [isAuthenticated, user])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchRepairJobs(false).finally(() => setRefreshing(false));
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'medium': return '#EAB308';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Acil';
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6B7280';
      case 'accepted': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'accepted': return 'Kabul Edildi';
      case 'in_progress': return 'İşlemde';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  };

  const filteredJobs = repairJobs.filter(job => {
    if (filter === 'all') return true;
    return job.status === filter;
  });

  const renderRepairJob = (job: RepairJob) => (
    <TouchableOpacity
      key={job._id}
      style={styles.repairJobCard}
      onPress={() => {
        // Repair job detail screen'e yönlendir
        Alert.alert('Bilgi', 'Tamir işi detay ekranı yakında eklenecek');
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.priorityContainer}>
          <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(job.priority) }]} />
          <Text style={[styles.priorityText, { color: getPriorityColor(job.priority) }]}>
            {getPriorityText(job.priority)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
            {getStatusText(job.status)}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>
          {job.customerId.name} {job.customerId.surname}
        </Text>
        <Text style={styles.customerPhone}>{job.customerId.phone}</Text>
      </View>

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleText}>
          {job.vehicleId.brand} {job.vehicleId.modelName} - {job.vehicleId.plateNumber}
        </Text>
      </View>

      <View style={styles.serviceInfo}>
        <Text style={styles.serviceType}>{job.serviceType}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {job.description}
        </Text>
      </View>

      {job.photos.length > 0 && (
        <View style={styles.photosContainer}>
          <Text style={styles.photosLabel}>Fotoğraflar:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {job.photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.jobFooter}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Fiyat:</Text>
          <Text style={styles.priceText}>₺{job.price}</Text>
        </View>
        <View style={styles.durationContainer}>
          <Text style={styles.durationLabel}>Süre:</Text>
          <Text style={styles.durationText}>{job.estimatedDuration}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="construct" size={64} color="#3B82F6" />
          <Text style={styles.loadingText}>Tamir işleri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tamir & Bakım</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        {['all', 'pending', 'accepted', 'in_progress', 'completed'].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterButton,
              filter === filterType && styles.activeFilterButton
            ]}
            onPress={() => setFilter(filterType as any)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === filterType && styles.activeFilterButtonText
            ]}>
              {filterType === 'all' ? 'Tümü' : 
               filterType === 'pending' ? 'Beklemede' :
               filterType === 'accepted' ? 'Kabul Edildi' :
               filterType === 'in_progress' ? 'İşlemde' : 'Tamamlandı'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Tamir İşi Yok</Text>
            <Text style={styles.emptyDescription}>
              {filter === 'all' 
                ? 'Henüz size gelen tamir işi bulunmuyor.'
                : 'Bu kategoride tamir işi bulunmuyor.'
              }
            </Text>
            <TouchableOpacity
              style={styles.faultReportsButton}
              onPress={() => (navigation as any).navigate('FaultReports')}
            >
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.faultReportsButtonText}>Arıza Bildirimlerini Gör</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredJobs.map(renderRepairJob)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  faultReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  faultReportsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  repairJobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerInfo: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  vehicleInfo: {
    marginBottom: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: '#374151',
  },
  serviceInfo: {
    marginBottom: 12,
  },
  serviceType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  photosContainer: {
    marginBottom: 12,
  },
  photosLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});