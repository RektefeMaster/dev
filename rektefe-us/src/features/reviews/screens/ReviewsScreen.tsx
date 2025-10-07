import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

const { width } = Dimensions.get('window');

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  customer?: {
    name: string;
    surname: string;
  };
  appointment?: {
    serviceType: string;
  };
  appointmentId?: string;
  driverId?: string;
  createdAt: string;
  categories?: {
    professionalism: number;
    quality: number;
    timeliness: number;
    communication: number;
    cleanliness: number;
  };
}

interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function ReviewsScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    averageRating: 0,
    totalRatings: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [selectedFilter, setSelectedFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');

  const fetchReviewsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [reviewsRes, statsRes] = await Promise.all([
        apiService.getRecentRatings(),
        apiService.getRatingStats(),
      ]);

      if (reviewsRes.success && reviewsRes.data) {
        setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
      }

      if (statsRes.success && statsRes.data) {
        setRatingStats({
          averageRating: statsRes.data.averageRating || 0,
          totalRatings: statsRes.data.totalRatings || 0,
          ratingDistribution: statsRes.data.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
      }

    } catch (error: any) {
      Alert.alert('Hata', 'Değerlendirmeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReviewsData();
    }
  }, [isAuthenticated, fetchReviewsData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReviewsData();
    setRefreshing(false);
  };

  const getFilteredReviews = () => {
    if (selectedFilter === 'all') {
      return reviews;
    }
    return reviews.filter(review => review.rating === parseInt(selectedFilter));
  };

  const renderStars = (rating: number, size: number = 18) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? '#F59E0B' : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  const renderRatingDistribution = () => {
    const total = ratingStats.totalRatings;
    if (total === 0) return null;

    return (
      <View style={styles.distributionContainer}>
        <Text style={styles.distributionTitle}>Puan Dağılımı</Text>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingStats.ratingDistribution[rating as keyof typeof ratingStats.ratingDistribution];
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <View key={rating} style={styles.distributionRow}>
              <View style={styles.distributionRating}>
                <Text style={styles.distributionRatingText}>{rating}</Text>
                <Ionicons name="star" size={16} color="#F59E0B" />
              </View>
              <View style={styles.distributionBarContainer}>
                <View 
                  style={[
                    styles.distributionBar, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.distributionCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderFilterButtons = () => {
    const filters = [
      { key: 'all', label: 'Tümü', count: reviews.length },
      { key: '5', label: '5 Yıldız', count: ratingStats.ratingDistribution[5] },
      { key: '4', label: '4 Yıldız', count: ratingStats.ratingDistribution[4] },
      { key: '3', label: '3 Yıldız', count: ratingStats.ratingDistribution[3] },
      { key: '2', label: '2 Yıldız', count: ratingStats.ratingDistribution[2] },
      { key: '1', label: '1 Yıldız', count: ratingStats.ratingDistribution[1] },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              selectedFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === filter.key && styles.filterButtonTextActive
            ]}>
              {filter.label}
            </Text>
            <Text style={[
              styles.filterButtonCount,
              selectedFilter === filter.key && styles.filterButtonCountActive
            ]}>
              ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderReviewCard = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {item.customer ? `${item.customer.name} ${item.customer.surname}` : `Müşteri ${item.driverId?.slice(-4) || 'XXXX'}`}
          </Text>
          <Text style={styles.serviceInfo}>
            {translateServiceName(item.appointment?.serviceType) || item.appointmentId || 'Servis'}
          </Text>
        </View>
        <View style={styles.ratingContainer}>
          {renderStars(item.rating)}
          <Text style={styles.ratingNumber}>({item.rating})</Text>
        </View>
      </View>
      
      {item.comment && (
        <Text style={styles.reviewComment}>"{item.comment}"</Text>
      )}
      
      {item.categories && (
        <View style={styles.categoriesContainer}>
          <Text style={styles.categoriesTitle}>Detaylı Değerlendirme:</Text>
          <View style={styles.categoriesGrid}>
            {Object.entries(item.categories).map(([key, value]) => (
              <View key={key} style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>
                  {key === 'professionalism' ? 'Profesyonellik' :
                   key === 'quality' ? 'Kalite' :
                   key === 'timeliness' ? 'Zamanında Teslimat' :
                   key === 'communication' ? 'İletişim' :
                   key === 'cleanliness' ? 'Temizlik' : key}
                </Text>
                {renderStars(value, 14)}
              </View>
            ))}
          </View>
        </View>
      )}
      
      <Text style={styles.reviewDate}>
        {new Date(item.createdAt).toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="star" size={40} color="#F59E0B" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Değerlendirmelerim</Text>
              <Text style={styles.headerSubtitle}>Müşteri yorumları ve puanları</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Rating Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.averageRating}>{ratingStats.averageRating.toFixed(1)}</Text>
            {renderStars(Math.round(ratingStats.averageRating), 24)}
            <Text style={styles.totalReviews}>{ratingStats.totalRatings} değerlendirme</Text>
          </View>
          <View style={styles.summaryRight}>
            {renderRatingDistribution()}
          </View>
        </View>

        {/* Filter Buttons */}
        {renderFilterButtons()}

        {/* Reviews List */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'Tüm Değerlendirmeler' : `${selectedFilter} Yıldızlı Değerlendirmeler`}
          </Text>
          
          {getFilteredReviews().length > 0 ? (
            <FlatList
              data={getFilteredReviews()}
              renderItem={renderReviewCard}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Henüz değerlendirme yok</Text>
              <Text style={styles.emptySubtitle}>
                Müşterilerinizden değerlendirme almaya başladığınızda burada görünecek.
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'System',
  },
  header: {
    backgroundColor: '#1E293B',
    paddingBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    fontFamily: 'System',
  },
  scrollContainer: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    ...shadows.medium,
  },
  summaryLeft: {
    alignItems: 'center',
    marginRight: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1E293B',
    fontFamily: 'System',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'System',
  },
  summaryRight: {
    flex: 1,
  },
  distributionContainer: {
    flex: 1,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
    fontFamily: 'System',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionRating: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
  },
  distributionRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginRight: 4,
    fontFamily: 'System',
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  distributionBar: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 12,
    color: '#64748B',
    width: 30,
    textAlign: 'right',
    fontFamily: 'System',
  },
  filtersContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'System',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterButtonCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'System',
  },
  filterButtonCountActive: {
    color: '#E0E7FF',
  },
  reviewsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    fontFamily: 'System',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadows.small,
  },
  reviewHeader: {
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
    color: '#1E293B',
    fontFamily: 'System',
  },
  serviceInfo: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'System',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  ratingNumber: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'System',
  },
  reviewComment: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 12,
    fontFamily: 'System',
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    fontFamily: 'System',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 6,
    fontFamily: 'System',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'System',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    fontFamily: 'System',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
    fontFamily: 'System',
  },
  bottomSpacing: {
    height: 32,
  },
});
