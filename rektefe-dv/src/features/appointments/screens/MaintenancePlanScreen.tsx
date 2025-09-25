import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

type RootStackParamList = {
  Home: undefined;
  MaintenancePlan: undefined;
  Main: { screen?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const MaintenancePlanScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedMaster, setSelectedMaster] = useState('');
  const [masters, setMasters] = useState<any[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [sharePhone, setSharePhone] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Ekrana her girildiğinde state'leri sıfırla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setStep(1);
      setSelectedService('');
      setSelectedVehicle('');
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      setSharePhone(false);
      setAvailableSlots([]);
      setShowCalendar(false);
      setCurrentMonth(new Date());
      setSelectedDay(null);
    });
    return unsubscribe;
  }, [navigation]);

  // Servis tipleri (HomeScreen ile aynı 12 hizmet)
  const serviceTypes = [
    { id: 'agir-bakim', name: 'Ağır Bakım', icon: 'wrench' },
    { id: 'genel-bakim', name: 'Genel Bakım', icon: 'tools' },
    { id: 'alt-takim', name: 'Alt Takım', icon: 'cog' },
    { id: 'ust-takim', name: 'Üst Takım', icon: 'nut' },
    { id: 'kaporta-boya', name: 'Kaporta & Boya', icon: 'spray' },
    { id: 'elektrik-elektronik', name: 'Elektrik-Elektronik', icon: 'lightning-bolt' },
    { id: 'yedek-parca', name: 'Yedek Parça', icon: 'car-wash' },
    { id: 'lastik', name: 'Lastik Servisi', icon: 'tire' },
    { id: 'egzoz-emisyon', name: 'Egzoz & Emisyon', icon: 'smoke' },
    { id: 'ekspertiz', name: 'Ekspertiz', icon: 'magnify' },
    { id: 'sigorta-kasko', name: 'Sigorta & Kasko', icon: 'shield-check' },
    { id: 'arac-yikama', name: 'Araç Yıkama', icon: 'car-wash' },
  ];

  // Kullanıcı ID'sini al
  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('user_id');
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        }
    };
    getUserId();
  }, []);

  // Araçları getir
  useEffect(() => {
    if (userId) {
      const fetchVehicles = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`${API_URL}/vehicles`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // API response formatı: { success: true, data: [...], message: "..." }
          if (response.data && response.data.success && response.data.data) {
            setVehicles(response.data.data);
          } else {
            setVehicles([]);
          }
        } catch (error) {
          setVehicles([]);
          Alert.alert('Hata', 'Araçlar yüklenirken bir hata oluştu');
        } finally {
          setLoading(false);
        }
      };
      fetchVehicles();
    }
  }, [userId, token]);

  // Usta müsaitlik durumunu getir
  const fetchMechanicAvailability = async (date: string) => {
    // Müsaitlik sorgusu için usta seçilmiş olmalı
    if (!selectedMaster) {
      // Bu bir hata değil, sadece henüz usta seçilmediği için sorgu yapmıyoruz.
      // Konsola bilgi yazıp geçebiliriz.
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/mechanic-services/mechanic-availability`,
        {
          params: { date, mechanicId: selectedMaster },
        }
      );
      
      if (response.data && response.data.success && response.data.data && response.data.data.availableSlots) {
        setAvailableSlots(response.data.data.availableSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      Alert.alert('Hata', 'Müsaitlik durumu alınırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Usta/Dükkanları getir
  useEffect(() => {
    if (step === 3 && selectedService && selectedVehicle) {
      const fetchMasters = async () => {
        setLoadingMasters(true);
        try {
          // Araç markasını bul
          const selectedVehicleObj = vehicles.find((v: any) => v._id === selectedVehicle);
          const brand = selectedVehicleObj ? selectedVehicleObj.brand : '';
          // Seçilen servisin backend'deki ismini bul
          const serviceName = serviceTypes.find(s => s.id === selectedService)?.name || selectedService;
          
          const response = await axios.get(`${API_URL}/mechanic-services/mechanics`, {
            params: { serviceCategory: serviceName, vehicleBrand: brand },
            headers: { Authorization: `Bearer ${token}` },
          });
          
          // API response formatı kontrol et
          if (response.data && response.data.success && response.data.data) {
            setMasters(response.data.data);
          } else {
            setMasters([]);
          }
        } catch (error) {
          setMasters([]);
        } finally {
          setLoadingMasters(false);
        }
      };
      fetchMasters();
    }
  }, [step, selectedService, selectedVehicle, vehicles, token]);

  // Randevu oluştur
  const createAppointment = async () => {
    setLoading(true);
    try {
      // Seçilen tarih ve saati birleştir
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Yerel saat diliminde tarih oluştur
      const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
      
      const appointmentData = {
        userId: userId, // Backend'de gerekli
        vehicleId: selectedVehicle,
        serviceType: selectedService,
        appointmentDate: appointmentDateTime.toISOString(),
        timeSlot: selectedTime, // Backend'de timeSlot olarak bekleniyor
        description: notes, // Backend'de description olarak bekleniyor
        mechanicId: selectedMaster,
      };

      const response = await axios.post(
        `${API_URL}/appointments`,
        appointmentData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        '🎉 Randevu Başarıyla Oluşturuldu!',
        'Randevunuz başarıyla oluşturuldu.\n\n💡 Randevunuzu "Randevular" kısmında takip edebilirsiniz.',
        [
          {
            text: 'Ana Sayfaya Git',
            onPress: () => {
              navigation.navigate('Main', { screen: 'MainTabs' });
            },
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Randevu oluşturulurken bir hata oluştu';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedVehicle) {
      Alert.alert('Uyarı', 'Lütfen bir araç seçin');
      return;
    }
    if (step === 2 && !selectedService) {
      Alert.alert('Uyarı', 'Lütfen bir servis seçin');
      return;
    }
    if (step === 3 && !selectedMaster) {
      Alert.alert('Uyarı', 'Lütfen bir usta veya dükkan seçin');
      return;
    }
    if (step === 4 && (!selectedDate || !selectedTime)) {
      Alert.alert('Uyarı', 'Lütfen tarih ve saat seçin');
      return;
    }
    if (step === 5) {
      createAppointment();
    } else {
      setStep(step + 1);
    }
  };

  // Geri butonuna basınca uyarı göster (sadece seçim yapıldıysa)
  const handleBackButton = () => {
    const hasSelection =
      step > 1 ||
      selectedVehicle !== '' ||
      selectedService !== '' ||
      selectedDate !== '' ||
      selectedTime !== '' ||
      notes !== '' ||
      sharePhone !== false;

    if (!hasSelection) {
      // Hiçbir seçim yoksa direkt çık
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.navigate('Main', { screen: 'Home' });
      return;
    }

    Alert.alert(
      'Bakım Planı Yarıda Kalacak',
      'Çıkarsanız bakım planı sıfırlanacaktır. Emin misiniz?',
      [
        {
          text: 'Hayır',
          style: 'cancel',
        },
        {
          text: 'Evet',
          style: 'destructive',
          onPress: () => {
            // State'leri sıfırla
            setStep(1);
            setSelectedService('');
            setSelectedVehicle('');
            setSelectedDate('');
            setSelectedTime('');
            setNotes('');
            setSharePhone(false);
            setAvailableSlots([]);
            setShowCalendar(false);
            setCurrentMonth(new Date());
            setSelectedDay(null);
            // Çıkış
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate('Main', { screen: 'Home' });
          },
        },
      ]
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];

    // Önceki ayın günleri
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Bu ayın günleri
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const handleDaySelect = (day: Date) => {
    setSelectedDay(day);
    // Yerel saat diliminde tarihi formatla
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${date}`;
    setSelectedDate(formattedDate);
    fetchMechanicAvailability(formattedDate);
    setShowCalendar(false);
  };

  const renderCalendar = () => {
    const days = getDaysInMonth(currentMonth);
    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(newMonth.getMonth() - 1);
              setCurrentMonth(newMonth);
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#0066cc" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {currentMonth.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(newMonth.getMonth() + 1);
              setCurrentMonth(newMonth);
            }}
          >
            <Ionicons name="chevron-forward" size={24} color="#0066cc" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysContainer}>
          {weekDays.map((day) => (
            <Text key={day} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysContainer}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                day && selectedDay?.getTime() === day.getTime() && styles.selectedDay,
                !day && styles.emptyDay,
              ]}
              onPress={() => day && handleDaySelect(day)}
              disabled={!day}
            >
              {day && (
                <Text
                  style={[
                    styles.dayText,
                    day.getTime() === selectedDay?.getTime() && styles.selectedDayText,
                  ]}
                >
                  {day.getDate()}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3, 4, 5].map((stepNumber) => (
          <View key={stepNumber} style={styles.stepIndicatorWrapper}>
            <View
              style={[
                styles.stepIndicator,
                stepNumber === step && styles.stepIndicatorActive,
                stepNumber < step && styles.stepIndicatorCompleted,
              ]}
            >
              {stepNumber < step ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={styles.stepIndicatorText}>{stepNumber}</Text>
              )}
            </View>
            {stepNumber < 5 && (
              <View
                style={[
                  styles.stepIndicatorLine,
                  stepNumber < step && styles.stepIndicatorLineCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Aracınızı Seçin</Text>
            <Text style={styles.stepDescription}>
              Bakım yaptırmak istediğiniz aracı seçin
            </Text>
            {loading ? (
              <ActivityIndicator size="large" color="#0066cc" />
            ) : (
              <ScrollView style={styles.vehiclesList}>
                {vehicles.map((vehicle: any) => (
                  <TouchableOpacity
                    key={vehicle._id}
                    style={[
                      styles.vehicleCard,
                      selectedVehicle === vehicle._id && styles.vehicleCardSelected,
                    ]}
                    onPress={() => setSelectedVehicle(vehicle._id)}
                  >
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleName}>
                        {vehicle.brand} {vehicle.model}
                      </Text>
                      <Text style={styles.vehicleDetails}>
                        {vehicle.year} • {vehicle.plateNumber}
                      </Text>
                    </View>
                    {selectedVehicle === vehicle._id && (
                      <Ionicons name="checkmark-circle" size={24} color="#0066cc" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Servis Seçin</Text>
            <Text style={styles.stepDescription}>
              Yaptırmak istediğiniz bakım servisini seçin
            </Text>
            <View style={styles.servicesGrid}>
              {serviceTypes.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    selectedService === service.id && styles.serviceCardSelected,
                  ]}
                  onPress={() => setSelectedService(service.id)}
                >
                  <MaterialCommunityIcons
                    name={service.icon as any}
                    size={32}
                    color={selectedService === service.id ? '#fff' : '#0066cc'}
                  />
                  <Text
                    style={[
                      styles.serviceName,
                      selectedService === service.id && styles.serviceNameSelected,
                    ]}
                  >
                    {service.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Usta / Dükkan Seçin</Text>
            <Text style={styles.stepDescription}>
              Seçtiğiniz hizmet ve araca uygun ustaları veya dükkanları seçin
            </Text>
            {loadingMasters ? (
              <ActivityIndicator size="large" color="#0066cc" />
            ) : masters.length === 0 ? (
              <View style={{alignItems:'center', marginTop:32}}>
                <Text style={{ color: '#888', textAlign: 'center', marginBottom: 12 }}>
                  Uygun usta veya dükkan bulunamadı.
                </Text>
                <Text style={{ color: '#FF9500', textAlign: 'center', fontWeight:'bold' }}>
                  Farklı bir servis veya araç seçmeyi deneyin.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 350 }}>
                {(() => {
                  try {
                    return masters.map((master) => (
                      <TouchableOpacity
                        key={master._id}
                        style={[
                          styles.vehicleCard,
                          selectedMaster === master._id && styles.vehicleCardSelected,
                        ]}
                        onPress={() => setSelectedMaster(master._id)}
                        disabled={!master.isAvailable}
                      >
                        <View style={[styles.masterCardInner, !master.isAvailable && styles.masterCardDisabled]}>
                          <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleName}>{master.shopName || `${master.name} ${master.surname}`}</Text>
                            <Text style={styles.vehicleDetails}>
                              {master.location && master.location.city ? master.location.city : 'Konum bilgisi yok'}
                            </Text>
                            <Text style={styles.vehicleDetails}>
                              {Array.isArray(master.serviceCategories) ? master.serviceCategories.slice(0, 3).join(', ') : ''}
                              {Array.isArray(master.serviceCategories) && master.serviceCategories.length > 3 ? '...' : ''}
                            </Text>
                            <Text style={styles.vehicleDetails}>
                              Deneyim: {master.experience || 0} yıl • Puan: {master.rating || 0}/5 ({master.ratingCount || 0} değerlendirme)
                            </Text>
                          </View>
                          <View style={styles.availabilityContainer}>
                            <View style={[styles.availabilityDot, { backgroundColor: master.isAvailable ? '#4CAF50' : '#F44336' }]} />
                            <Text style={[styles.availabilityText, { color: master.isAvailable ? '#4CAF50' : '#F44336' }]}>
                              {master.isAvailable ? 'Müsait' : 'Meşgul'}
                            </Text>
                          </View>
                        </View>
                        {selectedMaster === master._id && (
                          <Ionicons name="checkmark-circle" size={24} color="#0066cc" />
                        )}
                      </TouchableOpacity>
                    ));
                  } catch (err) {
                    return <Text style={{ color: 'red', textAlign: 'center' }}>Listeleme hatası oluştu.</Text>;
                  }
                })()}
              </ScrollView>
            )}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tarih ve Saat Seçin</Text>
            <Text style={styles.stepDescription}>
              Bakım için uygun bir tarih ve saat seçin
            </Text>
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowCalendar(!showCalendar)}
              >
                <Ionicons name="calendar-outline" size={24} color="#0066cc" />
                <Text style={styles.dateButtonText}>
                  {selectedDate || 'Tarih Seçin'}
                </Text>
              </TouchableOpacity>

              <View style={styles.timeContainer}>
                <Text style={styles.inputLabel}>Saat</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={selectedTime}
                  onChangeText={setSelectedTime}
                />
              </View>
            </View>

            {showCalendar && renderCalendar()}

            {selectedDate && availableSlots.length > 0 && (
              <View style={styles.availableSlotsContainer}>
                <Text style={styles.availableSlotsTitle}>Müsait Saatler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableSlots.map((slot: any) => (
                    <TouchableOpacity
                      key={slot.time}
                      style={[
                        styles.timeSlot,
                        selectedTime === slot.time && styles.timeSlotSelected,
                        !slot.isAvailable && { opacity: 0.5 },
                      ]}
                      onPress={() => slot.isAvailable && setSelectedTime(slot.time)}
                      disabled={!slot.isAvailable}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTime === slot.time && styles.timeSlotTextSelected,
                        ]}
                      >
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Notlar ve İletişim</Text>
            <Text style={styles.stepDescription}>
              Bakım ile ilgili notlarınızı ekleyin ve iletişim tercihlerinizi belirleyin
            </Text>
            <View style={styles.notesContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Bakım ile ilgili notlarınızı buraya yazın..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.phoneShareContainer}>
              <Text style={styles.phoneShareText}>
                Telefon numaranızı ustayla paylaşın
              </Text>
              <Switch
                value={sharePhone}
                onValueChange={setSharePhone}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={sharePhone ? '#0066cc' : '#f4f3f4'}
              />
            </View>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackButton}
          >
            <Ionicons name="arrow-back" size={24} color="#0066cc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bakım Planla</Text>
        </View>

        {renderStepIndicator()}

        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {renderStep()}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerContainer}>
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.footerButton, styles.backButton]}
              onPress={handleBackButton}
            >
              <Ionicons name="arrow-back" size={20} color="#0066cc" />
              <Text style={[styles.footerButtonText, styles.backButtonText]}>
                Geri
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.footerButton, styles.nextButton]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.footerButtonText}>
                  {step === 5 ? 'Randevu Oluştur' : 'İleri'}
                </Text>
                {step < 5 && (
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
        </SafeAreaView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
    color: '#1a1a1a',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  stepIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: '#0066cc',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepIndicatorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepIndicatorLine: {
    width: 50,
    height: 2,
    backgroundColor: '#e0e0e0',
  },
  stepIndicatorLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  vehiclesList: {
    maxHeight: 400,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  vehicleCardSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#f0f7ff',
  },
  vehicleInfo: {
    flex: 1,
    marginRight: 10,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#666',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  serviceCard: {
    width: (width - 72) / 2,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  serviceCardSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  serviceName: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  serviceNameSelected: {
    color: '#fff',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 12,
  },
  dateButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  timeContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDay: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  emptyDay: {
    opacity: 0,
  },
  selectedDay: {
    backgroundColor: '#0066cc',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  selectedDayText: {
    color: '#fff',
  },
  availableSlotsContainer: {
    marginTop: 24,
  },
  availableSlotsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 12,
  },
  timeSlotSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  phoneShareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  phoneShareText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  footerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  nextButton: {
    backgroundColor: '#0066cc',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  backButtonText: {
    color: '#0066cc',
  },
  masterCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  masterCardDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  availabilityContainer: {
    alignItems: 'center',
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MaintenancePlanScreen; 