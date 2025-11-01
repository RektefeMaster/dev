import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Vibration,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import Background from '@/shared/components/Background';
import { getRealUserLocation } from '@/shared/utils/distanceCalculator';
import { apiService } from '@/shared/services/api';

const EmergencyTowingScreen = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { userId, token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const location = await getRealUserLocation();
      setLocationPermission(!!location);
    } catch (error) {
      setLocationPermission(false);
    }
  };

  const handleEmergencyCall = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Konum İzni Gerekli',
        'Acil çekici çağırma hizmeti için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.',
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
      return;
    }

    // Titreşim efekti
    Vibration.vibrate([0, 200, 100, 200]);

    Alert.alert(
      'ACİL ÇEKİCİ TALEBİ',
      'Acil durumda çekici çağırmak istediğinizden emin misiniz?\n\nBu işlem:\n• Gerçek konumunuzu alacak\n• Araç bilgilerinizi gönderecek\n• En yakın çekicilere anında bildirim gönderecek',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'ACİL ÇAĞIR',
          style: 'destructive',
          onPress: showEmergencyTypeSelection
        }
      ]
    );
  };

  const showEmergencyTypeSelection = () => {
    Alert.alert(
      'Acil Durum Tipi',
      'Lütfen acil durum tipinizi seçin:',
      [
        {
          text: 'Kaza',
          onPress: () => executeEmergencyTowing('accident')
        },
        {
          text: 'Arıza',
          onPress: () => executeEmergencyTowing('breakdown')
        },
        {
          text: 'İptal',
          style: 'cancel'
        }
      ]
    );
  };

  const executeEmergencyTowing = async (emergencyType: 'accident' | 'breakdown') => {
    try {
      setLoading(true);

      // Titreşim efekti
      Vibration.vibrate([0, 500, 200, 500]);

      // 1. Gerçek konum al
      const location = await getRealUserLocation();
      if (!location) {
        throw new Error('Konum alınamadı');
      }

      // 2. Araç bilgilerini al
      const vehicleData = await getVehicleData();
      
      // 3. Kullanıcı bilgilerini al
      const userData = await getUserData();

      // 4. Acil talep verisi hazırla (serviceRequests/towing formatında)
      const emergencyData = {
        vehicleType: vehicleData.vehicleType || 'binek',
        reason: emergencyType,
        pickupLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 10
        },
        description: emergencyType === 'accident' ? 'Trafik kazası - Acil çekici gerekli' : 'Araç arızası - Acil çekici gerekli',
        emergencyLevel: 'critical',
        towingType: 'flatbed',
        vehicleInfo: {
          brand: vehicleData.vehicleBrand || 'Bilinmiyor',
          model: vehicleData.vehicleModel || 'Bilinmiyor',
          year: parseInt(vehicleData.vehicleYear) || new Date().getFullYear(),
          plate: vehicleData.vehiclePlate || 'Bilinmiyor'
        },
        userInfo: {
          name: userData.name,
          surname: userData.surname,
          phone: userData.phone
        },
        requestType: 'emergency',
        priority: 'critical'
      };

      // 5. API'ye gönder
      const response = await apiService.createEmergencyTowingRequest(emergencyData);
      
      if (response.success) {
        // Başarı bildirimi
        Alert.alert(
          'ACİL TALEP GÖNDERİLDİ!',
          'Çekici talebiniz en yakın çekicilere iletildi.\n\n• Çekiciler kabul/red verebilir\n• İlk kabul eden çekici seçilecek\n• Durum güncellemeleri anında gelecek',
          [
            {
              text: 'Durumu Takip Et',
                onPress: () => {
                // Acil durum takip ekranına yönlendir
                (navigation as any).navigate('EmergencyTracking', { 
                  requestId: (response.data as any)._id,
                  emergencyType: emergencyType
                });
              }
            }
          ]
        );

        // Titreşim efekti
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);

      } else {
        throw new Error(response.message || 'Acil talep gönderilemedi');
      }

    } catch (error: unknown) {
      const errorObj = error as Error;
      Alert.alert(
        'Hata Oluştu',
        `Acil çekici talebi gönderilirken bir hata oluştu.\n\nHata: ${errorObj.message}\n\nLütfen:\n• İnternet bağlantınızı kontrol edin\n• Konum izninin açık olduğundan emin olun\n• Tekrar deneyin`,
        [
          {
            text: 'Tekrar Dene',
            onPress: handleEmergencyCall
          },
          {
            text: 'Normal Form',
            onPress: () => (navigation as any).navigate('TowingRequest')
          },
          {
            text: 'Tamam',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const getVehicleData = async () => {
    try {
      const response = await apiService.getVehicles();
      
      const vehicleList = Array.isArray(response.data) ? response.data : (response.data?.vehicles || []);
      if (response.success && vehicleList.length > 0) {
        const vehicle = vehicleList.find((v: any) => v.isFavorite) || vehicleList[0];
        return {
          vehicleType: vehicle.vehicleType || 'binek',
          vehicleBrand: vehicle.brand || 'Bilinmiyor',
          vehicleModel: vehicle.modelName || vehicle.model || 'Bilinmiyor',
          vehicleYear: vehicle.year?.toString() || new Date().getFullYear().toString(),
          vehiclePlate: vehicle.plateNumber || 'Bilinmiyor'
        };
      }
      
      return {
        vehicleType: 'binek',
        vehicleBrand: 'Bilinmiyor',
        vehicleModel: 'Bilinmiyor',
        vehicleYear: new Date().getFullYear().toString(),
        vehiclePlate: 'Bilinmiyor'
      };
    } catch (error) {
      return {
        vehicleType: 'binek',
        vehicleBrand: 'Bilinmiyor',
        vehicleModel: 'Bilinmiyor',
        vehicleYear: new Date().getFullYear().toString(),
        vehiclePlate: 'Bilinmiyor'
      };
    }
  };

  const getUserData = async () => {
    try {
      if (user && user.name && user.surname && user.phone) {
        return {
          name: user.name,
          surname: user.surname,
          phone: user.phone
        };
      }
      
      // Fallback - API'den al
      const response = await apiService.getUserProfile();
      if (response.success && response.data) {
        return {
          name: response.data.name || 'Bilinmiyor',
          surname: response.data.surname || 'Bilinmiyor',
          phone: response.data.phone || 'Bilinmiyor'
        };
      }
      
      return {
        name: 'Bilinmiyor',
        surname: 'Bilinmiyor',
        phone: 'Bilinmiyor'
      };
    } catch (error) {
      return {
        name: 'Bilinmiyor',
        surname: 'Bilinmiyor',
        phone: 'Bilinmiyor'
      };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
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
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Emergency Icon */}
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.error.main + '20' }]}>
              <MaterialCommunityIcons 
                name="truck-fast" 
                size={80} 
                color={theme.colors.error.main} 
              />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              ACİL ÇEKİCİ
            </Text>
            
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Acil durumunuzda tek tıkla çekici çağırın
            </Text>

            {/* Status Info */}
            <View style={[
              styles.statusContainer,
              { 
                backgroundColor: locationPermission 
                  ? theme.colors.success.main + '20' 
                  : theme.colors.warning.main + '20',
                borderColor: locationPermission 
                  ? theme.colors.success.main 
                  : theme.colors.warning.main
              }
            ]}>
              <MaterialCommunityIcons 
                name={locationPermission ? 'check-circle' : 'alert-circle'} 
                size={20} 
                color={locationPermission ? theme.colors.success.main : theme.colors.warning.main} 
              />
              <Text style={[
                styles.statusText, 
                { color: locationPermission ? theme.colors.success.main : theme.colors.warning.main }
              ]}>
                {locationPermission ? 'Konum hazır' : 'Konum izni gerekli'}
              </Text>
            </View>
          </View>

          {/* Emergency Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.emergencyButton,
                { 
                  backgroundColor: loading ? theme.colors.text.secondary : theme.colors.error.main,
                  shadowColor: theme.colors.error.main,
                }
              ]}
              onPress={handleEmergencyCall}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator 
                  color="#FFFFFF" 
                  size="large" 
                />
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name="phone-alert" 
                    size={32} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.buttonText}>
                    ACİL ÇEKİCİ ÇAĞIR
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Warning Text */}
            <Text style={[styles.warningText, { color: theme.colors.text.secondary }]}>
              Sadece gerçek acil durumlar için kullanın
            </Text>
          </View>

          {/* Info Section */}
          <View style={[
            styles.infoSection,
            { 
              backgroundColor: theme.colors.background.card,
              borderColor: theme.colors.border.primary
            }
          ]}>
            <MaterialCommunityIcons 
              name="information" 
              size={24} 
              color={theme.colors.primary.main} 
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
                Acil Çekici Sistemi
              </Text>
              <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
                • Otomatik konum algılama{'\n'}
                • Araç bilgileri otomatik doldurma{'\n'}
                • En yakın çekicilere anında bildirim{'\n'}
                • 7/24 acil hizmet
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 280,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  infoSection: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default EmergencyTowingScreen;
