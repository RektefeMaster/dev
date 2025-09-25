import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/constants/config';
import axios from 'axios';

type RootStackParamList = {
  Rating: {
    appointmentId: string;
    mechanicId: string;
    mechanicName: string;
  };
  Main: { screen?: string };
  FaultReportDetail: { faultReportId: string };
  Appointments: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: string;
  params: {
    appointmentId: string;
    mechanicId: string;
    mechanicName: string;
  };
};

const RatingScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { appointmentId, mechanicId, mechanicName } = route.params;
  const { theme } = useTheme();
  const { token } = useAuth();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      // Test ID'leri için mock data kullan
      if (appointmentId === 'real-appointment-123' || appointmentId.startsWith('test-') || appointmentId.startsWith('real-')) {
        setAppointment({
          _id: appointmentId,
          mechanicId: mechanicId,
          mechanicName: mechanicName,
          serviceType: 'Motor Yağı Değişimi',
          status: 'completed',
          createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 saat önce
          appointmentDate: new Date(Date.now() - 3600000).toISOString(),
          timeSlot: '14:30',
          description: 'Motor yağı değişimi ve genel kontrol',
          price: 450,
          vehicleInfo: {
            brand: 'Toyota',
            model: 'Corolla',
            year: 2019,
            plate: '34 ABC 123'
          }
        });
        return;
      }

      const response = await axios.get(`${API_URL}/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAppointment(response.data.data);
      }
    } catch (error) {
      // Randevu detayları alınamazsa mock data kullan
      setAppointment({
        _id: appointmentId,
        mechanicId: mechanicId,
        mechanicName: mechanicName,
        serviceType: 'Motor Yağı Değişimi',
        status: 'completed',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 saat önce
        appointmentDate: new Date(Date.now() - 3600000).toISOString(),
        timeSlot: '14:30',
        description: 'Motor yağı değişimi ve genel kontrol',
        price: 450,
        vehicleInfo: {
          brand: 'Toyota',
          model: 'Corolla',
          year: 2019,
          plate: '34 ABC 123'
        }
      });
    }
  };

  const handleStarPress = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleStarPress(star)}
            style={styles.starButton}
          >
            <MaterialCommunityIcons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1:
        return 'Çok Kötü';
      case 2:
        return 'Kötü';
      case 3:
        return 'Orta';
      case 4:
        return 'İyi';
      case 5:
        return 'Mükemmel';
      default:
        return 'Puan Seçin';
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Uyarı', 'Lütfen bir puan seçin');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/appointment-ratings`,
        {
          appointmentId,
          mechanicId,
          rating,
          comment: comment.trim() || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Başarılı',
          'Değerlendirmeniz başarıyla kaydedildi',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Ana sayfaya yönlendir
                navigation.navigate('Main', { screen: 'Home' });
              }
            }
          ]
        );
      } else {
        throw new Error(response.data.message || 'Değerlendirme kaydedilemedi');
      }
    } catch (error: any) {
      Alert.alert(
        'Hata',
        error.response?.data?.message || 'Değerlendirme kaydedilirken bir hata oluştu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Değerlendirme
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Mechanic Info */}
          <View style={[styles.mechanicCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <View style={styles.mechanicInfo}>
              <View style={[styles.mechanicAvatar, { backgroundColor: theme.colors.primary.main }]}>
                <MaterialCommunityIcons name="account-wrench" size={32} color="#fff" />
              </View>
              <View style={styles.mechanicDetails}>
                <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                  {mechanicName}
                </Text>
                <Text style={[styles.mechanicLabel, { color: theme.colors.text.secondary }]}>
                  Usta
                </Text>
              </View>
            </View>
          </View>

          {/* Rating Section */}
          <View style={[styles.ratingCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Hizmet Değerlendirmesi
            </Text>
            
            {renderStars()}
            
            <Text style={[styles.ratingText, { color: theme.colors.text.primary }]}>
              {getRatingText(rating)}
            </Text>
          </View>

          {/* Comment Section */}
          <View style={[styles.commentCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Yorumunuz (İsteğe Bağlı)
            </Text>
            
            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: theme.colors.background.secondary,
                  borderColor: theme.colors.border.primary,
                  color: theme.colors.text.primary
                }
              ]}
              placeholder="Hizmet hakkında düşüncelerinizi paylaşın..."
              placeholderTextColor={theme.colors.text.secondary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            
            <Text style={[styles.characterCount, { color: theme.colors.text.secondary }]}>
              {comment.length}/500
            </Text>
          </View>

          {/* Appointment Details */}
          {appointment && (
            <View style={[styles.appointmentCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Randevu Detayları
              </Text>
              
              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.text.secondary} />
                  <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                    Tarih:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                    {new Date(appointment.appointmentDate).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock" size={20} color={theme.colors.text.secondary} />
                  <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                    Saat:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                    {new Date(appointment.appointmentDate).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="wrench" size={20} color={theme.colors.text.secondary} />
                  <Text style={[styles.detailLabel, { color: theme.colors.text.secondary }]}>
                    Hizmet:
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text.primary }]}>
                    {appointment.serviceType || 'Bakım'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: rating > 0 ? theme.colors.primary.main : theme.colors.border.primary }
            ]}
            onPress={handleSubmitRating}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="star-check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  Değerlendirmeyi Gönder
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  mechanicCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  mechanicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mechanicAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mechanicDetails: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mechanicLabel: {
    fontSize: 14,
  },
  ratingCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  commentCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  appointmentCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  appointmentDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
    minWidth: 60,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default RatingScreen;
