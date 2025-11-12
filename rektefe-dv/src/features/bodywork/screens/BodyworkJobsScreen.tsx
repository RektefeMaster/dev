import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';
import { RootStackParamList } from '@/navigation/AppNavigator';

interface BodyworkJob {
  _id: string;
  status: string;
  damageInfo: {
    description: string;
    photos: string[];
    damageType: string;
    severity: string;
    affectedAreas: string[];
  };
  quote: {
    totalAmount: number;
    status: string;
  };
  workflow: {
    currentStage: string;
    estimatedCompletionDate: string;
  };
  mechanicId?: {
    _id: string;
    name: string;
    surname: string;
  };
  vehicleId?: {
    brand: string;
    modelName: string;
    plateNumber: string;
  };
  createdAt: string;
}

type BodyworkJobsNavigationProp = StackNavigationProp<RootStackParamList, 'BodyworkJobs'>;

export default function BodyworkJobsScreen() {
  const navigation = useNavigation<BodyworkJobsNavigationProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [jobs, setJobs] = useState<BodyworkJob[]>([]);

  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  // Ekran her açıldığında verileri yenile
  useFocusEffect(
    useCallback(() => {
      fetchJobs();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])
  );

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'active' ? undefined : 'completed';
      const response = await apiService.getBodyworkJobs(status);

      if (response.success && response.data) {
        // Aktif tab için completed hariç tüm durumları göster
        let filteredJobs = response.data;
        if (activeTab === 'active') {
          filteredJobs = response.data.filter((job: BodyworkJob) => 
            job.status !== 'completed' && job.status !== 'cancelled'
          );
        }
        setJobs(filteredJobs);
      } else {
        Alert.alert('Uyarı', response.message || 'Kaporta işleri yüklenirken bir sorun oluştu');
      }
    } catch (error: any) {
      console.error('Fetch bodywork jobs error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
      } else {
        Alert.alert('Hata', 'Kaporta işleri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'quote_preparation': 'Teklif Hazırlanıyor',
      'quote_sent': 'Teklif Gönderildi',
      'quote_accepted': 'Teklif Kabul Edildi',
      'work_started': 'İş Başladı',
      'in_progress': 'Devam Ediyor',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi',
      'pending_mechanic': 'Usta Bekleniyor',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'quote_preparation': '#FF9800',
      'quote_sent': '#2196F3',
      'quote_accepted': '#4CAF50',
      'work_started': '#4CAF50',
      'in_progress': '#4CAF50',
      'completed': '#8B5CF6',
      'cancelled': '#F44336',
      'pending_mechanic': '#FF9800',
    };
    return colorMap[status] || '#9E9E9E';
  };

  const getDamageTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'collision': 'Çarpışma',
      'scratch': 'Çizik',
      'dent': 'Göçük',
      'rust': 'Pas',
      'paint_damage': 'Boya Hasarı',
      'other': 'Diğer',
    };
    return typeMap[type] || type;
  };

  const getSeverityText = (severity: string) => {
    const severityMap: { [key: string]: string } = {
      'minor': 'Hafif',
      'moderate': 'Orta',
      'major': 'Ağır',
      'severe': 'Ciddi',
    };
    return severityMap[severity] || severity;
  };

  const renderJobCard = ({ item }: { item: BodyworkJob }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('BodyworkJobDetail', { jobId: item._id })}
      activeOpacity={0.7}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          {item.vehicleId && (
            <>
              <Text style={styles.vehicleText}>
                {item.vehicleId.brand} {item.vehicleId.modelName}
              </Text>
              <Text style={styles.plateText}>{item.vehicleId.plateNumber}</Text>
            </>
          )}
          {item.mechanicId && (
            <Text style={styles.mechanicText}>
              {item.mechanicId.name} {item.mechanicId.surname}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.damageInfo}>
          <Ionicons name="warning" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.damageText}>
            {getDamageTypeText(item.damageInfo.damageType)} - {getSeverityText(item.damageInfo.severity)}
          </Text>
        </View>

        <Text style={styles.descriptionText} numberOfLines={2}>
          {item.damageInfo.description}
        </Text>

        {item.damageInfo.photos && item.damageInfo.photos.length > 0 && (
          <View style={styles.photosPreview}>
            {item.damageInfo.photos.slice(0, 3).map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.photoPreview} />
            ))}
            {item.damageInfo.photos.length > 3 && (
              <View style={styles.morePhotos}>
                <Text style={styles.morePhotosText}>+{item.damageInfo.photos.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {item.quote.totalAmount > 0 && (
          <View style={styles.quoteInfo}>
            <Text style={styles.quoteLabel}>Teklif:</Text>
            <Text style={styles.quoteAmount}>{item.quote.totalAmount.toLocaleString('tr-TR')}₺</Text>
            {item.quote.status === 'sent' && (
              <View style={styles.pendingQuoteBadge}>
                <Text style={styles.pendingQuoteText}>Onay Bekliyor</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.jobFooter}>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          {item.workflow.estimatedCompletionDate && (
            <Text style={styles.estimatedDateText}>
              Tahmini: {new Date(item.workflow.estimatedCompletionDate).toLocaleDateString('tr-TR')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={theme.colors.text.secondary} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'active' ? 'Aktif İş Yok' : 'Tamamlanan İş Yok'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'active'
          ? 'Henüz aktif kaporta işiniz bulunmuyor.'
          : 'Henüz tamamlanan kaporta işiniz bulunmuyor.'}
      </Text>
      {activeTab === 'active' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateBodyworkJob')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Yeni İş Oluştur</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && jobs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kaporta İşleri</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateBodyworkJob')}>
          <Ionicons name="add" size={24} color={theme.colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Aktif İşler
          </Text>
          {activeTab === 'active' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Tamamlanan
          </Text>
          {activeTab === 'completed' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary.main]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 12,
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.main,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary.main,
  },
  listContainer: {
    padding: 20,
  },
  emptyListContainer: {
    flex: 1,
  },
  jobCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  plateText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  mechanicText: {
    fontSize: 14,
    color: colors.text.secondary,
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
  jobDetails: {
    gap: 12,
  },
  damageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  damageText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  photosPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  morePhotosText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  quoteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary.light + '20',
    borderRadius: 8,
  },
  quoteLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  quoteAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.main,
  },
  pendingQuoteBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FF9800',
    borderRadius: 12,
  },
  pendingQuoteText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  dateText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  estimatedDateText: {
    fontSize: 12,
    color: colors.primary.main,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

