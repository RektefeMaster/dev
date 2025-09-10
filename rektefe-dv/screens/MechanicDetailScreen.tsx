import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Alert, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../constants/config';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

type MechanicDetailProps = {
  route: {
    params: {
      mechanic: {
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
        documents?: {
          insurance: string;
        };
        customBrands?: string[];
        supportedBrands?: string[];
        washPackages?: Array<{
          id: string;
          name: string;
          description: string;
          price: number;
          duration: string;
          features: string[];
          icon: string;
          color: string;
        }>;
        washOptions?: Array<{
          id: string;
          name: string;
          description: string;
          price: number;
          icon: string;
        }>;
        recentAppointments?: Array<{
          _id: string;
          appointmentDate: string;
          serviceType: string;
          status: string;
          vehicleInfo?: {
            brand: string;
            modelName: string;
            plateNumber: string;
          };
          customerInfo?: {
            name: string;
            surname: string;
          };
        }>;
      };
    };
  };
  navigation: any;
};

type Review = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  userId: {
    name: string;
    surname: string;
  };
};

const MechanicDetailScreen = ({ route, navigation }: MechanicDetailProps) => {
  const { theme } = useTheme();
  const { token, userId } = useAuth();
  const { mechanic } = route.params;

  // Uzmanlık alanlarını Türkçe'ye çeviren fonksiyon
  const translateSpecialty = (specialty: string) => {
    const translations: { [key: string]: string } = {
      'repair': 'Tamir & Bakım',
      'maintenance': 'Genel Bakım',
      'engine': 'Motor',
      'transmission': 'Şanzıman',
      'brake': 'Fren',
      'suspension': 'Süspansiyon',
      'electrical': 'Elektrik',
      'bodywork': 'Kaporta',
      'tire': 'Lastik',
      'oil_change': 'Yağ Değişimi',
      'inspection': 'Muayene',
      'diagnostic': 'Diagnostik',
      'ac': 'Klima',
      'exhaust': 'Egzoz',
      'fuel_system': 'Yakıt Sistemi',
      'cooling_system': 'Soğutma Sistemi',
      'ignition': 'Ateşleme',
      'steering': 'Direksiyon',
      'clutch': 'Debriyaj',
      'differential': 'Diferansiyel'
    };
    return translations[specialty.toLowerCase()] || specialty;
  };
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(mechanic.rating);
  const [totalReviews, setTotalReviews] = useState(mechanic.ratingCount || 0);
  const [loading, setLoading] = useState(false);
  const [mechanicDetails, setMechanicDetails] = useState(mechanic);
  
  // Expandable sections state
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [showAllCarBrands, setShowAllCarBrands] = useState(false);
  const [showAllEngineTypes, setShowAllEngineTypes] = useState(false);
  const [showAllTransmissionTypes, setShowAllTransmissionTypes] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    fetchMechanicDetails();
  }, [mechanic.id]);

  const fetchMechanicDetails = async () => {
    try {
      setLoading(true);
      
      // Usta detaylarını getir
      const response = await fetch(`${API_URL}/mechanic/details/${mechanic.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMechanicDetails(data.data);
          
          // Rating bilgilerini güncelle
          if (data.data.ratingStats) {
            setAverageRating(data.data.ratingStats.average);
            setTotalReviews(data.data.ratingStats.total);
          }
          
          // Yorumları güncelle
          if (data.data.ratings && data.data.ratings.length > 0) {
            setReviews(data.data.ratings.map((review: any) => ({
              _id: review._id,
              rating: review.rating,
              comment: review.comment || '',
              createdAt: review.createdAt,
              userId: {
                name: review.userId?.name || 'Kullanıcı',
                surname: review.userId?.surname || ''
              }
            })));
          }
        }
      }
    } catch (error) {
      console.error('Usta detayları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMechanicReviews = async () => {
    try {
      setLoading(true);

      
      // Ortalama puanı getir
      const ratingResponse = await fetch(`${API_URL}/appointment-ratings/mechanic/${mechanic.id}/rating`);

      
      if (ratingResponse.ok) {
        const ratingData = await ratingResponse.json();

        
        if (ratingData.success) {
          setAverageRating(ratingData.data.averageRating);
          setTotalReviews(ratingData.data.totalRatings);
        }
      }

      // Yorumları getir
      const reviewsResponse = await fetch(`${API_URL}/appointment-ratings/mechanic/${mechanic.id}/ratings?limit=20`);

      
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();

        
        if (reviewsData.success) {
          setReviews(reviewsData.data.ratings);
        }
      }
    } catch (error) {
      console.error('Usta bilgileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? '#F59E0B' : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={[styles.reviewCard, { backgroundColor: theme.colors.background.card }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={[styles.reviewerName, { color: theme.colors.text.primary }]}>
            {item.userId.name} {item.userId.surname}
          </Text>
          <Text style={[styles.reviewDate, { color: theme.colors.text.secondary }]}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={styles.reviewRating}>
          {renderStars(item.rating)}
        </View>
      </View>
      {item.comment && (
        <Text style={[styles.reviewComment, { color: theme.colors.text.primary }]}>
          {item.comment}
        </Text>
      )}
    </View>
  );

  const handleBookAppointment = () => {
    navigation.navigate('BookAppointment', {
      mechanicId: mechanic.id,
      mechanicName: mechanic.name,
      mechanicSurname: mechanic.surname
    });
  };

  const handleMessageButton = async () => {
    try {
      // Önce mevcut conversation'ı kontrol et
      const response = await fetch(`${API_URL}/message/conversation/find/${mechanic.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          // Mevcut conversation varsa, ChatScreen'e yönlendir
          navigation.navigate('ChatScreen', {
            conversationId: data.data._id,
            otherParticipant: {
              _id: mechanic.id,
              name: mechanic.name,
              surname: mechanic.surname,
              avatar: mechanic.avatar || 'https://via.placeholder.com/120',
              userType: 'mechanic'
            }
          });
        } else {
          // Conversation yoksa, NewMessage ekranına yönlendir
          navigation.navigate('NewMessage', {
            selectedUser: {
              _id: mechanic.id,
              name: mechanic.name,
              surname: mechanic.surname,
              avatar: mechanic.avatar || 'https://via.placeholder.com/120',
              userType: 'mechanic'
            }
          });
        }
      } else {
        // Hata durumunda NewMessage ekranına yönlendir
        navigation.navigate('NewMessage', {
          selectedUser: {
            _id: mechanic.id,
            name: mechanic.name,
            surname: mechanic.surname,
            avatar: mechanic.avatar || 'https://via.placeholder.com/120',
            userType: 'mechanic'
          }
        });
      }
    } catch (error) {
      console.error('Conversation kontrol hatası:', error);
      // Hata durumunda NewMessage ekranına yönlendir
      navigation.navigate('NewMessage', {
        selectedUser: {
          _id: mechanic.id,
          name: mechanic.name,
          surname: mechanic.surname,
          avatar: mechanic.avatar || 'https://via.placeholder.com/120',
          userType: 'mechanic'
        }
      });
    }
  };

  // Çalışma saatlerini parse eden fonksiyon
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

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Minimal Header */}
      <View style={styles.minimalHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usta Detayı</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Minimal Hero Section */}
        <View style={styles.minimalHeroSection}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: mechanicDetails.avatar || 'https://via.placeholder.com/120' }}
              style={styles.minimalAvatar}
              defaultSource={require('../assets/default_avatar.png')}
            />
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {mechanicDetails.name} {mechanicDetails.surname}
              </Text>
              
              {mechanicDetails.shopName && (
                <Text style={styles.shopName}>
                  {mechanicDetails.shopName}
                </Text>
              )}
              
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
                <View style={styles.locationDetails}>
                  <Text style={styles.locationText}>
                    {mechanic.city || mechanicDetails.city}
                    {mechanic.location?.district && `, ${mechanic.location.district}`}
                    {mechanic.location?.neighborhood && `, ${mechanic.location.neighborhood}`}
                  </Text>
                  {mechanic.location?.street && (
                    <Text style={styles.locationDetailText}>
                      {mechanic.location.street}
                      {mechanic.location.building && `, ${mechanic.location.building}`}
                      {mechanic.location.floor && `, ${mechanic.location.floor}. Kat`}
                      {mechanic.location.apartment && `, Daire: ${mechanic.location.apartment}`}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.ratingRow}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialCommunityIcons 
                      key={star} 
                      name={star <= averageRating ? 'star' : 'star-outline'} 
                      size={16} 
                      color={star <= averageRating ? '#F59E0B' : '#D1D5DB'} 
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {averageRating.toFixed(1)} ({totalReviews} değerlendirme)
                </Text>
              </View>
            </View>
          </View>

          {/* Bio Section */}
          {mechanicDetails.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>{mechanicDetails.bio}</Text>
            </View>
          )}

          {/* Minimal Stats */}
          <View style={styles.minimalStatsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mechanicDetails.totalJobs || mechanic.totalJobs || 0}</Text>
              <Text style={styles.statLabel}>Tamamlanan İş</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mechanicDetails.experience || mechanic.experience || 0}</Text>
              <Text style={styles.statLabel}>Deneyim Yılı</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalReviews}</Text>
              <Text style={styles.statLabel}>Değerlendirme</Text>
            </View>
          </View>

          {/* Minimal Action Buttons */}
          <View style={styles.minimalActionButtons}>
            <TouchableOpacity 
              style={styles.minimalMessageButton}
              onPress={handleMessageButton}
            >
              <MaterialCommunityIcons name="message" size={20} color="#6B7280" />
              <Text style={styles.minimalButtonText}>Mesaj</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.minimalBookButton, 
                { backgroundColor: mechanic.isAvailable ? '#374151' : '#9CA3AF' }
              ]}
              onPress={handleBookAppointment}
              disabled={!mechanic.isAvailable}
            >
              <MaterialCommunityIcons 
                name={mechanic.isAvailable ? "calendar-plus" : "clock-outline"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.minimalBookButtonText}>
                {mechanic.isAvailable ? 'Randevu Al' : 'Meşgul'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rating Distribution */}
        {mechanic.ratingStats && (
          <View style={styles.ratingCard}>
            <Text style={styles.cardTitle}>Değerlendirme Dağılımı</Text>
            <View style={styles.ratingBars}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = mechanic.ratingStats.distribution[star] || 0;
                const percentage = (count / mechanic.ratingStats.total) * 100;
                
                return (
                  <View key={star} style={styles.ratingBarRow}>
                    <Text style={styles.starLabel}>{star} ⭐</Text>
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
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Minimal Skills Card */}
        <View style={styles.minimalCard}>
          <Text style={styles.minimalCardTitle}>Uzmanlık Alanları</Text>
          
          {/* Premium Specialties Section */}
          <View style={styles.skillsSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="star-circle" size={18} color="#F59E0B" />
              <Text style={styles.skillsLabel}>Uzmanlık Alanları</Text>
            </View>
            <View style={styles.skillsRow}>
              {mechanic.specialties && mechanic.specialties.length > 0 ? (
                (showAllSpecialties ? mechanic.specialties : mechanic.specialties.slice(0, 4)).map((specialty, index) => (                                      
                  <View key={index} style={styles.skillTag}>
                    <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />                                                                     
                    <Text style={styles.skillText}>{translateSpecialty(specialty)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>Uzmanlık alanı bilgisi bulunmuyor</Text>
              )}
              {mechanic.specialties && mechanic.specialties.length > 4 && (
                <TouchableOpacity 
                  style={styles.expandableMoreTag}
                  onPress={() => setShowAllSpecialties(!showAllSpecialties)}
                >
                  <MaterialCommunityIcons 
                    name={showAllSpecialties ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#6B7280" 
                  />
                  <Text style={styles.moreText}>
                    {showAllSpecialties 
                      ? "Daha Az" 
                      : `+${mechanic.specialties.length - 4} Devamını Gör`
                    }
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

                     {/* Car Brands Row */}
           {mechanic.carBrands && mechanic.carBrands.length > 0 && (
             <View style={styles.skillsSection}>
               <Text style={styles.skillsLabel}>Uzman Olduğu Markalar</Text>
               <View style={styles.skillsRow}>
                 {(showAllCarBrands ? mechanic.carBrands : mechanic.carBrands.slice(0, 4)).map((brand, index) => (
                   <View key={index} style={styles.brandTag}>
                     <Text style={styles.brandText}>{brand}</Text>
                   </View>
                 ))}
                 {mechanic.carBrands.length > 4 && (
                   <TouchableOpacity 
                     style={styles.expandableMoreTag}
                     onPress={() => setShowAllCarBrands(!showAllCarBrands)}
                   >
                     <MaterialCommunityIcons 
                       name={showAllCarBrands ? "chevron-up" : "chevron-down"} 
                       size={16} 
                       color="#6B7280" 
                     />
                     <Text style={styles.moreText}>
                       {showAllCarBrands 
                         ? "Daha Az" 
                         : `+${mechanic.carBrands.length - 4} Devamını Gör`
                       }
          </Text>
                   </TouchableOpacity>
                 )}
               </View>
             </View>
           )}
        </View>

        {/* Technical Expertise - Compact */}
        {(mechanic.engineTypes?.length > 0 || mechanic.transmissionTypes?.length > 0) && (
          <View style={styles.techCard}>
            <Text style={styles.cardTitle}>⚙️ Teknik Uzmanlık</Text>
            
                         <View style={styles.techCompactGrid}>
               {mechanic.engineTypes && mechanic.engineTypes.length > 0 && (
                 <View style={styles.techCompactSection}>
                   <Text style={styles.techCompactLabel}>Motor</Text>
                   <View style={styles.techCompactTags}>
                     {(showAllEngineTypes ? mechanic.engineTypes : mechanic.engineTypes.slice(0, 3)).map((engine, index) => (
                       <View key={index} style={styles.techCompactTag}>
                         <Text style={styles.techCompactText}>{engine}</Text>
                       </View>
                     ))}
                     {mechanic.engineTypes.length > 3 && (
                       <TouchableOpacity 
                         style={styles.expandableMoreTag}
                         onPress={() => setShowAllEngineTypes(!showAllEngineTypes)}
                       >
                         <MaterialCommunityIcons 
                           name={showAllEngineTypes ? "chevron-up" : "chevron-down"} 
                           size={14} 
                           color="#6B7280" 
                         />
                         <Text style={styles.moreText}>
                           {showAllEngineTypes 
                             ? "Az" 
                             : `+${mechanic.engineTypes.length - 3}`
                           }
                         </Text>
                       </TouchableOpacity>
                     )}
                   </View>
                 </View>
               )}
               
               {mechanic.transmissionTypes && mechanic.transmissionTypes.length > 0 && (
                 <View style={styles.techCompactSection}>
                   <Text style={styles.techCompactLabel}>Vites</Text>
                   <View style={styles.techCompactTags}>
                     {(showAllTransmissionTypes ? mechanic.transmissionTypes : mechanic.transmissionTypes.slice(0, 3)).map((transmission, index) => (
                       <View key={index} style={styles.techCompactTag}>
                         <Text style={styles.techCompactText}>{transmission}</Text>
                       </View>
                     ))}
                     {mechanic.transmissionTypes.length > 3 && (
                       <TouchableOpacity 
                         style={styles.expandableMoreTag}
                         onPress={() => setShowAllTransmissionTypes(!showAllTransmissionTypes)}
                       >
                         <MaterialCommunityIcons 
                           name={showAllTransmissionTypes ? "chevron-up" : "chevron-down"} 
                           size={14} 
                           color="#6B7280" 
                         />
                         <Text style={styles.moreText}>
                           {showAllTransmissionTypes 
                             ? "Az" 
                             : `+${mechanic.transmissionTypes.length - 3}`
                           }
                         </Text>
                       </TouchableOpacity>
                     )}
                   </View>
                 </View>
               )}
             </View>
          </View>
        )}

        {/* Working Hours - Premium Timeline Design */}
        {mechanic.workingHours && (
          <View style={styles.workingHoursCard}>
            <View style={styles.workingHoursHeader}>
              <Text style={styles.cardTitle}>⏰ Çalışma Saatleri</Text>
              <View style={styles.currentStatusBadge}>
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.currentStatusText}>Şu anda açık</Text>
              </View>
            </View>
            
            <View style={styles.weeklyScheduleContainer}>
              {parseWorkingHours(mechanic.workingHours).map((day, index) => {
                const isToday = new Date().getDay() === index + 1;
                return (
                  <View key={index} style={[
                    styles.scheduleTimelineItem,
                    { backgroundColor: isToday ? '#F0F9FF' : 'transparent' }
                  ]}>
                    {/* Timeline Dot */}
                    <View style={styles.timelineDotContainer}>
                      <View style={[
                        styles.timelineDot,
                        { 
                          backgroundColor: day.isWorking ? '#10B981' : '#E5E7EB',
                          borderColor: isToday ? '#3B82F6' : 'transparent',
                          borderWidth: isToday ? 3 : 0
                        }
                      ]} />
                      {index < parseWorkingHours(mechanic.workingHours).length - 1 && (
                        <View style={[
                          styles.timelineLine,
                          { backgroundColor: day.isWorking ? '#10B981' : '#E5E7EB' }
                        ]} />
                      )}
                    </View>
                    
                    {/* Day Info */}
                    <View style={styles.scheduleContent}>
                      <View style={styles.dayHeader}>
                        <Text style={[
                          styles.dayNamePremium,
                          { 
                            color: isToday ? '#3B82F6' : day.isWorking ? '#111827' : '#6B7280',
                            fontWeight: isToday ? '700' : '600'
                          }
                        ]}>
                          {day.day}
                          {isToday && <Text style={styles.todayLabel}> • Bugün</Text>}
                        </Text>
                        
                        {day.isWorking ? (
                          <View style={styles.workingHoursInfo}>
                            <View style={styles.timeSlot}>
                              <MaterialCommunityIcons name="clock-outline" size={16} color="#10B981" />
                              <Text style={styles.workingTimePremium}>
                                {day.startTime} - {day.endTime}
                              </Text>
                            </View>
                            {day.isBreak && (
                              <View style={styles.breakSlot}>
                                <MaterialCommunityIcons name="coffee" size={14} color="#F59E0B" />
                                <Text style={styles.breakTimePremium}>
                                  Mola: {day.breakStartTime} - {day.breakEndTime}
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View style={styles.closedInfo}>
                            <MaterialCommunityIcons name="lock" size={16} color="#6B7280" />
                            <Text style={styles.closedTextPremium}>Kapalı</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
            
            {/* Weekly Summary */}
            <View style={styles.weeklySummary}>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="calendar-check" size={20} color="#10B981" />
                <Text style={styles.summaryText}>
                  {parseWorkingHours(mechanic.workingHours).filter(day => day.isWorking).length} gün açık
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="clock-time-four" size={20} color="#3B82F6" />
                <Text style={styles.summaryText}>Haftalık 45+ saat</Text>
              </View>
            </View>
          </View>
        )}

        {/* Contact Info */}
        {mechanic.phone && (
          <View style={styles.contactCard}>
            <Text style={styles.cardTitle}>📞 İletişim Bilgileri</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phoneInfo}>
                <View style={styles.phoneIcon}>
                  <MaterialCommunityIcons name="phone" size={20} color="#10B981" />
                </View>
                <Text style={styles.phoneText}>{mechanic.phone}</Text>
              </View>
              {/* Arama Butonu */}
              <TouchableOpacity 
                style={styles.callButton}
                                        onPress={() => {
                          // Telefon numarasını arama uygulamasında aç
                          if (mechanic.phone) {
                            Linking.openURL(`tel:${mechanic.phone}`);
                          }
                        }}
              >
                <MaterialCommunityIcons name="phone-plus" size={16} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Ara</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Insurance Info */}
        {mechanicDetails.documents?.insurance && (
          <View style={styles.insuranceCard}>
            <Text style={styles.cardTitle}>🛡️ Sigorta Bilgileri</Text>
            <View style={styles.insuranceRow}>
              <View style={styles.insuranceIcon}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" />
              </View>
              <View style={styles.insuranceInfo}>
                <Text style={styles.insuranceLabel}>Mesleki Sorumluluk Sigortası</Text>
                <Text style={styles.insuranceText}>{mechanicDetails.documents.insurance}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Custom Brands */}
        {mechanicDetails.customBrands && mechanicDetails.customBrands.length > 0 && (
          <View style={styles.customBrandsCard}>
            <Text style={styles.cardTitle}>🏷️ Özel Markalar</Text>
            <View style={styles.brandsGrid}>
              {mechanicDetails.customBrands.map((brand, index) => (
                <View key={index} style={styles.customBrandTag}>
                  <Text style={styles.customBrandText}>{brand}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Supported Brands */}
        {mechanicDetails.supportedBrands && mechanicDetails.supportedBrands.length > 0 && (
          <View style={styles.supportedBrandsCard}>
            <Text style={styles.cardTitle}>✅ Desteklenen Markalar</Text>
            <View style={styles.brandsGrid}>
              {mechanicDetails.supportedBrands.map((brand, index) => (
                <View key={index} style={styles.supportedBrandTag}>
                  <MaterialCommunityIcons name="check" size={14} color="#10B981" />
                  <Text style={styles.supportedBrandText}>{brand}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Wash Services */}
        {(mechanicDetails.washPackages && mechanicDetails.washPackages.length > 0) || (mechanicDetails.washOptions && mechanicDetails.washOptions.length > 0) ? (
          <View style={styles.washServicesCard}>
            <Text style={styles.cardTitle}>🚿 Yıkama Hizmetleri</Text>
            
            {mechanicDetails.washPackages && mechanicDetails.washPackages.length > 0 && (
              <View style={styles.washSection}>
                <Text style={styles.washSectionTitle}>Yıkama Paketleri</Text>
                {mechanicDetails.washPackages.map((pkg, index) => (
                  <View key={index} style={styles.washPackageCard}>
                    <View style={styles.washPackageHeader}>
                      <Text style={styles.washPackageName}>{pkg.name}</Text>
                      <Text style={styles.washPackagePrice}>{pkg.price}₺</Text>
                    </View>
                    <Text style={styles.washPackageDescription}>{pkg.description}</Text>
                    <Text style={styles.washPackageDuration}>⏱️ {pkg.duration}</Text>
                    <View style={styles.washPackageFeatures}>
                      {pkg.features.map((feature, featureIndex) => (
                        <Text key={featureIndex} style={styles.washPackageFeature}>• {feature}</Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {mechanicDetails.washOptions && mechanicDetails.washOptions.length > 0 && (
              <View style={styles.washSection}>
                <Text style={styles.washSectionTitle}>Ek Hizmetler</Text>
                {mechanicDetails.washOptions.map((option, index) => (
                  <View key={index} style={styles.washOptionCard}>
                    <Text style={styles.washOptionName}>{option.name}</Text>
                    <Text style={styles.washOptionPrice}>{option.price}₺</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Recent Appointments */}
        {mechanicDetails.recentAppointments && mechanicDetails.recentAppointments.length > 0 && (
          <View style={styles.recentAppointmentsCard}>
            <Text style={styles.cardTitle}>📅 Son Randevular</Text>
            {mechanicDetails.recentAppointments.map((appointment, index) => (
              <View key={index} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentDate}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.appointmentDateText}>
                      {new Date(appointment.appointmentDate).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  <View style={[
                    styles.appointmentStatus,
                    { backgroundColor: appointment.status === 'completed' ? '#D1FAE5' : '#FEF3C7' }
                  ]}>
                    <Text style={[
                      styles.appointmentStatusText,
                      { color: appointment.status === 'completed' ? '#065F46' : '#92400E' }
                    ]}>
                      {appointment.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.appointmentService}>{appointment.serviceType}</Text>
                {appointment.vehicleInfo && (
                  <View style={styles.appointmentVehicle}>
                    <MaterialCommunityIcons name="car" size={14} color="#6B7280" />
                    <Text style={styles.appointmentVehicleText}>
                      {appointment.vehicleInfo.brand} {appointment.vehicleInfo.modelName} - {appointment.vehicleInfo.plateNumber}
                    </Text>
                  </View>
                )}
                {appointment.customerInfo && (
                  <View style={styles.appointmentCustomer}>
                    <MaterialCommunityIcons name="account" size={14} color="#6B7280" />
                    <Text style={styles.appointmentCustomerText}>
                      {appointment.customerInfo.name} {appointment.customerInfo.surname}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Minimal Reviews Section */}
        <View style={styles.minimalCard}>
          <Text style={styles.minimalCardTitle}>Müşteri Yorumları ({totalReviews})</Text>
          
          {loading ? (
            <View style={styles.loadingCard}>
              <MaterialCommunityIcons name="loading" size={32} color="#9CA3AF" />
              <Text style={styles.loadingText}>Yorumlar yükleniyor...</Text>
            </View>
          ) : reviews.length > 0 ? (
            <>
              {/* Premium Review Cards */}
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>
                          {review.userId.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewerDetails}>
                        <Text style={styles.reviewerName}>
                          {review.userId.name} {review.userId.surname}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialCommunityIcons 
                          key={star} 
                          name={star <= review.rating ? 'star' : 'star-outline'} 
                          size={16} 
                          color={star <= review.rating ? '#F59E0B' : '#D1D5DB'} 
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <View style={styles.commentContainer}>
                      <MaterialCommunityIcons name="format-quote-open" size={16} color="#D1D5DB" />
                      <Text style={styles.reviewComment} numberOfLines={showAllReviews ? undefined : 3}>
                        {review.comment}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              
              {/* Expandable Button */}
              {reviews.length > 3 && (
                <TouchableOpacity 
                  style={styles.expandableReviewsButton}
                  onPress={() => setShowAllReviews(!showAllReviews)}
                >
                  <MaterialCommunityIcons 
                    name={showAllReviews ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6B7280" 
                  />
                  <Text style={styles.expandableReviewsText}>
                    {showAllReviews 
                      ? "Daha Az Göster" 
                      : `+${reviews.length - 3} Yorum Daha Göster`
                    }
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.noReviewsCard}>
              <MaterialCommunityIcons name="comment-outline" size={32} color="#9CA3AF" />
              <Text style={styles.noReviewsText}>
                Henüz yorum yapılmamış
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchMechanicReviews}
              >
                <MaterialCommunityIcons name="refresh" size={16} color="#6B7280" />
                <Text style={styles.refreshButtonText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Minimal Header Styles
  minimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  minimalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  minimalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  minimalStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  minimalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  minimalMessageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  minimalBookButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  minimalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  minimalBookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  minimalHeroSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  minimalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  professionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 4,
  },
  professionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  shopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationDetails: {
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#6B7280',
  },
  locationDetailText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationDetailText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
    marginTop: 2,
  },
  ratingSection: {
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  bioSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  bookButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewsCountBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBars: {
    gap: 16,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  starLabel: {
    width: 50,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barCount: {
    width: 40,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    color: '#6B7280',
  },
  specialtiesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specialtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#065F46',
  },
  carBrandsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  brandText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  techCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  techSection: {
    marginBottom: 20,
  },
  techLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  techGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  techTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  techText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
  },
  workingHoursCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  workingHoursGrid: {
    gap: 12,
  },
  workingDayCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeInfo: {
    gap: 4,
  },
  workingTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  closedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  phoneText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  reviewsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    gap: 8,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    fontStyle: 'italic',
  },
  noReviewsCard: {
    backgroundColor: '#F9FAFB',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  reviewRating: {
    marginLeft: 8,
  },

  loadingCard: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  skillsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  skillsSection: {
    marginBottom: 20,
  },
  skillsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  skillText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    color: '#065F46',
  },
  moreTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  moreText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  techCompactGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  techCompactSection: {
    flex: 1,
  },
  techCompactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  techCompactTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  techCompactTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  techCompactText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7C3AED',
  },
  workingHoursCompactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  workingDayCompactCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayCompactName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  workingCompactTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  closedCompactText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  // Expandable More Tag
  expandableMoreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Premium Working Hours Styles
  workingHoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  currentStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  weeklyScheduleContainer: {
    marginBottom: 24,
  },
  scheduleTimelineItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  timelineDotContainer: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  timelineLine: {
    position: 'absolute',
    top: 20,
    width: 2,
    height: 40,
    borderRadius: 1,
  },
  scheduleContent: {
    flex: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayNamePremium: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  workingHoursInfo: {
    alignItems: 'flex-end',
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workingTimePremium: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 6,
  },
  breakSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakTimePremium: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
    marginLeft: 4,
  },
  closedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closedTextPremium: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  weeklySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 8,
  },
  // Expandable Reviews Button
  expandableReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    marginHorizontal: 4,
  },
  expandableReviewsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 8,
  },
  // Arama butonu stilleri
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Insurance Card Styles
  insuranceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  insuranceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insuranceInfo: {
    flex: 1,
  },
  insuranceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  insuranceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Custom Brands Styles
  customBrandsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  supportedBrandsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customBrandTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customBrandText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  supportedBrandTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportedBrandText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Wash Services Styles
  washServicesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  washSection: {
    marginBottom: 16,
  },
  washSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  washPackageCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  washPackageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  washPackageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  washPackagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  washPackageDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  washPackageDuration: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  washPackageFeatures: {
    marginTop: 8,
  },
  washPackageFeature: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  washOptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  washOptionName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  washOptionPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  // Recent Appointments Styles
  recentAppointmentsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentDateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  appointmentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appointmentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  appointmentVehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentVehicleText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  appointmentCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentCustomerText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },

});

export default MechanicDetailScreen;
