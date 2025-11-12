import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
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

interface TireService {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface VehicleInfo {
  vehicleId: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
}

const TirePartsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<TirePartsScreenNavigationProp>();
  
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Hizmet seç, 2: Detaylar, 3: Usta seç
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [vehicles, setVehicles] = useState<VehicleInfo[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInfo | null>(null);
  const [tireSize, setTireSize] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('4');
  const [description, setDescription] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [isMobileService, setIsMobileService] = useState<boolean>(false);
  const [isShopService, setIsShopService] = useState<boolean>(true); // Varsayılan dükkanda montaj
  const [nearbyMechanics, setNearbyMechanics] = useState<any[]>([]);
  const [selectedMechanic, setSelectedMechanic] = useState<any>(null);
  const [showTireSizeModal, setShowTireSizeModal] = useState<boolean>(false);

  // Yaygın lastik ölçüleri
  const commonTireSizes = [
    { size: '185/65 R15', type: 'Küçük Araç' },
    { size: '195/65 R15', type: 'Kompakt' },
    { size: '205/55 R16', type: 'Orta Segment' },
    { size: '215/55 R16', type: 'Orta Segment' },
    { size: '215/60 R16', type: 'SUV/Crossover' },
    { size: '225/45 R17', type: 'Spor Sedan' },
    { size: '225/50 R17', type: 'Sedan' },
    { size: '225/55 R17', type: 'SUV' },
    { size: '235/55 R18', type: 'SUV' },
    { size: '245/45 R18', type: 'Spor' },
    { size: '255/55 R18', type: 'Büyük SUV' },
  ];

  // Lastik hizmetleri
  const tireServices: TireService[] = [
    {
      id: 'tire_change',
      name: 'Lastik Değişimi',
      description: 'Yeni lastik montajı',
      icon: 'car-wrench',
      color: '#F59E0B',
    },
    {
      id: 'tire_repair',
      name: 'Lastik Tamiri',
      description: 'Yama ve tamir',
      icon: 'wrench',
      color: '#EF4444',
    },
    {
      id: 'tire_balance',
      name: 'Balans',
      description: 'Lastik balans ayarı',
      icon: 'chart-donut',
      color: '#3B82F6',
    },
    {
      id: 'tire_alignment',
      name: 'Rot Ayarı',
      description: 'Rot balans',
      icon: 'axis-arrow',
      color: '#10B981',
    },
    {
      id: 'tire_inspection',
      name: 'Lastik Kontrolü',
      description: 'Genel kontrol',
      icon: 'magnify',
      color: '#8B5CF6',
    },
    {
      id: 'tire_purchase',
      name: 'Lastik Satışı',
      description: 'Yeni lastik alımı',
      icon: 'shopping',
      color: '#06B6D4',
    },
  ];

  useEffect(() => {
    loadVehicles();
    getCurrentLocation();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await apiService.getVehicles();
      
      if (response.success && response.data) {
        const vehicleList = Array.isArray(response.data) 
          ? response.data 
          : response.data.vehicles || [];
        
        const formattedVehicles = vehicleList.map((v: any) => ({
          vehicleId: v._id,
          brand: v.brand,
          model: v.model || v.modelName,
          year: v.year,
          plateNumber: v.plateNumber
        }));
        
        setVehicles(formattedVehicles);
        
        if (formattedVehicles.length > 0) {
          setSelectedVehicle(formattedVehicles[0]);
        }
      }
    } catch (error) {
      console.error('Araçlar yüklenirken hata:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
      }
    } catch (error) {
      console.error('Konum alınırken hata:', error);
    }
  };

  const loadNearbyMechanics = async () => {
    try {
      setLoading(true);
      
      const filters = {
        serviceCategory: 'tire',
        location: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : undefined
      };
      
      const response = await apiService.getMechanics(filters);
      
      if (response.success && response.data) {
        setNearbyMechanics(response.data);
      } else {
        setNearbyMechanics([]);
      }
    } catch (error) {
      console.error('Ustalar yüklenirken hata:', error);
      setNearbyMechanics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setStep(2);
  };

  const handleNextToMechanics = async () => {
    if (!selectedVehicle) {
      Alert.alert('Uyarı', 'Lütfen bir araç seçin');
      return;
    }
    
    if (!tireSize && (selectedService === 'tire_change' || selectedService === 'tire_purchase')) {
      Alert.alert('Uyarı', 'Lütfen lastik ölçüsü girin');
      return;
    }
    
    await loadNearbyMechanics();
    setStep(3);
  };

  const handleCreateRequest = async () => {
    if (!selectedMechanic) {
      Alert.alert('Uyarı', 'Lütfen bir usta seçin');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        tireServiceType: selectedService,
        vehicleId: selectedVehicle?.vehicleId,
        vehicleInfo: {
          brand: selectedVehicle?.brand,
          model: selectedVehicle?.model,
          year: selectedVehicle?.year?.toString(),
          plateNumber: selectedVehicle?.plateNumber
        },
        tireDetails: {
          size: tireSize,
          condition: 'used',
          quantity: parseInt(quantity),
          ...(description ? { notes: description } : {})
        },
        location: currentLocation ? {
          coordinates: [currentLocation.longitude, currentLocation.latitude],
          address: '',
          city: '',
          district: '',
        } : undefined,
        isMobileService,
        isUrgent: false,
        ...(description ? { description, specialRequests: description } : {}),
        mechanicId: selectedMechanic._id
      };

      const response = await apiService.createTireServiceRequest(requestData);
      
      if (response.success) {
        const jobId = response.data?._id;
        
        Alert.alert(
          'Talep Gönderildi',
          `${selectedMechanic.name} ${selectedMechanic.surname} ustaya talebiniz gönderildi.`,
          [
            {
              text: 'Takip Et',
              onPress: () => {
                if (jobId) {
                  navigation.navigate('TireServiceTracking', { jobId });
                } else {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Talep gönderilemedi');
      }
    } catch (error: any) {
      console.error('Talep oluşturma hatası:', error);
      Alert.alert('Hata', error.message || 'Talep oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Hizmet Seçimi
  const renderStep1 = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Lastik Hizmeti Seçin
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
          İhtiyacınız olan hizmeti seçerek başlayın
        </Text>
        
        {tireServices.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              {
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border.primary,
              }
            ]}
            onPress={() => handleServiceSelect(service.id)}
          >
            <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
              <MaterialCommunityIcons name={service.icon as any} size={28} color="#FFFFFF" />
            </View>
            <View style={styles.serviceText}>
              <Text style={[styles.serviceName, { color: theme.colors.text.primary }]}>
                {service.name}
              </Text>
              <Text style={[styles.serviceDescription, { color: theme.colors.text.secondary }]}>
                {service.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </Card>
    </ScrollView>
  );

  // STEP 2: Detaylar
  const renderStep2 = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Araç Seçimi */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Araç Seçin
        </Text>
        {vehicles.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.vehicleId}
            style={[
              styles.vehicleCard,
              {
                backgroundColor: selectedVehicle?.vehicleId === vehicle.vehicleId
                  ? theme.colors.primary.main + '15'
                  : theme.colors.background.secondary,
                borderColor: selectedVehicle?.vehicleId === vehicle.vehicleId
                  ? theme.colors.primary.main
                  : theme.colors.border.primary,
              }
            ]}
            onPress={() => setSelectedVehicle(vehicle)}
          >
            <Ionicons 
              name="car" 
              size={32} 
              color={selectedVehicle?.vehicleId === vehicle.vehicleId 
                ? theme.colors.primary.main 
                : theme.colors.text.secondary
              } 
            />
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleName, { color: theme.colors.text.primary }]}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text style={[styles.vehicleDetail, { color: theme.colors.text.secondary }]}>
                {vehicle.year} • {vehicle.plateNumber}
              </Text>
            </View>
            {selectedVehicle?.vehicleId === vehicle.vehicleId && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.main} />
            )}
          </TouchableOpacity>
        ))}
      </Card>

      {/* Lastik Bilgileri */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Lastik Bilgileri
        </Text>
        
        <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
          Lastik Ölçüsü
        </Text>
        
        <View style={styles.tireSizeContainer}>
          <TouchableOpacity
            style={[styles.tireSizeButton, { 
              backgroundColor: theme.colors.primary.main,
              borderColor: theme.colors.primary.main 
            }]}
            onPress={() => setShowTireSizeModal(true)}
          >
            <Ionicons name="list" size={20} color="#FFFFFF" />
            <Text style={styles.tireSizeButtonText}>
              {tireSize || 'Yaygın Ölçülerden Seç'}
            </Text>
          </TouchableOpacity>
          
          {tireSize && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: theme.colors.background.secondary }]}
              onPress={() => setTireSize('')}
            >
              <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={[styles.helperText, { color: theme.colors.text.tertiary }]}>
          veya lastik üzerindeki ebatı girin
        </Text>
        
