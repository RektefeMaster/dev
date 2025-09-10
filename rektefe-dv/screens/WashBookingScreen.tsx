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
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Background from '../components/Background';
import Button from '../components/Button';
import Card from '../components/Card';
import { apiService } from '../services/api';
import { vehicleDataService } from '../services/vehicleData';

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
  rating: number;
  address: string;
  distance: string;
  image?: string;
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
    try {
      const data = await vehicleDataService.getVehicleForForm();
      setVehicleData({
        vehicleType: data.vehicleType,
        vehicleBrand: data.vehicleBrand,
        vehicleModel: data.vehicleModel,
        vehicleYear: data.vehicleYear,
        vehiclePlate: data.vehiclePlate
      });
    } catch (error) {
      console.error('Araç bilgileri yüklenemedi:', error);
    }
  };

  const loadMechanics = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMechanicsByService('wash');
      if (response.success) {
        // Gerçek usta verilerini kullan, yoksa mock veri
        const mechanicsData = response.data || [];
        if (mechanicsData.length === 0) {
          // Mock usta verileri
          setMechanics([
            {
              id: '1',
              name: 'Ahmet Yıkama Ustası',
              rating: 4.8,
              address: 'Kadıköy, İstanbul',
              distance: '2.5 km',
              image: 'https://via.placeholder.com/100'
            },
            {
              id: '2',
              name: 'Mehmet Detay Temizlik',
              rating: 4.6,
              address: 'Beşiktaş, İstanbul',
              distance: '3.2 km',
              image: 'https://via.placeholder.com/100'
            }
          ]);
        } else {
          setMechanics(mechanicsData);
        }
      }
    } catch (error) {
      console.error('Ustalar yüklenirken hata:', error);
      // Hata durumunda mock veri göster
      setMechanics([
        {
          id: '1',
          name: 'Ahmet Yıkama Ustası',
          rating: 4.8,
          address: 'Kadıköy, İstanbul',
          distance: '2.5 km',
          image: 'https://via.placeholder.com/100'
        }
      ]);
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
      console.error('Yıkama paketleri yüklenirken hata:', error);
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
      console.error('Randevu oluşturma hatası:', error);
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
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              Yıkama Randevusu
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Mechanic Selection */}
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Usta Seçimi
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
                  Usta Seç
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
                Usta Seçin
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
                <TouchableOpacity
                  key={mechanic.id}
                  style={[styles.mechanicCard, { borderColor: theme.colors.border.secondary }]}
                  onPress={() => handleMechanicSelect(mechanic)}
                >
                  <View style={styles.mechanicImage}>
                    {mechanic.image ? (
                      <Image source={{ uri: mechanic.image }} style={styles.mechanicAvatar} />
                    ) : (
                      <View style={[styles.mechanicAvatar, { backgroundColor: theme.colors.primary.main }]}>
                        <MaterialCommunityIcons 
                          name="account" 
                          size={24} 
                          color="white" 
                        />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.mechanicDetails}>
                    <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
                      {mechanic.name}
                    </Text>
                    
                    <View style={styles.ratingContainer}>
                      <MaterialCommunityIcons 
                        name="star" 
                        size={16} 
                        color="#FFD700" 
                      />
                      <Text style={[styles.rating, { color: theme.colors.text.secondary }]}>
                        {mechanic.rating}
                      </Text>
                    </View>
                    
                    <View style={styles.mechanicLocation}>
                      <MaterialCommunityIcons 
                        name="map-marker" 
                        size={16} 
                        color={theme.colors.text.secondary} 
                      />
                      <Text style={[styles.mechanicAddress, { color: theme.colors.text.secondary }]}>
                        {mechanic.address}
                      </Text>
                    </View>
                    
                    <Text style={[styles.mechanicDistance, { color: theme.colors.text.secondary }]}>
                      {mechanic.distance}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.selectMechanicButton, { backgroundColor: theme.colors.primary.main }]}
                    onPress={() => handleMechanicSelect(mechanic)}
                  >
                    <Text style={[styles.selectMechanicText, { color: 'white' }]}>
                      Seç
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
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
  },
  selectMechanicText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  mechanicImage: {
    marginRight: 12,
  },
  mechanicAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mechanicDetails: {
    flex: 1,
  },
  mechanicLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  mechanicDistance: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default WashBookingScreen;