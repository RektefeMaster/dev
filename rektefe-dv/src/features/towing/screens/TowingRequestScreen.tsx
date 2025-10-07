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
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';
import Card from '@/shared/components/Card';
import { getRealUserLocation, getFallbackUserLocation } from '@/shared/utils/distanceCalculator';
import LocationPicker from '@/shared/components/LocationPicker';
import { apiService } from '@/shared/services/api';

type TowingRequestScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TowingRequest'>;

interface VehicleType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface TowingReason {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const TowingRequestScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<TowingRequestScreenNavigationProp>();
  
  // State
  const [loading, setLoading] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [pickupLocation, setPickupLocation] = useState<any>(null);
  const [dropoffLocation, setDropoffLocation] = useState<any>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationType, setLocationType] = useState<'pickup' | 'dropoff'>('pickup');
  const [tempLocation, setTempLocation] = useState<any>(null);
  
  // Araç bilgileri
  const [vehicleData, setVehicleData] = useState({
    vehicleType: 'binek',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: ''
  });

  // Vehicle types
  const vehicleTypes: VehicleType[] = [
    {
      id: 'binek',
      name: 'Binek Araç',
      icon: 'car',
      description: 'Sedan, Hatchback, Coupe'
    },
    {
      id: 'suv',
      name: 'SUV',
      icon: 'car',
      description: 'SUV, Crossover, Pickup'
    },
    {
      id: 'ticari',
      name: 'Ticari Araç',
      icon: 'truck',
      description: 'Kamyon, Kamyonet, Van'
    }
  ];

  // Towing reasons - Acil çağrı sistemi
  const towingReasons: TowingReason[] = [
    {
      id: 'emergency',
      name: 'Acil Durum',
      icon: 'car-alert',
      description: 'Acil müdahale gereken durum'
    },
    {
      id: 'accident',
      name: 'Kaza',
      icon: 'car-alert',
      description: 'Trafik kazası sonrası'
    },
    {
      id: 'breakdown',
      name: 'Arıza',
      icon: 'wrench',
      description: 'Motor veya mekanik arıza'
    },
    {
      id: 'aku',
      name: 'Akü Takviyesi',
      icon: 'battery',
      description: 'Akü bitmesi durumu'
    },
    {
      id: 'lastik',
      name: 'Lastik Değişimi',
      icon: 'car',
      description: 'Lastik patlaması veya arızası'
    },
    {
      id: 'yakit',
      name: 'Yakıt Takviyesi',
      icon: 'gas-station',
      description: 'Yakıt bitmesi durumu'
    }
  ];

  // Get user location and vehicle data on mount
  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    try {
      setLoading(true);
      const location = await getRealUserLocation();
      if (location) {
        setPickupLocation(location);
      } else {
        setPickupLocation(getFallbackUserLocation());
      }
    } catch (error) {
      setPickupLocation(getFallbackUserLocation());
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated price
  useEffect(() => {
    if (!selectedVehicleType || !selectedReason) return;
    
    let basePrice = 0;
    if (selectedVehicleType === 'binek') basePrice = 200;
    else if (selectedVehicleType === 'suv') basePrice = 250;
    else if (selectedVehicleType === 'ticari') basePrice = 300;
    
    if (selectedReason === 'aku' || selectedReason === 'yakit') {
      basePrice = basePrice * 0.5; // Half price for simple services
    }
    
    setEstimatedPrice(basePrice);
  }, [selectedVehicleType, selectedReason]);

  const handleVehicleTypeSelect = (type: string) => {
    setSelectedVehicleType(type);
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
  };

  const handleLocationSelect = (type: 'pickup' | 'dropoff') => {
    setLocationType(type);
    setTempLocation(type === 'pickup' ? pickupLocation : dropoffLocation);
    setShowLocationModal(true);
  };

  const handleRequestTowing = async () => {
    if (!selectedVehicleType || !selectedReason || !pickupLocation) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm gerekli alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      
      const requestData = {
        vehicleType: selectedVehicleType,
        reason: selectedReason,
        pickupLocation: pickupLocation,
        dropoffLocation: dropoffLocation,
        estimatedPrice: estimatedPrice,
        vehicleData: vehicleData,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      const response = await apiService.post('/towing/request', requestData);
      
      if (response.success) {
        Alert.alert(
          'Talep Gönderildi',
          'Çekici talebiniz başarıyla gönderildi. En yakın çekici ustalarına bildirim gönderildi.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Talep gönderilirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Towing request error:', error);
      Alert.alert('Hata', 'Talep gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const renderVehicleTypeCard = (vehicle: VehicleType) => (
    <TouchableOpacity
      key={vehicle.id}
      style={[
        styles.optionCard,
        {
          backgroundColor: selectedVehicleType === vehicle.id 
            ? theme.colors.primary.main + '20' 
            : theme.colors.background.card,
          borderColor: selectedVehicleType === vehicle.id 
            ? theme.colors.primary.main 
            : theme.colors.border.primary,
        }
      ]}
      onPress={() => handleVehicleTypeSelect(vehicle.id)}
    >
      <View style={styles.optionContent}>
        <View style={[
          styles.optionIcon,
          { backgroundColor: selectedVehicleType === vehicle.id 
            ? theme.colors.primary.main 
            : theme.colors.background.secondary
          }
        ]}>
          <MaterialCommunityIcons 
            name={vehicle.icon as any} 
            size={24} 
            color={selectedVehicleType === vehicle.id 
              ? theme.colors.text.inverse 
              : theme.colors.text.primary
            } 
          />
        </View>
        <View style={styles.optionText}>
          <Text style={[
            styles.optionTitle,
            { color: theme.colors.text.primary }
          ]}>
            {vehicle.name}
          </Text>
          <Text style={[
            styles.optionDescription,
            { color: theme.colors.text.secondary }
          ]}>
            {vehicle.description}
          </Text>
        </View>
        {selectedVehicleType === vehicle.id && (
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={theme.colors.primary.main} 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderReasonCard = (reason: TowingReason) => (
    <TouchableOpacity
      key={reason.id}
      style={[
        styles.optionCard,
        {
          backgroundColor: selectedReason === reason.id 
            ? theme.colors.error.main + '20' 
            : theme.colors.background.card,
          borderColor: selectedReason === reason.id 
            ? theme.colors.error.main 
            : theme.colors.border.primary,
        }
      ]}
      onPress={() => handleReasonSelect(reason.id)}
    >
      <View style={styles.optionContent}>
        <View style={[
          styles.optionIcon,
          { backgroundColor: selectedReason === reason.id 
            ? theme.colors.error.main 
            : theme.colors.background.secondary
          }
        ]}>
          <MaterialCommunityIcons 
            name={reason.icon as any} 
            size={24} 
            color={selectedReason === reason.id 
              ? theme.colors.text.inverse 
              : theme.colors.text.primary
            } 
          />
        </View>
        <View style={styles.optionText}>
          <Text style={[
            styles.optionTitle,
            { color: theme.colors.text.primary }
          ]}>
            {reason.name}
          </Text>
          <Text style={[
            styles.optionDescription,
            { color: theme.colors.text.secondary }
          ]}>
            {reason.description}
          </Text>
        </View>
        {selectedReason === reason.id && (
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={theme.colors.error.main} 
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
            <BackButton />
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
                Çekici Hizmeti
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
                Acil durumunuz için en yakın çekiciyi bulalım
              </Text>
            </View>
          </View>

          {/* Emergency Towing Button */}
          <View style={styles.emergencySection}>
            <View style={styles.emergencyHeader}>
              <MaterialCommunityIcons 
                name="phone-alert" 
                size={24} 
                color="#DC2626" 
              />
              <Text style={[styles.emergencySectionTitle, { color: theme.colors.text.primary }]}>
                Acil Durum
              </Text>
            </View>
            <Text style={[styles.emergencySectionDescription, { color: theme.colors.text.secondary }]}>
              Gerçek acil durumlar için anında çekici çağırın
            </Text>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => navigation.navigate('EmergencyTowing')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons 
                name="phone-alert" 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.emergencyButtonText}>
                ACİL ÇEKİCİ ÇAĞIR
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Araç Tipi Seçin
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
              Hangi tür aracınız için çekici hizmeti istiyorsunuz?
            </Text>
            {vehicleTypes.map(renderVehicleTypeCard)}
          </View>

          {/* Reason Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Sebep Seçin
            </Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
              Çekici hizmetine neden ihtiyacınız var?
            </Text>
            {towingReasons.map(renderReasonCard)}
          </View>

          {/* Location Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Konum Bilgileri
            </Text>
            
            {/* Pickup Location */}
            <Card style={styles.locationCard}>
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={() => handleLocationSelect('pickup')}
              >
                <View style={styles.locationContent}>
                  <MaterialCommunityIcons 
                    name="map-marker" 
                    size={24} 
                    color={theme.colors.primary.main} 
                  />
                  <View style={styles.locationText}>
                    <Text style={[styles.locationTitle, { color: theme.colors.text.primary }]}>
                      Alış Konumu
                    </Text>
                    <Text style={[styles.locationAddress, { color: theme.colors.text.secondary }]}>
                      {pickupLocation ? 'Konum alındı' : 'Konum alınıyor...'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons 
                    name="chevron-right" 
                    size={24} 
                    color={theme.colors.text.secondary} 
                  />
                </View>
              </TouchableOpacity>
            </Card>

            {/* Dropoff Location (Optional) */}
            <Card style={styles.locationCard}>
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={() => handleLocationSelect('dropoff')}
              >
                <View style={styles.locationContent}>
                  <MaterialCommunityIcons 
                    name="map-marker-outline" 
                    size={24} 
                    color={theme.colors.text.secondary} 
                  />
                  <View style={styles.locationText}>
                    <Text style={[styles.locationTitle, { color: theme.colors.text.primary }]}>
                      Bırakış Konumu (Opsiyonel)
                    </Text>
                    <Text style={[styles.locationAddress, { color: theme.colors.text.secondary }]}>
                      {dropoffLocation ? 'Konum seçildi' : 'Konum seçin'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons 
                    name="chevron-right" 
                    size={24} 
                    color={theme.colors.text.secondary} 
                  />
                </View>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Price Estimate */}
          {estimatedPrice > 0 && (
            <View style={styles.section}>
              <Card style={[styles.priceCard, { backgroundColor: theme.colors.success.main + '10' }] as any}>
                <View style={styles.priceContent}>
                  <MaterialCommunityIcons 
                    name="currency-try" 
                    size={24} 
                    color={theme.colors.success.main} 
                  />
                  <View style={styles.priceText}>
                    <Text style={[styles.priceLabel, { color: theme.colors.text.secondary }]}>
                      Tahmini Ücret
                    </Text>
                    <Text style={[styles.priceAmount, { color: theme.colors.success.main }]}>
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
              title="Çekici Çağır"
              onPress={handleRequestTowing}
              disabled={!selectedVehicleType || !selectedReason || !pickupLocation || loading}
              style={[
                styles.requestButton,
                { backgroundColor: theme.colors.error.main }
              ] as any}
              textStyle={styles.requestButtonText}
            />
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 48 }} />
        </ScrollView>
      </Background>

      {/* Location Modal */}
      <Modal visible={showLocationModal} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1 }}>
          <LocationPicker
            title={locationType === 'pickup' ? 'Alış Konumu Seç' : 'Bırakış Konumu Seç'}
            initialCoordinate={tempLocation}
            onCancel={() => setShowLocationModal(false)}
            onConfirm={(coord) => {
              if (locationType === 'pickup') setPickupLocation(coord);
              else setDropoffLocation(coord);
              setShowLocationModal(false);
            }}
          />
        </SafeAreaView>
      </Modal>
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
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  emergencySection: {
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    color: '#DC2626',
  },
  emergencySectionDescription: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
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
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontWeight: '400',
  },
  locationCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  locationButton: {
    padding: 16,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '400',
  },
  priceCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  priceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    marginLeft: 12,
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '700',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 8,
  },
});

export default TowingRequestScreen;