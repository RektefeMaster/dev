import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Image, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../constants/config';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Mechanic = {
  id: string;
  name: string;
  surname: string;
  rating: number;
  experience: number;
  totalJobs: number;
  specialties: string[];
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
  };
  phone?: string;
  workingHours?: string;
  carBrands?: string[];
  engineTypes?: string[];
  transmissionTypes?: string[];
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

  // Çalışma saatlerini parse eden yardımcı fonksiyon
  const parseWorkingHours = (workingHoursString: string) => {
    try {
      const workingHours = JSON.parse(workingHoursString);
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
        const mechanicsFromAPI = mechanicsWithDetails.map((mech: any) => ({
          id: mech._id,
          name: mech.name,
          surname: mech.surname,
          rating: mech.rating || 0,
          experience: mech.experience || 0,
          totalJobs: mech.completedJobs || mech.totalJobs || mech.totalServices || 0,
          specialties: mech.serviceCategories || mech.specialties || [],
          city: mech.location?.city || mech.city || 'Şehir bilgisi yok',
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
          location: mech.location,
          phone: mech.phone,
          workingHours: mech.workingHours,
          carBrands: mech.carBrands,
          engineTypes: mech.engineTypes,
          transmissionTypes: mech.transmissionTypes,
        }));
        
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
    { id: 'kaporta-boya', title: 'Kaporta/Boya', icon: 'spray', color: '#FF3B30' },
    { id: 'elektrik-elektronik', title: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: '#FFCC00' },
    { id: 'yedek-parca', title: 'Yedek Parça', icon: 'car-wash', color: '#5856D6' },
    { id: 'lastik', title: 'Lastik', icon: 'tire', color: '#FF6B35' },
    { id: 'egzoz-emisyon', title: 'Egzoz & Emisyon', icon: 'smoke', color: '#8E8E93' },
    { id: 'ekspertiz', title: 'Ekspertiz', icon: 'magnify', color: '#5AC8FA' },
    { id: 'sigorta-kasko', title: 'Sigorta/Kasko', icon: 'shield-check', color: '#4CD964' },
    { id: 'arac-yikama', title: 'Araç Yıkama', icon: 'car-wash', color: '#007AFF' },
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

  const filteredMechanics = mechanics.filter(mechanic => {
    const matchesSearch = mechanic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         mechanic.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesService = !selectedService || mechanic.specialties.includes(selectedService);
    
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
    
    return matchesSearch && matchesService && matchesFilters;
  }).sort((a, b) => {
    switch(sortBy) {
      case 'rating': return b.rating - a.rating;
      case 'experience': return b.experience - a.experience;
      case 'jobs': return b.totalJobs - a.totalJobs;
      default: return b.rating - a.rating;
    }
  });

  const renderMechanicCard = ({ item }: { item: Mechanic }) => (
    <View style={[styles.mechanicCard, { backgroundColor: theme.colors.card }]}>
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
            <Text style={[styles.mechanicName, { color: theme.colors.text }]}>
              {item.name} {item.surname}
            </Text>
            
            {item.shopName && (
              <Text style={[styles.shopName, { color: theme.colors.primary }]}>
                {item.shopName}
              </Text>
            )}
            
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
              <Text style={[styles.mechanicCity, { color: theme.colors.textSecondary }]}>
                {item.city}
                {item.location?.district && `, ${item.location.district}`}
              </Text>
            </View>
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
            <Text style={[styles.ratingText, { color: theme.colors.text }]}>
              {item.rating.toFixed(1)}
            </Text>
            <Text style={[styles.ratingCount, { color: theme.colors.textSecondary }]}>
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
          <Text style={[styles.bio, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.bio}
          </Text>
        </View>
      )}

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
            <MaterialCommunityIcons name="briefcase" size={20} color="#3B82F6" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{item.totalJobs}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tamamlanan İş</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
            <MaterialCommunityIcons name="calendar" size={20} color="#10B981" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{item.experience}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Deneyim Yılı</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{item.ratingCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Değerlendirme</Text>
          </View>
        </View>
      </View>

      {/* Rating Distribution */}
      {item.ratingStats && item.ratingStats.total > 0 && (
        <View style={styles.ratingSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Değerlendirme Dağılımı
          </Text>
          <View style={styles.ratingBars}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = item.ratingStats.distribution[star] || 0;
              const percentage = (count / item.ratingStats.total) * 100;
              
              return (
                <View key={star} style={styles.ratingBarItem}>
                  <Text style={[styles.starLabel, { color: theme.colors.textSecondary }]}>
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
                  <Text style={[styles.barCount, { color: theme.colors.textSecondary }]}>
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
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Uzmanlık Alanları
        </Text>
        <View style={styles.specialtiesGrid}>
          {(expandedCards.has(item.id) ? item.specialties : item.specialties.slice(0, 4)).map((specialty, index) => (
            <View key={index} style={styles.specialtyTag}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
              <Text style={[styles.specialtyText, { color: theme.colors.text }]}>
                {specialty}
              </Text>
            </View>
          ))}
          {item.specialties.length > 4 && (
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
                  : `+${item.specialties.length - 4} Devamını Gör`
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Working Hours - Compact */}
      {item.workingHours && (
        <View style={styles.workingHoursSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Çalışma Saatleri
          </Text>
          <View style={styles.workingHoursCompactGrid}>
            {parseWorkingHours(item.workingHours).slice(0, expandedCards.has(item.id) ? 7 : 4).map((day, index) => (
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
            {parseWorkingHours(item.workingHours).length > 4 && (
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
                    : `+${parseWorkingHours(item.workingHours).length - 4}`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Reviews Section - Expandable */}
      <View style={styles.reviewsSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Son Yorumlar
        </Text>
        {item.recentReviews && item.recentReviews.length > 0 ? (
          <>
            {(expandedCards.has(item.id) ? item.recentReviews : item.recentReviews.slice(0, 2)).map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>
                        {review.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.reviewerName, { color: theme.colors.text }]}>
                        {review.userName}
                      </Text>
                      <Text style={[styles.reviewDate, { color: theme.colors.textSecondary }]}>
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
                  <Text style={[styles.reviewComment, { color: theme.colors.textSecondary }]} numberOfLines={expandedCards.has(item.id) ? undefined : 2}>
                    "{review.comment}"
                  </Text>
                )}
              </View>
            ))}
            
            {item.recentReviews.length > 2 && (
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
                    : `+${item.recentReviews.length - 2} Yorum Daha Göster`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.noReviewsCard}>
            <MaterialCommunityIcons name="comment-outline" size={24} color="#9CA3AF" />
            <Text style={[styles.noReviewsText, { color: theme.colors.textSecondary }]}>
              Henüz yorum yapılmamış
            </Text>
          </View>
        )}
      </View>

      {/* Action Section */}
      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={styles.detailButton}
          onPress={() => navigation.navigate('MechanicDetail', { mechanic: item })}
        >
          <MaterialCommunityIcons name="eye" size={18} color="#6B7280" />
          <Text style={[styles.detailButtonText, { color: theme.colors.textSecondary }]}>
            Detayları Gör
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('BookAppointment', { 
            mechanicId: item.id,
            mechanicName: item.name,
            mechanicSurname: item.surname
          })}
        >
          <MaterialCommunityIcons name="calendar-plus" size={20} color="#FFFFFF" />
          <Text style={styles.bookButtonText}>Randevu Al</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialCommunityIcons 
              name={showFilters ? "tune-variant" : "tune"} 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Compact Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[
            styles.searchInputContainer, 
            { 
              backgroundColor: theme.colors.card,
              borderColor: searchFocused ? theme.colors.primary : 'transparent',
              borderWidth: searchFocused ? 2 : 0,
            }
          ]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={18} 
              color={searchFocused ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Usta, şehir veya hizmet ara..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Compact Stats */}
          <View style={styles.compactStats}>
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatNumber}>{mechanics.length}</Text>
              <Text style={styles.compactStatLabel}>Toplam</Text>
            </View>
            <View style={styles.compactStatDivider} />
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatNumber}>{filteredMechanics.length}</Text>
              <Text style={styles.compactStatLabel}>Bulunan</Text>
            </View>
            <View style={styles.compactStatDivider} />
            <View style={styles.compactStatItem}>
              <Text style={styles.compactStatNumber}>
                {mechanics.filter(m => m.isAvailable).length}
              </Text>
              <Text style={styles.compactStatLabel}>Müsait</Text>
            </View>
          </View>
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
              <Text style={[styles.sortLabel, { color: theme.colors.textSecondary }]}>
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
                      sortBy === sort.key && { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={() => setSortBy(sort.key as any)}
                  >
                    <MaterialCommunityIcons 
                      name={sort.icon as any} 
                      size={16} 
                      color={sortBy === sort.key ? '#FFFFFF' : theme.colors.textSecondary} 
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

        {/* Compact Service Categories */}
        <View style={styles.serviceCategoriesContainer}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Hizmetler
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Usta Listesi
            </Text>
            <View style={styles.mechanicsCount}>
              <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
                {filteredMechanics.length} usta bulundu
              </Text>
            </View>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="loading" size={48} color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Ustalar yükleniyor...
              </Text>
            </View>
          ) : filteredMechanics.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search" size={64} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Usta Bulunamadı
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
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
                  <MaterialCommunityIcons name="refresh" size={16} color={theme.colors.primary} />
                  <Text style={[styles.clearFiltersText, { color: theme.colors.primary }]}>
                    Filtreleri Temizle
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredMechanics}
              renderItem={renderMechanicCard}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={styles.mechanicsList}
            />
          )}
        </View>
      </ScrollView>
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
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
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
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
});

export default MechanicSearchScreen;
