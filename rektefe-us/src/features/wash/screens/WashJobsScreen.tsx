import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';

interface WashJob {
  _id: string;
  orderNumber: string;
  type: 'shop' | 'mobile';
  status: string;
  driverId: {
    _id: string;
    name: string;
    surname: string;
    phone: string;
  };
  vehicle: {
    brand: string;
    model: string;
    plateNumber: string;
    segment: string;
  };
  package: {
    name: string;
    basePrice: number;
    duration: number;
  };
  location: {
    address: string;
  };
  scheduling: {
    slotStart?: string;
    slotEnd?: string;
    timeWindow?: {
      start: string;
      end: string;
    };
    estimatedDuration: number;
  };
  pricing: {
    finalPrice: number;
  };
  workSteps: Array<{
    step: string;
    name: string;
    status: string;
  }>;
  createdAt: string;
}

export default function WashJobsScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<WashJob[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Ustanın hizmet kategorilerini kontrol et
  const userServiceCategories = useMemo(() => {
    return user?.serviceCategories || [];
  }, [user?.serviceCategories]);

  const hasWashServiceAccess = useMemo(() => {
    if (!userServiceCategories || userServiceCategories.length === 0) return false;
    return userServiceCategories.some(cat => 
      ['wash', 'arac-yikama', 'Yıkama Hizmeti'].includes(cat)
    );
  }, [userServiceCategories]);

  useFocusEffect(
    React.useCallback(() => {
      // Eğer usta bu kategoride hizmet vermiyorsa, ekranı gösterme ve geri yönlendir
      if (!hasWashServiceAccess && isAuthenticated && user) {
        navigation.goBack();
        return;
      }
      if (hasWashServiceAccess) {
        fetchJobs();
      }
    }, [selectedFilter, hasWashServiceAccess, isAuthenticated, user, navigation])
  );

  // Eğer usta bu kategoride hizmet vermiyorsa hiçbir şey gösterme
  if (!hasWashServiceAccess) {
    return null;
  }

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const status = selectedFilter === 'all' ? undefined : selectedFilter;
      const response = await apiService.CarWashService.getWashJobs(status);
      
      if (response.success && response.data) {
        setJobs(response.data);
      }
    } catch (error) {
      console.error('İşler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleJobPress = (job: WashJob) => {
    (navigation as any).navigate('WashJobDetail', { jobId: job._id });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRIVER_CONFIRMED: 'Yeni Talep',
      PROVIDER_ACCEPTED: 'Kabul Edildi',
      EN_ROUTE: 'Yolda',
      CHECK_IN: 'Giriş Yapıldı',
      IN_PROGRESS: 'İşlemde',
      QA_PENDING: 'Kalite Kontrolü',
      COMPLETED: 'Tamamlandı',
      PAID: 'Ödeme Alındı',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      DRIVER_CONFIRMED: '#3B82F6',
      PROVIDER_ACCEPTED: '#10B981',
      EN_ROUTE: '#F59E0B',
      CHECK_IN: '#8B5CF6',
      IN_PROGRESS: '#8B5CF6',
      QA_PENDING: '#F59E0B',
      COMPLETED: '#10B981',
      PAID: '#10B981',
    };
    return colorMap[status] || '#6B7280';
  };

  const getProgressPercentage = (job: WashJob) => {
    if (!job.workSteps || job.workSteps.length === 0) return 0;
    
    const completedSteps = job.workSteps.filter(step => step.status === 'completed').length;
    return Math.round((completedSteps / job.workSteps.length) * 100);
  };

  const filters = [
    { value: 'all', label: 'Tümü' },
    { value: 'DRIVER_CONFIRMED', label: 'Yeni' },
    { value: 'PROVIDER_ACCEPTED', label: 'Kabul Edildi' },
    { value: 'IN_PROGRESS', label: 'İşlemde' },
    { value: 'QA_PENDING', label: 'Kalite Kontrolü' },
    { value: 'COMPLETED', label: 'Tamamlandı' },
  ];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            İşler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Yıkama İşleri
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === filter.value ? colors.primary : colors.inputBackground,
                borderColor: selectedFilter === filter.value ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setSelectedFilter(filter.value)}
          >
            <Text style={[
              styles.filterChipText,
              { color: selectedFilter === filter.value ? '#FFFFFF' : colors.text }
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {jobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="water-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedFilter === 'all' ? 'Henüz iş bulunmuyor' : 'Bu filtrede iş bulunmuyor'}
            </Text>
          </View>
        ) : (
          <View style={styles.jobsContainer}>
            {jobs.map((job) => (
              <Card key={job._id} style={styles.jobCard}>
                <TouchableOpacity onPress={() => handleJobPress(job)}>
                  {/* Header */}
                  <View style={styles.jobHeader}>
                    <View style={styles.jobHeaderLeft}>
                      <View style={[styles.jobTypeIcon, { 
                        backgroundColor: job.type === 'shop' ? '#3B82F6' : '#F59E0B' 
                      }]}>
                        <Ionicons
                          name={job.type === 'shop' ? 'business' : 'car'}
                          size={16}
                          color="#FFFFFF"
                        />
                      </View>
                      <View>
                        <Text style={[styles.jobNumber, { color: colors.text }]}>
                          #{job.orderNumber}
                        </Text>
                        <Text style={[styles.jobPackage, { color: colors.textSecondary }]}>
                          {job.package.name}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: getStatusColor(job.status) + '20' 
                    }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(job.status) }]}>
                        {getStatusLabel(job.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Customer & Vehicle Info */}
                  <View style={styles.jobInfo}>
                    <View style={styles.jobInfoRow}>
                      <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.jobInfoText, { color: colors.text }]}>
                        {job.driverId.name} {job.driverId.surname}
                      </Text>
                    </View>
                    <View style={styles.jobInfoRow}>
                      <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.jobInfoText, { color: colors.text }]}>
                        {job.vehicle.brand} {job.vehicle.model} ({job.vehicle.plateNumber})
                      </Text>
                    </View>
                    {job.type === 'shop' && job.scheduling.slotStart ? (
                      <View style={styles.jobInfoRow}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.jobInfoText, { color: colors.text }]}>
                          {new Date(job.scheduling.slotStart).toLocaleString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    ) : job.scheduling.timeWindow ? (
                      <View style={styles.jobInfoRow}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.jobInfoText, { color: colors.text }]}>
                          {new Date(job.scheduling.timeWindow.start).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          -
                          {new Date(job.scheduling.timeWindow.end).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Progress */}
                  {job.status === 'IN_PROGRESS' && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                          İlerleme
                        </Text>
                        <Text style={[styles.progressPercentage, { color: colors.primary }]}>
                          %{getProgressPercentage(job)}
                        </Text>
                      </View>
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: colors.primary,
                              width: `${getProgressPercentage(job)}%`,
                            }
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {/* Footer */}
                  <View style={styles.jobFooter}>
                    <Text style={[styles.jobPrice, { color: colors.primary }]}>
                      {job.pricing.finalPrice} TL
                    </Text>
                    <View style={styles.jobActions}>
                      <Text style={[styles.viewDetailsText, { color: colors.primary }]}>
                        Detayları Gör
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  filtersContainer: {
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  filterChipText: {
    ...typography.body,
    fontWeight: '500',
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
    ...typography.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  jobsContainer: {
    padding: spacing.md,
  },
  jobCard: {
    marginBottom: spacing.md,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  jobHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  jobTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobNumber: {
    ...typography.bodyBold,
  },
  jobPackage: {
    ...typography.caption,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  jobInfo: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobInfoText: {
    ...typography.body,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.caption,
  },
  progressPercentage: {
    ...typography.caption,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  jobFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  jobPrice: {
    ...typography.h3,
  },
  jobActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewDetailsText: {
    ...typography.bodyBold,
  },
});

