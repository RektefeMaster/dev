import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';

// --- Interfaces ---
interface Mechanic {
  id: string;
  _id: string;
  name: string;
  surname: string;
  avatar?: string;
  rating?: number;
  totalJobs?: number;
  experience?: number;
  specialties?: string[];
  reviews?: Review[];
  phone?: string;
  email?: string;
  address?: string;
  isOnline?: boolean;
  city?: string;
  district?: string;
  shopName?: string;
  bio?: string;
  isAvailable?: boolean;
  workingHours?: any;
  fullAddress?: string;
  formattedDistance?: string;
  specialization?: string[];
  ratingCount?: number;
  location?: {
    coordinates: [number, number];
  };
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  avatar?: string;
}

// --- UI/UX Constants ---
const { width } = Dimensions.get('window');
const HEADER_EXPANDED_HEIGHT = 380;
const HEADER_COLLAPSED_HEIGHT = Platform.OS === 'ios' ? 110 : 120;
const TAB_BAR_HEIGHT = 48;

const MechanicDetailScreen: React.FC = () => {
  // --- Hooks ---
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const routeParams = route.params as { mechanic: Mechanic } | undefined;
  const mechanic = routeParams?.mechanic;
  
  const [mechanicDetails, setMechanicDetails] = useState<Mechanic | null>(null);
  const [mechanicReviews, setMechanicReviews] = useState<Review[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');
  
  // --- Data Loading and Actions ---
  if (!mechanic) {
    console.log('❌ Mechanic data not found, navigating back');
    navigation.goBack();
    return null;
  }

  useEffect(() => {
    loadAllData();
  }, []);
  
  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadMechanicDetails(),
      loadReviews(),
      checkFavoriteStatus()
    ]);
    setLoading(false);
  };

  const loadMechanicDetails = async () => {
    try {
      setError(null);
      
      const mechanicId = mechanic.id || mechanic._id;
      const { data, error: apiError } = await withErrorHandling(
        () => apiService.getMechanicDetails(mechanicId),
        { showErrorAlert: false }
      );

      if (data && data.success) {
        setMechanicDetails(data.data);
      } else {
        setMechanicDetails(mechanic);
      }
    } catch (err) {
      console.error('Usta detayları yüklenemedi:', err);
      setError('Usta bilgileri yüklenemedi');
      setMechanicDetails(mechanic);
    }
  };

  const loadReviews = async () => {
    try {
      const mechanicId = mechanic.id || mechanic._id;
      const { data, error: apiError } = await withErrorHandling(
        () => apiService.getMechanicReviews(mechanicId),
        { showErrorAlert: false }
      );

      if (data && data.success && data.data) {
        setMechanicReviews(data.data);
      }
    } catch (err) {
      console.error('Yorumlar yüklenemedi:', err);
      setMechanicReviews([]);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const mechanicId = mechanic.id || mechanic._id;
      const { data } = await withErrorHandling(
        () => apiService.checkFavoriteMechanic(mechanicId),
        { showErrorAlert: false }
      );

      if (data && data.success) {
        setIsFavorite(data.data.isFavorite || false);
      }
    } catch (err) {
      console.error('Favori durumu kontrol edilemedi:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMechanicDetails(), loadReviews(), checkFavoriteStatus()]);
    setRefreshing(false);
  };

  // --- Helper functions for booking, messaging, calling, and favorites ---

  const handleBookAppointment = () => {
    const mechanicId = mechanic.id || mechanic._id;
    (navigation as any).navigate('BookAppointment', {
      mechanicId,
      mechanicName: mechanic.name,
      mechanicSurname: mechanic.surname,
    });
  };

  const handleMessage = () => {
    const mechanicId = mechanic.id || mechanic._id;
    (navigation as any).navigate('ChatScreen', {
      otherParticipant: {
        _id: mechanicId,
        name: mechanic.name,
        surname: mechanic.surname,
        avatar: mechanic.avatar,
        userType: 'mechanic'
      }
    });
  };

  const handleCall = () => {
    const phone = (mechanicDetails || mechanic).phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Bilgi', 'Bu ustanın telefon numarası kayıtlı değil.');
    }
  };

  const toggleFavorite = async () => {
    try {
      const mechanicId = mechanic.id || mechanic._id;
      const { data } = await withErrorHandling(() => apiService.toggleFavoriteMechanic(mechanicId), { showErrorAlert: false });
      if (data && data.success) {
        setIsFavorite(data.data.isFavorite);
      }
    } catch (err) {
      console.error('Favori durumu güncellenemedi:', err);
    }
  };

  // --- Render Functions ---

  const renderStars = (rating: number) => (
    Array.from({ length: 5 }, (_, index) => (
      <MaterialCommunityIcons
        key={index}
        name={index < Math.floor(rating) ? 'star' : 'star-outline'}
        size={14}
        color="#FFD700"
      />
    ))
  );

  const renderTabBar = () => {
    const tabs = [
      { key: 'about', title: 'Hakkında' },
      { key: 'services', title: 'Hizmetler' },
      { key: 'reviews', title: 'Yorumlar' },
    ];
    return (
      <View style={[styles.tabBarContainer, { backgroundColor: theme.colors.background.primary }]}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key as any)} style={styles.tabItem}>
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? theme.colors.primary.main : theme.colors.text.secondary }
            ]}>
              {tab.title}
            </Text>
            {activeTab === tab.key && (
              <View style={[styles.activeTabIndicator, { backgroundColor: theme.colors.primary.main }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  const renderAboutTab = (currentMechanic: Mechanic) => (
    <View style={styles.tabContentContainer}>
      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.background.card }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.primary.main + '20' }]}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary.main} />
          </View>
          <Text style={[styles.statNumber, { color: theme.colors.text.primary }]}>
            {currentMechanic.experience || '0'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Yıl Deneyim</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.colors.background.card }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.success.main + '20' }]}>
            <MaterialCommunityIcons name="wrench" size={24} color={theme.colors.success.main} />
          </View>
          <Text style={[styles.statNumber, { color: theme.colors.text.primary }]}>
            {currentMechanic.totalJobs || '0'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Tamamlanan İş</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.colors.background.card }]}>
          <View style={[styles.statIcon, { backgroundColor: theme.colors.warning.main + '20' }]}>
            <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.warning.main} />
          </View>
          <Text style={[styles.statNumber, { color: theme.colors.text.primary }]}>
            {currentMechanic.formattedDistance || '0 m'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Mesafe</Text>
        </View>
      </View>

      {currentMechanic.bio && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Hakkında</Text>
          <Text style={[styles.bioText, { color: theme.colors.text.secondary }]}>{currentMechanic.bio}</Text>
        </View>
      )}
       <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>İletişim Bilgileri</Text>
          {currentMechanic.phone && (
            <TouchableOpacity style={[styles.contactItem, { backgroundColor: theme.colors.background.card }]} onPress={handleCall}>
                <MaterialCommunityIcons name="phone" size={22} color={theme.colors.success.main} />
                <Text style={[styles.contactText, { color: theme.colors.text.primary }]}>{currentMechanic.phone}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
          {currentMechanic.email && (
             <View style={[styles.contactItem, { backgroundColor: theme.colors.background.card }]}>
                <MaterialCommunityIcons name="email" size={22} color={theme.colors.primary.main} />
                <Text style={[styles.contactText, { color: theme.colors.text.primary }]}>{currentMechanic.email}</Text>
            </View>
          )}
          {currentMechanic.fullAddress && (
             <View style={[styles.contactItem, { backgroundColor: theme.colors.background.card }]}>
                <MaterialCommunityIcons name="map-marker" size={22} color={theme.colors.warning.main} />
                <Text style={[styles.contactText, { color: theme.colors.text.primary }]}>{currentMechanic.fullAddress}</Text>
            </View>
          )}
       </View>
    </View>
  );

  const renderServicesTab = (specialties: string[]) => (
    <View style={styles.tabContentContainer}>
       <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Uzmanlık Alanları</Text>
            {specialties.length > 0 ? (
                <View style={styles.specialtiesContainer}>
                    {specialties.map((specialty, index) => (
                        <View key={index} style={[styles.specialtyChip, { backgroundColor: theme.colors.primary.main + '15' }]}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.primary.main} />
                            <Text style={[styles.specialtyText, { color: theme.colors.primary.main }]}>{specialty}</Text>
                        </View>
                    ))}
                </View>
            ) : <Text style={{color: theme.colors.text.secondary}}>Uzmanlık alanı belirtilmemiş.</Text>}
       </View>
    </View>
  );

  const renderReviewsTab = (reviews: Review[]) => (
    <View style={styles.tabContentContainer}>
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Müşteri Yorumları ({reviews.length})
            </Text>
            {reviews.length > 0 ? reviews.map((review) => (
                <View key={review.id} style={[styles.reviewCard, { backgroundColor: theme.colors.background.card }]}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewInfo}>
                      <Text style={[styles.reviewerName, { color: theme.colors.text.primary }]}>{review.userName}</Text>
                      <Text style={[styles.reviewDate, { color: theme.colors.text.secondary }]}>
                          {new Date(review.date).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    <View style={styles.reviewRating}>{renderStars(review.rating)}</View>
                  </View>
                  <Text style={[styles.reviewComment, { color: theme.colors.text.primary }]}>{review.comment}</Text>
                </View>
            )) : <Text style={{color: theme.colors.text.secondary}}>Henüz yorum yapılmamış.</Text>}
        </View>
    </View>
  );

  // --- Loading and Error States ---
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
          Usta bilgileri yükleniyor...
        </Text>
      </View>
    );
  }

  if (error && !mechanicDetails) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background.primary }]}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={theme.colors.error.main} />
        <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>{error}</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.primary.main }]} onPress={loadAllData}>
             <Text style={styles.primaryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentMechanic = mechanicDetails || mechanic;
  const specialties = currentMechanic.specialties || currentMechanic.specialization || [];

  // --- Animation Interpolations ---
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_EXPANDED_HEIGHT - HEADER_COLLAPSED_HEIGHT],
    outputRange: [HEADER_EXPANDED_HEIGHT, HEADER_COLLAPSED_HEIGHT],
    extrapolate: 'clamp'
  });

  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, (HEADER_EXPANDED_HEIGHT - HEADER_COLLAPSED_HEIGHT) / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const collapsedHeaderOpacity = scrollY.interpolate({
    inputRange: [(HEADER_EXPANDED_HEIGHT - HEADER_COLLAPSED_HEIGHT) / 2, HEADER_EXPANDED_HEIGHT - HEADER_COLLAPSED_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  

  // --- Main Render ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary.main} />
        {/* --- Animated Header --- */}
        <Animated.View style={[styles.header, { height: headerHeight }]}>
            <LinearGradient 
              colors={[theme.colors.primary.main, theme.colors.primary.dark]} 
              style={StyleSheet.absoluteFill} 
            />
            
            {/* Expanded Header Content */}
            <Animated.View style={[styles.expandedHeaderContent, { opacity: headerContentOpacity }]}>
                <Text style={styles.mechanicName}>{currentMechanic.name} {currentMechanic.surname}</Text>
                {currentMechanic.shopName && (
                  <Text style={styles.mechanicShop}>{currentMechanic.shopName}</Text>
                )}
                <View style={styles.ratingContainer}>
                    {renderStars(currentMechanic.rating || 0)}
                    <Text style={styles.ratingText}>
                      {currentMechanic.rating?.toFixed(1) || '0.0'} ({currentMechanic.ratingCount || mechanicReviews.length})
                    </Text>
                </View>
            </Animated.View>
            
            {/* Collapsed Header Content */}
            <Animated.View style={[styles.collapsedHeaderContent, { opacity: collapsedHeaderOpacity }]}>
                <Text style={styles.collapsedMechanicName}>{currentMechanic.name} {currentMechanic.surname}</Text>
            </Animated.View>

            {/* Shared Header Buttons */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton} onPress={toggleFavorite}>
                    <MaterialCommunityIcons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#FF3B30' : '#fff'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton}>
                    <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </Animated.View>

        
        {/* Content ScrollView */}
        <ScrollView
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary.main} />}
        >
            <View style={{ paddingTop: HEADER_EXPANDED_HEIGHT }}>
                {/* --- Sticky Tab Bar --- */}
                {renderTabBar()}
                
                {/* --- Tab Content --- */}
                {activeTab === 'about' && renderAboutTab(currentMechanic)}
                {activeTab === 'services' && renderServicesTab(specialties)}
                {activeTab === 'reviews' && renderReviewsTab(mechanicReviews)}
            </View>
        </ScrollView>
        
        {/* --- Floating Action Buttons --- */}
        <View style={[styles.footer, {borderTopColor: theme.colors.border?.primary || '#eee'}]}>
            <TouchableOpacity 
              style={[styles.secondaryButton, {borderColor: theme.colors.primary.main}]} 
              onPress={handleMessage}
            >
                <MaterialCommunityIcons name="message-text" size={20} color={theme.colors.primary.main} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.primary.main }]}>Mesaj</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary.main }]} 
              onPress={handleBookAppointment}
            >
                <MaterialCommunityIcons name="calendar-plus" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Randevu Al</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  errorText: { 
    fontSize: 16, 
    textAlign: 'center', 
    marginTop: 16,
    marginBottom: 24,
  },
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60
  },
  expandedHeaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  collapsedHeaderContent: {
    position: 'absolute',
    bottom: 12,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 45,
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 45,
    right: 15,
    flexDirection: 'row',
    gap: 10
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Mechanic Info
  mechanicName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  collapsedMechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  mechanicShop: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Tab Bar
  tabBarContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '60%',
    borderRadius: 2,
  },
  // Tab Content
  tabContentContainer: {
    padding: 20
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Services/Specialties
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Reviews
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row'
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Contact
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  contactText: {
    fontSize: 15,
    flex: 1
  },
  // Footer Actions
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MechanicDetailScreen;