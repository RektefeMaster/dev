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
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(mechanic.rating);
  const [totalReviews, setTotalReviews] = useState(mechanic.ratingCount || 0);
  const [loading, setLoading] = useState(false);
  
  // Expandable sections state
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [showAllCarBrands, setShowAllCarBrands] = useState(false);
  const [showAllEngineTypes, setShowAllEngineTypes] = useState(false);
  const [showAllTransmissionTypes, setShowAllTransmissionTypes] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    // Eğer mechanic'te zaten detaylı bilgiler varsa kullan
    if (mechanic.ratingStats) {
      setAverageRating(mechanic.ratingStats.average);
      setTotalReviews(mechanic.ratingStats.total);
    }
    
    if (mechanic.recentReviews && mechanic.recentReviews.length > 0) {
      console.log('🔍 Mechanic\'ten gelen yorumlar:', mechanic.recentReviews);
      setReviews(mechanic.recentReviews.map(review => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment || '',
        createdAt: review.createdAt,
        userId: {
          name: review.userName.split(' ')[0],
          surname: review.userName.split(' ').slice(1).join(' ')
        }
      })));
    } else {
      console.log('🔍 Yorumlar bulunamadı, API\'den çekiliyor...');
    fetchMechanicReviews();
    }
  }, [mechanic]);

  const fetchMechanicReviews = async () => {
    try {
      setLoading(true);
      console.log('🔍 API\'den yorumlar çekiliyor... Mechanic ID:', mechanic.id);
      
      // Ortalama puanı getir
      const ratingResponse = await fetch(`${API_URL}/appointment-ratings/mechanic/${mechanic.id}/rating`);
      console.log('📊 Rating response status:', ratingResponse.status);
      
      if (ratingResponse.ok) {
        const ratingData = await ratingResponse.json();
        console.log('📊 Rating data:', ratingData);
        
        if (ratingData.success) {
          setAverageRating(ratingData.data.averageRating);
          setTotalReviews(ratingData.data.totalRatings);
        }
      }

      // Yorumları getir
      const reviewsResponse = await fetch(`${API_URL}/appointment-ratings/mechanic/${mechanic.id}/ratings?limit=20`);
      console.log('💬 Reviews response status:', reviewsResponse.status);
      
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        console.log('💬 Reviews data:', reviewsData);
        
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
    <View style={[styles.reviewCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={[styles.reviewerName, { color: theme.colors.text }]}>
            {item.userId.name} {item.userId.surname}
          </Text>
          <Text style={[styles.reviewDate, { color: theme.colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <View style={styles.reviewRating}>
          {renderStars(item.rating)}
        </View>
      </View>
      {item.comment && (
        <Text style={[styles.reviewComment, { color: theme.colors.text }]}>
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
      const response = await fetch(`${API_URL}/messages/conversation/find/${mechanic.id}`, {
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
            otherParticipant: data.data.otherParticipant
          });
        } else {
          // Conversation yoksa, NewMessage ekranına yönlendir
          navigation.navigate('NewMessage', {
            selectedUser: {
              _id: mechanic.id,
              name: mechanic.name,
              surname: mechanic.surname,
              avatar: mechanic.avatar,
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
            avatar: mechanic.avatar,
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
          avatar: mechanic.avatar,
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
      {/* Modern Header */}
      <View style={styles.modernHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity style={styles.shareButton}>
          <MaterialCommunityIcons name="share-variant" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section - Instagram Tarzı */}
        <View style={styles.heroSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarSection}>
            <Image
                source={{ uri: mechanic.avatar || 'https://via.placeholder.com/120' }}
                style={styles.profileAvatar}
              defaultSource={require('../assets/default_avatar.png')}
            />
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: mechanic.isAvailable ? '#10B981' : '#EF4444' }
              ]} />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {mechanic.name} {mechanic.surname}
              </Text>
              
              {mechanic.shopName && (
                <Text style={styles.shopName}>
                  {mechanic.shopName}
                </Text>
              )}
              
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
                <Text style={styles.locationText}>
                {mechanic.city}
                  {mechanic.location?.district && `, ${mechanic.location.district}`}
                </Text>
              </View>
              
              <View style={styles.ratingRow}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialCommunityIcons 
                      key={star} 
                      name={star <= averageRating ? 'star' : 'star-outline'} 
                      size={18} 
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
          {mechanic.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>{mechanic.bio}</Text>
            </View>
          )}

          {/* Stats Row - Instagram Tarzı */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mechanic.totalJobs}</Text>
              <Text style={styles.statLabel}>Tamamlanan İş</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mechanic.experience}</Text>
              <Text style={styles.statLabel}>Deneyim Yılı</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalReviews}</Text>
              <Text style={styles.statLabel}>Değerlendirme</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={handleMessageButton}
            >
              <MaterialCommunityIcons name="message" size={20} color="#3B82F6" />
              <Text style={styles.messageButtonText}>Mesaj</Text>
            </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.bookButton, 
                { backgroundColor: mechanic.isAvailable ? '#10B981' : '#6B7280' }
            ]}
            onPress={handleBookAppointment}
            disabled={!mechanic.isAvailable}
            >
              <MaterialCommunityIcons name="calendar-plus" size={20} color="#FFFFFF" />
              <Text style={styles.bookButtonText}>
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

        {/* Skills & Expertise - Combined Card */}
        <View style={styles.skillsCard}>
          <Text style={styles.cardTitle}>🔧 Uzmanlık & Markalar</Text>
          
                     {/* Specialties Row */}
           <View style={styles.skillsSection}>
             <Text style={styles.skillsLabel}>Uzmanlık Alanları</Text>
             <View style={styles.skillsRow}>
               {(showAllSpecialties ? mechanic.specialties : mechanic.specialties.slice(0, 4)).map((specialty, index) => (
                 <View key={index} style={styles.skillTag}>
                   <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                   <Text style={styles.skillText}>{specialty}</Text>
                 </View>
               ))}
               {mechanic.specialties.length > 4 && (
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

        {/* Reviews Section */}
        <View style={styles.reviewsCard}>
          <Text style={styles.cardTitle}>💬 Müşteri Yorumları ({totalReviews})</Text>
          
          {loading ? (
            <View style={styles.loadingCard}>
              <MaterialCommunityIcons name="loading" size={32} color="#9CA3AF" />
              <Text style={styles.loadingText}>Yorumlar yükleniyor...</Text>
            </View>
          ) : reviews.length > 0 ? (
            <>
              {/* Show first 3 reviews or all if expanded */}
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>
                          {review.userId.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
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
                    <Text style={styles.reviewComment} numberOfLines={showAllReviews ? undefined : 3}>
                      "{review.comment}"
              </Text>
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
  // Modern Instagram tarzı stiller
  modernHeader: {
    backgroundColor: '#1F2937',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginBottom: 16,
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
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
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
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  ratingRow: {
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  bookButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
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

});

export default MechanicDetailScreen;
