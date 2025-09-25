import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import Input from '@/shared/components/Input';
import { apiService } from '@/shared/services/api';
import LocationService, { UserLocation } from '@/shared/services/locationService';

type TirePartsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TireParts'>;

interface TirePart {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requiresSpecs: boolean;
}

interface VehicleInfo {
  brand: string;
  model: string;
  year: string;
  engine: string;
}

const TirePartsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<TirePartsScreenNavigationProp>();
  
  // State
  const [loading, setLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState<string>('');
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    brand: '',
    model: '',
    year: '',
    engine: ''
  });
  const [tireSize, setTireSize] = useState<string>('');
  const [tireBrand, setTireBrand] = useState<string>('');
  const [tireModel, setTireModel] = useState<string>('');
  const [season, setSeason] = useState<string>('all-season');
  const [quantity, setQuantity] = useState<string>('1');
  const [description, setDescription] = useState<string>('');
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Load vehicle data on mount
  useEffect(() => {
    loadVehicleData();
  }, []);

  // Konum bilgisini al
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();
      
      if (location) {
        setCurrentLocation(location);
        } else {
        }
    } catch (error) {
      } finally {
      setLocationLoading(false);
    }
  };

  // Sayfa yüklendiğinde konum al
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Load vehicle data from garage
  const loadVehicleData = async () => {
    // Varsayılan değerler
    setVehicleInfo({
      brand: 'Bilinmiyor',
      model: 'Bilinmiyor',
      year: '',
      engine: 'binek'
    });
    setTireSize('');
    setTireBrand('');
    setTireModel('');
  };

  // Tire parts - Usta tarafındaki mock verilerle entegre
  const tireParts: TirePart[] = [
    {
      id: 'tire_change',
      name: 'Lastik Değişimi',
      description: 'Lastik satış ve montaj hizmeti',
      icon: 'car',
      color: '#F59E0B',
      requiresSpecs: true
    },
    {
      id: 'tire_repair',
      name: 'Lastik Tamiri',
      description: 'Lastik yama ve tamir hizmeti',
      icon: 'wrench',
      color: '#EF4444',
      requiresSpecs: true
    },
    {
      id: 'tire_balance',
      name: 'Lastik Balansı',
      description: 'Lastik balans ayarı',
      icon: 'car-brake-abs',
      color: '#3B82F6',
      requiresSpecs: true
    },
    {
      id: 'tire_alignment',
      name: 'Rot Balansı',
      description: 'Rot ayarı ve balans',
      icon: 'car',
      color: '#10B981',
      requiresSpecs: true
    },
    {
      id: 'tire_inspection',
      name: 'Lastik Kontrolü',
      description: 'Lastik durumu kontrolü',
      icon: 'magnify',
      color: '#8B5CF6',
      requiresSpecs: true
    },
    {
      id: 'tire_purchase',
      name: 'Lastik Satışı',
      description: 'Yeni lastik satışı',
      icon: 'shopping',
      color: '#6366F1',
      requiresSpecs: true
    }
  ];

  // Calculate estimated price - Usta tarafındaki mock verilerle entegre
  useEffect(() => {
    let basePrice = 0;
    
    switch (selectedPart) {
      case 'tire_change':
        basePrice = 800; // 4 lastik + montaj
        break;
      case 'tire_repair':
        basePrice = 120; // Yama + balans
        break;
      case 'tire_balance':
        basePrice = 80; // Balans ayarı
        break;
      case 'tire_alignment':
        basePrice = 150; // Rot + balans
        break;
      case 'tire_inspection':
        basePrice = 50; // Kontrol ücreti
        break;
      case 'tire_purchase':
        basePrice = 600; // Lastik satışı
        break;
    }
    
    const qty = parseInt(quantity) || 1;
    setEstimatedPrice(basePrice * qty);
  }, [selectedPart, quantity]);

  const handlePartSelect = (partId: string) => {
    setSelectedPart(partId);
  };

  const handleVehicleInfoChange = (field: keyof VehicleInfo, value: string) => {
    setVehicleInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTireSizeChange = (value: string) => {
    // Basic tire size validation (e.g., 205/55 R16)
    const tireSizeRegex = /^\d{3}\/\d{2}\sR\d{2}$/;
    if (value === '' || tireSizeRegex.test(value)) {
      setTireSize(value);
    }
  };

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value);
    if (value === '' || (num > 0 && num <= 10)) {
      setQuantity(value);
    }
  };

  const handleRequestParts = async () => {
    if (!selectedPart) {
      Alert.alert('Eksik Bilgi', 'Lütfen parça türü seçin.');
      return;
    }

    const selectedPartData = tireParts.find(part => part.id === selectedPart);
    
    if (selectedPartData?.requiresSpecs) {
      if (selectedPart === 'lastik' && !tireSize) {
        Alert.alert('Eksik Bilgi', 'Lastik için lastik ölçüsü gerekli.');
        return;
      }
      
      if (!vehicleInfo.brand || !vehicleInfo.model) {
        Alert.alert('Eksik Bilgi', 'Araç marka ve model bilgisi gerekli.');
        return;
      }
    }

    try {
      setLoading(true);

      const requestData = {
        partType: selectedPart,
        vehicleInfo,
        tireSize: tireSize,
        tireBrand: tireBrand,
        tireModel: tireModel,
        season: season,
        quantity: parseInt(quantity),
        description,
        estimatedPrice,
        specialRequests: description,
        location: currentLocation ? {
          coordinates: [currentLocation.longitude, currentLocation.latitude],
          address: '', // Adres bilgisi şimdilik boş
          city: '',
          district: '',
          neighborhood: ''
        } : undefined
      };

      const response = await apiService.createTirePartsRequest(requestData);
      
      if (response.success) {
        Alert.alert(
          'Talep Gönderildi',
          'Parça talebiniz en yakın ustalara iletildi. En kısa sürede size dönüş yapılacak.',
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
      Alert.alert('Hata', 'Parça talebi gönderilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const renderPartCard = (part: TirePart) => (
    <TouchableOpacity
      key={part.id}
      style={[
        styles.partCard,
        {
          backgroundColor: selectedPart === part.id 
            ? part.color + '20' 
            : theme.colors.background.card,
          borderColor: selectedPart === part.id 
            ? part.color 
            : theme.colors.border.primary,
        }
      ]}
      onPress={() => handlePartSelect(part.id)}
    >
      <View style={styles.partContent}>
        <View style={[
          styles.partIcon,
          { backgroundColor: part.color }
        ]}>
          <MaterialCommunityIcons 
            name={part.icon as any} 
            size={24} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.partText}>
          <Text style={[
            styles.partName,
            { color: theme.colors.text.primary }
          ]}>
            {part.name}
          </Text>
          <Text style={[
            styles.partDescription,
            { color: theme.colors.text.secondary }
          ]}>
            {part.description}
          </Text>
        </View>
        {selectedPart === part.id && (
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={part.color} 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
      <Background>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
                Lastik & Parça
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
                İhtiyacınız olan parçayı bulun
              </Text>
            </View>
          </View>

          {/* Part Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Parça Türü Seçin
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
              Hangi parçaya ihtiyacınız var?
            </Text>
            {tireParts.map(renderPartCard)}
          </View>

          {/* Vehicle Information */}
          {selectedPart && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Araç Bilgileri
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
                Aracınızın bilgilerini girin
              </Text>
              
              <View style={styles.vehicleForm}>
                <Input
                  label="Marka"
                  value={vehicleInfo.brand}
                  onChangeText={(value) => handleVehicleInfoChange('brand', value)}
                  placeholder="Örn: Toyota, Ford, BMW"
                  style={styles.input}
                />
                
                <Input
                  label="Model"
                  value={vehicleInfo.model}
                  onChangeText={(value) => handleVehicleInfoChange('model', value)}
                  placeholder="Örn: Corolla, Focus, 3 Series"
                  style={styles.input}
                />
                
                <View style={styles.row}>
                  <Input
                    label="Yıl"
                    value={vehicleInfo.year}
                    onChangeText={(value) => handleVehicleInfoChange('year', value)}
                    placeholder="2020"
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                  
                  <Input
                    label="Motor"
                    value={vehicleInfo.engine}
                    onChangeText={(value) => handleVehicleInfoChange('engine', value)}
                    placeholder="1.6"
                    style={[styles.input, styles.halfInput]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Tire Size (for tire selection) */}
          {selectedPart === 'lastik' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Lastik Ölçüsü
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
                Lastiğinizin ölçüsünü girin (örn: 205/55 R16)
              </Text>
              
              <Input
                label="Lastik Ölçüsü"
                value={tireSize}
                onChangeText={handleTireSizeChange}
                placeholder="205/55 R16"
                style={styles.input}
              />
            </View>
          )}

          {/* Quantity */}
          {selectedPart && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Miktar
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
                Kaç adet istiyorsunuz?
              </Text>
              
              <Input
                label="Miktar"
                value={quantity}
                onChangeText={handleQuantityChange}
                placeholder="1"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          )}

          {/* Description */}
          {selectedPart && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Açıklama
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
                Ek bilgi veya özel istekleriniz
              </Text>
              
              <Input
                label="Açıklama"
                value={description}
                onChangeText={setDescription}
                placeholder="Özel isteklerinizi yazın..."
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </View>
          )}

          {/* Price Estimate */}
          {estimatedPrice > 0 && (
            <View style={styles.section}>
              <Card style={[styles.priceCard, { backgroundColor: theme.colors.warning.main + '10' }]}>
                <View style={styles.priceContent}>
                  <MaterialCommunityIcons 
                    name="currency-try" 
                    size={24} 
                    color={theme.colors.warning.main} 
                  />
                  <View style={styles.priceText}>
                    <Text style={[styles.priceLabel, { color: theme.colors.text.secondary }]}>
                      Tahmini Fiyat
                    </Text>
                    <Text style={[styles.priceAmount, { color: theme.colors.warning.main }]}>
                      ₺{estimatedPrice}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.priceNote, { color: theme.colors.text.secondary }]}>
                  * Kesin fiyat usta ile görüşüldükten sonra belirlenir
                </Text>
              </Card>
            </View>
          )}

          {/* Request Button */}
          <View style={styles.section}>
            <Button
              title="Talep Oluştur"
              onPress={handleRequestParts}
              disabled={!selectedPart || loading}
              style={[
                styles.requestButton,
                { backgroundColor: theme.colors.warning.main }
              ]}
              textStyle={styles.requestButtonText}
            />
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 48 }} />
        </ScrollView>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  partCard: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    padding: 16,
  },
  partContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  partText: {
    flex: 1,
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  partDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  vehicleForm: {
    gap: 16,
  },
  input: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  priceCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  priceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    marginLeft: 16,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  priceNote: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  requestButton: {
    paddingVertical: 16,
    borderRadius: 16,
  },
  requestButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default TirePartsScreen;
