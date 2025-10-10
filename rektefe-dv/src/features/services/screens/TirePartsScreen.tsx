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
import { useTheme } from '../../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import Background from '../../../shared/components/Background';
import { BackButton } from '../../../shared/components';
import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Input from '../../../shared/components/Input';
import { apiService } from '../../../shared/services/api';
import LocationService, { UserLocation } from '../../../shared/services/locationService';

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
  const [selectedTireBrand, setSelectedTireBrand] = useState<string>('');
  const [selectedTireModel, setSelectedTireModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showBrandModal, setShowBrandModal] = useState<boolean>(false);
  const [showModelModal, setShowModelModal] = useState<boolean>(false);
  const [season, setSeason] = useState<string>('all-season');
  const [quantity, setQuantity] = useState<string>('1');
  const [description, setDescription] = useState<string>('');
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
    try {
      console.log('🔍 TirePartsScreen: Garajdan araç bilgileri yükleniyor...');
      
      // Kullanıcının garajındaki araçları çek
      const response = await apiService.getVehicles();
      
      console.log('🔍 TirePartsScreen: API Response:', JSON.stringify(response, null, 2));
      
      // API response yapısını kontrol et
      let vehicles = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          vehicles = response.data;
        } else if (response.data.vehicles && Array.isArray(response.data.vehicles)) {
          vehicles = response.data.vehicles;
        } else if (response.data && Array.isArray(response.data)) {
          vehicles = response.data;
        }
      }
      
      console.log('🔍 TirePartsScreen: Bulunan araçlar:', vehicles.length, 'araç');
      
      if (vehicles.length > 0) {
        // İlk aracı varsayılan olarak seç
        const vehicle = vehicles[0];
        console.log('🚗 TirePartsScreen: Seçilen araç:', JSON.stringify(vehicle, null, 2));
        
        setVehicleInfo({
          brand: vehicle.brand || vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year || vehicle.modelYear || '',
          engine: vehicle.engineType || vehicle.fuelType || vehicle.engine || ''
        });
        
        // Lastik bilgilerini de çek
        if (vehicle.tireSize) {
          setTireSize(vehicle.tireSize);
        }
        if (vehicle.tireBrand) {
          setTireBrand(vehicle.tireBrand);
        }
        if (vehicle.tireModel) {
          setTireModel(vehicle.tireModel);
        }
        
        console.log('✅ TirePartsScreen: Araç bilgileri başarıyla yüklendi');
      } else {
        console.log('⚠️ TirePartsScreen: Garajda araç bulunamadı');
        // Garajda araç yoksa boş değerler
        setVehicleInfo({
          brand: '',
          model: '',
          year: '',
          engine: ''
        });
        setTireSize('');
        setTireBrand('');
        setTireModel('');
      }
    } catch (error) {
      console.error('❌ TirePartsScreen: Garajdan araç bilgileri yüklenirken hata:', error);
      // Hata durumunda boş değerler
      setVehicleInfo({
        brand: '',
        model: '',
        year: '',
        engine: ''
      });
      setTireSize('');
      setTireBrand('');
      setTireModel('');
    }
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
      id: 'tire_tamir',
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

  // En ünlü 15 lastik markası ve modelleri
  const tireBrands = [
    {
      id: 'michelin',
      name: 'Michelin',
      models: ['Pilot Sport 4', 'Primacy 4', 'Energy Saver+', 'CrossClimate 2', 'Latitude Cross']
    },
    {
      id: 'bridgestone',
      name: 'Bridgestone',
      models: ['Potenza RE003', 'Turanza T005', 'Ecopia EP300', 'Dueler H/P Sport', 'Blizzak LM005']
    },
    {
      id: 'continental',
      name: 'Continental',
      models: ['PremiumContact 6', 'SportContact 6', 'WinterContact TS 860', 'EcoContact 6', 'CrossContact LX2']
    },
    {
      id: 'pirelli',
      name: 'Pirelli',
      models: ['P Zero', 'Cinturato P7', 'Scorpion Verde', 'Winter Sottozero 3', 'Dragon Sport']
    },
    {
      id: 'goodyear',
      name: 'Goodyear',
      models: ['Eagle F1 Asymmetric 5', 'EfficientGrip Performance', 'Vector 4Seasons', 'Wrangler HP All Weather', 'Assurance TripleMax']
    },
    {
      id: 'dunlop',
      name: 'Dunlop',
      models: ['Sport Maxx RT2', 'SP Winter Sport 5', 'Roadsmart III', 'Trailmax Mission', 'SP Sport Maxx 050+']
    },
    {
      id: 'hankook',
      name: 'Hankook',
      models: ['Ventus Prime3 K125', 'Winter i*cept RS2', 'Dynapro AT2', 'Ventus S1 Evo3', 'Kinergy GT']
    },
    {
      id: 'kumho',
      name: 'Kumho',
      models: ['Ecsta PS31', 'WinterCraft WS71', 'Road Venture AT51', 'Ecsta HS51', 'Solus TA11']
    },
    {
      id: 'toyo',
      name: 'Toyo',
      models: ['Proxes Sport', 'Open Country A/T III', 'Celsius CUV', 'Proxes R1R', 'Open Country M/T']
    },
    {
      id: 'yokohama',
      name: 'Yokohama',
      models: ['Advan Sport V105', 'BluEarth-A AE-50', 'Geolandar A/T G015', 'W.drive V905', 'S.drive']
    },
    {
      id: 'falken',
      name: 'Falken',
      models: ['Azenis FK510', 'Eurowinter HS01', 'Sincera SN832', 'Eurowinter HS449', 'Ziex ZE310 Ecorun']
    },
    {
      id: 'nexen',
      name: 'Nexen',
      models: ['N\'Fera SU1', 'Winguard Sport 2', 'Roadian GTX', 'N\'Blue HD Plus', 'N\'Priz AH8']
    },
    {
      id: 'maxxis',
      name: 'Maxxis',
      models: ['Premitra HP5', 'Victra Sport VS5', 'Bravo HP-M3', 'Premitra AP2', 'Victra MA-Z1']
    },
    {
      id: 'cooper',
      name: 'Cooper',
      models: ['Zeon RS3-G1', 'Discoverer AT3 4S', 'CS5 Ultra Touring', 'Discoverer STT Pro', 'Zeon RS3-A']
    },
    {
      id: 'general',
      name: 'General',
      models: ['G-MAX AS-05', 'Altimax RT43', 'Grabber AT3', 'Altimax Arctic 12', 'G-MAX RS']
    }
  ];

  // Fiyat tahmini kaldırıldı - ustalar fiyat belirleyecek

  const handlePartSelect = (partId: string) => {
    setSelectedPart(partId);
  };

  // Araç bilgileri artık garajdan otomatik yükleniyor, düzenlenemez

  const handleTireBrandSelect = (brandId: string) => {
    const brand = tireBrands.find(b => b.id === brandId);
    if (brand) {
      setSelectedTireBrand(brandId);
      setTireBrand(brand.name);
      setAvailableModels(brand.models);
      setSelectedTireModel('');
      setTireModel('');
    }
  };

  const handleTireModelSelect = (model: string) => {
    setSelectedTireModel(model);
    setTireModel(model);
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
          <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
            <BackButton />
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
                Lastik & Parça
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
                Profesyonel lastik hizmetleri
              </Text>
            </View>
          </View>

          {/* Part Selection */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Hizmet Türü Seçin
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
              Hangi lastik hizmetine ihtiyacınız var?
            </Text>
            {tireParts.map(renderPartCard)}
          </Card>

          {/* Vehicle Information */}
          {selectedPart && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Araç Bilgileri
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
                Garajınızdan otomatik yüklenen araç bilgileri. Bu bilgiler düzenlenemez.
              </Text>
              
              <View style={styles.vehicleForm}>
                <View style={styles.readOnlyField}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.text.secondary }]}>Marka</Text>
                  <Text style={[styles.fieldValue, { color: theme.colors.text.primary }]}>
                    {vehicleInfo.brand || 'Belirtilmemiş'}
                  </Text>
                </View>
                
                <View style={styles.readOnlyField}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.text.secondary }]}>Model</Text>
                  <Text style={[styles.fieldValue, { color: theme.colors.text.primary }]}>
                    {vehicleInfo.model || 'Belirtilmemiş'}
                  </Text>
                </View>
                
                <View style={styles.row}>
                  <View style={[styles.readOnlyField, styles.halfField]}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.text.secondary }]}>Yıl</Text>
                    <Text style={[styles.fieldValue, { color: theme.colors.text.primary }]}>
                      {vehicleInfo.year || 'Belirtilmemiş'}
                    </Text>
                  </View>
                  
                  <View style={[styles.readOnlyField, styles.halfField]}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.text.secondary }]}>Motor</Text>
                    <Text style={[styles.fieldValue, { color: theme.colors.text.primary }]}>
                      {vehicleInfo.engine || 'Belirtilmemiş'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Tire Details (for tire services) */}
          {(selectedPart === 'tire_change' || selectedPart === 'tire_tamir' || selectedPart === 'tire_purchase') && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Lastik Detayları
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
                Lastik ölçüsü, markası ve modelini seçebilirsiniz. En ünlü markalar ve modelleri mevcuttur.
              </Text>
              
              <Input
                label="Lastik Ölçüsü"
                value={tireSize}
                onChangeText={handleTireSizeChange}
                placeholder="205/55 R16"
                style={styles.input}
              />
              
              {/* Lastik Markası Seçimi */}
              <View style={styles.dropdownContainer}>
                <Text style={[styles.dropdownLabel, { color: theme.colors.text.secondary }]}>
                  Lastik Markası
                </Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowBrandModal(true)}
                >
                  <Text style={[styles.pickerButtonText, { color: theme.colors.text.primary }]}>
                    {selectedTireBrand ? tireBrands.find(b => b.id === selectedTireBrand)?.name : 'Marka seçin'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              {/* Lastik Modeli Seçimi */}
              {availableModels.length > 0 && (
                <View style={styles.dropdownContainer}>
                  <Text style={[styles.dropdownLabel, { color: theme.colors.text.secondary }]}>
                    Lastik Modeli
                  </Text>
                  <TouchableOpacity 
                    style={styles.pickerButton}
                    onPress={() => setShowModelModal(true)}
                  >
                    <Text style={[styles.pickerButtonText, { color: theme.colors.text.primary }]}>
                      {selectedTireModel || 'Model seçin'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          )}

          {/* Quantity */}
          {selectedPart && (
            <Card style={styles.section}>
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
            </Card>
          )}

          {/* Description */}
          {selectedPart && (
            <Card style={styles.section}>
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
            </Card>
          )}

          {/* Fiyat tahmini kaldırıldı - ustalar fiyat belirleyecek */}

          {/* Request Button */}
          <Card style={styles.section}>
            <Button
              title={loading ? "Talep Gönderiliyor..." : "Talep Oluştur"}
              onPress={handleRequestParts}
              disabled={!selectedPart || loading}
              style={styles.requestButton}
              textStyle={styles.requestButtonText}
            />
          </Card>

          {/* Bottom Spacing */}
          <View style={{ height: 48 }} />
        </ScrollView>

        {/* Brand Selection Modal */}
        <Modal
          visible={showBrandModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBrandModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  Lastik Markası Seçin
                </Text>
                <TouchableOpacity onPress={() => setShowBrandModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalList}>
                {tireBrands.map(brand => (
                  <TouchableOpacity
                    key={brand.id}
                    style={[
                      styles.modalItem,
                      selectedTireBrand === brand.id && { backgroundColor: theme.colors.primary.main + '20' }
                    ]}
                    onPress={() => {
                      handleTireBrandSelect(brand.id);
                      setShowBrandModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: theme.colors.text.primary }]}>
                      {brand.name}
                    </Text>
                    {selectedTireBrand === brand.id && (
                      <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary.main} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Model Selection Modal */}
        <Modal
          visible={showModelModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowModelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  Lastik Modeli Seçin
                </Text>
                <TouchableOpacity onPress={() => setShowModelModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalList}>
                {availableModels.map(model => (
                  <TouchableOpacity
                    key={model}
                    style={[
                      styles.modalItem,
                      selectedTireModel === model && { backgroundColor: theme.colors.primary.main + '20' }
                    ]}
                    onPress={() => {
                      handleTireModelSelect(model);
                      setShowModelModal(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, { color: theme.colors.text.primary }]}>
                      {model}
                    </Text>
                    {selectedTireModel === model && (
                      <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary.main} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.8,
  },
  partCard: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  partContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  partText: {
    flex: 1,
  },
  partName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  partDescription: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
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
  readOnlyField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  halfField: {
    flex: 1,
  },
  dropdownContainer: {
    marginBottom: 16,
    overflow: 'visible',
    zIndex: 1000,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  dropdown: {
    height: 50,
    marginBottom: 10,
  },
  dropdownStyle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownItemStyle: {
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  dropdownListStyle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    zIndex: 10000,
    elevation: 1000,
    borderRadius: 8,
    maxHeight: 200,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    backgroundColor: '#FFFFFF',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '400',
  },
});

export default TirePartsScreen;
