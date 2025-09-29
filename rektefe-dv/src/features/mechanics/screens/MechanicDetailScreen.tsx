import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

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
  reviews?: any[];
  phone?: string;
  email?: string;
  address?: string;
  isOnline?: boolean;
}

const MechanicDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { mechanic } = route.params as { mechanic: Mechanic };
  
  const [mechanicDetails, setMechanicDetails] = useState<Mechanic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Animasyonları başlat
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Usta detaylarını yükle
    loadMechanicDetails();
  }, []);

  const loadMechanicDetails = async () => {
    try {
      // API'den usta detaylarını yükle
      // const response = await apiService.getMechanicDetails(mechanic.id);
      // setMechanicDetails(response.data);
      
      // Şimdilik mock data kullan
      setMechanicDetails({
        ...mechanic,
        rating: 4.8,
        totalJobs: 1247,
        experience: 8,
        specialties: ['Motor Tamiri', 'Fren Sistemi', 'Elektrik', 'Klima'],
        reviews: [
          {
            id: 1,
            userName: 'Ahmet Y.',
            rating: 5,
            comment: 'Çok profesyonel ve hızlı. Kesinlikle tavsiye ederim.',
            date: '2024-01-15',
          },
          {
            id: 2,
            userName: 'Fatma K.',
            rating: 4,
            comment: 'İşini çok iyi yapıyor. Fiyatlar da uygun.',
            date: '2024-01-10',
          },
        ],
        phone: '+90 555 123 45 67',
        email: 'usta@example.com',
        address: 'İstanbul, Kadıköy',
        isOnline: true,
      });
    } catch (error) {
      console.error('Usta detayları yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = () => {
    const currentMechanic = mechanicDetails || mechanic;
    const mechanicId = currentMechanic.id || currentMechanic._id;
    
    console.log('Randevu için usta bilgileri:', {
      mechanicId,
      name: currentMechanic.name,
      surname: currentMechanic.surname,
    });

    navigation.navigate('BookAppointment' as never, {
      mechanicId,
      mechanicName: currentMechanic.name,
      mechanicSurname: currentMechanic.surname,
    } as never);
  };

  const handleMessage = () => {
    const currentMechanic = mechanicDetails || mechanic;
    const mechanicId = currentMechanic.id || currentMechanic._id;
    
    console.log('Mesaj için usta bilgileri:', {
      mechanicId,
      name: currentMechanic.name,
      surname: currentMechanic.surname,
    });

    navigation.navigate('Chat' as never, {
      mechanicId,
      mechanicName: currentMechanic.name,
      mechanicSurname: currentMechanic.surname,
    } as never);
  };

  const handleCall = () => {
    const phoneNumber = mechanicDetails?.phone;
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: API'ye favori durumunu kaydet
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <MaterialCommunityIcons
        key={index}
        name={index < Math.floor(rating) ? 'star' : 'star-outline'}
        size={16}
        color="#FFD700"
      />
    ));
  };

  const renderSpecialtyChip = (specialty: string, index: number) => (
    <Animated.View
      key={index}
      style={[
        styles.specialtyChip,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
      <Text style={styles.specialtyText}>{specialty}</Text>
    </Animated.View>
  );

  const renderReviewCard = (review: any, index: number) => (
    <Animated.View
      key={review.id}
      style={[
        styles.reviewCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerAvatar}>
          <Text style={styles.reviewerInitial}>
            {review.userName.charAt(0)}
          </Text>
        </View>
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewerName}>{review.userName}</Text>
          <View style={styles.reviewRating}>
            {renderStars(review.rating)}
            <Text style={styles.reviewDate}>{review.date}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <MaterialCommunityIcons name="wrench" size={60} color="#007AFF" />
          <Text style={styles.loadingText}>Usta bilgileri yükleniyor...</Text>
        </Animated.View>
      </View>
    );
  }

  const currentMechanic = mechanicDetails || mechanic;

  return (
    <View style={styles.container}>
      {/* Header with Gradient Background */}
      <LinearGradient
        colors={['#007AFF', '#5856D6', '#AF52DE']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <BlurView intensity={20} style={styles.headerBlur}>
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={toggleFavorite}
              >
                <MaterialCommunityIcons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? '#FF3B30' : '#fff'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mechanic Avatar */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Image
              source={{ uri: currentMechanic.avatar || 'https://via.placeholder.com/150?text=U' }}
              style={styles.avatar}
            />
            {currentMechanic.isOnline && (
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
              </View>
            )}
          </Animated.View>

          {/* Mechanic Name */}
          <Animated.View
            style={[
              styles.nameContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.mechanicName}>
              {currentMechanic.name} {currentMechanic.surname}
            </Text>
            <Text style={styles.mechanicTitle}>Profesyonel Usta</Text>
          </Animated.View>
        </BlurView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clock-outline" size={32} color="#007AFF" />
            <Text style={styles.statNumber}>{currentMechanic.experience}</Text>
            <Text style={styles.statLabel}>Yıl Deneyim</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="wrench" size={32} color="#34C759" />
            <Text style={styles.statNumber}>{currentMechanic.totalJobs}</Text>
            <Text style={styles.statLabel}>Tamamlanan İş</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star" size={32} color="#FFD700" />
            <Text style={styles.statNumber}>{currentMechanic.rating}</Text>
            <Text style={styles.statLabel}>Puan</Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.primaryButton} onPress={handleBookAppointment}>
            <LinearGradient
              colors={['#007AFF', '#5856D6']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="calendar-plus" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Randevu Al</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleMessage}>
              <MaterialCommunityIcons name="message-text" size={24} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Mesaj</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={24} color="#34C759" />
              <Text style={styles.secondaryButtonText}>Ara</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Specialties */}
        {currentMechanic.specialties && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Uzmanlık Alanları</Text>
            <View style={styles.specialtiesContainer}>
              {currentMechanic.specialties.map(renderSpecialtyChip)}
            </View>
          </Animated.View>
        )}

        {/* Reviews */}
        {currentMechanic.reviews && currentMechanic.reviews.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Müşteri Yorumları</Text>
            {currentMechanic.reviews.map(renderReviewCard)}
          </Animated.View>
        )}

        {/* Contact Information */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
            <MaterialCommunityIcons name="phone" size={24} color="#007AFF" />
            <Text style={styles.contactText}>{currentMechanic.phone}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem}>
            <MaterialCommunityIcons name="email" size={24} color="#007AFF" />
            <Text style={styles.contactText}>{currentMechanic.email}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#007AFF" />
            <Text style={styles.contactText}>{currentMechanic.address}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  header: {
    height: height * 0.4,
    justifyContent: 'flex-end',
  },
  headerBlur: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
  },
  nameContainer: {
    alignItems: 'center',
  },
  mechanicName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  mechanicTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginTop: -30,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  reviewComment: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default MechanicDetailScreen;