import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { getRealUserLocation } from '@/shared/utils/distanceCalculator';
import { apiService } from '@/shared/services/api';
import { useAuth } from '@/context/AuthContext';
import { API_URL, STORAGE_KEYS } from '@/constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '@/shared/hooks/useSocket';
import { driverApi } from '@/shared/services/api';

interface EmergencyTowingButtonProps {
  style?: any;
  variant?: 'primary' | 'secondary' | 'compact' | 'emergency';
  onEmergencyRequest?: (requestId: string) => void;
}

interface EmergencyTowingData {
  requestId: string;
  userId: string;
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
  createdAt: Date;
}

export const EmergencyTowingButton: React.FC<EmergencyTowingButtonProps> = ({ 
  style, 
  variant = 'primary',
  onEmergencyRequest
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { userId, token, user } = useAuth();
  const { isConnected, sendEmergencyTowingRequest } = useSocket();
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      // Konum izni kontrolü
      const location = await getRealUserLocation();
      setLocationPermission(!!location);
    } catch (error) {
      setLocationPermission(false);
    }
  };

  const handleEmergencyTowing = async () => {
    // Konum izni kontrolü
    if (!locationPermission) {
      Alert.alert(
        'Konum İzni Gerekli',
        'Acil çekici talebi için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.',
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
      return;
    }

    // Titreşim efekti
    Vibration.vibrate([0, 200, 100, 200]);

    Alert.alert(
      '🚨 ACİL ÇEKİCİ TALEBİ',
      'Acil durumda çekici çağırmak istediğinizden emin misiniz?\n\nBu işlem:\n• Gerçek konumunuzu alacak\n• Araç bilgilerinizi gönderecek\n• En yakın çekicilere anında bildirim gönderecek\n• Çekiciler kabul/red verebilecek',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'ACİL ÇAĞIR',
          style: 'destructive',
          onPress: executeEmergencyTowing
        }
      ]
    );
  };

  const executeEmergencyTowing = async () => {
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

      // 4. Acil talep verisi hazırla
      const emergencyData: EmergencyTowingData = {
        requestId: `EMR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        userId: userId!,
        vehicleInfo: {
          type: vehicleData.vehicleType || 'binek',
          brand: vehicleData.vehicleBrand || 'Bilinmiyor',
          model: vehicleData.vehicleModel || 'Bilinmiyor',
          year: parseInt(vehicleData.vehicleYear) || new Date().getFullYear(),
          plate: vehicleData.vehiclePlate || 'Bilinmiyor'
        },
        location: {
          coordinates: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          address: 'Konum adresi alınıyor...', // Reverse geocoding yapılabilir
          accuracy: 10 // GPS accuracy
        },
        userInfo: {
          name: userData.name,
          surname: userData.surname,
          phone: userData.phone
        },
        emergencyDetails: {
          reason: 'emergency',
          description: 'Acil durum çekici talebi',
          severity: 'critical'
        },
        createdAt: new Date()
      };

      let result;
      
      // WebSocket bağlantısı varsa WebSocket ile gönder, yoksa HTTP ile
      if (isConnected) {
        result = await sendEmergencyTowingRequest(emergencyData);
      } else {
        const response = await fetch(`${API_URL}/emergency/emergency-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(emergencyData)
        });
        result = await response.json();
      }

      if (result.success) {
        // Başarı bildirimi
        Alert.alert(
          '🚨 Acil Talep Gönderildi!',
          'Çekici talebiniz en yakın çekicilere iletildi.\n\n• Çekiciler kabul/red verebilir\n• İlk kabul eden çekici seçilecek\n• Durum güncellemeleri anında gelecek',
          [
            {
              text: 'Durumu Takip Et',
              onPress: () => {
                onEmergencyRequest?.(result.data.requestId);
                // Acil durum takip ekranına yönlendir
                (navigation as any).navigate('EmergencyTracking', { 
                  requestId: result.data.requestId 
                });
              }
            }
          ]
        );

        // Titreşim efekti
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);

      } else {
        throw new Error(result.message || result.error || 'Acil talep gönderilemedi');
      }

    } catch (error: unknown) {
      const errorObj = error as Error;
      Alert.alert(
        '❌ Hata Oluştu',
        `Acil çekici talebi gönderilirken bir hata oluştu.\n\nHata: ${errorObj.message}\n\nLütfen:\n• İnternet bağlantınızı kontrol edin\n• Konum izninin açık olduğundan emin olun\n• Tekrar deneyin`,
        [
          {
            text: 'Tekrar Dene',
            onPress: handleEmergencyTowing
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
      // API'den gerçek araç bilgilerini al
      const response = await driverApi.getVehicles();
      
      if (response.success && response.data && response.data.length > 0) {
        const vehicle = response.data[0]; // İlk aracı al
        return {
          vehicleType: vehicle.fuelType || 'binek',
          vehicleBrand: vehicle.brand || 'Bilinmiyor',
          vehicleModel: vehicle.model || 'Bilinmiyor',
          vehicleYear: vehicle.year || new Date().getFullYear(),
          vehiclePlate: vehicle.plateNumber || 'Bilinmiyor'
        };
      }
      
      // Fallback - apiService'den al
      const fallbackResponse = await apiService.getVehicles();
      if (fallbackResponse.success && fallbackResponse.data && fallbackResponse.data.length > 0) {
        const vehicle = fallbackResponse.data.find((v: any) => v.isFavorite) || fallbackResponse.data[0];
        return {
          id: vehicle._id,
          brand: vehicle.brand,
          model: vehicle.modelName || vehicle.model,
          plateNumber: vehicle.plateNumber,
          year: vehicle.year
        };
      }
      return null;
      
    } catch (error: any) {
      // 401 hatası durumunda kullanıcıyı logout et
      if (error.response?.status === 401) {
        // AuthContext otomatik olarak logout işlemini gerçekleştirecek
        return {
          vehicleType: 'binek',
          vehicleBrand: 'Bilinmiyor',
          vehicleModel: 'Bilinmiyor',
          vehicleYear: new Date().getFullYear(),
          vehiclePlate: 'Bilinmiyor'
        };
      }
      
      // Son fallback
      return {
        vehicleType: 'binek',
        vehicleBrand: 'Bilinmiyor',
        vehicleModel: 'Bilinmiyor',
        vehicleYear: new Date().getFullYear(),
        vehiclePlate: 'Bilinmiyor'
      };
    }
  };

  const getUserData = async () => {
    try {
      // AuthContext'ten kullanıcı bilgilerini al
      if (user && user.name && user.surname && user.phone) {
        return {
          name: user.name,
          surname: user.surname,
          phone: user.phone
        };
      }
      
      // Fallback - API'den al
      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.name && result.data.surname && result.data.phone) {
          const user = result.data;
          return {
            name: user.name,
            surname: user.surname,
            phone: user.phone
          };
        }
      }
      
      // Son fallback - AsyncStorage'dan al
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA_LEGACY);
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.name && parsed.surname && parsed.phone) {
          return {
            name: parsed.name,
            surname: parsed.surname,
            phone: parsed.phone
          };
        }
      }
      
      // En son fallback - kullanıcıyı uyar
      Alert.alert(
        'Kullanıcı Bilgileri Eksik',
        'Profil bilgileriniz alınamadı. Lütfen uygulamayı yeniden başlatın veya tekrar giriş yapın.',
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
      throw new Error('Kullanıcı bilgileri alınamadı');
    } catch (error) {
      Alert.alert(
        'Kullanıcı Bilgileri Eksik',
        'Profil bilgileriniz alınamadı. Lütfen uygulamayı yeniden başlatın veya tekrar giriş yapın.',
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
      throw error;
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'emergency':
        return styles.emergencyButton;
      case 'compact':
        return styles.compactButton;
      case 'secondary':
        return styles.secondaryButton;
      default:
        return styles.primaryButton;
    }
  };

  const getIconSize = () => {
    return variant === 'compact' ? 20 : variant === 'emergency' ? 32 : 24;
  };

  const getTextSize = () => {
    return variant === 'compact' ? 12 : variant === 'emergency' ? 18 : 16;
  };

  const getButtonText = () => {
    switch (variant) {
      case 'emergency':
        return 'ACİL ÇEKİCİ ÇAĞIR';
      case 'compact':
        return 'Acil';
      default:
        return 'Acil Çekici';
    }
  };

  return (
    <TouchableOpacity
      testID="emergency-towing-button"
      style={[
        getButtonStyle(),
        { 
          backgroundColor: variant === 'emergency' ? '#EF4444' : theme.colors.primary.main,
          borderColor: variant === 'emergency' ? '#DC2626' : theme.colors.primary.main,
        },
        style
      ]}
      onPress={handleEmergencyTowing}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'emergency' ? '#FFFFFF' : theme.colors.background.primary} 
          size="small" 
        />
      ) : (
        <>
          <MaterialCommunityIcons 
            name={variant === 'emergency' ? 'truck-fast' : 'truck'} 
            size={getIconSize()} 
            color={variant === 'emergency' ? '#FFFFFF' : theme.colors.background.primary} 
          />
          <Text 
            style={[
              styles.buttonText, 
              { 
                color: variant === 'emergency' ? '#FFFFFF' : theme.colors.background.primary,
                fontSize: getTextSize(),
                fontWeight: variant === 'emergency' ? 'bold' : '600'
              }
            ]}
          >
            {getButtonText()}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 40,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 32,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 64,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    marginLeft: 8,
    textAlign: 'center',
  },
});

