import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { getRealUserLocation } from '@/shared/utils/distanceCalculator';
import { apiService } from '@/shared/services/api';

interface QuickTowingOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  reason: string;
  emergencyLevel: 'high' | 'medium';
}

interface QuickTowingOptionsProps {
  style?: StyleProp<ViewStyle>;
}

export const QuickTowingOptions: React.FC<QuickTowingOptionsProps> = ({ style }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState<string | null>(null);

  const quickOptions: QuickTowingOption[] = [
    {
      id: 'emergency',
      title: 'Acil Durum',
      subtitle: 'Hemen çekici çağır',
      icon: 'truck',
      color: '#EF4444',
      reason: 'emergency',
      emergencyLevel: 'high'
    },
    {
      id: 'accident',
      title: 'Kaza',
      subtitle: 'Kaza sonrası çekici',
      icon: 'car-multiple',
      color: '#DC2626',
      reason: 'accident',
      emergencyLevel: 'high'
    },
    {
      id: 'breakdown',
      title: 'Arıza',
      subtitle: 'Motor arızası',
      icon: 'wrench',
      color: '#F59E0B',
      reason: 'breakdown',
      emergencyLevel: 'medium'
    },
    {
      id: 'battery',
      title: 'Akü Takviyesi',
      subtitle: 'Akü bitmesi',
      icon: 'battery',
      color: '#10B981',
      reason: 'aku',
      emergencyLevel: 'medium'
    },
    {
      id: 'tire',
      title: 'Lastik Değişimi',
      subtitle: 'Lastik patlaması',
      icon: 'car',
      color: '#8B5CF6',
      reason: 'lastik',
      emergencyLevel: 'medium'
    },
    {
      id: 'fuel',
      title: 'Yakıt Takviyesi',
      subtitle: 'Yakıt bitmesi',
      icon: 'gas-station',
      color: '#06B6D4',
      reason: 'yakit',
      emergencyLevel: 'medium'
    }
  ];

  const handleQuickTowing = async (option: QuickTowingOption) => {
    Alert.alert(
      'Çekici Talebi',
      `${option.title} için çekici çağırmak istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Çağır',
          onPress: () => executeQuickTowing(option)
        }
      ]
    );
  };

  const executeQuickTowing = async (option: QuickTowingOption): Promise<void> => {
    try {
      setLoading(option.id);

      // Hızlı veri toplama
      const location: { latitude: number; longitude: number } | null = await getRealUserLocation().catch((): null => null);
      const vehicleData = {
        vehicleType: 'binek',
        vehicleBrand: 'Bilinmiyor',
        vehicleModel: 'Bilinmiyor',
        vehicleYear: '',
        vehiclePlate: ''
      };

      const requestData = {
        vehicleType: vehicleData.vehicleType,
        reason: option.reason,
        pickupLocation: location ? { 
          coordinates: { 
            latitude: location.latitude, 
            longitude: location.longitude 
          } 
        } : undefined,
        description: `${option.title}: ${vehicleData.vehicleBrand} ${vehicleData.vehicleModel} (${vehicleData.vehiclePlate}) için çekici talebi`,
        emergencyLevel: option.emergencyLevel,
        towingType: vehicleData.vehicleType === 'ticari' ? 'flatbed' : 'wheel-lift',
        requestType: 'quick'
      };

      const response = await apiService.createTowingRequest(requestData);
      
      if (response.success) {
        Alert.alert(
          'Talep Gönderildi',
          `${option.title} çekici talebiniz en yakın ustalara iletildi. En kısa sürede size dönüş yapılacak.`,
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Talep gönderilemedi');
      }
    } catch (error) {
      Alert.alert(
        'Hata', 
        `${option.title} çekici talebi gönderilirken bir hata oluştu. Lütfen normal çekici talebi formunu kullanın.`,
        [
          {
            text: 'Normal Form',
            onPress: () => navigation.navigate('TowingRequest' as never)
          },
          {
            text: 'Tamam',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Hızlı Çekici Seçenekleri
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        Durumunuza uygun seçeneği seçin
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {quickOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              {
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border.primary,
                opacity: loading === option.id ? 0.6 : 1
              }
            ]}
            onPress={() => handleQuickTowing(option)}
            disabled={loading === option.id}
            activeOpacity={0.8}
          >
            {loading === option.id ? (
              <ActivityIndicator color={option.color} size="small" />
            ) : (
              <>
                <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                  <MaterialCommunityIcons 
                    name={option.icon} 
                    size={24} 
                    color="white" 
                  />
                </View>
                
                <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]}>
                  {option.title}
                </Text>
                
                <Text style={[styles.optionSubtitle, { color: theme.colors.text.secondary }]}>
                  {option.subtitle}
                </Text>
                
              </>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.detailedFormButton,
          {
            backgroundColor: theme.colors.background.secondary,
            borderColor: theme.colors.border.primary,
          }
        ]}
        onPress={() => navigation.navigate('TowingRequest' as never)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name="form-select" 
          size={20} 
          color={theme.colors.text.secondary} 
        />
        <Text style={[styles.detailedFormText, { color: theme.colors.text.secondary }]}>
          Detaylı Form Doldur
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  scrollContent: {
    paddingRight: 16,
  },
  optionCard: {
    width: 140,
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  detailedFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  detailedFormText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
