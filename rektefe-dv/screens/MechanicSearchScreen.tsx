import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Image, StatusBar, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../constants/config';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomMapView } from '../components';
import { sortMechanicsByDistance, getFallbackUserLocation, getRealUserLocation, formatDistance, openLocationInMaps } from '../utils/distanceCalculator';
import { Linking, Platform, Alert } from 'react-native';

type Mechanic = {
  id: string;
  name: string;
  surname: string;
  rating: number;
  experience: number;
  totalJobs: number;
  serviceCategories: string[];
  serviceType?: string; // Eksik olan property
  city: string;
  isAvailable: boolean;
  avatar?: string;
  bio?: string;
  // Yeni alanlar
  ratingCount: number;
  ratingStats?: {
    average: number;
    total: number;
    distribution: { [key: number]: number };
  };
  recentReviews?: Array<{
    _id: string;
    rating: number;
    comment?: string;
    userName: string;
    createdAt: string;
  }>;
  shopName?: string;
  location?: {
    city: string;
    district?: string;
    neighborhood?: string;
    street?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  phone?: string;
  workingHours?: string;
  carBrands?: string[];
  engineTypes?: string[];
  transmissionTypes?: string[];
  formattedDistance?: string;
};

const MechanicSearchScreen = ({ navigation, route }: any) => {
  const { theme } = useTheme();
  const { userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rating' | 'experience' | 'jobs'>('rating');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showMapView, setShowMapView] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [userLocation, setUserLocation] = useState(getFallbackUserLocation());
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Çalışma saatlerini parse eden yardımcı fonksiyon
  const parseWorkingHours = (workingHoursString: string | undefined | null) => {
    if (!workingHoursString) return [];
    try {
      // Eğer zaten obje ise direkt kullan
      if (typeof workingHoursString === 'object' && workingHoursString !== null) {
        const workingHours = workingHoursString as any;
        if (!Array.isArray(workingHours)) return [];
        return workingHours.map((day: any) => ({
          day: day.day,
          isWorking: day.isWorking,
          startTime: day.startTime,
          endTime: day.endTime,
          isBreak: day.isBreak,
          breakStartTime: day.breakStartTime,
          breakEndTime: day.breakEndTime
        }));
      }
      
      // String ise parse et
      let workingHours;
      try {
        workingHours = JSON.parse(workingHoursString);
      } catch (parseError) {
        // Eğer JSON parse edilemezse, basit string formatını kontrol et
        if (workingHoursString.includes('-')) {
          // "09:00-18:00" formatı
          return [{
            day: 'Genel',
            isWorking: true,
            startTime: workingHoursString.split('-')[0],
            endTime: workingHoursString.split('-')[1],
            isBreak: false,
            breakStartTime: '',
            breakEndTime: ''
          }];
        }
        return [];
      }
      
      if (!Array.isArray(workingHours)) return [];
      return workingHours.map((day: any) => ({
        day: day.day,
        isWorking: day.isWorking,
        startTime: day.startTime,
        endTime: day.endTime,
        isBreak: day.isBreak,
        breakStartTime: day.breakStartTime,
        breakEndTime: day.breakEndTime
      }));
    } catch (error) {
      console.error('Çalışma saatleri parse edilemedi:', error);
      return [];
    }
  };

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      
      // Önce tüm mekanikleri getir
      const response = await fetch(`${API_URL}/mechanic/list`);

      if (response.ok) {
        const data = await response.json();
        
        // Çekici ustalarını özel olarak kontrol et
        const towingMechanics = data.data.filter((mech: any) => 
          mech.serviceCategories?.some((cat: string) => 
            cat.toLowerCase().includes('çekici') || 
            cat.toLowerCase().includes('kurtarma') ||
            cat.toLowerCase().includes('towing') ||
            cat.toLowerCase().includes('tow')
          )
        );
        
        if (!data.data || data.data.length === 0) {
          setMechanics([]);
          return;
        }
        
        // Her mekanik için detaylı bilgileri getir
        const mechanicsWithDetails = await Promise.all(
          data.data.map(async (mech: any) => {
            try {
              // Detaylı bilgileri getir
              const detailsResponse = await fetch(`${API_URL}/mechanic/details/${mech._id}`);
              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                return detailsData.data;
              }
              return mech; // Detay getirilemezse temel bilgileri kullan
            } catch (error) {
              return mech; // Hata durumunda temel bilgileri kullan
            }
          })
        );

        // API'den gelen mekanikleri ekran formatına dönüştür
        const mechanicsFromAPI = mechanicsWithDetails.map((mech: any, index: number) => {
          
          // Sadece API'den gelen gerçek konum bilgilerini kullan
          // 0,0 koordinatları değil, gerçek koordinatları kontrol et
          const hasApiLocation = mech.location && 
            mech.location.coordinates && 
            mech.location.coordinates.latitude !== 0 && 
            mech.location.coordinates.longitude !== 0;
          
          return {
            id: mech._id,
            name: mech.name,
            surname: mech.surname,
            rating: mech.rating || 0,
            experience: mech.experience || mech.yearsOfExperience || 0,
            totalJobs: mech.completedJobs || mech.totalJobs || mech.totalServices || 0,
            serviceCategories: mech.serviceCategories || [],
            city: hasApiLocation ? mech.location.city : 'Konum bilgisi yok',
            isAvailable: mech.isAvailable || false,
            avatar: mech.avatar,
            bio: mech.bio || 'Bio bilgisi yok',
            // Yeni alanlar
            ratingCount: mech.ratingCount || mech.totalRatings || 0,
            ratingStats: mech.ratingStats || {
              average: mech.rating || 0,
              total: mech.ratingCount || mech.totalRatings || 0,
              distribution: mech.ratingDistribution || {}
            },
            recentReviews: mech.recentReviews || mech.reviews || [],
            shopName: mech.shopName,
            // Sadece gerçek konum bilgisi varsa ekle
            ...(hasApiLocation && {
              location: {
                city: mech.location.city,
                district: mech.location.district,
                neighborhood: mech.location.neighborhood,
                street: mech.location.street,
                coordinates: mech.location.coordinates
              },
              // Address alanı da ekle (mesafe hesaplama için)
              address: {
                city: mech.location.city,
                district: mech.location.district,
                neighborhood: mech.location.neighborhood,
                street: mech.location.street,
                coordinates: mech.location.coordinates
              }
            }),
            phone: mech.phone,
            workingHours: mech.workingHours,
            carBrands: mech.carBrands,
            engineTypes: mech.engineTypes,
            transmissionTypes: mech.transmissionTypes,
          };
        });
        
        setMechanics(mechanicsFromAPI);
      } else {
        console.error('API yanıtı başarısız:', response.status, response.statusText);
        setMechanics([]);
      }
    } catch (error) {
      console.error('Mekanikler yüklenirken hata:', error);
      setMechanics([]);
    } finally {
      setLoading(false);
    }
  };

  const serviceCategories = [
    { id: 'agir-bakim', title: 'Ağır Bakım', icon: 'wrench', color: '#007AFF' },
    { id: 'genel-bakim', title: 'Genel Bakım', icon: 'tools', color: '#34C759' },
    { id: 'alt-takim', title: 'Alt Takım', icon: 'cog', color: '#FF9500' },
    { id: 'ust-takim', title: 'Üst Takım', icon: 'nut', color: '#AF52DE' },
    { id: 'kaporta-boya', title: 'Kaporta & Boya', icon: 'spray', color: '#FF3B30' },
    { id: 'elektrik-elektronik', title: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: '#FFCC00' },
    { id: 'yedek-parca', title: 'Yedek Parça', icon: 'car-wash', color: '#5856D6' },
    { id: 'lastik', title: 'Lastik Servisi', icon: 'tire', color: '#FF6B35' },
    { id: 'egzoz-emisyon', title: 'Egzoz & Emisyon', icon: 'smoke', color: '#8E8E93' },
    { id: 'ekspertiz', title: 'Ekspertiz', icon: 'magnify', color: '#5AC8FA' },
    { id: 'sigorta-kasko', title: 'Sigorta & Kasko', icon: 'shield-check', color: '#4CD964' },
    { id: 'arac-yikama', title: 'Araç Yıkama', icon: 'car-wash', color: '#007AFF' },
  ];

  // 4 ana hizmet modeli
  const mainServiceCategories = [
    { id: 'towing', title: 'Çekici Hizmeti', icon: 'truck', color: '#EF4444' },
    { id: 'repair', title: 'Tamir & Bakım', icon: 'wrench', color: '#3B82F6' },
    { id: 'wash', title: 'Araç Yıkama', icon: 'water', color: '#10B981' },
    { id: 'tire', title: 'Lastik & Parça', icon: 'tire', color: '#F59E0B' },
  ];

  // Gerçek mekanik verilerini API'den al
  useEffect(() => {
    fetchMechanics();
  }, []);

  // Ekran odaklandığında refresh kontrolü
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.shouldRefresh) {
        fetchMechanics();
        // Parametreyi temizle
        navigation.setParams({ shouldRefresh: undefined });
      }
    }, [route.params?.shouldRefresh])
  );

  const filteredMechanics = (mechanics || []).filter(mechanic => {
    const matchesSearch = !searchQuery || 
                         mechanic.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Hizmet kategorisi filtreleme - hem ana kategoriler hem de detaylı kategoriler
    let matchesService = true;
    
    if (selectedService) {
      
      // Önce direkt eşleşme kontrol et
      matchesService = mechanic.serviceCategories?.includes(selectedService);
      
      // Eğer direkt eşleşme yoksa serviceType alanını da kontrol et
      if (!matchesService && mechanic.serviceType) {
        matchesService = (selectedService === 'towing' && (
          mechanic.serviceType.toLowerCase().includes('çekici') || 
          mechanic.serviceType.toLowerCase().includes('kurtarma') ||
          mechanic.serviceType.toLowerCase().includes('towing') || 
          mechanic.serviceType.toLowerCase().includes('tow')
        )) ||
        (selectedService === 'repair' && (
          mechanic.serviceType.toLowerCase().includes('tamir') || 
          mechanic.serviceType.toLowerCase().includes('bakım') ||
          mechanic.serviceType.toLowerCase().includes('repair')
        )) ||
        (selectedService === 'wash' && (
          mechanic.serviceType.toLowerCase().includes('yıkama') || 
          mechanic.serviceType.toLowerCase().includes('wash')
        )) ||
        (selectedService === 'tire' && (
          mechanic.serviceType.toLowerCase().includes('lastik') || 
          mechanic.serviceType.toLowerCase().includes('tire')
        ));
      }
      
      // Eğer hala eşleşme yoksa ana hizmet kategorilerine göre filtreleme yap
      if (!matchesService) {
        matchesService = (selectedService === 'towing' && mechanic.serviceCategories?.some(cat => 
          cat?.toLowerCase().includes('çekici') || cat?.toLowerCase().includes('kurtarma') ||
          cat?.toLowerCase().includes('towing') || cat?.toLowerCase().includes('tow') ||
          cat?.toLowerCase().includes('çekme') || cat?.toLowerCase().includes('araç çekme') ||
          cat?.toLowerCase().includes('arac çekme') || cat?.toLowerCase().includes('araç kurtarma') ||
          cat?.toLowerCase().includes('arac kurtarma') || cat?.toLowerCase().includes('kurtarma') ||
          cat?.toLowerCase().includes('rescue') || cat?.toLowerCase().includes('recovery')
        )) ||
        (selectedService === 'repair' && mechanic.serviceCategories?.some(cat => 
          cat?.toLowerCase().includes('tamir') || cat?.toLowerCase().includes('bakım') || 
          cat?.toLowerCase().includes('onarım') || cat?.toLowerCase().includes('ariza') ||
          cat?.toLowerCase().includes('repair') || cat?.toLowerCase().includes('maintenance') ||
          cat?.toLowerCase().includes('servis') || cat?.toLowerCase().includes('motor')
        )) ||
        (selectedService === 'wash' && mechanic.serviceCategories?.some(cat => 
          cat?.toLowerCase().includes('yıkama') || cat?.toLowerCase().includes('temizlik') ||
          cat?.toLowerCase().includes('wash') || cat?.toLowerCase().includes('cleaning') ||
          cat?.toLowerCase().includes('detailing')
        )) ||
        (selectedService === 'tire' && mechanic.serviceCategories?.some(cat => 
          cat?.toLowerCase().includes('lastik') || cat?.toLowerCase().includes('parça') ||
          cat?.toLowerCase().includes('tire') || cat?.toLowerCase().includes('wheel') ||
          cat?.toLowerCase().includes('jant') || cat?.toLowerCase().includes('balans')
        ));
      }
    }
    
    const matchesFilters = selectedFilters.length === 0 || 
                          selectedFilters.some(filter => {
                            switch(filter) {
                              case 'available': return mechanic.isAvailable;
                              case 'highRating': return mechanic.rating >= 4.5;
                              case 'experienced': return mechanic.experience >= 5;
                              case 'busy': return mechanic.totalJobs >= 100;
                              default: return true;
                            }
                          });
    
    const result = matchesSearch && matchesService && matchesFilters;
    
    
    return result;
  });

  // Gerçek konumu al
  const loadUserLocation = async () => {
    // Eğer konum zaten yüklendiyse tekrar yükleme
    if (locationLoaded) return;
    
    setIsLocationLoading(true);
    
    try {
      // Önce gerçek konumu almaya çalış
      const realLocation = await getRealUserLocation();
      if (realLocation) {
        setUserLocation(realLocation);
        setLocationLoaded(true);
      } else {
        // Gerçek konum alınamazsa fallback kullan
        const fallbackLocation = getFallbackUserLocation();
        setUserLocation(fallbackLocation);
        setLocationLoaded(true);
      }
    } catch (error) {
      console.error('Konum alınamadı:', error);
      // Hata durumunda fallback kullan
      const fallbackLocation = getFallbackUserLocation();
      setUserLocation(fallbackLocation);
      setLocationLoaded(true);
    } finally {
      setIsLocationLoading(false);
    }
  };

  // Component mount olduğunda konumu al
  React.useEffect(() => {
    loadUserLocation();
  }, []);

  // Mesafe bilgisi ekle ve sırala
  const mechanicsWithDistance = sortMechanicsByDistance(filteredMechanics, userLocation);

  // Harita için marker'ları hazırla
  const mapMarkers = (mechanicsWithDistance || [])
    .filter(mechanic => mechanic.location?.coordinates)
    .map(mechanic => ({
      id: mechanic.id,
      coordinate: mechanic.location!.coordinates!, // normalize edilerek MapView içinde işleniyor
      title: `${mechanic.name} ${mechanic.surname}`,
      description: `${mechanic.formattedDistance} - ${mechanic.rating.toFixed(1)} ⭐`,
      phone: mechanic.phone || '+90 555 123 4567',
      mechanic: mechanic, // Tüm usta bilgilerini marker'a ekle
    }));

  // Harita marker'ına tıklandığında
  const handleMarkerPress = (marker: any) => {
    const mechanic = (mechanicsWithDistance || []).find(m => m.id === marker.id);
    if (mechanic) {
      setSelectedMechanic(mechanic);
    }
  };

  // Haritada konum açma fonksiyonu
  const handleOpenInMaps = async (mechanic: any) => {
    try {
      if (mechanic.location?.coordinates) {
        const mapData = openLocationInMaps(
          mechanic.location.coordinates,
          `${mechanic.name} ${mechanic.surname} - ${mechanic.shopName || 'Usta'}`
        );
        
        const url = Platform.OS === 'ios' ? mapData.appleMapsUrl : mapData.googleMapsUrl;
        
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert(
            'Harita Açılamadı',
            'Harita uygulaması bulunamadı. Lütfen cihazınızda bir harita uygulaması yüklü olduğundan emin olun.',
            [{ text: 'Tamam' }]
          );
        }
      } else {
        Alert.alert(
          'Konum Bilgisi Yok',
          'Bu ustanın konum bilgisi mevcut değil.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Harita açılırken hata:', error);
      Alert.alert(
        'Hata',
        'Harita açılırken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    }
  };

  // Telefon arama fonksiyonu
  const handleCallMechanic = async (mechanic: any) => {
    try {
      // Telefon numarasını kontrol et
      const phoneNumber = mechanic.phone || mechanic.phoneNumber;
      
      if (!phoneNumber) {
        Alert.alert(
          'Telefon Numarası Yok',
          'Bu ustanın telefon numarası mevcut değil.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      // Telefon numarasını temizle (sadece rakamlar)
      const cleanPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');
      
      // Arama yap
      const phoneUrl = `tel:${cleanPhoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          'Arama Yapılamadı',
          'Telefon uygulaması bulunamadı.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Telefon arama hatası:', error);
      Alert.alert(
        'Hata',
        'Telefon arama sırasında bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    }
  };

  const renderMechanicCard = ({ item }: { item: Mechanic }) => (
    <View style={[styles.mechanicCard, { backgroundColor: theme.colors.background.card }]}>
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: item.avatar || 'https://via.placeholder.com/80' }}
              style={styles.avatar}
              defaultSource={require('../assets/default_avatar.png')}
            />
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: item.isAvailable ? '#10B981' : '#EF4444' }
            ]} />
          </View>
          
          <View style={styles.basicInfo}>
            <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}> 
              {item.name} {item.surname} Usta
            </Text>
            
            {item.shopName && (
              <Text style={[styles.shopName, { color: theme.colors.primary.main }]}> 
                {item.shopName}
              </Text>
            )}
            
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
              <Text style={[styles.mechanicCity, { color: theme.colors.text.secondary }]}> 
                {item.city}
                {item.location?.district && `, ${item.location.district}`}
              </Text>
            </View>
            
            {/* Mesafe Bilgisi */}
            {item.formattedDistance && (
              <View style={styles.distanceContainer}>
                <MaterialCommunityIcons name="map-marker-distance" size={14} color="#3B82F6" />
                <Text style={[styles.distanceText, { color: '#3B82F6' }]}>
                  {item.formattedDistance}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.ratingContainer}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialCommunityIcons 
                  key={star} 
                  name={star <= item.rating ? "star" : "star-outline"} 
                  size={18} 
                  color={star <= item.rating ? "#F59E0B" : "#D1D5DB"} 
                />
              ))}
            </View>
            <Text style={[styles.ratingText, { color: theme.colors.text.primary }]}> 
              {item.rating.toFixed(1)}
            </Text>
            <Text style={[styles.ratingCount, { color: theme.colors.text.secondary }]}> 
              ({item.ratingCount} değerlendirme)
            </Text>
          </View>
          
          <View style={[
            styles.availabilityBadge, 
            { backgroundColor: item.isAvailable ? '#10B981' : '#EF4444' }
          ]}>
            <View style={[
              styles.availabilityDot, 
              { backgroundColor: item.isAvailable ? '#FFFFFF' : '#FFFFFF' }
            ]} />
            <Text style={styles.availabilityText}>
              {item.isAvailable ? 'Müsait' : 'Meşgul'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bio Section */}
      {item.bio && (
        <View style={styles.bioSection}>
          <Text style={[styles.bio, { color: theme.colors.text.secondary }]} numberOfLines={2}> 
            {item.bio}
          </Text>
        </View>
      )}

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => handleCallMechanic(item)}
        >
          <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
            <MaterialCommunityIcons name="phone" size={18} color="#10B981" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>Ara</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Telefon</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
            <MaterialCommunityIcons name="calendar" size={18} color="#10B981" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{item.experience}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Yıl</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="star" size={18} color="#F59E0B" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{item.ratingCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Yorum</Text>
          </View>
        </View>
      </View>

      {/* Rating Distribution */}
      {item.ratingStats && item.ratingStats.total > 0 && (
        <View style={styles.ratingSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
            Değerlendirme Dağılımı
          </Text>
          <View style={styles.ratingBars}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = item.ratingStats.distribution[star] || 0;
              const percentage = (count / item.ratingStats.total) * 100;
              
              return (
                <View key={star} style={styles.ratingBarItem}>
                  <Text style={[styles.starLabel, { color: theme.colors.text.secondary }]}> 
                    {star} ⭐
                  </Text>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.barFill,
                        { 
                          width: `${Math.max(percentage, 2)}%`,
                          backgroundColor: star >= 4 ? '#10B981' : star >= 3 ? '#F59E0B' : '#EF4444'
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.barCount, { color: theme.colors.text.secondary }]}> 
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Specialties Section - Expandable */}
      <View style={styles.specialtiesSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
          Uzmanlık Alanları
        </Text>
        <View style={styles.specialtiesGrid}>
          {(expandedCards.has(item.id) ? item.serviceCategories : (item.serviceCategories || []).slice(0, 4)).map((specialty, index) => (
            <View key={index} style={styles.specialtyTag}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
              <Text style={[styles.specialtyText, { color: theme.colors.text.primary }]}> 
                {specialty}
              </Text>
            </View>
          ))}
          {(item.serviceCategories || []).length > 4 && (
            <TouchableOpacity 
              style={styles.expandableMoreTag}
              onPress={() => {
                const newExpanded = new Set(expandedCards);
                if (newExpanded.has(item.id)) {
                  newExpanded.delete(item.id);
                } else {
                  newExpanded.add(item.id);
                }
                setExpandedCards(newExpanded);
              }}
            >
              <MaterialCommunityIcons 
                name={expandedCards.has(item.id) ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#6B7280" 
              />
                <Text style={styles.expandableMoreText}>
                  {expandedCards.has(item.id) 
                    ? "Daha Az" 
                    : `+${(item.serviceCategories || []).length - 4} Devamını Gör`
                  }
                </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Working Hours - Compact */}
      {item.workingHours && (
        <View style={styles.workingHoursSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
            Çalışma Saatleri
          </Text>
          <View style={styles.workingHoursCompactGrid}>
            {(parseWorkingHours(item.workingHours) || []).slice(0, expandedCards.has(item.id) ? 7 : 4).map((day, index) => (
              <View key={index} style={[
                styles.workingDayCompactCard,
                { backgroundColor: day.isWorking ? '#F0FDF4' : '#F9FAFB' }
              ]}>
                <Text style={[
                  styles.dayCompactName,
                  { color: day.isWorking ? '#10B981' : '#6B7280' }
                ]}>
                  {day.day.substring(0, 3)}
                </Text>
                {day.isWorking ? (
                  <Text style={[styles.workingCompactTime, { color: '#10B981' }]}>
                    {day.startTime}-{day.endTime}
                  </Text>
                ) : (
                  <Text style={[styles.closedCompactText, { color: '#6B7280' }]}>
                    Kapalı
                  </Text>
                )}
              </View>
            ))}
            {(parseWorkingHours(item.workingHours) || []).length > 4 && (
              <TouchableOpacity 
                style={styles.expandableMoreTag}
                onPress={() => {
                  const newExpanded = new Set(expandedCards);
                  if (newExpanded.has(item.id)) {
                    newExpanded.delete(item.id);
                  } else {
                    newExpanded.add(item.id);
                  }
                  setExpandedCards(newExpanded);
                }}
              >
                <MaterialCommunityIcons 
                  name={expandedCards.has(item.id) ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#6B7280" 
                />
                <Text style={styles.expandableMoreText}>
                  {expandedCards.has(item.id) 
                    ? "Az" 
                    : `+${(parseWorkingHours(item.workingHours) || []).length - 4}`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Reviews Section - Expandable */}
      <View style={styles.reviewsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
          Son Yorumlar
        </Text>
        {item.recentReviews && item.recentReviews.length > 0 ? (
          <>
            {(expandedCards.has(item.id) ? item.recentReviews : (item.recentReviews || []).slice(0, 2)).map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>
                        {review.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.reviewerName, { color: theme.colors.text.primary }]}> 
                        {review.userName}
                      </Text>
                      <Text style={[styles.reviewDate, { color: theme.colors.text.secondary }]}> 
                        {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <MaterialCommunityIcons 
                        key={star} 
                        name={star <= review.rating ? "star" : "star-outline"} 
                        size={16} 
                        color={star <= review.rating ? "#F59E0B" : "#D1D5DB"} 
                      />
                    ))}
                  </View>
                </View>
                {review.comment && (
                  <Text style={[styles.reviewComment, { color: theme.colors.text.secondary }]} numberOfLines={expandedCards.has(item.id) ? undefined : 2}> 
                    "{review.comment}"
                  </Text>
                )}
              </View>
            ))}
            
            {(item.recentReviews || []).length > 2 && (
              <TouchableOpacity 
                style={styles.expandableMoreTag}
                onPress={() => {
                  const newExpanded = new Set(expandedCards);
                  if (newExpanded.has(item.id)) {
                    newExpanded.delete(item.id);
                  } else {
                    newExpanded.add(item.id);
                  }
                  setExpandedCards(newExpanded);
                }}
              >
                <MaterialCommunityIcons 
                  name={expandedCards.has(item.id) ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#6B7280" 
                />
                <Text style={styles.expandableMoreText}>
                  {expandedCards.has(item.id) 
                    ? "Daha Az Göster" 
                    : `+${(item.recentReviews || []).length - 2} Yorum Daha Göster`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.noReviewsCard}>
            <MaterialCommunityIcons name="comment-outline" size={24} color="#9CA3AF" />
            <Text style={[styles.noReviewsText, { color: theme.colors.text.secondary }]}> 
              Henüz yorum yapılmamış
            </Text>
          </View>
        )}
      </View>

      {/* Action Section */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.mapButton]}
          onPress={() => handleOpenInMaps(item)}
        >
          <MaterialCommunityIcons name="map-marker" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>
            Harita
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.detailButton]}
          onPress={() => navigation.navigate('MechanicDetail', { mechanic: item })}
        >
          <MaterialCommunityIcons name="eye" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>
            Detay
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: theme.colors.primary.main }]}
          onPress={() => navigation.navigate('BookAppointment', { 
            mechanicId: item.id,
            mechanicName: item.name,
            mechanicSurname: item.surname
          })}
        >
          <MaterialCommunityIcons name="calendar-plus" size={16} color="#FFFFFF" />
          <Text style={styles.bookButtonText}>Randevu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <LinearGradient
        colors={['#1F2937', '#374151']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Usta Ara</Text>
          </View>
          <View style={styles.headerRightButtons}>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: showMapView ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)' }]}
              onPress={() => setShowMapView(!showMapView)}
            >
              <MaterialCommunityIcons 
                name={showMapView ? "format-list-bulleted" : "map"} 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialCommunityIcons 
                name={showFilters ? "tune-variant" : "tune"} 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {showMapView ? (
        <View style={styles.mapContainer}>
          <CustomMapView
            markers={mapMarkers}
            onMarkerPress={handleMarkerPress}
            style={styles.map}
            showUserLocation={true}
            followUserLocation={false}
          />
          
          {/* Seçilen Usta Bilgi Kartı */}
          {selectedMechanic && (
            <View style={[styles.selectedMechanicCard, { backgroundColor: theme.colors.background.card }]}> 
              <View style={styles.selectedMechanicHeader}>
                <Image
                  source={{ uri: selectedMechanic.avatar || 'https://via.placeholder.com/50' }}
                  style={styles.selectedMechanicAvatar}
                  defaultSource={require('../assets/default_avatar.png')}
                />
                <View style={styles.selectedMechanicInfo}>
                  <Text style={[styles.selectedMechanicName, { color: theme.colors.text.primary }]}> 
                    {selectedMechanic.name} {selectedMechanic.surname}
                  </Text>
                  {selectedMechanic.shopName && (
                    <Text style={[styles.selectedMechanicShop, { color: theme.colors.primary.main }]}> 
                      {selectedMechanic.shopName}
                    </Text>
                  )}
                  <View style={styles.selectedMechanicRating}>
                    <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
                    <Text style={[styles.selectedMechanicRatingText, { color: theme.colors.text.primary }]}> 
                      {selectedMechanic.rating.toFixed(1)} ({selectedMechanic.ratingCount} değerlendirme)
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedMechanic(null)}
                >
                  <MaterialCommunityIcons name="close" size={20} color={theme.colors.text.secondary} /> 
                </TouchableOpacity>
              </View>
              
              <View style={styles.selectedMechanicActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.detailButton]}
                  onPress={() => navigation.navigate('MechanicDetail', { mechanic: selectedMechanic })}
                >
                  <MaterialCommunityIcons name="eye" size={14} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>
                    Detay
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.bookButton, { backgroundColor: theme.colors.primary.main }]} 
                  onPress={() => navigation.navigate('BookAppointment', { 
                    mechanicId: selectedMechanic.id,
                    mechanicName: selectedMechanic.name,
                    mechanicSurname: selectedMechanic.surname
                  })}
                >
                  <MaterialCommunityIcons name="calendar-plus" size={14} color="#FFFFFF" />
                  <Text style={styles.bookButtonText}>Randevu</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Compact Search Bar */}
          <View style={styles.searchContainer}>
          <View style={[
            styles.searchInputContainer, 
            { 
              backgroundColor: theme.colors.background.card,
              borderColor: searchFocused ? theme.colors.primary.main : 'transparent',
              borderWidth: searchFocused ? 2 : 0,
            }
          ]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={18} 
              color={searchFocused ? theme.colors.primary.main : theme.colors.text.secondary} 
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text.primary }]} 
              placeholder="Usta, şehir veya hizmet ara..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.text.secondary} /> 
              </TouchableOpacity>
            )}
          </View>
          
          {/* Compact Stats */}
          <View style={styles.compactStats}>
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatNumber}>{mechanics?.length || 0}</Text>
              <Text style={styles.compactStatLabel}>Toplam</Text>
            </View>
            <View style={styles.compactStatDivider} />
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatNumber}>{filteredMechanics?.length || 0}</Text>
              <Text style={styles.compactStatLabel}>Bulunan</Text>
            </View>
            <View style={styles.compactStatDivider} />
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatNumber}>
                {mechanics?.filter(m => m.isAvailable).length || 0}
              </Text>
              <Text style={styles.compactStatLabel}>Müsait</Text>
            </View>
          </View>
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
              Gelişmiş Filtreler
            </Text>
            
            {/* Filter Chips */}
            <View style={styles.filterChipsContainer}>
              {[
                { key: 'available', label: 'Müsait', icon: 'check-circle', color: '#10B981' },
                { key: 'highRating', label: 'Yüksek Puan', icon: 'star', color: '#F59E0B' },
                { key: 'experienced', label: 'Deneyimli', icon: 'account-clock', color: '#3B82F6' },
                { key: 'busy', label: 'Yoğun', icon: 'briefcase', color: '#8B5CF6' },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    selectedFilters.includes(filter.key) && { backgroundColor: filter.color }
                  ]}
                  onPress={() => {
                    if (selectedFilters.includes(filter.key)) {
                      setSelectedFilters(selectedFilters.filter(f => f !== filter.key));
                    } else {
                      setSelectedFilters([...selectedFilters, filter.key]);
                    }
                  }}
                >
                  <MaterialCommunityIcons 
                    name={filter.icon as any} 
                    size={16} 
                    color={selectedFilters.includes(filter.key) ? '#FFFFFF' : filter.color} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    selectedFilters.includes(filter.key) && styles.filterChipTextSelected
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <Text style={[styles.sortLabel, { color: theme.colors.text.secondary }]}> 
                Sıralama:
              </Text>
              <View style={styles.sortButtons}>
                {[
                  { key: 'rating', label: 'Puana Göre', icon: 'star' },
                  { key: 'experience', label: 'Deneyime Göre', icon: 'account-clock' },
                  { key: 'jobs', label: 'İş Sayısına Göre', icon: 'briefcase' },
                ].map((sort) => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[
                      styles.sortButton,
                      sortBy === sort.key && { backgroundColor: theme.colors.primary.main }
                    ]}
                    onPress={() => setSortBy(sort.key as any)}
                  >
                    <MaterialCommunityIcons 
                      name={sort.icon as any} 
                      size={16} 
                      color={sortBy === sort.key ? '#FFFFFF' : theme.colors.text.secondary} 
                    />
                    <Text style={[
                      styles.sortButtonText,
                      sortBy === sort.key && styles.sortButtonTextSelected
                    ]}>
                      {sort.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Ana Hizmet Kategorileri */}
        <View style={styles.serviceCategoriesContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
            Hizmet Kategorileri
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {mainServiceCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.serviceCategoryChip,
                  selectedService === category.id && { backgroundColor: category.color }
                ]}
                onPress={() => setSelectedService(selectedService === category.id ? '' : category.id)}
              >
                <MaterialCommunityIcons 
                  name={category.icon as any} 
                  size={16} 
                  color={selectedService === category.id ? '#FFFFFF' : category.color} 
                />
                <Text style={[
                  styles.serviceCategoryText,
                  selectedService === category.id && styles.serviceCategoryTextSelected
                ]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Detaylı Hizmet Kategorileri */}
        <View style={styles.serviceCategoriesContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
            Detaylı Hizmetler
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {serviceCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.serviceCategoryChip,
                  selectedService === category.title && { backgroundColor: category.color }
                ]}
                onPress={() => setSelectedService(selectedService === category.title ? '' : category.title)}
              >
                <MaterialCommunityIcons 
                  name={category.icon as any} 
                  size={16} 
                  color={selectedService === category.title ? '#FFFFFF' : category.color} 
                />
                <Text style={[
                  styles.serviceCategoryText,
                  selectedService === category.title && styles.serviceCategoryTextSelected
                ]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mechanics List */}
        <View style={styles.mechanicsContainer}>
          <View style={styles.mechanicsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}> 
              Usta Listesi
            </Text>
            <View style={styles.mechanicsCount}>
              <Text style={[styles.countText, { color: theme.colors.text.secondary }]}> 
                {filteredMechanics?.length || 0} usta bulundu
              </Text>
            </View>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="loading" size={48} color={theme.colors.primary.main} /> 
              <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}> 
                Ustalar yükleniyor...
              </Text>
            </View>
          ) : (filteredMechanics?.length || 0) === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search" size={64} color={theme.colors.text.tertiary} /> 
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}> 
                Usta Bulunamadı
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}> 
                {searchQuery || selectedService || selectedFilters.length > 0 
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'Henüz usta kaydı bulunmuyor'
                }
              </Text>
              {(searchQuery || selectedService || selectedFilters.length > 0) && (
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedService('');
                    setSelectedFilters([]);
                    setSortBy('rating');
                  }}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color={theme.colors.primary.main} /> 
                  <Text style={[styles.clearFiltersText, { color: theme.colors.primary.main }]}> 
                    Filtreleri Temizle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.mechanicsList}>
              {(mechanicsWithDistance || []).map((mechanic) => (
                <View key={mechanic.id}>
                  {renderMechanicCard({ item: mechanic })}
                </View>
              ))}
            </View>
          )}
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Yeni modern kart stilleri
  mechanicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  basicInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 3,
    color: '#111827',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#3B82F6',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mechanicCity: {
    fontSize: 14,
    marginLeft: 6,
    color: '#6B7280',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  ratingCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bioSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
  },
  ratingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  ratingBars: {
    gap: 12,
  },
  ratingBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starLabel: {
    width: 40,
    fontSize: 14,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barCount: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
    color: '#6B7280',
  },
  specialtiesSection: {
    marginBottom: 24,
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    color: '#065F46',
  },
  workingHoursSection: {
    marginBottom: 24,
  },
  workingHoursGrid: {
    gap: 8,
  },
  // Compact Working Hours
  workingHoursCompactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  workingDayCompactCard: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },
  dayCompactName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  workingCompactTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  closedCompactText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  workingDayCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeInfo: {
    gap: 4,
  },
  workingTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  breakTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  closedText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  reviewsSection: {
    marginBottom: 24,
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  noReviewsCard: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapButton: {
    backgroundColor: '#3B82F6',
  },
  detailButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  filterButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  // Compact Stats Styles
  compactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 2,
  },
  compactStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  compactStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  // Advanced Filters Styles
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#374151',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  sortContainer: {
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#374151',
  },
  sortButtonTextSelected: {
    color: '#FFFFFF',
  },
  // Mechanics Header & States
  mechanicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mechanicsCount: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Expandable More Tag
  expandableMoreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expandableMoreText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    color: '#6B7280',
  },
  serviceCategoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  serviceCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    color: '#333',
  },
  serviceCategoryTextSelected: {
    color: '#FFFFFF',
  },
  mechanicsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  mechanicsList: {
    paddingBottom: 20,
  },
  // Harita Stilleri
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  selectedMechanicCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedMechanicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedMechanicAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedMechanicInfo: {
    flex: 1,
  },
  selectedMechanicName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  selectedMechanicShop: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedMechanicRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedMechanicRatingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  closeButton: {
    padding: 4,
  },
  selectedMechanicActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});

export default MechanicSearchScreen;
