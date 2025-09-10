import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Spacing from '../components/Spacing';
import { API_URL } from '../constants/config';

interface Rating {
  _id: string;
  appointmentId: {
    _id: string;
    serviceType: string;
    appointmentDate: string;
    vehicleId: {
      brand: string;
      modelName: string;
      plateNumber: string;
    };
  };
  mechanicId: {
    _id: string;
    userId: {
      name: string;
      surname: string;
    };
    shopName: string;
    name?: string; // Fallback için
    surname?: string; // Fallback için
  };
  rating: number;
  comment: string;
  createdAt: string;
}

export const MyRatingsScreen: React.FC = ({ route }: any) => {
  const { token } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyRatings = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/appointment-ratings/my-ratings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });


      if (response.ok) {
        const data = await response.json();
        
        if (data && data.success && data.data && data.data.ratings && Array.isArray(data.data.ratings)) {
          
          // Her rating'in populate edilmiş verilerini kontrol et
          data.data.ratings.forEach((rating: any, index: number) => {
          });
          
          setRatings(data.data.ratings);
        } else if (data && data.success && data.data && Array.isArray(data.data)) {
          setRatings(data.data);
        } else {
          setRatings([]);
        }
      } else {
        const errorText = await response.text();
        setRatings([]);
      }
    } catch (error) {
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyRatings();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMyRatings();
  }, [token]);

  // Route parametresinden refresh gelirse verileri yenile
  useEffect(() => {
    if (route?.params?.refresh) {
      fetchMyRatings();
      // Parametreyi temizle
      route.params.refresh = false;
    }
  }, [route?.params?.refresh]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Dün';
    if (diffDays === 2) return 'Önceki gün';
    if (diffDays <= 7) return `${diffDays} gün önce`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    if (diffDays <= 365) return `${Math.floor(diffDays / 30)} ay önce`;
    return `${Math.floor(diffDays / 365)} yıl önce`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Bugün';
    if (date.toDateString() === tomorrow.toDateString()) return 'Yarın';
    
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <MaterialCommunityIcons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={20}
          color={i <= rating ? '#FFD700' : '#94A3B8'}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const getServiceTypeText = (serviceType: string) => {
    const serviceTypes: { [key: string]: string } = {
      'genel-bakim': 'Genel Bakım',
      'elektrik-elektronik': 'Elektrik & Elektronik',
      'kaporta-boya': 'Kaporta & Boya',
      'ust-takim': 'Üst Takım',
      'alt-takim': 'Alt Takım',
      'agir-bakim': 'Ağır Bakım',
      'yedek-parca': 'Yedek Parça',
      'lastik': 'Lastik Servisi',
      'ekspertiz': 'Ekspertiz',
      'egzoz-emisyon': 'Egzoz & Emisyon',
      'sigorta-kasko': 'Sigorta & Kasko',
      'arac-yikama': 'Araç Yıkama',
    };
    return serviceTypes[serviceType] || serviceType;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            Puanlarınız yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Verdiğim Puanlar
        </Text>
        <Text style={styles.subtitle}>
          Ustalara verdiğiniz değerlendirmeler
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {!ratings || ratings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="star-outline"
              size={80}
              color="#94A3B8"
            />
            <Text style={styles.emptyTitle}>
              Henüz Puan Vermediniz
            </Text>
            <Text style={styles.emptySubtitle}>
              Ustalara verdiğiniz puanlar burada görünecek
            </Text>
          </View>
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <Card style={styles.statCard}>
                <MaterialCommunityIcons
                  name="star"
                  size={32}
                  color="#2563EB"
                  style={styles.statIcon}
                />
                <Text style={styles.statText}>
                  {ratings.length}
                </Text>
                <Text style={styles.statCaption}>
                  Toplam Puan
                </Text>
              </Card>
              
              <Card style={styles.statCard}>
                <MaterialCommunityIcons
                  name="star-half"
                  size={32}
                  color="#F59E0B"
                  style={styles.statIcon}
                />
                <Text style={styles.statText}>
                  {ratings.length > 0 ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.statCaption}>
                  Ortalama Puan
                </Text>
              </Card>
            </View>

            <Spacing size="lg" />

            {/* Rating Cards */}
            {ratings.map((rating) => (
              <Card key={rating._id} style={styles.ratingCard}>
                {/* Mechanic Header */}
                <View style={styles.mechanicHeader}>
                  <View style={styles.mechanicInfo}>
                    <View style={styles.mechanicAvatar}>
                      <MaterialCommunityIcons
                        name="account-wrench"
                        size={24}
                        color="#2563EB"
                      />
                    </View>
                    <View style={styles.mechanicText}>
                      <Text style={styles.mechanicName}>
                        {rating.mechanicId?.userId?.name || rating.mechanicId?.name || 'Bilinmeyen Usta'} {rating.mechanicId?.userId?.surname || rating.mechanicId?.surname || ''}
                      </Text>
                      {rating.mechanicId?.shopName && (
                        <Text style={styles.mechanicShop}>
                          {rating.mechanicId.shopName}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.ratingDisplay}>
                    {renderStars(rating.rating)}
                    <Text style={styles.ratingValue}>
                      {rating.rating}/5
                    </Text>
                  </View>
                </View>

                {/* Service Details */}
                <View style={styles.serviceDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="wrench" size={18} color="#64748B" />
                    <Text style={styles.detailLabel}>
                      Hizmet:
                    </Text>
                    <Text style={styles.detailValue}>
                      {rating.appointmentId?.serviceType ? getServiceTypeText(rating.appointmentId.serviceType) : 'Bilinmeyen'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="car" size={18} color="#64748B" />
                    <Text style={styles.detailLabel}>
                      Araç:
                    </Text>
                    <Text style={styles.detailValue}>
                      {rating.appointmentId?.vehicleId?.brand || 'Bilinmeyen'} {rating.appointmentId?.vehicleId?.modelName || ''}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="car-key" size={18} color="#64748B" />
                    <Text style={styles.detailLabel}>
                      Plaka:
                    </Text>
                    <Text style={styles.detailValue}>
                      {rating.appointmentId?.vehicleId?.plateNumber || 'Bilinmeyen'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="calendar-clock" size={18} color="#64748B" />
                    <Text style={styles.detailLabel}>
                      Randevu:
                    </Text>
                    <Text style={styles.detailValue}>
                      {rating.appointmentId?.appointmentDate ? formatAppointmentDate(rating.appointmentId.appointmentDate) : 'Bilinmeyen'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#64748B" />
                    <Text style={styles.detailLabel}>
                      Saat:
                    </Text>
                    <Text style={styles.detailValue}>
                      {rating.appointmentId?.appointmentDate ? new Date(rating.appointmentId.appointmentDate).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Bilinmeyen'}
                    </Text>
                  </View>
                </View>

                {/* Comment */}
                {rating.comment && (
                  <View style={styles.commentSection}>
                    <Text style={styles.commentTitle}>
                      Yorumunuz
                    </Text>
                    <Text style={styles.commentText}>
                      "{rating.comment}"
                    </Text>
                  </View>
                )}

                {/* Rating Date */}
                <View style={styles.ratingDate}>
                  <MaterialCommunityIcons name="star-check" size={16} color="#10B981" />
                  <Text style={styles.dateText}>
                    Puan verildi: {formatDateTime(rating.createdAt)}
                  </Text>
                  <Text style={styles.relativeDate}>
                    ({formatDate(rating.createdAt)})
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#2563EB',
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.9,
    color: 'white',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#374151',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    marginTop: 24,
    marginBottom: 12,
    color: '#374151',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    color: '#6B7280',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIcon: {
    marginBottom: 12,
  },
  statText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  statCaption: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 'medium',
  },
  ratingCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mechanicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mechanicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mechanicAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mechanicText: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  mechanicShop: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  ratingDisplay: {
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  serviceDetails: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    marginLeft: 8,
    marginRight: 8,
    minWidth: 50,
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'medium',
    color: '#374151',
    flex: 1,
  },
  commentSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: 'semibold',
    color: '#374151',
    marginBottom: 8,
  },
  commentText: {
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 20,
    fontSize: 14,
    color: '#6B7280',
  },
  ratingDate: {
    alignItems: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dateText: {
    marginLeft: 8,
    marginBottom: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  relativeDate: {
    fontSize: 11,
    opacity: 0.7,
  },
});
