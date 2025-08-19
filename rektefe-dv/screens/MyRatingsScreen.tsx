import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Typography } from '../components/Typography';
import { Card } from '../components/Card';
import { Spacing } from '../components/Spacing';
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
  };
  rating: number;
  comment: string;
  createdAt: string;
}

export const MyRatingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/appointment-ratings/my-ratings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRatings(data.data || []);
      } else {
        console.error('Puanlar getirilemedi:', response.status);
        Alert.alert('Hata', 'Puanlarınız getirilemedi');
      }
    } catch (error) {
      console.error('Puanlar getirme hatası:', error);
      Alert.alert('Hata', 'Puanlarınız getirilirken bir hata oluştu');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
          color={i <= rating ? '#FFD700' : theme.colors.textTertiary}
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
      'lastik': 'Lastik',
      'ekspertiz': 'Ekspertiz',
      'egzoz-emisyon': 'Egzoz & Emisyon',
      'sigorta-kasko': 'Sigorta & Kasko',
      'arac-yikama': 'Araç Yıkama',
    };
    return serviceTypes[serviceType] || serviceType;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography variant="body" style={styles.loadingText}>
            Puanlarınız yükleniyor...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Typography variant="h1" color="white" weight="bold">
          Verdiğim Puanlar
        </Typography>
        <Typography variant="body2" color="white" style={styles.subtitle}>
          Ustalara verdiğiniz değerlendirmeler
        </Typography>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {ratings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="star-outline"
              size={64}
              color={theme.colors.textTertiary}
            />
            <Typography variant="h3" color="secondary" style={styles.emptyTitle}>
              Henüz Puan Vermediniz
            </Typography>
            <Typography variant="body2" color="secondary" style={styles.emptySubtitle}>
              Ustalara verdiğiniz puanlar burada görünecek
            </Typography>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                <Typography variant="h2" color="primary" weight="bold">
                  {ratings.length}
                </Typography>
                <Typography variant="caption" color="secondary">
                  Toplam Puan
                </Typography>
              </Card>
              <Card style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                <Typography variant="h2" color="primary" weight="bold">
                  {(ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)}
                </Typography>
                <Typography variant="caption" color="secondary">
                  Ortalama Puan
                </Typography>
              </Card>
            </View>

            <Spacing size="md" />

            {ratings.map((rating) => (
              <Card key={rating._id} style={[styles.ratingCard, { backgroundColor: theme.colors.card }]}>
                {/* Header */}
                <View style={styles.ratingHeader}>
                  <View style={styles.mechanicInfo}>
                    <MaterialCommunityIcons
                      name="account-wrench"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={styles.mechanicText}>
                      <Typography variant="body" weight="semibold">
                        {rating.mechanicId.userId.name} {rating.mechanicId.userId.surname}
                      </Typography>
                      {rating.mechanicId.shopName && (
                        <Typography variant="caption" color="secondary">
                          {rating.mechanicId.shopName}
                        </Typography>
                      )}
                    </View>
                  </View>
                  <View style={styles.ratingInfo}>
                    {renderStars(rating.rating)}
                    <Typography variant="caption" color="secondary">
                      {rating.rating}/5
                    </Typography>
                  </View>
                </View>

                {/* Service Info */}
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceRow}>
                    <MaterialCommunityIcons
                      name="wrench"
                      size={16}
                      color={theme.colors.textTertiary}
                    />
                    <Typography variant="body2" color="secondary">
                      {getServiceTypeText(rating.appointmentId.serviceType)}
                    </Typography>
                  </View>
                  <View style={styles.serviceRow}>
                    <MaterialCommunityIcons
                      name="car"
                      size={16}
                      color={theme.colors.textTertiary}
                    />
                    <Typography variant="body2" color="secondary">
                      {rating.appointmentId.vehicleId.brand} {rating.appointmentId.vehicleId.modelName} ({rating.appointmentId.vehicleId.plateNumber})
                    </Typography>
                  </View>
                  <View style={styles.serviceRow}>
                    <MaterialCommunityIcons
                      name="calendar"
                      size={16}
                      color={theme.colors.textTertiary}
                    />
                    <Typography variant="body2" color="secondary">
                      {formatDate(rating.appointmentId.appointmentDate)}
                    </Typography>
                  </View>
                </View>

                {/* Comment */}
                {rating.comment && (
                  <View style={styles.commentContainer}>
                    <Typography variant="body2" weight="medium" style={styles.commentLabel}>
                      Yorumunuz:
                    </Typography>
                    <Typography variant="body2" color="secondary" style={styles.commentText}>
                      "{rating.comment}"
                    </Typography>
                  </View>
                )}

                {/* Date */}
                <View style={styles.dateContainer}>
                  <Typography variant="caption" color="tertiary">
                    Puan verildi: {formatDate(rating.createdAt)}
                  </Typography>
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
  },
  header: {
    padding: 20,
    paddingBottom: 30,
  },
  subtitle: {
    marginTop: 5,
    opacity: 0.9,
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
    marginTop: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    borderRadius: 12,
  },
  ratingCard: {
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  mechanicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mechanicText: {
    marginLeft: 12,
    flex: 1,
  },
  ratingInfo: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  serviceInfo: {
    marginBottom: 15,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  commentLabel: {
    marginBottom: 8,
  },
  commentText: {
    fontStyle: 'italic',
    lineHeight: 20,
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
});
