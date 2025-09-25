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
  Vibration,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/shared/context';
import { Background } from '@/shared/components';
import apiService from '@/shared/services/api';

interface EmergencyRequest {
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
    accuracy: number;
  };
  userInfo: {
    name: string;
    surname: string;
    phone: string;
  };
  emergencyDetails: {
    reason: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
  };
  createdAt: string;
  updatedAt: string;
  distance?: number;
}

const EmergencyNotificationScreen = () => {
  const { themeColors, isDark } = useTheme();
  const theme = { colors: themeColors, isDark };
  const navigation = useNavigation();
  const { userId, token, user } = useAuth();
  
  // Sadece çekici hizmeti veren ustalar için bu ekranı göster
  const userCapabilities = user?.serviceCategories || [];
  const hasTowingService = userCapabilities.includes('towing') || 
                          userCapabilities.includes('Çekici') || 
                          userCapabilities.includes('çekici');
  
  useEffect(() => {
    if (!hasTowingService) {
      Alert.alert(
        'Erişim Yok',
        'Bu özellik sadece çekici hizmeti veren ustalar için kullanılabilir.',
        [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]
      );
    }
  }, [hasTowingService]);
  
  if (!hasTowingService) {
    return null;
  }
  
  const [loading, setLoading] = useState(true);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    fetchEmergencyRequests();
    
    // Pulse animasyonu
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, []);

  useEffect(() => {
    // Slide animasyonu
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [emergencyRequests]);

  const fetchEmergencyRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getEmergencyTowingRequests();
      
      if (response.success && response.data) {
        setEmergencyRequests(response.data);
        
        // Yeni acil talepler varsa titreşim
        if (response.data.length > 0) {
          Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        }
      } else {
        setEmergencyRequests([]);
      }
    } catch (error: unknown) {
      console.error('Acil talepler alınamadı:', error);
      setEmergencyRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshRequests = async () => {
    try {
      setRefreshing(true);
      await fetchEmergencyRequests();
    } finally {
      setRefreshing(false);
    }
  };

  const respondToRequest = async (requestId: string, response: 'accepted' | 'rejected') => {
    try {
      setResponding(requestId);
      
      const responseData = await apiService.respondToEmergencyTowingRequest(requestId, response);
      
      if (responseData.success) {
        if (response === 'accepted') {
          Alert.alert(
            'TALEP KABUL EDİLDİ!',
            'Acil çekici talebini kabul ettiniz. Müşteriye bilgi verildi.',
            [
              {
                text: 'Haritada Gör',
                onPress: () => openMaps(requestId),
                style: 'default'
              },
              {
                text: 'Tamam',
                onPress: () => navigation.goBack()
              }
            ]
          );
        } else {
          Alert.alert(
            'Talep Reddedildi',
            'Bu acil talebi reddettiniz. Diğer çekiciler aranacak.',
            [
              { text: 'Tamam', onPress: () => navigation.goBack() }
            ]
          );
        }
        
        // Listeden kaldır
        setEmergencyRequests(prev => prev.filter(req => req.requestId !== requestId));
      } else {
        throw new Error(responseData.message || 'Yanıt gönderilemedi');
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      Alert.alert('Hata', `Yanıt gönderilemedi: ${errorObj.message}`);
    } finally {
      setResponding(null);
    }
  };

  const acceptRequest = (requestId: string) => {
    Alert.alert(
      'TALEP KABUL EDİLİYOR',
      'Bu acil çekici talebini kabul etmek istediğinizden emin misiniz?\n\n• Müşteriye anında bildirim gidecek\n• Konum otomatik açılacak\n• Tahmini varış süresi belirtilecek',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'KABUL ET',
          style: 'default',
          onPress: () => respondToRequest(requestId, 'accepted')
        }
      ]
    );
  };

  const rejectRequest = (requestId: string) => {
    Alert.alert(
      'TALEP REDDEDİLİYOR',
      'Bu acil çekici talebini reddetmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'REDDET',
          style: 'destructive',
          onPress: () => respondToRequest(requestId, 'rejected')
        }
      ]
    );
  };

  const openMaps = (requestId: string) => {
    const request = emergencyRequests.find(req => req.requestId === requestId);
    if (!request) return;

    const { latitude, longitude } = request.location.coordinates;
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Hata', 'Harita uygulaması açılamadı.');
    });
  };

  const callCustomer = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert('Hata', 'Telefon uygulaması açılamadı.');
    });
  };

  const getEmergencyTypeInfo = (emergencyType: string) => {
    switch (emergencyType) {
      case 'accident':
        return { 
          icon: 'car-alert', 
          text: 'TRAFIK KAZASI', 
          color: '#EF4444',
          bgColor: '#FEF2F2'
        };
      case 'breakdown':
        return { 
          icon: 'wrench', 
          text: 'ARAÇ ARİZASİ', 
          color: '#F59E0B',
          bgColor: '#FFFBEB'
        };
      default:
        return { 
          icon: 'alert-circle', 
          text: 'ACİL DURUM', 
          color: '#EF4444',
          bgColor: '#FEF2F2'
        };
    }
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return 'Mesafe hesaplanıyor...';
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const formatTime = (createdAt: string) => {
    const now = new Date();
    const requestTime = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - requestTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Şimdi';
    if (diffMinutes < 60) return `${diffMinutes} dk önce`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} saat önce`;
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
              Acil talepler kontrol ediliyor...
            </Text>
          </View>
        </Background>
      </SafeAreaView>
    );
  }

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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color={theme.colors.text.primary} 
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Acil Çekici Bildirimleri
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshRequests}
              disabled={refreshing}
            >
              <MaterialCommunityIcons 
                name="refresh" 
                size={24} 
                color={theme.colors.primary.main} 
              />
            </TouchableOpacity>
          </View>

          {emergencyRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="truck-fast" 
                size={64} 
                color={theme.colors.text.secondary} 
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                Acil Talep Yok
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                Şu anda beklemede olan acil çekici talebi bulunmuyor.
              </Text>
              <TouchableOpacity 
                style={[styles.refreshButtonLarge, { backgroundColor: theme.colors.primary.main }]}
                onPress={fetchEmergencyRequests}
              >
                <Text style={styles.refreshButtonText}>Yenile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.requestsContainer}>
              {emergencyRequests.map((request, index) => {
                const emergencyInfo = getEmergencyTypeInfo(request.emergencyType);
                
                return (
                  <Animated.View
                    key={request.requestId}
                    style={[
                      styles.requestCard,
                      { 
                        backgroundColor: emergencyInfo.bgColor,
                        borderColor: emergencyInfo.color,
                        transform: [
                          { translateY: slideAnim },
                          { scale: pulseAnim }
                        ]
                      }
                    ]}
                  >
                    {/* Emergency Type Header */}
                    <View style={styles.emergencyHeader}>
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <MaterialCommunityIcons 
                          name={emergencyInfo.icon as any} 
                          size={32} 
                          color={emergencyInfo.color} 
                        />
                      </Animated.View>
                      <View style={styles.emergencyHeaderContent}>
                        <Text style={[styles.emergencyTypeText, { color: emergencyInfo.color }]}>
                          {emergencyInfo.text}
                        </Text>
                        <Text style={[styles.requestTime, { color: theme.colors.text.secondary }]}>
                          {formatTime(request.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.distanceContainer}>
                        <Text style={[styles.distanceText, { color: emergencyInfo.color }]}>
                          {formatDistance(request.distance)}
                        </Text>
                      </View>
                    </View>

                    {/* Vehicle Info */}
                    <View style={styles.vehicleInfo}>
                      <MaterialCommunityIcons 
                        name="car" 
                        size={20} 
                        color={theme.colors.text.primary} 
                      />
                      <View style={styles.vehicleDetails}>
                        <Text style={[styles.vehicleText, { color: theme.colors.text.primary }]}>
                          {request.vehicleInfo.brand} {request.vehicleInfo.model} ({request.vehicleInfo.year})
                        </Text>
                        <Text style={[styles.plateText, { color: theme.colors.text.secondary }]}>
                          Plaka: {request.vehicleInfo.plate}
                        </Text>
                      </View>
                    </View>

                    {/* Customer Info */}
                    <View style={styles.customerInfo}>
                      <MaterialCommunityIcons 
                        name="account" 
                        size={20} 
                        color={theme.colors.text.primary} 
                      />
                      <View style={styles.customerDetails}>
                        <Text style={[styles.customerText, { color: theme.colors.text.primary }]}>
                          {request.userInfo.name} {request.userInfo.surname}
                        </Text>
                        <Text style={[styles.phoneText, { color: theme.colors.text.secondary }]}>
                          {request.userInfo.phone}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.callButton}
                        onPress={() => callCustomer(request.userInfo.phone)}
                      >
                        <MaterialCommunityIcons name="phone" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Location Info */}
                    <View style={styles.locationInfo}>
                      <MaterialCommunityIcons 
                        name="map-marker" 
                        size={20} 
                        color={theme.colors.text.primary} 
                      />
                      <Text style={[styles.locationText, { color: theme.colors.text.secondary }]}>
                        {request.location.address || 'Konum bilgisi alınıyor...'}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.rejectButton, { borderColor: theme.colors.error.main }]}
                        onPress={() => rejectRequest(request.requestId)}
                        disabled={responding === request.requestId}
                      >
                        {responding === request.requestId ? (
                          <ActivityIndicator size="small" color={theme.colors.error.main} />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="close" size={20} color={theme.colors.error.main} />
                            <Text style={[styles.buttonText, { color: theme.colors.error.main }]}>
                              Reddet
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.acceptButton, { backgroundColor: theme.colors.success.main }]}
                        onPress={() => acceptRequest(request.requestId)}
                        disabled={responding === request.requestId}
                      >
                        {responding === request.requestId ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                            <Text style={styles.acceptButtonText}>
                              Kabul Et
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
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
    padding: 16,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  refreshButtonLarge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  requestsContainer: {
    gap: 16,
  },
  requestCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emergencyHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTypeText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  requestTime: {
    fontSize: 14,
    marginTop: 2,
  },
  distanceContainer: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleDetails: {
    marginLeft: 12,
    flex: 1,
  },
  vehicleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  plateText: {
    fontSize: 14,
    marginTop: 2,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  customerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneText: {
    fontSize: 14,
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EmergencyNotificationScreen;
