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
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { apiService } from '@/shared/services/api';

type WashBookingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WashBooking'>;

interface WashPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  features: string[];
  icon: string;
  color: string;
}

interface WashOption {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
}

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface Mechanic {
  id: string;
  name: string;
  rating: string;
  ratingCount: number;
  address: string;
  image?: string;
  experience?: number;
  shopName?: string;
}

const WashBookingScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<WashBookingScreenNavigationProp>();
  
  // State
  const [loading, setLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [washPackages, setWashPackages] = useState<WashPackage[]>([]);
  const [washOptions, setWashOptions] = useState<WashOption[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [showMechanicModal, setShowMechanicModal] = useState(false);
  const [description, setDescription] = useState<string>('');
  
  // Araç bilgileri
  const [vehicleData, setVehicleData] = useState({
    vehicleType: 'binek',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: ''
  });

  // Load mechanics offering wash service and vehicle data
  useEffect(() => {
    loadMechanics();
    loadVehicleData();
  }, []);

  // Load vehicle data from garage
  const loadVehicleData = async () => {
    // Varsayılan değerler
    setVehicleData({
      vehicleType: 'binek',
      vehicleBrand: 'Bilinmiyor',
      vehicleModel: 'Bilinmiyor',
      vehicleYear: '',
      vehiclePlate: ''
    });
  };

  const loadMechanics = async () => {
    try {
      setLoading(true);
      console.log('🔍 WashBookingScreen: Yıkama hizmeti veren usta listesi yükleniyor...');
      
      const response = await apiService.getMechanicsByService('wash');
      console.log('📱 WashBookingScreen API Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        // API'den gelen veriyi kontrol et
        let mechanicsData = [];
        
        if (response.data && Array.isArray(response.data)) {
          mechanicsData = response.data;
          console.log('✅ WashBookingScreen: API\'den gelen usta sayısı:', mechanicsData.length);
        } else if (response.data && response.data.mechanics && Array.isArray(response.data.mechanics)) {
          mechanicsData = response.data.mechanics;
          console.log('✅ WashBookingScreen: API\'den gelen usta sayısı (nested):', mechanicsData.length);
        } else {
          console.warn('⚠️ WashBookingScreen: Beklenmeyen API response formatı:', response);
        }
        
        // Yıkama hizmeti veren ustaları filtrele
        const washMechanics = mechanicsData.filter((mechanic: any) => {
          // Servis türlerini kontrol et
          const services = mechanic.services || mechanic.serviceTypes || [];
          const hasWashService = services.some((service: any) => 
            service === 'wash' || 
            service === 'yıkama' || 
            service === 'car_wash' ||
            (typeof service === 'object' && service.type === 'wash')
          );
          
          // Alternatif olarak specialties kontrolü
          const specialties = mechanic.specialties || mechanic.skills || [];
          const hasWashSpecialty = specialties.some((specialty: any) => 
            specialty === 'wash' || 
            specialty === 'yıkama' || 
            specialty === 'car_wash' ||
            specialty.toLowerCase().includes('yıkama') ||
            specialty.toLowerCase().includes('wash')
          );
          
          return hasWashService || hasWashSpecialty;
        });
        
        console.log('🔍 WashBookingScreen: Yıkama hizmeti veren usta sayısı:', washMechanics.length);
        
        // Veriyi normalize et
        const normalizedMechanics = washMechanics.map((mechanic: any) => {
          // Adres bilgisini akıllı şekilde birleştir
          let address = '';
          if (mechanic.location) {
            const loc = mechanic.location;
            const addressParts = [];
            
            if (loc.description && loc.description.trim()) {
              addressParts.push(loc.description.trim());
            }
            if (loc.street && loc.street.trim()) {
              addressParts.push(loc.street.trim());
            }
            if (loc.neighborhood && loc.neighborhood.trim()) {
              addressParts.push(loc.neighborhood.trim());
            }
            if (loc.district && loc.district.trim()) {
              addressParts.push(loc.district.trim());
            }
            if (loc.city && loc.city.trim()) {
              addressParts.push(loc.city.trim());
            }
            
            address = addressParts.join(', ') || loc.city || 'Adres bilgisi yok';
          } else {
            address = mechanic.city || 'Adres bilgisi yok';
          }
          
          // İsim bilgisini düzelt
          const fullName = `${mechanic.name || ''} ${mechanic.surname || ''}`.trim();
          const displayName = fullName || mechanic.name || 'İsimsiz Usta';
          
          // API'den gelen rating bilgisini kullan
          const rating = mechanic.rating || mechanic.averageRating || 0;
          const ratingText = rating > 0 ? rating.toFixed(1) : 'Değerlendirme yok';
          const ratingCount = mechanic.ratingCount || mechanic.totalRatings || 0;
          
          return {
            id: mechanic._id || mechanic.id,
            name: displayName,
            rating: ratingText,
            ratingCount: ratingCount,
            address: address,
            image: mechanic.profilePhotoUrl || mechanic.avatar || mechanic.image,
            // Ek bilgiler
            experience: mechanic.experience || 0,
            totalServices: mechanic.totalServices || 0,
            isAvailable: mechanic.isAvailable !== false,
            specialties: mechanic.specialties || [],
            shopName: mechanic.shopName || ''
          };
        });
        
        console.log('✅ WashBookingScreen: Normalize edilmiş usta verileri:', normalizedMechanics);
        setMechanics(normalizedMechanics);
      } else {
        console.log('❌ WashBookingScreen: API başarısız:', response.message);
        setMechanics([]);
      }
    } catch (error) {
      console.error('❌ WashBookingScreen: Usta yükleme hatası:', error);
      setMechanics([]);
    } finally {
      setLoading(false);
    }
  };

  // Load wash packages and options from selected mechanic
  useEffect(() => {
    if (selectedMechanic) {
      loadMechanicWashData(selectedMechanic.id);
    }
  }, [selectedMechanic]);

  const loadMechanicWashData = async (mechanicId: string) => {
    try {
      setLoading(true);
      
      // Usta tarafındaki mock verilerle entegre - gerçek API'den gelecek
      const mockPackages: WashPackage[] = [
        {
          id: 'basic',
          name: 'Temel Yıkama',
          description: 'Dış yıkama + Vakum',
          price: 50,
          duration: '30 dk',
          features: ['Dış yıkama', 'Vakum', 'Kurulama'],
          icon: 'water',
          color: '#10B981'
        },
        {
          id: 'premium',
          name: 'Premium Yıkama',
          description: 'Dış + İç temizlik',
          price: 80,
          duration: '45 dk',
          features: ['Dış yıkama', 'İç temizlik', 'Vakum', 'Kurulama', 'Cam temizliği'],
          icon: 'water',
          color: '#3B82F6'
        },
        {
          id: 'deluxe',
          name: 'Deluxe Yıkama',
          description: 'Tam detay temizlik',
          price: 120,
          duration: '60 dk',
          features: ['Dış yıkama', 'İç temizlik', 'Vakum', 'Kurulama', 'Cam temizliği', 'Cila', 'Lastik parlatma'],
          icon: 'water',
          color: '#8B5CF6'
        },
        {
          id: 'detailing',
          name: 'Detay Temizlik',
          description: 'Profesyonel detay temizlik',
          price: 150,
          duration: '90 dk',
          features: ['Dış yıkama', 'İç temizlik', 'Vakum', 'Kurulama', 'Cam temizliği', 'Cila', 'Lastik parlatma', 'Koltuk temizliği', 'Motor temizliği'],
          icon: 'water',
          color: '#F59E0B'
        }
      ];

      const mockOptions: WashOption[] = [
        {
          id: 'wax',
          name: 'Cila',
          description: 'Araç cilası',
          price: 30,
          icon: 'sparkles'
        },
        {
          id: 'interior',
          name: 'İç Detay',
          description: 'Koltuk ve panel temizliği',
          price: 25,
          icon: 'sofa'
        },
        {
          id: 'engine',
          name: 'Motor Temizliği',
          description: 'Motor bölümü temizliği',
          price: 40,
          icon: 'engine'
        },
        {
          id: 'tire',
          name: 'Lastik Parlatma',
          description: 'Lastik parlatma ve temizlik',
          price: 20,
          icon: 'car'
        },
        {
          id: 'leather',
          name: 'Deri Temizlik',
          description: 'Deri koltuk temizliği',
          price: 35,
          icon: 'sofa'
        }
      ];

      setWashPackages(mockPackages);
      setWashOptions(mockOptions);
    } catch (error) {
      Alert.alert('Hata', 'Yıkama paketleri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total price
  useEffect(() => {
    let total = 0;
    
    if (selectedPackage) {
      const packageData = washPackages.find(pkg => pkg.id === selectedPackage);
      if (packageData) {
        total += packageData.price;
      }
    }
    
    selectedOptions.forEach(optionId => {
      const optionData = washOptions.find(opt => opt.id === optionId);
      if (optionData) {
        total += optionData.price;
      }
    });
    
    setTotalPrice(total);
  }, [selectedPackage, selectedOptions, washPackages, washOptions]);

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleMechanicSelect = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setShowMechanicModal(false);
    // Reset selections when changing mechanic
    setSelectedPackage('');
    setSelectedOptions([]);
  };

  const handleBookWash = async () => {
    if (!selectedMechanic) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir usta seçin.');
      return;
    }

    if (!selectedPackage) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir yıkama paketi seçin.');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir tarih seçin.');
      return;
    }

    if (!selectedTimeSlot) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir saat seçin.');
      return;
    }

    try {
      setLoading(true);
      
      const bookingData = {
        mechanicId: selectedMechanic.id,
        packageType: selectedPackage,
        options: selectedOptions,
        appointmentDate: selectedDate,
        timeSlot: selectedTimeSlot,
        totalPrice: totalPrice,
        vehicleType: vehicleData.vehicleType,
        vehicleBrand: vehicleData.vehicleBrand,
        vehicleModel: vehicleData.vehicleModel,
        vehicleYear: vehicleData.vehicleYear,
        specialRequests: description,
        serviceType: 'wash'
      };

      const response = await apiService.createWashBooking(bookingData);
      
      if (response.success) {
        Alert.alert(
          'Başarılı!', 
          'Yıkama randevunuz başarıyla oluşturuldu.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Randevu oluşturulurken bir hata oluştu.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Randevu oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots: TimeSlot[] = [
    { id: '09:00', time: '09:00', available: true },
    { id: '10:00', time: '10:00', available: true },
    { id: '11:00', time: '11:00', available: true },
    { id: '12:00', time: '12:00', available: true },
    { id: '13:00', time: '13:00', available: true },
    { id: '14:00', time: '14:00', available: true },
    { id: '15:00', time: '15:00', available: true },
    { id: '16:00', time: '16:00', available: true },
    { id: '17:00', time: '17:00', available: true },
    { id: '18:00', time: '18:00', available: true },
  ];

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getDayAfterTomorrowDate = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Yarın';
    } else if (date.toDateString() === dayAfter.toDateString()) {
      return 'Öbür Gün';
    } else {
      return date.toLocaleDateString('tr-TR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      });
    }
  };

  return (
    <Background>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <BackButton />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
              Araç Yıkama
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
              Profesyonel yıkama hizmeti
            </Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

          {/* Mechanic Selection */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Yıkama Ustası Seçimi
            </Text>
            
            {selectedMechanic ? (
              <View style={styles.selectedMechanic}>
                <View style={styles.mechanicInfo}>
                  <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                    {selectedMechanic.name}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <MaterialCommunityIcons 
                      name="star" 
                      size={16} 
                      color="#FFD700" 
                    />
                    <Text style={[styles.rating, { color: theme.colors.text.secondary }]}>
                      {selectedMechanic.rating}
                    </Text>
                  </View>
                  <Text style={[styles.mechanicAddress, { color: theme.colors.text.secondary }]}>
                    {selectedMechanic.address}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.changeMechanicButton, { borderColor: theme.colors.border.secondary }]}
                  onPress={() => setShowMechanicModal(true)}
                >
                  <Text style={[styles.changeMechanicText, { color: theme.colors.primary.main }]}>
                    Değiştir
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.selectMechanicButton, { borderColor: theme.colors.border.secondary }]}
                onPress={() => setShowMechanicModal(true)}
              >
                <MaterialCommunityIcons 
                  name="account-search" 
                  size={24} 
                  color={theme.colors.primary.main} 
                />
                <Text style={[styles.selectMechanicText, { color: theme.colors.primary.main }]}>
                  Yıkama Ustası Seç
                </Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Package Selection */}
          {selectedMechanic && washPackages.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Yıkama Paketi
              </Text>
              
              {washPackages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    { 
                      borderColor: selectedPackage === pkg.id 
                        ? theme.colors.primary.main 
                        : theme.colors.border.secondary 
                    }
                  ]}
                  onPress={() => handlePackageSelect(pkg.id)}
                >
                  <View style={styles.packageHeader}>
                    <View style={[styles.packageIcon, { backgroundColor: pkg.color }]}>
                      <MaterialCommunityIcons 
                        name={pkg.icon as any} 
                        size={24} 
                        color="white" 
                      />
                    </View>
                    <View style={styles.packageInfo}>
                      <Text style={[styles.packageName, { color: theme.colors.text.primary }]}>
                        {pkg.name}
                      </Text>
                      <Text style={[styles.packageDescription, { color: theme.colors.text.secondary }]}>
                        {pkg.description}
                      </Text>
                      <Text style={[styles.packageDuration, { color: theme.colors.text.secondary }]}>
                        {pkg.duration}
                      </Text>
                    </View>
                    <View style={styles.packagePrice}>
                      <Text style={[styles.priceText, { color: theme.colors.primary.main }]}>
                        {pkg.price}₺
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.featuresContainer}>
                    {pkg.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <MaterialCommunityIcons 
                          name="check" 
                          size={16} 
                          color={theme.colors.success.main} 
                        />
                        <Text style={[styles.featureText, { color: theme.colors.text.secondary }]}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          )}

          {/* Options Selection */}
          {selectedMechanic && washOptions.length > 0 && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Ek Hizmetler
              </Text>
              
              {washOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    { 
                      borderColor: selectedOptions.includes(option.id) 
                        ? theme.colors.primary.main 
                        : theme.colors.border.secondary 
                    }
                  ]}
                  onPress={() => handleOptionToggle(option.id)}
                >
                  <View style={styles.optionContent}>
                    <MaterialCommunityIcons 
                      name={option.icon as any} 
                      size={20} 
                      color={theme.colors.primary.main} 
                    />
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionName, { color: theme.colors.text.primary }]}>
                        {option.name}
                      </Text>
                      <Text style={[styles.optionDescription, { color: theme.colors.text.secondary }]}>
                        {option.description}
                      </Text>
                    </View>
                    <View style={styles.optionPrice}>
                      <Text style={[styles.priceText, { color: theme.colors.primary.main }]}>
                        +{option.price}₺
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          )}

          {/* Date Selection */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Tarih Seçimi
            </Text>
            
            <View style={styles.dateContainer}>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { 
                    borderColor: selectedDate === getTodayDate() 
                      ? theme.colors.primary.main 
                      : theme.colors.border.secondary 
                  }
                ]}
                onPress={() => setSelectedDate(getTodayDate())}
              >
                <Text style={[styles.dateText, { color: theme.colors.text.primary }]}>
                  Bugün
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { 
                    borderColor: selectedDate === getTomorrowDate() 
                      ? theme.colors.primary.main 
                      : theme.colors.border.secondary 
                  }
                ]}
                onPress={() => setSelectedDate(getTomorrowDate())}
              >
                <Text style={[styles.dateText, { color: theme.colors.text.primary }]}>
                  Yarın
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { 
                    borderColor: selectedDate === getDayAfterTomorrowDate() 
                      ? theme.colors.primary.main 
                      : theme.colors.border.secondary 
                  }
                ]}
                onPress={() => setSelectedDate(getDayAfterTomorrowDate())}
              >
                <Text style={[styles.dateText, { color: theme.colors.text.primary }]}>
                  Öbür Gün
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Time Selection */}
          {selectedDate && (
            <Card style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                Saat Seçimi
              </Text>
              
              <View style={styles.timeGrid}>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.timeSlot,
                      { 
                        borderColor: selectedTimeSlot === slot.id 
                          ? theme.colors.primary.main 
                          : theme.colors.border.secondary 
                      }
                    ]}
                    onPress={() => setSelectedTimeSlot(slot.id)}
                  >
                    <Text style={[styles.timeText, { color: theme.colors.text.primary }]}>
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          )}

          {/* Total Price */}
          {totalPrice > 0 && (
            <Card style={styles.section}>
              <View style={styles.totalContainer}>
                <Text style={[styles.totalLabel, { color: theme.colors.text.primary }]}>
                  Toplam Tutar:
                </Text>
                <Text style={[styles.totalPrice, { color: theme.colors.primary.main }]}>
                  {totalPrice}₺
                </Text>
              </View>
            </Card>
          )}

          {/* Book Button */}
          <View style={styles.buttonContainer}>
            <Button
              title={loading ? "İşleniyor..." : "Randevu Oluştur"}
              onPress={handleBookWash}
              disabled={loading || !selectedMechanic || !selectedPackage || !selectedDate || !selectedTimeSlot}
              style={styles.bookButton}
            />
          </View>
        </ScrollView>

        {/* Mechanic Selection Modal */}
        <Modal
          visible={showMechanicModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background.primary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Yıkama Ustası Seçin
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMechanicModal(false)}
              >
                <MaterialCommunityIcons 
                  name="close" 
                  size={24} 
                  color={theme.colors.text.primary} 
                />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.mechanicList}>
              {mechanics.map((mechanic) => (
                <View key={mechanic.id} style={[styles.mechanicCard, { borderColor: theme.colors.border.secondary }]}>
                  <View style={styles.mechanicCardContent}>
                    <View style={styles.mechanicImage}>
                      {mechanic.image ? (
                        <Image source={{ uri: mechanic.image }} style={styles.mechanicAvatar} />
                      ) : (
                        <View style={[styles.mechanicAvatar, { backgroundColor: theme.colors.primary.main }]}>
                          <MaterialCommunityIcons 
                            name="account" 
                            size={28} 
                            color="white" 
                          />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.mechanicDetails}>
                      <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                        {mechanic.name}
                      </Text>
                      
                      {mechanic.shopName && (
                        <Text style={[styles.shopName, { color: theme.colors.text.secondary }]}>
                          {mechanic.shopName}
                        </Text>
                      )}
                      
                      <View style={styles.mechanicInfoRow}>
                        <View style={styles.ratingContainer}>
                          <MaterialCommunityIcons 
                            name="star" 
                            size={18} 
                            color="#FFD700" 
                          />
                          <Text style={[styles.rating, { color: theme.colors.text.secondary }]}>
                            {mechanic.rating}
                          </Text>
                          <Text style={[styles.ratingCount, { color: theme.colors.text.secondary }]}>
                            ({mechanic.ratingCount})
                          </Text>
                        </View>
                      </View>
                      
                      {mechanic.experience > 0 && (
                        <View style={styles.experienceContainer}>
                          <MaterialCommunityIcons 
                            name="briefcase" 
                            size={16} 
                            color={theme.colors.text.secondary} 
                          />
                          <Text style={[styles.experienceText, { color: theme.colors.text.secondary }]}>
                            {mechanic.experience} yıl deneyim
                          </Text>
                        </View>
                      )}
                      
                      <Text style={[styles.mechanicFullAddress, { color: theme.colors.text.secondary }]}>
                        {mechanic.address}
                      </Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.selectMechanicButton, { backgroundColor: theme.colors.primary.main }]}
                    onPress={() => handleMechanicSelect(mechanic)}
                  >
                    <Text style={[styles.selectMechanicText, { color: 'white' }]}>
                      Seç
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
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
  selectedMechanic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mechanicInfo: {
    flex: 1,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    marginLeft: 4,
  },
  mechanicAddress: {
    fontSize: 14,
  },
  changeMechanicButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  changeMechanicText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectMechanicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginLeft: 8,
  },
  selectMechanicText: {
    fontSize: 16,
    fontWeight: '500',
  },
  packageCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  packageIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  packageDuration: {
    fontSize: 12,
  },
  packagePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    marginLeft: 4,
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  optionPrice: {
    alignItems: 'flex-end',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '18%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    paddingVertical: 16,
  },
  bookButton: {
    marginHorizontal: 0,
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
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  mechanicList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mechanicCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  mechanicCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mechanicImage: {
    marginRight: 16,
  },
  mechanicAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mechanicDetails: {
    flex: 1,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.8,
  },
  mechanicInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 4,
    opacity: 0.7,
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  experienceText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  mechanicFullAddress: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
});

export default WashBookingScreen;