// Export the emergency function for external use
export const useEmergencyTowing = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { userId, token, user } = useAuth();
  const { isConnected, sendEmergencyTowingRequest } = useSocket();
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

  const handleEmergencyTowing = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Konum İzni Gerekli',
        'Acil çekici talebi için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }

    Vibration.vibrate([0, 200, 100, 200]);

    Alert.alert(
      '🚨 ACİL ÇEKİCİ TALEBİ',
      'Acil durumda çekici çağırmak istediğinizden emin misiniz?\n\nBu işlem:\n• Gerçek konumunuzu alacak\n• Araç bilgilerinizi gönderecek\n• En yakın çekicilere anında bildirim gönderecek\n• Çekiciler kabul/red verebilecek',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'ACİL ÇAĞIR', style: 'destructive', onPress: executeEmergencyTowing }
      ]
    );
  };

  const executeEmergencyTowing = async () => {
    try {
      setLoading(true);
      Vibration.vibrate([0, 500, 200, 500]);
      const location = await getRealUserLocation();
      if (!location) throw new Error('Konum alınamadı');

      const vehicleData = await getVehicleData();
      const userData = await getUserData();

      const emergencyData: EmergencyTowingData = {
        requestId: `EMR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        userId: userId!,
        vehicleInfo: {
          type: vehicleData.vehicleType || 'binek',
          brand: vehicleData.vehicleBrand || 'Bilinmiyor',
          model: vehicleData.vehicleModel || 'Bilinmiyor',
          year: parseInt(vehicleData.vehicleYear) || new Date().getFullYear(),
          plate: vehicleData.vehiclePlate || 'Bilinmiyor'
        },
        location: {
          coordinates: { latitude: location.latitude, longitude: location.longitude },
          address: 'Konum adresi alınıyor...',
          accuracy: 10
        },
        userInfo: userData,
        emergencyDetails: {
          reason: 'emergency',
          description: 'Acil durum çekici talebi',
          severity: 'critical'
        },
        createdAt: new Date()
      };

      let result;
      if (isConnected) {
        result = await sendEmergencyTowingRequest(emergencyData);
      } else {
        const response = await fetch(`${API_URL}/emergency/emergency-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(emergencyData)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();
      }

      if (result && result.success) {
        Alert.alert(
          '✅ Acil Talep Gönderildi',
          `Acil çekici talebiniz başarıyla gönderildi.\n\nTalep ID: ${result.requestId}\n\nEn yakın çekicilere bildirim gönderildi. Çekiciler kabul/red verebilir.`,
          [
            {
              text: 'Takip Et',
              onPress: () => (navigation as any).navigate('EmergencyTracking', { requestId: result.requestId })
            },
            { text: 'Tamam', style: 'default' }
          ]
        );
      } else {
        throw new Error(result.message || result.error || 'Acil talep gönderilemedi');
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      Alert.alert(
        '❌ Hata',
        `Acil çekici talebi gönderilemedi:\n\n${errorObj.message}`,
        [{ text: 'Tamam', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getVehicleData = async () => {
    try {
      const response = await driverApi.getVehicles();

      if (response.success && response.data && response.data.length > 0) {
        const vehicle = response.data[0];
        return {
          vehicleType: vehicle.fuelType || 'binek',
          vehicleBrand: vehicle.brand || 'Bilinmiyor',
          vehicleModel: vehicle.model || 'Bilinmiyor',
          vehicleYear: vehicle.year?.toString() || new Date().getFullYear().toString(),
          vehiclePlate: vehicle.plateNumber || 'Bilinmiyor'
        };
      }
    } catch (error: any) {
      // 401 hatası durumunda kullanıcıyı logout et
      if (error.response?.status === 401) {
        // AuthContext otomatik olarak logout işlemini gerçekleştirecek
        return {
          vehicleType: 'binek',
          vehicleBrand: 'Bilinmiyor',
          vehicleModel: 'Bilinmiyor',
          vehicleYear: new Date().getFullYear().toString(),
          vehiclePlate: 'Bilinmiyor'
        };
      }
    }

    const fallbackResponse = await apiService.getVehicles();
    if (fallbackResponse.success && fallbackResponse.data && fallbackResponse.data.length > 0) {
      return fallbackResponse.data.map((vehicle: any) => ({
        id: vehicle._id,
        brand: vehicle.brand,
        model: vehicle.modelName || vehicle.model,
        year: vehicle.year,
        plateNumber: vehicle.plateNumber,
        engineType: vehicle.engineType,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        mileage: vehicle.mileage,
        isFavorite: vehicle.isFavorite || false
      }));
    }
    return [];
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

      const response = await fetch(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.name && result.data.surname && result.data.phone) {
          const user = result.data;
          return {
            name: user.name,
            surname: user.surname,
            phone: user.phone
          };
        }
      }

      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA_LEGACY);
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.name && parsed.surname && parsed.phone) {
          return {
            name: parsed.name,
            surname: parsed.surname,
            phone: parsed.phone
          };
        }
      }
      
      Alert.alert(
        'Kullanıcı Bilgileri Eksik',
        'Profil bilgileriniz alınamadı. Lütfen uygulamayı yeniden başlatın veya tekrar giriş yapın.',
        [{ text: 'Tamam', style: 'default' }]
      );
      throw new Error('Kullanıcı bilgileri alınamadı');
    } catch (error) {
      Alert.alert(
        'Kullanıcı Bilgileri Eksik',
        'Profil bilgileriniz alınamadı. Lütfen uygulamayı yeniden başlatın veya tekrar giriş yapın.',
        [{ text: 'Tamam', style: 'default' }]
      );
      throw error;
    }
  };

  return { handleEmergencyTowing, loading };
};

export default EmergencyTowingButton;