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
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated, logout, updateUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileStats, setProfileStats] = useState({
    averageRating: 0.0,
    totalReviews: 0,
    completedJobs: 0,
    totalServices: 0,
    experienceYears: 0,
    totalEarnings: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showCapabilitiesModal, setShowCapabilitiesModal] = useState(false);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [statsRes, reviewsRes, appointmentsRes, walletRes] = await Promise.all([
        apiService.getRatingStats(),
        apiService.getRecentRatings(),
        apiService.getMechanicAppointments('completed'),
        apiService.getMechanicWallet(),
      ]);

      if (statsRes.success && statsRes.data) {
        setProfileStats(prev => ({
          ...prev,
          averageRating: statsRes.data.averageRating || 0.0,
          totalReviews: statsRes.data.totalRatings || 0,
          ratingDistribution: statsRes.data.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        }));
      }

      if (reviewsRes.success && reviewsRes.data) {
        setRecentReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
      }

      if (appointmentsRes.success && appointmentsRes.data) {
        const appointmentsData = appointmentsRes.data as any;
        const completedJobs = appointmentsData?.appointments?.length || appointmentsData?.length || 0;
        setProfileStats(prev => ({
          ...prev,
          completedJobs: completedJobs,
          totalServices: completedJobs
        }));
      }

      if (walletRes.success && walletRes.data) {
        setProfileStats(prev => ({
          ...prev,
          totalEarnings: walletRes.data.totalEarnings || 0
        }));
      }

      if (user?.experience) {
        setProfileStats(prev => ({
          ...prev,
          experienceYears: user.experience
        }));
      }

    } catch (error: any) {
      Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfileData();
      // Load user capabilities
      setSelectedCapabilities(user.serviceCategories || []);
    }
  }, [isAuthenticated, user, fetchProfileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', onPress: logout }
      ]
    );
  };

  const getSatisfactionText = (rating: number) => {
    if (rating === 0) return 'Henüz değerlendirilmedi';
    if (rating >= 4.5) return 'Mükemmel';
    if (rating >= 4.0) return 'Çok İyi';
    if (rating >= 3.5) return 'İyi';
    if (rating >= 3.0) return 'Orta';
    if (rating >= 2.0) return 'Kötü';
    return 'Çok Kötü';
  };

  // Capabilities data
  const capabilities = [
    {
      id: 'towing',
      title: 'Çekici Hizmeti',
      icon: 'car',
      color: '#EF4444',
      description: 'Acil kurtarma hizmetleri'
    },
    {
      id: 'repair',
      title: 'Tamir & Bakım',
      icon: 'construct',
      color: '#3B82F6',
      description: 'Arıza tespit ve onarım'
    },
    {
      id: 'wash',
      title: 'Yıkama Hizmeti',
      icon: 'water',
      color: '#10B981',
      description: 'Araç temizlik hizmetleri'
    },
    {
      id: 'tire',
      title: 'Lastik & Parça',
      icon: 'car',
      color: '#F59E0B',
      description: 'Lastik ve yedek parça'
    }
  ];

  const handleCapabilityToggle = (capabilityId: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(capabilityId) 
        ? prev.filter(id => id !== capabilityId)
        : [...prev, capabilityId]
    );
  };

  const handleSaveCapabilities = async () => {
    try {
      setLoading(true);

      // API call to update capabilities
      const response = await apiService.updateUserCapabilities(selectedCapabilities);

      if (response.success) {
        // AuthContext'teki user'ı güncelle
        updateUser({ serviceCategories: selectedCapabilities });

        Alert.alert(
          'Başarılı',
          'Hizmet alanlarınız başarıyla güncellendi.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setShowCapabilitiesModal(false);
              }
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Yetenekler güncellenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Yetenekler güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const renderRatingBar = (stars: number, count: number) => {
    const percentage = profileStats.totalReviews > 0 ? (count / profileStats.totalReviews) * 100 : 0;
    
    return (
      <View style={styles.ratingBarRow}>
        <Text style={styles.ratingStars}>{stars}</Text>
        <Ionicons name="star" size={16} color="#F59E0B" />
        <View style={styles.ratingBarContainer}>
          <View style={[styles.ratingBar, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingCount}>{count}</Text>
      </View>
    );
  };

  const renderReviewCard = (review: any) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.avatarText}>
            {review.customer?.name?.charAt(0) || 'M'}
          </Text>
        </View>
        
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewCustomerName}>
            {review.customer?.name ? `${review.customer.name} ${review.customer.surname || ''}` : 'Müşteri'}
          </Text>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        
        <View style={styles.reviewRating}>
          <Text style={styles.reviewRatingText}>{review.rating}/5</Text>
          <View style={styles.reviewStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= review.rating ? "star" : "star-outline"}
                size={16}
                color="#F59E0B"
              />
            ))}
          </View>
        </View>
      </View>
      
      {review.comment && (
        <View style={styles.reviewContent}>
          <View style={styles.reviewLabel}>
            <Ionicons name="chatbubble" size={16} color="#3B82F6" />
            <Text style={styles.reviewLabelText}>Müşteri Yorumu:</Text>
          </View>
          <Text style={styles.reviewText}>{review.comment}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="person" size={40} color={colors.primary} />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Profil</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0) || 'M'}
                </Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.name} {user?.surname}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileLocation}>
                {user?.city || 'Konum belirtilmemiş'}
              </Text>
              <View style={styles.roleContainer}>
                <Ionicons name="construct" size={16} color={colors.primary} />
                <Text style={styles.roleText}>Usta</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="star" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{profileStats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Ortalama Puan</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{profileStats.completedJobs}</Text>
            <Text style={styles.statLabel}>Tamamlanan İş</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="construct" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{profileStats.totalServices}</Text>
            <Text style={styles.statLabel}>Toplam Hizmet</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="time" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{profileStats.experienceYears}</Text>
            <Text style={styles.statLabel}>Yıl Deneyim</Text>
          </View>
        </View>

        {/* Rating Summary Card */}
        <View style={styles.ratingCard}>
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingTitle}>Puan Detayları</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>
                {profileStats.totalReviews} değerlendirme
              </Text>
            </View>
          </View>
          
          <View style={styles.ratingSummary}>
            <View style={styles.ratingMain}>
              <Text style={styles.averageRating}>{profileStats.averageRating.toFixed(1)}</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= profileStats.averageRating ? "star" : "star-outline"}
                    size={20}
                    color="#F59E0B"
                  />
                ))}
              </View>
              <Text style={styles.satisfactionText}>
                {getSatisfactionText(profileStats.averageRating)}
              </Text>
              <Text style={styles.satisfactionPercentage}>
                {profileStats.averageRating === 0 ? 'Değerlendirme bekleniyor' : `${Math.round((profileStats.averageRating / 5) * 100)}% memnuniyet`}
              </Text>
            </View>
          </View>

          {/* Rating Distribution */}
          {profileStats.totalReviews > 0 && (
            <View style={styles.distributionSection}>
              <Text style={styles.distributionTitle}>Puan Dağılımı</Text>
              <View style={styles.distributionBars}>
                {renderRatingBar(5, profileStats.ratingDistribution[5])}
                {renderRatingBar(4, profileStats.ratingDistribution[4])}
                {renderRatingBar(3, profileStats.ratingDistribution[3])}
                {renderRatingBar(2, profileStats.ratingDistribution[2])}
                {renderRatingBar(1, profileStats.ratingDistribution[1])}
              </View>
            </View>
          )}
        </View>

        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Ionicons name="wallet" size={24} color="#10B981" />
            <Text style={styles.earningsTitle}>Kazanç Özeti</Text>
          </View>
          
          <View style={styles.earningsContent}>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Toplam Kazanç</Text>
              <Text style={styles.earningsValue}>
                ₺{profileStats.totalEarnings.toLocaleString('tr-TR')}
              </Text>
            </View>
            
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Ortalama İş Başına</Text>
              <Text style={styles.earningsValue}>
                ₺{profileStats.completedJobs > 0 
                  ? (profileStats.totalEarnings / profileStats.completedJobs).toFixed(0)
                  : '0'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Reviews */}
        {recentReviews.length > 0 && (
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.reviewsTitle}>Değerlendirmeler</Text>
              <TouchableOpacity onPress={() => setShowAllReviews(!showAllReviews)}>
                <Text style={styles.viewAllText}>
                  {showAllReviews ? 'Daha Az Göster' : 'Tümünü Gör'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {(showAllReviews ? recentReviews : recentReviews.slice(0, 3)).map((review, index) => (
              <View key={review._id || index}>
                {renderReviewCard(review)}
              </View>
            ))}
          </View>
        )}

        {/* Empty State for Reviews */}
        {recentReviews.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyStateTitle}>Henüz değerlendirme yok</Text>
            <Text style={styles.emptyStateText}>
              Müşterilerden gelen değerlendirmeler burada görünecek
            </Text>
          </View>
        )}

        {/* Profile Actions */}
        <View style={styles.profileActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditProfile' as never)}
          >
            <Ionicons name="person" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Profili Düzenle</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowCapabilitiesModal(true)}
          >
            <Ionicons name="construct" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Hizmet Alanlarım</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('WorkingHours' as never)}
          >
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Çalışma Saatleri</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('Settings');
            }}
          >
            <Ionicons name="settings" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Hesap Ayarları</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Capabilities Modal */}
      <Modal
        visible={showCapabilitiesModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCapabilitiesModal(false)}>
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Hizmet Alanlarım</Text>
            <TouchableOpacity onPress={handleSaveCapabilities}>
              <Text style={styles.modalSaveText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Hangi hizmet alanlarında çalışmak istiyorsunuz? Seçtiğiniz alanlara göre menünüz güncellenecek.
            </Text>
            
            <View style={styles.capabilitiesList}>
              {capabilities.map((capability) => (
                <TouchableOpacity
                  key={capability.id}
                  style={[
                    styles.capabilityCard,
                    {
                      backgroundColor: selectedCapabilities.includes(capability.id)
                        ? capability.color + '20'
                        : colors.background.secondary,
                      borderColor: selectedCapabilities.includes(capability.id)
                        ? capability.color
                        : colors.border.secondary,
                    }
                  ]}
                  onPress={() => handleCapabilityToggle(capability.id)}
                >
                  <View style={styles.capabilityContent}>
                    <View style={[
                      styles.capabilityIcon,
                      { backgroundColor: capability.color }
                    ]}>
                      <Ionicons 
                        name={capability.icon as any} 
                        size={24} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <View style={styles.capabilityText}>
                      <Text style={[
                        styles.capabilityTitle,
                        { color: colors.text.primary.main }
                      ]}>
                        {capability.title}
                      </Text>
                      <Text style={[
                        styles.capabilityDescription,
                        { color: colors.text.secondary }
                      ]}>
                        {capability.description}
                      </Text>
                    </View>
                    {selectedCapabilities.includes(capability.id) && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={24} 
                        color={capability.color} 
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingTop: 0,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
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
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  
  // Profile Card
  profileCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  profileLocation: {
    fontSize: typography.body3.fontSize,
    color: colors.text.tertiary,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  roleText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    width: (width - spacing.lg * 3) / 2,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.ultraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Rating Card
  ratingCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  ratingTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
  },
  ratingBadge: {
    backgroundColor: colors.primary.ultraLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  ratingBadgeText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },
  ratingSummary: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ratingMain: {
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  satisfactionText: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  satisfactionPercentage: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
  },
  distributionSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border.secondary,
    paddingTop: spacing.lg,
  },
  distributionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  distributionBars: {
    gap: spacing.sm,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingStars: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    width: 20,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.secondary,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  ratingCount: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    width: 30,
    textAlign: 'right',
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  earningsTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
    marginLeft: spacing.sm,
  },
  earningsContent: {
    gap: spacing.md,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
  },
  earningsValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
  },

  // Reviews Section
  reviewsSection: {
    marginBottom: spacing.lg,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  reviewsTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
  },
  viewAllText: {
    fontSize: typography.body3.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },

  // Review Card
  reviewCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewCustomerName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  reviewDate: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  reviewRating: {
    alignItems: 'flex-end',
  },
  reviewRatingText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
    marginBottom: spacing.xs,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border.secondary,
    paddingTop: spacing.md,
  },
  reviewLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  reviewLabelText: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
  },
  reviewText: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
    backgroundColor: colors.background.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
    marginTop: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  profileActions: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  actionButtonText: {
    flex: 1,
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary.main,
    marginLeft: spacing.sm,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text.primary.main,
  },
  modalCancelText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
  },
  modalSaveText: {
    fontSize: typography.body1.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  modalDescription: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
    lineHeight: 20,
  },
  capabilitiesList: {
    gap: spacing.md,
  },
  capabilityCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.md,
  },
  capabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capabilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  capabilityText: {
    flex: 1,
  },
  capabilityTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  capabilityDescription: {
    fontSize: typography.body3.fontSize,
    fontWeight: '500',
  },
});
