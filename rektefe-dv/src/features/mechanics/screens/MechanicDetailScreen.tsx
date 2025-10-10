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
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

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
  serviceCategories?: string[];
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
  totalServices?: number;
  completedJobs?: number;
}

interface Review {
  id: string;
  userName: string;
  comment: string;
  date: string;
  avatar?: string;
  rating?: number;
  _id?: string;
  userId?: {
    name: string;
    surname: string;
  };
  createdAt?: string;
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
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<string>('0 m');
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
    getUserLocation();
  }, []);

  // Mesafe hesaplama fonksiyonu
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    console.log('🧮 Mesafe hesaplama:', { lat1, lon1, lat2, lon2 });
    
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    console.log('🧮 Hesaplama detayları:', { dLat, dLon, a, c, distance });
    return distance;
  };

  // Mesafeyi formatla
  const formatDistance = (distanceKm: number): string => {
    console.log('📏 Formatlanacak mesafe:', distanceKm);
    
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      console.log('📏 Metre cinsinden:', meters);
      return `${meters} m`;
    } else if (distanceKm < 10) {
      const km = distanceKm.toFixed(1);
      console.log('📏 Ondalıklı km:', km);
      return `${km} km`;
    } else {
      const km = Math.round(distanceKm);
      console.log('📏 Tam km:', km);
      return `${km} km`;
    }
  };

  // Adres bilgisini formatla
  const formatAddress = (location: any): string => {
    if (!location) return 'Konum yok';
    
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.district) parts.push(location.district);
    
    if (parts.length > 0) {
      return parts.join(', ');
    }
    
    return 'Konum yok';
  };

  // Kullanıcı konumunu al
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ Konum izni verilmedi');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      console.log('📍 Kullanıcı konumu alındı:', userLoc);
      setUserLocation(userLoc);
    } catch (error) {
      console.log('❌ Konum alınamadı:', error);
    }
  };
  
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
      console.log('🔍 Mechanic ID:', mechanicId);
      
      const { data, error: apiError } = await withErrorHandling(
        () => apiService.getMechanicDetails(mechanicId),
        { showErrorAlert: false }
      );

      console.log('🔍 API Response:', { data, error: apiError });

      if (data && data.success) {
        console.log('🔍 Backend\'den gelen veri:', data.data);
        setMechanicDetails(data.data);
        
        // Mesafe hesapla - İstanbul merkez koordinatları kullanarak test
        console.log('🔍 Konum verisi:', data.data.location);
        if (data.data.location?.coordinates && Array.isArray(data.data.location.coordinates)) {
          const mechanicCoords = data.data.location.coordinates;
          console.log('📍 Usta koordinatları:', mechanicCoords);
          
          // Koordinatların geçerli olup olmadığını kontrol et
          if (mechanicCoords.length >= 2 && typeof mechanicCoords[0] === 'number' && typeof mechanicCoords[1] === 'number') {
            // İstanbul merkez koordinatları (test için)
            const istanbulCenter = { latitude: 41.0082, longitude: 28.9784 };
            console.log('🏙️ İstanbul merkez:', istanbulCenter);
            
            const distance = calculateDistance(
              istanbulCenter.latitude,
              istanbulCenter.longitude,
              mechanicCoords[0],  // latitude
              mechanicCoords[1]   // longitude
            );
            console.log('📏 Hesaplanan mesafe (km):', distance);
            
            const formattedDist = formatDistance(distance);
            console.log('📍 Formatlanmış mesafe:', formattedDist);
            setCalculatedDistance(formattedDist);
          } else {
            console.log('⚠️ Geçersiz koordinat formatı:', mechanicCoords);
            // Adres bilgisini kullan
            const address = formatAddress(data.data.location);
            setCalculatedDistance(address);
          }
        } else {
          console.log('⚠️ Usta konum bilgisi eksik:', data.data.location);
          // Adres bilgisini kullan
          const address = formatAddress(data.data.location);
          setCalculatedDistance(address);
        }
      } else {
        console.log('❌ Backend\'den veri alınamadı:', data);
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
        setMechanicReviews(data.data.reviews || []);
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

  const handleCall = () => {
    if (mechanicDetails?.phone) {
      Linking.openURL(`tel:${mechanicDetails.phone}`);
    }
  };

  const handleMessage = () => {
    if (!mechanicDetails) return;
    
    navigation.navigate('ChatScreen' as never, {
      otherParticipant: {
        _id: mechanicDetails._id || mechanicDetails.id,
        name: mechanicDetails.name || '',
        surname: mechanicDetails.surname || '',
        avatar: mechanicDetails.avatar,
        userType: 'mechanic'
      }
    } as never);
  };

  const handleAppointment = () => {
    // Randevu alma işlemi
    console.log('Randevu alınacak:', mechanicDetails?.name);
  };

  const handleFavorite = async () => {
    try {
      const mechanicId = mechanic.id || mechanic._id;
      const { data } = await withErrorHandling(
        () => apiService.toggleFavoriteMechanic(mechanicId),
        { showErrorAlert: false }
      );
      
      if (data && data.success) {
        setIsFavorite(data.data.isFavorite || !isFavorite);
      }
    } catch (err) {
      console.error('Favori durumu değiştirilemedi:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <MaterialCommunityIcons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color="#FFD700"
      />
    ));
  };

  const renderAboutTab = (mechanicData: Mechanic) => {
    console.log('📊 Stats için kullanılan veri:', {
      experience: mechanicData.experience,
      totalJobs: mechanicData.totalJobs,
      totalServices: mechanicData.totalServices,
      completedJobs: mechanicData.completedJobs,
      calculatedDistance,
      formattedDistance: mechanicData.formattedDistance
    });

    return (
      <View style={styles.tabContentContainer}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.background.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.primary.main + '20' }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary.main} />
            </View>
            <Text 
              style={[
                styles.statNumber, 
                { 
                  color: theme.colors.text.primary,
                  fontSize: (() => {
                    const text = (mechanicData.experience || '0').toString();
                    if (text.length > 4) return 14;
                    if (text.length > 3) return 16;
                    if (text.length > 2) return 18;
                    return 20;
                  })()
                }
              ]}
            >
              {mechanicData.experience || '0'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Yıl Deneyim</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.colors.background.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.success.main + '20' }]}>
              <MaterialCommunityIcons name="wrench" size={24} color={theme.colors.success.main} />
            </View>
            <Text 
              style={[
                styles.statNumber, 
                { 
                  color: theme.colors.text.primary,
                  fontSize: (() => {
                    const text = (mechanicData.totalJobs || mechanicData.totalServices || mechanicData.completedJobs || '0').toString();
                    if (text.length > 5) return 12;
                    if (text.length > 4) return 14;
                    if (text.length > 3) return 16;
                    if (text.length > 2) return 18;
                    return 20;
                  })()
                }
              ]}
            >
              {mechanicData.totalJobs || mechanicData.totalServices || mechanicData.completedJobs || '0'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Tamamlanan İş</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.colors.background.card }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.warning.main + '20' }]}>
              <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.warning.main} />
            </View>
            <Text 
              style={[
                styles.statNumber, 
                { 
                  color: theme.colors.text.primary,
                  fontSize: (() => {
                    const text = calculatedDistance || mechanicData.formattedDistance || '0 m';
                    if (text.length > 20) return 10;
                    if (text.length > 15) return 12;
                    if (text.length > 10) return 14;
                    if (text.length > 5) return 16;
                    return 18;
                  })()
                }
              ]}
            >
              {calculatedDistance || mechanicData.formattedDistance || '0 m'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Adres</Text>
          </View>
        </View>

        {mechanicData.bio && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Hakkında</Text>
            <Text style={[styles.bioText, { color: theme.colors.text.secondary }]}>{mechanicData.bio}</Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>İletişim Bilgileri</Text>
          {mechanicData.phone && (
            <TouchableOpacity style={[styles.contactItem, { backgroundColor: theme.colors.background.card }]} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={22} color={theme.colors.success.main} />
              <Text style={[styles.contactText, { color: theme.colors.text.primary }]}>{mechanicData.phone}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
          {mechanicData.email && (
            <View style={[styles.contactItem, { backgroundColor: theme.colors.background.card }]}>
              <MaterialCommunityIcons name="email" size={22} color={theme.colors.primary.main} />
              <Text style={[styles.contactText, { color: theme.colors.text.primary }]}>{mechanicData.email}</Text>
            </View>
          )}
          {mechanicData.fullAddress && (
            <View style={[styles.contactItem, { backgroundColor: theme.colors.background.card }]}>
              <MaterialCommunityIcons name="map-marker" size={22} color={theme.colors.warning.main} />
              <Text style={[styles.contactText, { color: theme.colors.text.primary }]}>{mechanicData.fullAddress}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderServicesTab = (specialties: string[]) => {
    console.log('🔧 Hizmetler verisi:', specialties);
    console.log('🔧 Hizmetler uzunluğu:', specialties.length);
    
    // Hizmetleri çevir ve genişlet
    const translatedServices = specialties.map(service => translateServiceName(service));
    
    // Genel hizmetleri detaylı alt hizmetlere genişlet
    const expandedServices: string[] = [];
    translatedServices.forEach(service => {
      if (service === 'Genel Bakım') {
        expandedServices.push(
          'Motor Yağı Değişimi',
          'Filtre Değişimi',
          'Fren Kontrolü',
          'Lastik Kontrolü',
          'Elektrik Kontrolü',
          'Araç Muayenesi',
          'Periyodik Bakım'
        );
      } else if (service === 'Genel Onarım') {
        expandedServices.push(
          'Motor Onarımı',
          'Fren Sistemi Onarımı',
          'Süspansiyon Onarımı',
          'Direksiyon Onarımı',
          'Şanzıman Onarımı',
          'Elektrik Arıza Tespiti',
          'Klima Onarımı'
        );
      } else {
        expandedServices.push(service);
      }
    });
    
    const uniqueServices = [...new Set(expandedServices)]; // Tekrarları kaldır
    
    // Hizmetleri daha detaylı kategorilere ayır
    const categorizedServices = {
      'Bakım Hizmetleri': uniqueServices.filter(service => 
        service.includes('Bakım') || service.includes('Kontrolü') || service.includes('Muayene') ||
        service.includes('Yağı') || service.includes('Filtre') || service.includes('Periyodik')
      ),
      'Onarım Hizmetleri': uniqueServices.filter(service => 
        service.includes('Onarım') || service.includes('Arıza') || service.includes('Tespiti') ||
        service.includes('Motor') || service.includes('Fren') || service.includes('Süspansiyon') ||
        service.includes('Direksiyon') || service.includes('Şanzıman') || service.includes('Klima')
      ),
      'Lastik & Parça Hizmetleri': uniqueServices.filter(service => 
        service.includes('Lastik') || service.includes('Jant') || service.includes('Balans') ||
        service.includes('Rot') || service.includes('Parça') || service.includes('Yedek')
      ),
      'Elektrik & Elektronik': uniqueServices.filter(service => 
        service.includes('Elektrik') || service.includes('Elektronik') || service.includes('Aku') ||
        service.includes('Klima') || service.includes('Radyo') || service.includes('Kamera')
      ),
      'Kaporta & Boya': uniqueServices.filter(service => 
        service.includes('Kaporta') || service.includes('Boya') || service.includes('Çizik') ||
        service.includes('Dent') || service.includes('Çarpma')
      ),
      'Diğer Hizmetler': uniqueServices.filter(service => 
        !service.includes('Bakım') && !service.includes('Kontrolü') && !service.includes('Muayene') &&
        !service.includes('Yağı') && !service.includes('Filtre') && !service.includes('Periyodik') &&
        !service.includes('Onarım') && !service.includes('Arıza') && !service.includes('Tespiti') &&
        !service.includes('Motor') && !service.includes('Fren') && !service.includes('Süspansiyon') &&
        !service.includes('Direksiyon') && !service.includes('Şanzıman') && !service.includes('Klima') &&
        !service.includes('Lastik') && !service.includes('Jant') && !service.includes('Balans') &&
        !service.includes('Rot') && !service.includes('Parça') && !service.includes('Yedek') &&
        !service.includes('Elektrik') && !service.includes('Elektronik') && !service.includes('Aku') &&
        !service.includes('Radyo') && !service.includes('Kamera') && !service.includes('Boya') &&
        !service.includes('Çizik') && !service.includes('Dent') && !service.includes('Çarpma')
      )
    };

    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.section}>
          {uniqueServices.length > 0 ? (
            <View style={styles.servicesContainer}>
              {Object.entries(categorizedServices).map(([category, services]) => {
                if (services.length === 0) return null;
                
                return (
                  <View key={category} style={styles.serviceCategory}>
                    <Text style={[styles.categoryTitle, { color: theme.colors.text.secondary }]}>
                      {category}
                    </Text>
                     <View style={styles.servicesGrid}>
                      {services.map((service, index) => (
                        <View key={index} style={[styles.serviceItem, { backgroundColor: theme.colors.background.card }]}>
                          <MaterialCommunityIcons 
                            name="check-circle" 
                            size={18} 
                            color={theme.colors.primary.main} 
                          />
                          <Text style={[styles.serviceText, { color: theme.colors.text.primary }]}>
                            {service}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.noServicesContainer}>
              <MaterialCommunityIcons 
                name="wrench" 
                size={48} 
                color={theme.colors.text.secondary} 
              />
              <Text style={[styles.noServicesText, { color: theme.colors.text.secondary }]}>
                Henüz hizmet bilgisi eklenmemiş
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderReviewsTab = (reviews: Review[]) => {
    // Reviews verilerini formatla - undefined kontrolü ekle
    const safeReviews = reviews || [];
    const formattedReviews = safeReviews.map(review => ({
      id: review.id || review._id,
      userName: review.userName || `${review.userId?.name || 'Müşteri'} ${review.userId?.surname || ''}`.trim(),
      rating: review.rating || 0,
      comment: review.comment || 'Yorum yapılmamış',
      date: review.date || review.createdAt || new Date().toISOString()
    }));

    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Müşteri Yorumları ({formattedReviews.length})
          </Text>
          
          {formattedReviews.length > 0 ? (
            <View style={styles.reviewsContainer}>
              {formattedReviews.map((review, index) => (
                <View key={review.id || index} style={[styles.reviewCard, { backgroundColor: theme.colors.background.card }]}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserInfo}>
                      <Text style={[styles.reviewUserName, { color: theme.colors.text.primary }]}>
                        {review.userName}
                      </Text>
                      <Text style={[styles.reviewDate, { color: theme.colors.text.secondary }]}>
                        {new Date(review.date).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={styles.reviewRating}>
                      {[...Array(5)].map((_, i) => (
                        <MaterialCommunityIcons
                          key={i}
                          name={i < review.rating ? 'star' : 'star-outline'}
                          size={18}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.reviewComment, { color: theme.colors.text.primary }]}>
                    {review.comment}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noReviewsContainer}>
              <MaterialCommunityIcons 
                name="comment-outline" 
                size={64} 
                color={theme.colors.text.secondary} 
              />
              <Text style={[styles.noReviewsText, { color: theme.colors.text.secondary }]}>
                Henüz yorum yapılmamış
              </Text>
              <Text style={[styles.noReviewsSubtext, { color: theme.colors.text.secondary }]}>
                Bu usta için ilk yorumu siz yapabilirsiniz
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary.main} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary.main }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleFavorite}>
            <MaterialCommunityIcons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ff6b6b" : "#fff"} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: theme.colors.primary.main }]}>
          <View style={styles.profileImageContainer}>
            {currentMechanic.avatar ? (
              <Image source={{ uri: currentMechanic.avatar }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.colors.background.card }]}>
                <MaterialCommunityIcons name="account" size={60} color={theme.colors.text.secondary} />
              </View>
            )}
          </View>
          
          <Text style={[
            styles.mechanicName,
            {
              fontSize: (() => {
                const text = `${currentMechanic.name} ${currentMechanic.surname}`;
                if (text.length > 25) return 18;
                if (text.length > 20) return 20;
                if (text.length > 15) return 22;
                return 24;
              })()
            }
          ]}>
            {currentMechanic.name} {currentMechanic.surname}
          </Text>
          
          {currentMechanic.shopName && (
            <Text style={[
              styles.shopName,
              {
                fontSize: (() => {
                  const text = currentMechanic.shopName || '';
                  if (text.length > 25) return 14;
                  if (text.length > 20) return 16;
                  if (text.length > 15) return 18;
                  return 20;
                })()
              }
            ]}>{currentMechanic.shopName}</Text>
          )}
          
          <View style={styles.ratingContainer}>
            {renderStars(Math.floor(currentMechanic.rating || 0))}
            <Text style={[
              styles.ratingText,
              {
                fontSize: (() => {
                  const text = `${currentMechanic.rating?.toFixed(1) || '0.0'} (${currentMechanic.ratingCount || 0})`;
                  if (text.length > 15) return 12;
                  if (text.length > 12) return 14;
                  return 16;
                })()
              }
            ]}>
              {currentMechanic.rating?.toFixed(1) || '0.0'} ({currentMechanic.ratingCount || 0})
            </Text>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBarContainer, { backgroundColor: theme.colors.background.primary }]}>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('about')}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'about' ? theme.colors.primary.main : theme.colors.text.secondary }
            ]}>
              Hakkında
            </Text>
            {activeTab === 'about' && (
              <View style={[styles.activeTabIndicator, { backgroundColor: theme.colors.primary.main }]} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('services')}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'services' ? theme.colors.primary.main : theme.colors.text.secondary }
            ]}>
              Hizmetler
            </Text>
            {activeTab === 'services' && (
              <View style={[styles.activeTabIndicator, { backgroundColor: theme.colors.primary.main }]} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'reviews' ? theme.colors.primary.main : theme.colors.text.secondary }
            ]}>
              Yorumlar
            </Text>
            {activeTab === 'reviews' && (
              <View style={[styles.activeTabIndicator, { backgroundColor: theme.colors.primary.main }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'about' && renderAboutTab(currentMechanic)}
        {activeTab === 'services' && renderServicesTab(currentMechanic.serviceCategories || currentMechanic.specialties || [])}
        {activeTab === 'reviews' && renderReviewsTab(mechanicReviews)}
      </ScrollView>

      {/* Footer Actions */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background.primary }]}>
        <TouchableOpacity 
          style={[styles.secondaryButton, { borderColor: theme.colors.primary.main }]} 
          onPress={handleMessage}
        >
          <MaterialCommunityIcons name="message" size={20} color={theme.colors.primary.main} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.primary.main }]}>
            Mesaj
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary.main }]} 
          onPress={handleAppointment}
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
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
    textAlign: 'center',
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Services/Specialties
  servicesContainer: {
    gap: 20,
  },
  serviceCategory: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
   servicesGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 8,
   },
   serviceItem: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 8,
     gap: 6,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 2,
     elevation: 1,
     marginBottom: 4,
     flex: 1,
     minWidth: '45%',
     maxWidth: '48%',
   },
   serviceText: {
     fontSize: 13,
     fontWeight: '500',
     flex: 1,
   },
  noServicesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  noServicesText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // Legacy styles for backward compatibility
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
  reviewsContainer: {
    gap: 12,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
  },
  noReviewsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  noReviewsText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  noReviewsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
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