        <Input
          label=""
          value={tireSize}
          onChangeText={setTireSize}
          placeholder="Örn: 205/55 R16"
          style={styles.input}
        />
        
        <Input
          label="Miktar"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="4"
          keyboardType="numeric"
          style={styles.input}
        />
        
        <Input
          label="Açıklama (Opsiyonel)"
          value={description}
          onChangeText={setDescription}
          placeholder="Ek bilgiler..."
          multiline
          numberOfLines={3}
          style={styles.input}
        />
      </Card>

      {/* Hizmet Seçenekleri */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Hizmet Tercihleri
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
          Hizmetin nasıl verilmesini istersiniz?
        </Text>
        
        <TouchableOpacity
          style={[
            styles.optionCard,
            {
              backgroundColor: isShopService 
                ? theme.colors.success.main + '10' 
                : theme.colors.background.secondary,
              borderColor: isShopService 
                ? theme.colors.success.main 
                : theme.colors.border.primary
            }
          ]}
          onPress={() => {
            setIsShopService(true);
            setIsMobileService(false);
          }}
        >
          <Ionicons 
            name="storefront" 
            size={24} 
            color={isShopService ? theme.colors.success.main : theme.colors.text.secondary} 
          />
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]}>
              Dükkanda Montaj
            </Text>
            <Text style={[styles.optionDescription, { color: theme.colors.text.secondary }]}>
              Ustanın dükkânına giderim
            </Text>
          </View>
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isShopService ? theme.colors.success.main : 'transparent',
              borderColor: isShopService ? theme.colors.success.main : theme.colors.border.primary
            }
          ]}>
            {isShopService && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            {
              backgroundColor: isMobileService 
                ? theme.colors.primary.main + '10' 
                : theme.colors.background.secondary,
              borderColor: isMobileService 
                ? theme.colors.primary.main 
                : theme.colors.border.primary
            }
          ]}
          onPress={() => {
            setIsMobileService(true);
            setIsShopService(false);
          }}
        >
          <Ionicons 
            name="car" 
            size={24} 
            color={isMobileService ? theme.colors.primary.main : theme.colors.text.secondary} 
          />
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: theme.colors.text.primary }]}>
              Mobil Hizmet
            </Text>
            <Text style={[styles.optionDescription, { color: theme.colors.text.secondary }]}>
              Usta bulunduğum yere gelsin
            </Text>
          </View>
          <View style={[
            styles.checkbox,
            {
              backgroundColor: isMobileService ? theme.colors.primary.main : 'transparent',
              borderColor: isMobileService ? theme.colors.primary.main : theme.colors.border.primary
            }
          ]}>
            {isMobileService && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>
      </Card>

      {/* Devam Butonu */}
      <Card style={styles.section}>
        <Button
          title="Ustaları Gör"
          onPress={handleNextToMechanics}
          disabled={!selectedVehicle}
          style={styles.nextButton}
        />
      </Card>

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  // STEP 3: Usta Seçimi
  const renderStep3 = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Yakınınızdaki Ustalar
        </Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
          Lastik hizmeti veren {nearbyMechanics.length} usta bulundu
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </View>
        ) : nearbyMechanics.length > 0 ? (
          nearbyMechanics.map((mechanic) => (
            <TouchableOpacity
              key={mechanic._id}
              style={[
                styles.mechanicCard,
                {
                  backgroundColor: selectedMechanic?._id === mechanic._id
                    ? theme.colors.primary.main + '10'
                    : theme.colors.background.secondary,
                  borderColor: selectedMechanic?._id === mechanic._id
                    ? theme.colors.primary.main
                    : theme.colors.border.primary,
                }
              ]}
              onPress={() => setSelectedMechanic(mechanic)}
            >
              <View style={styles.mechanicHeader}>
                <View style={[styles.mechanicAvatar, { backgroundColor: theme.colors.primary.main }]}>
                  <Text style={styles.mechanicAvatarText}>
                    {mechanic.name?.charAt(0)}{mechanic.surname?.charAt(0)}
                  </Text>
                </View>
                <View style={styles.mechanicInfo}>
                  <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                    {mechanic.name} {mechanic.surname}
                  </Text>
                  {mechanic.shopName && (
                    <Text style={[styles.mechanicShop, { color: theme.colors.text.secondary }]}>
                      {mechanic.shopName}
                    </Text>
                  )}
                  <View style={styles.mechanicMeta}>
                    {mechanic.rating > 0 && (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={14} color="#FFB800" />
                        <Text style={[styles.ratingText, { color: theme.colors.text.secondary }]}>
                          {mechanic.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {mechanic.experience > 0 && (
                      <Text style={[styles.experienceText, { color: theme.colors.text.tertiary }]}>
                        {mechanic.experience} yıl tecrübe
                      </Text>
                    )}
                    {mechanic.distance && (
                      <Text style={[styles.distanceText, { color: theme.colors.text.tertiary }]}>
                        {mechanic.formattedDistance || `${mechanic.distance.toFixed(1)} km`}
                      </Text>
                    )}
                  </View>
                </View>
                {selectedMechanic?._id === mechanic._id && (
                  <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary.main} />
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={theme.colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              Usta Bulunamadı
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.text.secondary }]}>
              Yakınınızda lastik hizmeti veren usta bulunamadı
            </Text>
          </View>
        )}
      </Card>

      {/* Özet Kart */}
      {selectedMechanic && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Talep Özeti
          </Text>
          
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.background.secondary }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>
                Hizmet:
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                {tireServices.find(s => s.id === selectedService)?.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>
                Araç:
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                {selectedVehicle?.brand} {selectedVehicle?.model}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>
                Usta:
              </Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                {selectedMechanic.name} {selectedMechanic.surname}
              </Text>
            </View>
            {tireSize && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>
                  Lastik Ölçüsü:
                </Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                  {tireSize}
                </Text>
              </View>
            )}
            <View style={styles.summaryBadgesRow}>
              {isShopService && (
                <View style={[styles.summaryBadge, { backgroundColor: theme.colors.success.main + '10' }]}>
                  <Ionicons name="storefront" size={16} color={theme.colors.success.main} />
                  <Text style={[styles.summaryBadgeText, { color: theme.colors.success.main }]}>
                    Dükkanda Montaj
                  </Text>
                </View>
              )}
              {isMobileService && (
                <View style={[styles.summaryBadge, { backgroundColor: theme.colors.primary.main + '10' }]}>
                  <Ionicons name="car" size={16} color={theme.colors.primary.main} />
                  <Text style={[styles.summaryBadgeText, { color: theme.colors.primary.main }]}>
                    Mobil Hizmet
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>
      )}

      {/* Gönder Butonu */}
      {selectedMechanic && (
        <Card style={styles.section}>
          <Button
            title={loading ? "Gönderiliyor..." : "Talep Gönder"}
            onPress={handleCreateRequest}
            disabled={loading}
            style={styles.submitButton}
          />
        </Card>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
      <Background>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary, borderBottomColor: theme.colors.border.primary }]}>
          {step > 1 ? (
            <TouchableOpacity onPress={() => setStep((step - 1) as 1 | 2)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <BackButton />
          )}
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Lastik Hizmeti
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              {step === 1 && 'Hizmet Seçin'}
              {step === 2 && 'Detaylar'}
              {step === 3 && 'Usta Seçin'}
            </Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.background.secondary }]}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: step >= s 
                    ? theme.colors.primary.main 
                    : theme.colors.border.primary
                }
              ]}
            />
          ))}
        </View>

        {/* Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Lastik Ölçüsü Modal */}
        <Modal
          visible={showTireSizeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTireSizeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border.primary }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  Lastik Ölçüsü Seçin
                </Text>
                <TouchableOpacity onPress={() => setShowTireSizeModal(false)}>
                  <Ionicons name="close" size={28} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalList}>
                {commonTireSizes.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.tireSizeItem,
                      {
                        backgroundColor: tireSize === item.size
                          ? theme.colors.primary.main + '15'
                          : 'transparent',
                        borderBottomColor: theme.colors.border.primary
                      }
                    ]}
                    onPress={() => {
                      setTireSize(item.size);
                      setShowTireSizeModal(false);
                    }}
                  >
                    <View style={styles.tireSizeItemContent}>
                      <Text style={[styles.tireSizeText, { color: theme.colors.text.primary }]}>
                        {item.size}
                      </Text>
                      <Text style={[styles.tireSizeType, { color: theme.colors.text.secondary }]}>
                        {item.type}
                      </Text>
                    </View>
                    {tireSize === item.size && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary.main} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressDot: {
    width: 32,
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceText: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
  },
  vehicleDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    marginTop: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  mechanicCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  mechanicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mechanicAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mechanicAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  mechanicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: '600',
  },
  mechanicShop: {
    fontSize: 13,
    marginTop: 2,
  },
  mechanicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  experienceText: {
    fontSize: 12,
  },
  distanceText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  tireSizeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tireSizeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  tireSizeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalList: {
    maxHeight: 500,
  },
  tireSizeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  tireSizeItemContent: {
    flex: 1,
  },
  tireSizeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  tireSizeType: {
    fontSize: 13,
  },
});

export default TirePartsScreen;
