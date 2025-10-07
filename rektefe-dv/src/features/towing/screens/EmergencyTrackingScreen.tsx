import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import { apiService } from '@/shared/services/api';

interface EmergencyTrackingRouteParams {
  requestId: string;
  emergencyType: 'accident' | 'breakdown';
}

interface TowingRequest {
  _id: string;
  requestId: string;
  userId: string;
  emergencyType: 'accident' | 'breakdown';
  status: 'pending' | 'accepted' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';
  vehicleInfo: {
    type: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
  };
  location: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
  };
  userInfo: {
    name: string;
    surname: string;
    phone: string;
  };
  emergencyDetails: {
    reason: string;
    description: string;
    severity: string;
  };
  acceptedMechanic?: {
    _id: string;
    name: string;
    phone: string;
    location: {
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
    estimatedArrival: string;
  };
  createdAt: string;
  updatedAt: string;
}

const EmergencyTrackingScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<TowingRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const routeParams = route.params as EmergencyTrackingRouteParams;

  useEffect(() => {
    if (routeParams?.requestId) {
      fetchRequestDetails();
    } else {
      Alert.alert('Hata', 'Talep bilgisi bulunamadı.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    }
  }, [routeParams?.requestId]);

  useEffect(() => {
    // Pulse animasyonu
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (request?.status === 'pending') {
      pulseAnimation.start();
    } else {
      pulseAnimation.stop();
      pulseAnim.setValue(1);
    }

    return () => pulseAnimation.stop();
  }, [request?.status]);

  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getEmergencyTowingRequest(routeParams.requestId);
      
      if (response.success && response.data) {
        setRequest(response.data as TowingRequest);
      } else {
        throw new Error(response.message || 'Talep bilgileri alınamadı');
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      Alert.alert('Hata', `Talep bilgileri alınamadı: ${errorObj.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshRequest = async () => {
    try {
      setRefreshing(true);
      await fetchRequestDetails();
    } finally {
      setRefreshing(false);
    }
  };

  const cancelRequest = async () => {
    Alert.alert(
      'Talebi İptal Et',
      'Acil çekici talebinizi iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: executeCancelRequest
        }
      ]
    );
  };

  const executeCancelRequest = async () => {
    try {
      const response = await apiService.cancelEmergencyTowingRequest(routeParams.requestId);
      
      if (response.success) {
        Alert.alert(
          'Talep İptal Edildi',
          'Acil çekici talebiniz başarıyla iptal edildi.',
          [
            { text: 'Tamam', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        throw new Error(response.message || 'Talep iptal edilemedi');
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      Alert.alert('Hata', `Talep iptal edilemedi: ${errorObj.message}`);
    }
  };

  const openMaps = () => {
    if (!request?.acceptedMechanic?.location) return;

    const { latitude, longitude } = request.acceptedMechanic.location.coordinates;
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Hata', 'Harita uygulaması açılamadı.');
    });
  };

  const callMechanic = () => {
    if (!request?.acceptedMechanic?.phone) return;
    
    const phoneUrl = `tel:${request.acceptedMechanic.phone}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert('Hata', 'Telefon uygulaması açılamadı.');
    });
  };

  const getStatusInfo = () => {
    if (!request) return { icon: 'help', text: 'Bilinmiyor', color: theme.colors.text.secondary };

    switch (request.status) {
      case 'pending':
        return { 
          icon: 'clock-outline', 
          text: 'Çekiciler Aranıyor...', 
          color: theme.colors.warning.main 
        };
      case 'accepted':
        return { 
          icon: 'check-circle', 
          text: 'Çekici Kabul Edildi', 
          color: theme.colors.success.main 
        };
      case 'on_the_way':
        return { 
          icon: 'truck', 
          text: 'Çekici Yolda', 
          color: theme.colors.primary.main 
        };
      case 'arrived':
        return { 
          icon: 'map-marker', 
          text: 'Çekici Geldi', 
          color: theme.colors.success.main 
        };
      case 'completed':
        return { 
          icon: 'check-all', 
          text: 'Hizmet Tamamlandı', 
          color: theme.colors.success.main 
        };
      case 'cancelled':
        return { 
          icon: 'close-circle', 
          text: 'İptal Edildi', 
          color: theme.colors.error.main 
        };
      default:
        return { 
          icon: 'help', 
          text: 'Bilinmiyor', 
          color: theme.colors.text.secondary 
        };
    }
  };

  const getEmergencyTypeInfo = () => {
    if (!request) return { icon: 'help', text: 'Bilinmiyor', color: theme.colors.text.secondary };

    switch (request.emergencyType) {
      case 'accident':
        return { 
          icon: 'car-alert', 
          text: 'Trafik Kazası', 
          color: theme.colors.error.main 
        };
      case 'breakdown':
        return { 
          icon: 'wrench', 
          text: 'Araç Arızası', 
          color: theme.colors.warning.main 
        };
      default:
        return { 
          icon: 'help', 
          text: 'Bilinmiyor', 
          color: theme.colors.text.secondary 
        };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar 
          barStyle={theme.isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={theme.colors.background.primary} 
        />
        <Background>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Talep bilgileri alınıyor...
            </Text>
          </View>
        </Background>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar 
          barStyle={theme.isDark ? 'light-content' : 'dark-content'} 
          backgroundColor={theme.colors.background.primary} 
        />
        <Background>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={64} 
              color={theme.colors.error.main} 
            />
            <Text style={[styles.errorText, { color: theme.colors.text.primary }]}>
              Talep bilgileri bulunamadı
            </Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={fetchRequestDetails}
            >
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </Background>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusInfo();
  const emergencyTypeInfo = getEmergencyTypeInfo();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar 
        barStyle={theme.isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background.primary} 
      />
      <Background>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <BackButton />
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Acil Çekici Takip
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshRequest}
              disabled={refreshing}
            >
              <MaterialCommunityIcons 
                name="refresh" 
                size={24} 
                color={theme.colors.primary.main} 
              />
            </TouchableOpacity>
          </View>

          {/* Status Card */}
          <View style={[
            styles.statusCard,
            { 
              backgroundColor: theme.colors.background.card,
              borderColor: statusInfo.color,
            }
          ]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialCommunityIcons 
                name={statusInfo.icon as any} 
                size={48} 
                color={statusInfo.color} 
              />
            </Animated.View>
            <View style={styles.statusContent}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
              <Text style={[styles.statusSubtext, { color: theme.colors.text.secondary }]}>
                Talep ID: {request.requestId}
              </Text>
            </View>
          </View>

          {/* Emergency Type */}
          <View style={[
            styles.infoCard,
            { 
              backgroundColor: theme.colors.background.card,
              borderColor: theme.colors.border.primary,
            }
          ]}>
            <MaterialCommunityIcons 
              name={emergencyTypeInfo.icon as any} 
              size={24} 
              color={emergencyTypeInfo.color} 
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
                Acil Durum Tipi
              </Text>
              <Text style={[styles.infoText, { color: emergencyTypeInfo.color }]}>
                {emergencyTypeInfo.text}
              </Text>
            </View>
          </View>

          {/* Vehicle Info */}
          <View style={[
            styles.infoCard,
            { 
              backgroundColor: theme.colors.background.card,
              borderColor: theme.colors.border.primary,
            }
          ]}>
            <MaterialCommunityIcons 
              name="car" 
              size={24} 
              color={theme.colors.primary.main} 
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
                Araç Bilgileri
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                {request.vehicleInfo?.brand || 'Bilinmiyor'} {request.vehicleInfo?.model || 'Bilinmiyor'} ({request.vehicleInfo?.year || 'Bilinmiyor'})
              </Text>
              <Text style={[styles.infoSubtext, { color: theme.colors.text.secondary }]}>
                Plaka: {request.vehicleInfo?.plate || 'Bilinmiyor'}
              </Text>
            </View>
          </View>

          {/* Accepted Mechanic Info */}
          {request.acceptedMechanic && (
            <View style={[
              styles.mechanicCard,
              { 
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.success.main,
              }
            ]}>
              <MaterialCommunityIcons 
                name="account-hard-hat" 
                size={24} 
                color={theme.colors.success.main} 
              />
              <View style={styles.mechanicContent}>
                <Text style={[styles.mechanicTitle, { color: theme.colors.text.primary }]}>
                  Çekici Ustası
                </Text>
                <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                  {request.acceptedMechanic.name}
                </Text>
                <Text style={[styles.mechanicPhone, { color: theme.colors.text.secondary }]}>
                  {request.acceptedMechanic.phone}
                </Text>
                <Text style={[styles.mechanicArrival, { color: theme.colors.success.main }]}>
                  Tahmini Varış: {request.acceptedMechanic.estimatedArrival}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {request.acceptedMechanic && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary.main }]}
                  onPress={openMaps}
                >
                  <MaterialCommunityIcons name="map" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Haritada Gör</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.colors.success.main }]}
                  onPress={callMechanic}
                >
                  <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Çekiciyi Ara</Text>
                </TouchableOpacity>
              </>
            )}
            
            {request.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.colors.error.main }]}
                onPress={cancelRequest}
              >
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Talebi İptal Et</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: '700',
  },
  refreshButton: {
    padding: 8,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  statusContent: {
    marginLeft: 16,
    flex: 1,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  mechanicCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
  },
  mechanicContent: {
    marginLeft: 12,
    flex: 1,
  },
  mechanicTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  mechanicPhone: {
    fontSize: 16,
    marginBottom: 4,
  },
  mechanicArrival: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmergencyTrackingScreen;