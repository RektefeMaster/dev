import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  TextInput,
  Switch,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { apiService } from '@/shared/services/api';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { API_URL } from '@/constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type WashBookingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WashBooking'>;

// ==================== INTERFACES ====================

interface Vehicle {
  _id: string;
  brand: string;
  modelName: string;
  package: string;
  year: number;
  plateNumber: string;
  engineType?: string;
  fuelType?: string;
  segment?: 'A' | 'B' | 'C' | 'SUV' | 'Commercial';
}

interface WashPackage {
  _id: string;
  name: string;
  description: string;
  packageType: string;
  basePrice: number;
  duration: number;
  services: Array<{
    name: string;
    category: string;
    order: number;
  }>;
  extras: Array<{
    name: string;
    description: string;
    price: number;
    duration: number;
  }>;
  availableFor: 'shop' | 'mobile' | 'both';
  requirements: {
    requiresPower: boolean;
    requiresWater: boolean;
    requiresCoveredArea: boolean;
  };
  segmentMultipliers?: {
    A: number;
    B: number;
    C: number;
    SUV: number;
    Commercial: number;
  };
}

interface Provider {
  _id: string;
  userId: {
    _id: string;
    name: string;
    surname: string;
    phone?: string;
  };
  businessName: string;
  type: 'shop' | 'mobile' | 'both';
  location: {
    address: string;
    city: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  metrics: {
    averageRating: number;
    totalReviews: number;
  };
  distance?: number;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  laneId?: string;
  laneName?: string;
}

interface PricingInfo {
  basePrice: number;
  segmentMultiplier: number;
  densityCoefficient: number;
  locationMultiplier: number;
  distanceFee: number;
  subtotal: number;
  finalPrice: number;
  breakdown: Record<string, string>;
}

// ==================== COMPONENT ====================

const WashBookingScreen = () => {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigation = useNavigation<WashBookingScreenNavigationProp>();
  const route = useRoute();

  // ===== STATE =====
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Araç, 2: Paket, 3: Tip, 4: Slot, 5: Ödeme
  
  // Araç seçimi
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // Paket seçimi
  const [packages, setPackages] = useState<WashPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<WashPackage | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  // Tip seçimi (Shop vs Mobil)
  const [selectedType, setSelectedType] = useState<'shop' | 'mobile' | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);

  // Zamanlama
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  // Mobil için zaman penceresi
  const [timeWindowStart, setTimeWindowStart] = useState<Date | null>(null);
  const [timeWindowEnd, setTimeWindowEnd] = useState<Date | null>(null);

  // Konum (mobil için)
  const [location, setLocation] = useState({
    address: '',
    latitude: 0,
    longitude: 0,
    requiresPower: false,
    requiresWater: false,
    isIndoorParking: false,
  });

  // Fiyatlandırma
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [tefePuanUsed, setTefePuanUsed] = useState(0);
  const [tefePuanBalance, setTefePuanBalance] = useState(0);

  // Ödeme
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  // ===== EFFECTS =====

  useEffect(() => {
    loadVehicles();
    loadPackages();
  }, []);

  useEffect(() => {
    if (selectedPackage && selectedVehicle && selectedType && selectedProvider) {
      calculatePricing();
    }
  }, [selectedPackage, selectedVehicle, selectedType, selectedProvider, selectedExtras, tefePuanUsed]);

  useEffect(() => {
    if (selectedProvider && selectedType === 'shop' && selectedDate && selectedPackage) {
      loadAvailableSlots();
    }
  }, [selectedProvider, selectedDate, selectedPackage]);

  // ===== LOAD DATA =====

  const loadVehicles = async () => {
    try {
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success && response.data?.data) {
        const vehiclesWithSegment = response.data.data.map((v: Vehicle) => ({
          ...v,
          segment: determineVehicleSegment(v),
        }));
        setVehicles(vehiclesWithSegment);
      }
    } catch (error) {
      console.error('Araçlar yüklenemedi:', error);
    }
  };

  const loadPackages = async () => {
    try {
      const response = await apiService.getWashPackages();
      if (response.success && response.data) {
        setPackages(response.data);
      }
    } catch (error) {
      console.error('Paketler yüklenemedi:', error);
    }
  };

  const loadProviders = async (type: 'shop' | 'mobile') => {
    try {
      setLoading(true);
      const response = await apiService.getWashProviders({ type });
      
      if (response.success && response.data) {
        setProviders(response.data);
      }
    } catch (error) {
      console.error('İşletmeler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedProvider || !selectedDate || !selectedPackage) return;

    try {
      setLoading(true);
      const response = await apiService.getAvailableWashSlots({
        providerId: selectedProvider._id,
        date: selectedDate.toISOString().split('T')[0],
        duration: selectedPackage.duration,
      });

      if (response.success && response.data) {
        setAvailableSlots(response.data);
      }
    } catch (error) {
      console.error('Slotlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async () => {
    if (!selectedPackage || !selectedVehicle || !selectedProvider) return;

    try {
      const response = await apiService.getWashQuote({
        packageId: selectedPackage._id,
        vehicleSegment: selectedVehicle.segment || 'B',
        type: selectedType!,
        providerId: selectedProvider.userId._id,
        location: selectedType === 'mobile' && location.latitude ? {
          latitude: location.latitude,
          longitude: location.longitude,
        } : undefined,
        scheduledDate: selectedDate?.toISOString(),
      });

      if (response.success && response.data) {
        setPricing(response.data.pricing);
      }
    } catch (error) {
      console.error('Fiyat hesaplanamadı:', error);
    }
  };

  // ===== HELPERS =====

  const determineVehicleSegment = (vehicle: Vehicle): 'A' | 'B' | 'C' | 'SUV' | 'Commercial' => {
    const brand = vehicle.brand.toLowerCase();
    const model = vehicle.modelName.toLowerCase();

    // SUV kontrolü
    if (model.includes('suv') || model.includes('jeep') || model.includes('cross')) {
      return 'SUV';
    }

    // Ticari araç kontrolü
    if (model.includes('commercial') || model.includes('van') || model.includes('pick') || model.includes('kamyon')) {
      return 'Commercial';
    }

    // Segment sınıflandırması (basitleştirilmiş)
    const luxuryBrands = ['bmw', 'mercedes', 'audi', 'porsche', 'lexus', 'jaguar', 'volvo'];
    const midBrands = ['toyota', 'honda', 'mazda', 'nissan', 'ford', 'volkswagen', 'renault', 'peugeot'];
    
    if (luxuryBrands.some(b => brand.includes(b))) return 'C';
    if (midBrands.some(b => brand.includes(b))) return 'B';
    
    return 'A'; // Ekonomik segment
  };

  const getNextDates = (count: number = 7) => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Yarın';
    } else {
      return date.toLocaleDateString('tr-TR', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  // ===== HANDLERS =====

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowVehicleModal(false);
    setStep(2);
  };

  const handlePackageSelect = (pkg: WashPackage) => {
    setSelectedPackage(pkg);
    setSelectedExtras([]);
    setStep(3);
  };

  const handleExtraToggle = (extraName: string) => {
    setSelectedExtras(prev =>
      prev.includes(extraName)
        ? prev.filter(e => e !== extraName)
        : [...prev, extraName]
    );
  };

  const handleTypeSelect = async (type: 'shop' | 'mobile') => {
    setSelectedType(type);
    await loadProviders(type);
    setShowProviderModal(true);
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowProviderModal(false);
    setStep(4);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (selectedType === 'shop') {
      loadAvailableSlots();
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep(5);
  };

  const handleTimeWindowSelect = (start: Date, end: Date) => {
    setTimeWindowStart(start);
    setTimeWindowEnd(end);
    setStep(5);
  };

  const handleCreateOrder = async () => {
    // Validasyon
    if (!selectedVehicle || !selectedPackage || !selectedType || !selectedProvider) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm bilgileri doldurun');
      return;
    }

    if (selectedType === 'shop' && (!selectedDate || !selectedSlot)) {
      Alert.alert('Eksik Bilgi', 'Lütfen tarih ve saat seçin');
      return;
    }

    if (selectedType === 'mobile' && !location.address) {
      Alert.alert('Eksik Bilgi', 'Lütfen adres giriniz');
      return;
    }

    if (!cardInfo.cardNumber || !cardInfo.cardHolderName) {
      Alert.alert('Eksik Bilgi', 'Lütfen ödeme bilgilerini giriniz');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        providerId: selectedProvider.userId._id,
        packageId: selectedPackage._id,
        vehicleId: selectedVehicle._id,
        vehicle: {
          brand: selectedVehicle.brand,
          model: selectedVehicle.modelName,
          year: selectedVehicle.year,
          plateNumber: selectedVehicle.plateNumber,
          segment: selectedVehicle.segment || 'B',
        },
        type: selectedType,
        location: selectedType === 'mobile' ? location : {
          address: selectedProvider.location.address,
          latitude: selectedProvider.location.coordinates.latitude,
          longitude: selectedProvider.location.coordinates.longitude,
        },
        scheduling: selectedType === 'shop' && selectedSlot ? {
          slotStart: new Date(`${selectedDate!.toISOString().split('T')[0]}T${selectedSlot.startTime}:00`),
          slotEnd: new Date(`${selectedDate!.toISOString().split('T')[0]}T${selectedSlot.endTime}:00`),
        } : {
          timeWindowStart: timeWindowStart,
          timeWindowEnd: timeWindowEnd,
        },
        laneId: selectedSlot?.laneId,
        tefePuanUsed,
        cardInfo,
      };

      const response = await apiService.createWashOrder(orderData);

      if (response.success) {
        Alert.alert(
          'Sipariş Oluşturuldu!',
          'Yıkama siparişiniz başarıyla oluşturuldu. İşletme onayından sonra sizi bilgilendireceğiz.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Sipariş oluşturulamadı');
      }
    } catch (error: any) {
      console.error('Sipariş oluşturma hatası:', error);
      Alert.alert('Hata', 'Sipariş oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  // ===== RENDER STEPS =====

  const renderVehicleSelection = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="car" size={24} color={theme.colors.primary.main} />
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Araç Seçimi
        </Text>
      </View>

      {selectedVehicle ? (
        <View style={styles.selectedItem}>
          <View style={styles.selectedItemContent}>
            <Text style={[styles.selectedItemTitle, { color: theme.colors.text.primary }]}>
              {selectedVehicle.brand} {selectedVehicle.modelName}
            </Text>
            <Text style={[styles.selectedItemSubtitle, { color: theme.colors.text.secondary }]}>
              {selectedVehicle.plateNumber} • {selectedVehicle.year}
            </Text>
            <View style={[styles.segmentBadge, { backgroundColor: theme.colors.primary.main + '20' }]}>
              <Text style={[styles.segmentBadgeText, { color: theme.colors.primary.main }]}>
                Segment: {selectedVehicle.segment}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => setShowVehicleModal(true)}
          >
            <Text style={[styles.changeButtonText, { color: theme.colors.primary.main }]}>
              Değiştir
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.selectButton, { borderColor: theme.colors.border.secondary }]}
          onPress={() => setShowVehicleModal(true)}
        >
          <MaterialCommunityIcons name="car-select" size={24} color={theme.colors.primary.main} />
          <Text style={[styles.selectButtonText, { color: theme.colors.primary.main }]}>
            Araç Seçin
          </Text>
        </TouchableOpacity>
      )}

      {selectedVehicle && (
        <Button
          title="Devam Et"
          onPress={() => setStep(2)}
          style={styles.continueButton}
        />
      )}
    </Card>
  );

  const renderPackageSelection = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="package-variant" size={24} color={theme.colors.primary.main} />
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Paket Seçimi
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagesScroll}>
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg._id}
            style={[
              styles.packageCard,
              {
                borderColor: selectedPackage?._id === pkg._id 
                  ? theme.colors.primary.main 
                  : theme.colors.border.secondary,
                backgroundColor: selectedPackage?._id === pkg._id
                  ? theme.colors.primary.main + '10'
                  : theme.colors.background.secondary,
              }
            ]}
            onPress={() => handlePackageSelect(pkg)}
          >
            <Text style={[styles.packageName, { color: theme.colors.text.primary }]}>
              {pkg.name}
            </Text>
            <Text style={[styles.packageDescription, { color: theme.colors.text.secondary }]}>
              {pkg.description}
            </Text>
            <View style={styles.packageMeta}>
              <View style={styles.packageMetaItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.text.secondary} />
                <Text style={[styles.packageMetaText, { color: theme.colors.text.secondary }]}>
                  {pkg.duration} dk
                </Text>
              </View>
              <Text style={[styles.packagePrice, { color: theme.colors.primary.main }]}>
                {pkg.basePrice} TL
              </Text>
            </View>
            
            {pkg.services && pkg.services.length > 0 && (
              <View style={styles.packageServices}>
                {pkg.services.slice(0, 3).map((service, idx) => (
                  <View key={idx} style={styles.packageServiceItem}>
                    <MaterialCommunityIcons name="check" size={14} color="#10B981" />
                    <Text style={[styles.packageServiceText, { color: theme.colors.text.secondary }]}>
                      {service.name}
                    </Text>
                  </View>
                ))}
                {pkg.services.length > 3 && (
                  <Text style={[styles.moreServices, { color: theme.colors.text.secondary }]}>
                    +{pkg.services.length - 3} hizmet daha
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Ekstra Hizmetler */}
      {selectedPackage && selectedPackage.extras && selectedPackage.extras.length > 0 && (
        <View style={styles.extrasSection}>
          <Text style={[styles.extrasSectionTitle, { color: theme.colors.text.primary }]}>
            Ekstra Hizmetler
          </Text>
          {selectedPackage.extras.map((extra, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.extraItem,
                {
                  borderColor: selectedExtras.includes(extra.name)
                    ? theme.colors.primary.main
                    : theme.colors.border.secondary,
                  backgroundColor: selectedExtras.includes(extra.name)
                    ? theme.colors.primary.main + '10'
                    : 'transparent',
                }
              ]}
              onPress={() => handleExtraToggle(extra.name)}
            >
              <View style={styles.extraContent}>
                <MaterialCommunityIcons
                  name={selectedExtras.includes(extra.name) ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={24}
                  color={selectedExtras.includes(extra.name) ? theme.colors.primary.main : theme.colors.text.secondary}
                />
                <View style={styles.extraInfo}>
                  <Text style={[styles.extraName, { color: theme.colors.text.primary }]}>
                    {extra.name}
                  </Text>
                  <Text style={[styles.extraDescription, { color: theme.colors.text.secondary }]}>
                    {extra.description}
                  </Text>
                </View>
              </View>
              <Text style={[styles.extraPrice, { color: theme.colors.primary.main }]}>
                +{extra.price} TL
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedPackage && (
        <Button
          title="Devam Et"
          onPress={() => setStep(3)}
          style={styles.continueButton}
        />
      )}
    </Card>
  );

  const renderTypeSelection = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.primary.main} />
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Hizmet Tipi Seçimi
        </Text>
      </View>

      <View style={styles.typeOptions}>
        {selectedPackage?.availableFor !== 'mobile' && (
          <TouchableOpacity
            style={[
              styles.typeCard,
              {
                borderColor: selectedType === 'shop' 
                  ? theme.colors.primary.main 
                  : theme.colors.border.secondary,
                backgroundColor: selectedType === 'shop'
                  ? theme.colors.primary.main + '10'
                  : theme.colors.background.secondary,
              }
            ]}
            onPress={() => handleTypeSelect('shop')}
          >
            <MaterialCommunityIcons name="store" size={48} color={theme.colors.primary.main} />
            <Text style={[styles.typeTitle, { color: theme.colors.text.primary }]}>
              İstasyonda Yıkama
            </Text>
            <Text style={[styles.typeDescription, { color: theme.colors.text.secondary }]}>
              Yıkama istasyonuna giderek hizmet alın
            </Text>
            <View style={styles.typeFeatures}>
              <View style={styles.typeFeature}>
                <MaterialCommunityIcons name="check" size={16} color="#10B981" />
                <Text style={[styles.typeFeatureText, { color: theme.colors.text.secondary }]}>
                  Daha uygun fiyat
                </Text>
              </View>
              <View style={styles.typeFeature}>
                <MaterialCommunityIcons name="check" size={16} color="#10B981" />
                <Text style={[styles.typeFeatureText, { color: theme.colors.text.secondary }]}>
                  Profesyonel ekipman
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {selectedPackage?.availableFor !== 'shop' && (
          <TouchableOpacity
            style={[
              styles.typeCard,
              {
                borderColor: selectedType === 'mobile' 
                  ? theme.colors.primary.main 
                  : theme.colors.border.secondary,
                backgroundColor: selectedType === 'mobile'
                  ? theme.colors.primary.main + '10'
                  : theme.colors.background.secondary,
              }
            ]}
            onPress={() => handleTypeSelect('mobile')}
          >
            <MaterialCommunityIcons name="car-wash" size={48} color={theme.colors.primary.main} />
            <Text style={[styles.typeTitle, { color: theme.colors.text.primary }]}>
              Mobil Yıkama
            </Text>
            <Text style={[styles.typeDescription, { color: theme.colors.text.secondary }]}>
              Aracınız bulunduğu yerde yıkanır
            </Text>
            <View style={styles.typeFeatures}>
              <View style={styles.typeFeature}>
                <MaterialCommunityIcons name="check" size={16} color="#10B981" />
                <Text style={[styles.typeFeatureText, { color: theme.colors.text.secondary }]}>
                  Zaman kazandırır
                </Text>
              </View>
              <View style={styles.typeFeature}>
                <MaterialCommunityIcons name="check" size={16} color="#10B981" />
                <Text style={[styles.typeFeatureText, { color: theme.colors.text.secondary }]}>
                  Kapınıza gelir
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Seçilen Provider */}
      {selectedProvider && (
        <View style={styles.selectedProviderCard}>
          <View style={styles.providerInfo}>
            <Text style={[styles.providerName, { color: theme.colors.text.primary }]}>
              {selectedProvider.businessName}
            </Text>
            <Text style={[styles.providerAddress, { color: theme.colors.text.secondary }]}>
              {selectedProvider.location.address}
            </Text>
            <View style={styles.providerMeta}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={[styles.providerRating, { color: theme.colors.text.secondary }]}>
                {selectedProvider.metrics.averageRating.toFixed(1)} ({selectedProvider.metrics.totalReviews})
              </Text>
              {selectedProvider.distance && (
                <>
                  <Text style={[styles.providerDivider, { color: theme.colors.text.secondary }]}>•</Text>
                  <Text style={[styles.providerDistance, { color: theme.colors.text.secondary }]}>
                    {selectedProvider.distance.toFixed(1)} km
                  </Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => setShowProviderModal(true)}
          >
            <Text style={[styles.changeButtonText, { color: theme.colors.primary.main }]}>
              Değiştir
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedProvider && (
        <Button
          title="Devam Et"
          onPress={() => setStep(4)}
          style={styles.continueButton}
        />
      )}
    </Card>
  );

  const renderScheduling = () => {
    if (selectedType === 'shop') {
      return renderShopScheduling();
    } else {
      return renderMobileScheduling();
    }
  };

  const renderShopScheduling = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.primary.main} />
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Tarih ve Saat Seçimi
        </Text>
      </View>

      {/* Tarih Seçimi */}
      <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>Tarih</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
        {getNextDates().map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateButton,
              {
                borderColor: selectedDate?.toDateString() === date.toDateString()
                  ? theme.colors.primary.main
                  : theme.colors.border.secondary,
                backgroundColor: selectedDate?.toDateString() === date.toDateString()
                  ? theme.colors.primary.main + '10'
                  : theme.colors.background.secondary,
              }
            ]}
            onPress={() => handleDateSelect(date)}
          >
            <Text style={[styles.dateDay, { color: theme.colors.text.secondary }]}>
              {formatDate(date)}
            </Text>
            <Text style={[styles.dateNumber, { color: theme.colors.text.primary }]}>
              {date.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Slot Seçimi */}
      {selectedDate && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.colors.text.primary, marginTop: 16 }]}>
            Müsait Saatler
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} style={{ marginVertical: 16 }} />
          ) : availableSlots.length === 0 ? (
            <Text style={[styles.noSlotsText, { color: theme.colors.text.secondary }]}>
              Bu tarih için müsait slot bulunmuyor
            </Text>
          ) : (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotButton,
                    {
                      borderColor: selectedSlot?.startTime === slot.startTime
                        ? theme.colors.primary.main
                        : theme.colors.border.secondary,
                      backgroundColor: selectedSlot?.startTime === slot.startTime
                        ? theme.colors.primary.main
                        : theme.colors.background.secondary,
                    }
                  ]}
                  onPress={() => handleSlotSelect(slot)}
                >
                  <Text style={[
                    styles.slotTime,
                    {
                      color: selectedSlot?.startTime === slot.startTime
                        ? '#FFFFFF'
                        : theme.colors.text.primary,
                    }
                  ]}>
                    {slot.startTime}
                  </Text>
                  {slot.laneName && (
                    <Text style={[
                      styles.slotLane,
                      {
                        color: selectedSlot?.startTime === slot.startTime
                          ? '#FFFFFF'
                          : theme.colors.text.secondary,
                      }
                    ]}>
                      {slot.laneName}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {selectedSlot && (
        <Button
          title="Devam Et"
          onPress={() => setStep(5)}
          style={styles.continueButton}
        />
      )}
    </Card>
  );

  const renderMobileScheduling = () => (
    <Card style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.primary.main} />
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
          Konum ve Zaman
        </Text>
      </View>

      {/* Adres Girişi */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Adres *</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.secondary,
          }]}
          value={location.address}
          onChangeText={(text) => setLocation({ ...location, address: text })}
          placeholder="Tam adres giriniz"
          placeholderTextColor={theme.colors.text.secondary}
          multiline
        />
      </View>

      {/* Özel Gereksinimler */}
      <View style={styles.requirementsSection}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Özel Gereksinimler</Text>
        
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: theme.colors.text.secondary }]}>
            Elektrik bağlantısı mevcut
          </Text>
          <Switch
            value={location.requiresPower}
            onValueChange={(value) => setLocation({ ...location, requiresPower: value })}
            trackColor={{ false: theme.colors.border.secondary, true: theme.colors.primary.main }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: theme.colors.text.secondary }]}>
            Su bağlantısı mevcut
          </Text>
          <Switch
            value={location.requiresWater}
            onValueChange={(value) => setLocation({ ...location, requiresWater: value })}
            trackColor={{ false: theme.colors.border.secondary, true: theme.colors.primary.main }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: theme.colors.text.secondary }]}>
            Kapalı otopark
          </Text>
          <Switch
            value={location.isIndoorParking}
            onValueChange={(value) => setLocation({ ...location, isIndoorParking: value })}
            trackColor={{ false: theme.colors.border.secondary, true: theme.colors.primary.main }}
          />
        </View>
      </View>

      {/* Zaman Penceresi */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.colors.text.primary }]}>Zaman Penceresi</Text>
        <Text style={[styles.helpText, { color: theme.colors.text.secondary }]}>
          İstediğiniz 2 saatlik zaman aralığını seçin
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeWindowsScroll}>
          {[
            { start: '09:00', end: '11:00', label: 'Sabah' },
            { start: '11:00', end: '13:00', label: 'Öğle' },
            { start: '13:00', end: '15:00', label: 'Öğleden Sonra' },
            { start: '15:00', end: '17:00', label: 'İkindi' },
            { start: '17:00', end: '19:00', label: 'Akşam' },
          ].map((window, index) => {
            const startDate = selectedDate ? new Date(selectedDate) : new Date();
            const endDate = new Date(startDate);
            
            const [startHour, startMinute] = window.start.split(':').map(Number);
            const [endHour, endMinute] = window.end.split(':').map(Number);
            
            startDate.setHours(startHour, startMinute, 0, 0);
            endDate.setHours(endHour, endMinute, 0, 0);

            const isSelected = 
              timeWindowStart?.getTime() === startDate.getTime() &&
              timeWindowEnd?.getTime() === endDate.getTime();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeWindowButton,
                  {
                    borderColor: isSelected
                      ? theme.colors.primary.main
                      : theme.colors.border.secondary,
                    backgroundColor: isSelected
                      ? theme.colors.primary.main
                      : theme.colors.background.secondary,
                  }
                ]}
                onPress={() => handleTimeWindowSelect(startDate, endDate)}
              >
                <Text style={[
                  styles.timeWindowLabel,
                  { color: isSelected ? '#FFFFFF' : theme.colors.text.primary }
                ]}>
                  {window.label}
                </Text>
                <Text style={[
                  styles.timeWindowTime,
                  { color: isSelected ? '#FFFFFF' : theme.colors.text.secondary }
                ]}>
                  {window.start} - {window.end}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {location.address && timeWindowStart && timeWindowEnd && (
        <Button
          title="Devam Et"
          onPress={() => setStep(5)}
          style={styles.continueButton}
        />
      )}
    </Card>
  );

  const renderPayment = () => (
    <ScrollView style={styles.paymentScroll}>
      {/* Fiyat Özeti */}
      {pricing && (
        <Card style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <MaterialCommunityIcons name="cash" size={24} color={theme.colors.primary.main} />
            <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
              Fiyat Özeti
            </Text>
          </View>

          <View style={styles.pricingBreakdown}>
            {Object.entries(pricing.breakdown).map(([key, value]) => (
              <View key={key} style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, { color: theme.colors.text.secondary }]}>
                  {key}
                </Text>
                <Text style={[styles.pricingValue, { color: theme.colors.text.primary }]}>
                  {value}
                </Text>
              </View>
            ))}
            
            <View style={[styles.pricingDivider, { backgroundColor: theme.colors.border.secondary }]} />
            
            <View style={styles.pricingRow}>
              <Text style={[styles.pricingLabel, { color: theme.colors.text.primary, fontWeight: 'bold' }]}>
                Ara Toplam
              </Text>
              <Text style={[styles.pricingValue, { color: theme.colors.text.primary, fontWeight: 'bold' }]}>
                {pricing.subtotal.toFixed(2)} TL
              </Text>
            </View>

            {pricing.distanceFee > 0 && (
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, { color: theme.colors.text.secondary }]}>
                  Mesafe Ücreti
                </Text>
                <Text style={[styles.pricingValue, { color: theme.colors.text.primary }]}>
                  {pricing.distanceFee.toFixed(2)} TL
                </Text>
              </View>
            )}

            {tefePuanUsed > 0 && (
              <View style={styles.pricingRow}>
                <Text style={[styles.pricingLabel, { color: '#10B981' }]}>
                  TefePuan İndirimi
                </Text>
                <Text style={[styles.pricingValue, { color: '#10B981' }]}>
                  -{tefePuanUsed} TL
                </Text>
              </View>
            )}

            <View style={[styles.pricingDivider, { backgroundColor: theme.colors.border.secondary }]} />

            <View style={styles.pricingRow}>
              <Text style={[styles.pricingTotalLabel, { color: theme.colors.primary.main }]}>
                Toplam
              </Text>
              <Text style={[styles.pricingTotalValue, { color: theme.colors.primary.main }]}>
                {(pricing.finalPrice - tefePuanUsed).toFixed(2)} TL
              </Text>
            </View>
          </View>

          {/* TefePuan Kullanımı */}
          {tefePuanBalance > 0 && (
            <View style={styles.tefePuanSection}>
              <View style={styles.tefePuanHeader}>
                <Text style={[styles.tefePuanTitle, { color: theme.colors.text.primary }]}>
                  TefePuan Kullan
                </Text>
                <Text style={[styles.tefePuanBalance, { color: theme.colors.primary.main }]}>
                  Bakiye: {tefePuanBalance} puan
                </Text>
              </View>
              <View style={styles.tefePuanInput}>
                <TextInput
                  style={[styles.input, { 
                    flex: 1,
                    backgroundColor: theme.colors.background.secondary,
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.border.secondary,
                  }]}
                  value={tefePuanUsed.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    const maxUsable = Math.min(tefePuanBalance, Math.floor(pricing.finalPrice * 0.5));
                    setTefePuanUsed(Math.min(value, maxUsable));
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.text.secondary}
                />
                <TouchableOpacity
                  style={[styles.maxButton, { backgroundColor: theme.colors.primary.main }]}
                  onPress={() => {
                    const maxUsable = Math.min(tefePuanBalance, Math.floor(pricing.finalPrice * 0.5));
                    setTefePuanUsed(maxUsable);
                  }}
                >
                  <Text style={styles.maxButtonText}>Maksimum</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.tefePuanHint, { color: theme.colors.text.secondary }]}>
                Maksimum %50'sine kadar kullanabilirsiniz
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Ödeme Bilgileri */}
      <Card style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <MaterialCommunityIcons name="credit-card" size={24} color={theme.colors.primary.main} />
          <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
            Ödeme Bilgileri
          </Text>
        </View>

        <View style={[styles.testModeBadge, { backgroundColor: '#F59E0B20' }]}>
          <MaterialCommunityIcons name="information" size={20} color="#F59E0B" />
          <Text style={[styles.testModeText, { color: '#F59E0B' }]}>
            TEST MODU - Gerçek ödeme yapılmayacak
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Kart Numarası</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.secondary,
            }]}
            value={cardInfo.cardNumber}
            onChangeText={(text) => setCardInfo({ ...cardInfo, cardNumber: text })}
            placeholder="4111 1111 1111 1111"
            placeholderTextColor={theme.colors.text.secondary}
            keyboardType="numeric"
            maxLength={16}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text.primary }]}>Kart Sahibi</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background.secondary,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border.secondary,
            }]}
            value={cardInfo.cardHolderName}
            onChangeText={(text) => setCardInfo({ ...cardInfo, cardHolderName: text })}
            placeholder="AD SOYAD"
            placeholderTextColor={theme.colors.text.secondary}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Ay</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border.secondary,
              }]}
              value={cardInfo.expiryMonth}
              onChangeText={(text) => setCardInfo({ ...cardInfo, expiryMonth: text })}
              placeholder="MM"
              placeholderTextColor={theme.colors.text.secondary}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>Yıl</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border.secondary,
              }]}
              value={cardInfo.expiryYear}
              onChangeText={(text) => setCardInfo({ ...cardInfo, expiryYear: text })}
              placeholder="YY"
              placeholderTextColor={theme.colors.text.secondary}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: theme.colors.text.primary }]}>CVV</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border.secondary,
              }]}
              value={cardInfo.cvv}
              onChangeText={(text) => setCardInfo({ ...cardInfo, cvv: text })}
              placeholder="123"
              placeholderTextColor={theme.colors.text.secondary}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
            />
          </View>
        </View>

        <View style={[styles.escrowNotice, { backgroundColor: theme.colors.info.main + '10', borderColor: theme.colors.info.main }]}>
          <MaterialCommunityIcons name="shield-check" size={20} color={theme.colors.info.main} />
          <Text style={[styles.escrowNoticeText, { color: theme.colors.info.main }]}>
            Ödemeniz güvenli bir şekilde tutulacak ve iş tamamlandıktan sonra işletmeye aktarılacaktır
          </Text>
        </View>
      </Card>

      {/* Sipariş Oluştur Butonu */}
      <View style={styles.bottomButtonContainer}>
        <Button
          title={loading ? "İşleniyor..." : "Siparişi Oluştur"}
          onPress={handleCreateOrder}
          disabled={loading}
          style={styles.createOrderButton}
        />
      </View>
    </ScrollView>
  );

  // ===== MODALS =====

  const renderVehicleModal = () => (
    <Modal
      visible={showVehicleModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowVehicleModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background.primary }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border.secondary }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
            Araç Seçin
          </Text>
          <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {vehicles.length === 0 ? (
            <View style={styles.emptyVehicles}>
              <MaterialCommunityIcons name="car-off" size={64} color={theme.colors.text.secondary} />
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                Henüz araç eklemediniz
              </Text>
              <Button
                title="Garajıma Git"
                onPress={() => {
                  setShowVehicleModal(false);
                  navigation.navigate('Garage');
                }}
                style={styles.emptyButton}
              />
            </View>
          ) : (
            vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle._id}
                style={[
                  styles.vehicleCard,
                  { 
                    borderColor: theme.colors.border.secondary,
                    backgroundColor: theme.colors.background.secondary,
                  }
                ]}
                onPress={() => handleVehicleSelect(vehicle)}
              >
                <View style={styles.vehicleCardContent}>
                  <MaterialCommunityIcons name="car" size={32} color={theme.colors.primary.main} />
                  <View style={styles.vehicleInfo}>
                    <Text style={[styles.vehicleName, { color: theme.colors.text.primary }]}>
                      {vehicle.brand} {vehicle.modelName}
                    </Text>
                    <Text style={[styles.vehiclePlate, { color: theme.colors.text.secondary }]}>
                      {vehicle.plateNumber} • {vehicle.year}
                    </Text>
                    {vehicle.segment && (
                      <View style={[styles.segmentBadgeSmall, { backgroundColor: theme.colors.primary.main + '20' }]}>
                        <Text style={[styles.segmentBadgeSmallText, { color: theme.colors.primary.main }]}>
                          {vehicle.segment}
                        </Text>
                      </View>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderProviderModal = () => (
    <Modal
      visible={showProviderModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowProviderModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background.primary }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border.secondary }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
            {selectedType === 'shop' ? 'İstasyon Seçin' : 'Mobil Yıkama Seçin'}
          </Text>
          <TouchableOpacity onPress={() => setShowProviderModal(false)}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary.main} style={{ marginTop: 32 }} />
          ) : providers.length === 0 ? (
            <View style={styles.emptyProviders}>
              <MaterialCommunityIcons name="store-off" size={64} color={theme.colors.text.secondary} />
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                Yakınınızda yıkama işletmesi bulunamadı
              </Text>
            </View>
          ) : (
            providers.map((provider) => (
              <TouchableOpacity
                key={provider._id}
                style={[
                  styles.providerCard,
                  { 
                    borderColor: theme.colors.border.secondary,
                    backgroundColor: theme.colors.background.secondary,
                  }
                ]}
                onPress={() => handleProviderSelect(provider)}
              >
                <View style={styles.providerCardContent}>
                  <View style={[styles.providerIcon, { backgroundColor: theme.colors.primary.main }]}>
                    <MaterialCommunityIcons
                      name={provider.type === 'mobile' ? 'car-wash' : 'store'}
                      size={28}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.providerDetails}>
                    <Text style={[styles.providerCardName, { color: theme.colors.text.primary }]}>
                      {provider.businessName}
                    </Text>
                    <Text style={[styles.providerCardAddress, { color: theme.colors.text.secondary }]}>
                      {provider.location.address}
                    </Text>
                    <View style={styles.providerCardMeta}>
                      <View style={styles.providerRatingContainer}>
                        <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                        <Text style={[styles.providerCardRating, { color: theme.colors.text.secondary }]}>
                          {provider.metrics.averageRating.toFixed(1)} ({provider.metrics.totalReviews})
                        </Text>
                      </View>
                      {provider.distance && (
                        <Text style={[styles.providerCardDistance, { color: theme.colors.text.secondary }]}>
                          • {provider.distance.toFixed(1)} km
                        </Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ===== MAIN RENDER =====

  return (
    <Background>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <BackButton onPress={handleBack} />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Araç Yıkama
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              Adım {step}/5
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.background.secondary }]}>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressStep,
                  {
                    backgroundColor: s <= step 
                      ? theme.colors.primary.main 
                      : theme.colors.border.secondary,
                  }
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {step === 1 && renderVehicleSelection()}
          {step === 2 && renderPackageSelection()}
          {step === 3 && renderTypeSelection()}
          {step === 4 && renderScheduling()}
          {step === 5 && renderPayment()}
        </ScrollView>

        {/* Modals */}
        {renderVehicleModal()}
        {renderProviderModal()}
      </SafeAreaView>
    </Background>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepCard: {
    marginTop: 16,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderWidth: 2,
    borderRadius: 12,
    borderStyle: 'dashed',
    gap: 8,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  selectedItemContent: {
    flex: 1,
  },
  selectedItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedItemSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  segmentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  segmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  segmentBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  segmentBadgeSmallText: {
    fontSize: 10,
    fontWeight: '600',
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 16,
  },
  packagesScroll: {
    marginVertical: 8,
  },
  packageCard: {
    width: SCREEN_WIDTH * 0.7,
    padding: 16,
    borderWidth: 2,
    borderRadius: 16,
    marginRight: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  packageMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packageMetaText: {
    fontSize: 12,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  packageServices: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  packageServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  packageServiceText: {
    fontSize: 12,
  },
  moreServices: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  extrasSection: {
    marginTop: 16,
  },
  extrasSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  extraContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  extraInfo: {
    flex: 1,
  },
  extraName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  extraDescription: {
    fontSize: 12,
  },
  extraPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  typeFeatures: {
    width: '100%',
  },
  typeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  typeFeatureText: {
    fontSize: 12,
  },
  selectedProviderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  providerAddress: {
    fontSize: 13,
    marginBottom: 6,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerRating: {
    fontSize: 12,
  },
  providerDivider: {
    fontSize: 12,
    marginHorizontal: 4,
  },
  providerDistance: {
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  datesScroll: {
    marginBottom: 16,
  },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  dateDay: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  noSlotsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  slotButton: {
    width: (SCREEN_WIDTH - 64) / 3,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  slotLane: {
    fontSize: 11,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  requirementsSection: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
  },
  timeWindowsScroll: {
    marginTop: 8,
  },
  timeWindowButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  timeWindowLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeWindowTime: {
    fontSize: 12,
  },
  paymentScroll: {
    flex: 1,
  },
  pricingBreakdown: {
    marginTop: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  pricingLabel: {
    fontSize: 14,
  },
  pricingValue: {
    fontSize: 14,
  },
  pricingDivider: {
    height: 1,
    marginVertical: 8,
  },
  pricingTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  pricingTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  tefePuanSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  tefePuanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tefePuanTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tefePuanBalance: {
    fontSize: 14,
    fontWeight: '600',
  },
  tefePuanInput: {
    flexDirection: 'row',
    gap: 8,
  },
  maxButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  maxButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tefePuanHint: {
    fontSize: 11,
    marginTop: 4,
  },
  testModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  testModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  escrowNotice: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  escrowNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomButtonContainer: {
    padding: 16,
  },
  createOrderButton: {
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  emptyVehicles: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyButton: {
    marginTop: 16,
  },
  vehicleCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  vehicleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 13,
  },
  emptyProviders: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  providerCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  providerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  providerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerDetails: {
    flex: 1,
  },
  providerCardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  providerCardAddress: {
    fontSize: 13,
    marginBottom: 6,
  },
  providerCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerCardRating: {
    fontSize: 12,
  },
  providerCardDistance: {
    fontSize: 12,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default WashBookingScreen;

