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
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
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
  const { token, userId: authUserId } = useAuth();
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
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Electrical-specific state
  const [electricalSystemType, setElectricalSystemType] = useState('');
  const [electricalProblemType, setElectricalProblemType] = useState('');
  const [electricalUrgencyLevel, setElectricalUrgencyLevel] = useState('normal');
  const [isRecurring, setIsRecurring] = useState(false);
  const [lastWorkingCondition, setLastWorkingCondition] = useState('');

  // Ekrana her girildiğinde state'leri sıfırla - SADECE İLK GİRİŞTE
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Sadece hiçbir seçim yapılmamışsa sıfırla
      const hasAnySelection = 
        step > 1 || 
        selectedService !== '' || 
        selectedVehicle !== '' || 
        selectedDate !== '' || 
        selectedTime !== '' || 
        notes !== '' || 
        sharePhone !== false ||
        electricalSystemType !== '' ||
        electricalProblemType !== '' ||
        electricalUrgencyLevel !== 'normal' ||
        isRecurring !== false ||
        lastWorkingCondition !== '';
      
      if (!hasAnySelection) {
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
        // Electrical state reset
        setElectricalSystemType('');
        setElectricalProblemType('');
        setElectricalUrgencyLevel('normal');
        setIsRecurring(false);
        setLastWorkingCondition('');
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Servis tipleri (HomeScreen ile aynı - Ekspertiz ve Sigorta & Kasko kaldırıldı)
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
    { id: 'arac-yikama', name: 'Araç Yıkama', icon: 'car-wash' },
  ];

  // Electrical-specific constants
  const electricalSystems = [
    { id: 'klima', name: 'Klima', icon: 'snowflake' },
    { id: 'far', name: 'Far/Lamba', icon: 'lightbulb' },
    { id: 'alternator', name: 'Alternatör', icon: 'cog' },
    { id: 'batarya', name: 'Batarya/Aku', icon: 'battery-full' },
    { id: 'elektrik-araci', name: 'Elektrikli Aygıtlar', icon: 'plugin' },
    { id: 'sinyal', name: 'Sinyal/Göstergeler', icon: 'speedometer' },
    { id: 'diger', name: 'Diğer', icon: 'settings' }
  ];

  const electricalProblems = [
    { id: 'calismiyor', name: 'Çalışmıyor' },
    { id: 'arizali-bos', name: 'Arızalı/Boş' },
    { id: 'ariza-gostergesi', name: 'Arıza Göstergesi' },
    { id: 'ses-yapiyor', name: 'Ses Yapıyor' },
    { id: 'isinma-sorunu', name: 'Isınma Sorunu' },
    { id: 'kisa-devre', name: 'Kısa Devre' },
    { id: 'tetik-atmiyor', name: 'Tetik Atmıyor' },
    { id: 'diger', name: 'Diğer' }
  ];

  // Araçları getir - useAuth'dan userId kullan
  useEffect(() => {
    if (authUserId) {
      const fetchVehicles = async () => {
        setLoading(true);
        try {
          // Araçlar yükleniyor
          
          const { data, error } = await withErrorHandling(
            () => apiService.getVehicles(),
            { showErrorAlert: false }
          );

          // Hata varsa
          if (error) {
            console.error('Araç yükleme hatası:', error);
            setVehicles([]);
            return;
          }

          // API yanıtı işleniyor - withErrorHandling data'yı API response olarak döndürüyor
          console.log('🔍 DEBUG: API Response:', JSON.stringify(data, null, 2));
          
          if (data && (data as any).success) {
            // Backend formatı: { success: true, data: [...], message: "..." }
            const vehiclesData = (data as any).data || [];
            console.log('🔍 DEBUG: Vehicles data:', vehiclesData);
            setVehicles(vehiclesData);
          } else if (Array.isArray(data)) {
            // Doğrudan array formatı
            console.log('🔍 DEBUG: Direct array data:', data);
            setVehicles(data);
          } else {
            // API yanıt formatı beklenenden farklı
            console.log('🔍 DEBUG: API yanıt formatı beklenenden farklı:', data);
            setVehicles([]);
          }
        } catch (error: any) {
          console.error('Araç yükleme hatası:', error);
          setVehicles([]);
          
          // 401 Unauthorized hatası için özel mesaj
          if (error.response?.status === 401) {
            console.error('401 Unauthorized - Token geçersiz!');
            Alert.alert(
              'Oturum Süresi Doldu', 
              'Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.',
              [
                {
                  text: 'Tamam',
                  onPress: () => {
                    // Kullanıcıyı login ekranına yönlendir
                    // navigation.navigate('Login');
                  }
                }
              ]
            );
          } else {
            Alert.alert('Hata', 'Araçlar yüklenirken bir hata oluştu');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchVehicles();
    }
  }, [authUserId, token]);

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
      const response = await axios.get(`${API_URL}/mechanic-services/mechanic-availability`, {
        params: { date, mechanicId: selectedMaster },
        headers: { Authorization: `Bearer ${token}` },
      });
      
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
          
          // Frontend hizmet kategorilerini backend formatına çevir
          const serviceCategoryMapping: { [key: string]: string } = {
            'agir-bakim': 'repair',
            'genel-bakim': 'repair', 
            'alt-takim': 'repair',
            'ust-takim': 'repair',
            'kaporta-boya': 'bodywork',
            'elektrik-elektronik': 'electrical',
            'yedek-parca': 'parts',
            'egzoz-emisyon': 'repair',
            'lastik': 'tire',
            'arac-yikama': 'wash',
            'cekici': 'towing'
          };
          
          const backendServiceCategory = serviceCategoryMapping[selectedService] || 'repair';
          
          console.log('🔍 MaintenancePlanScreen: Seçilen hizmet:', selectedService);
          console.log('🔍 MaintenancePlanScreen: Backend kategori:', backendServiceCategory);
          console.log('🔍 MaintenancePlanScreen: Araç markası:', brand);
          
          const response = await axios.get(`${API_URL}/mechanic-services/mechanics`, {
            params: { serviceCategory: backendServiceCategory },
            headers: { Authorization: `Bearer ${token}` },
          });
          
          console.log('🔍 MaintenancePlanScreen: Usta listesi yanıtı:', response.data);
          
          // API response formatı kontrol et
          if (response.data && response.data.success && response.data.data) {
            setMasters(response.data.data);
            console.log('✅ MaintenancePlanScreen: Usta sayısı:', response.data.data.length);
          } else {
            setMasters([]);
            console.log('⚠️ MaintenancePlanScreen: Usta bulunamadı');
          }
        } catch (error) {
          console.error('❌ MaintenancePlanScreen: Usta getirme hatası:', error);
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
      
      // timeSlot formatını düzelt (HH:MM-HH:MM formatına çevir)
      const [startHour, startMinute] = selectedTime.split(':').map(Number);
      const endTime = new Date(year, month - 1, day, startHour + 1, startMinute);
      const endTimeString = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
      const formattedTimeSlot = `${selectedTime}-${endTimeString}`;
      
      // Service type'ı backend formatına çevir (kod değerlerini kullan)
      // selectedService zaten kod değeri (agir-bakim, genel-bakim, etc.)
      const backendServiceType = selectedService;
      
      const appointmentData: any = {
        vehicleId: selectedVehicle,
        serviceType: backendServiceType,
        appointmentDate: appointmentDateTime.toISOString(),
        timeSlot: formattedTimeSlot,
        description: notes || 'Bakım randevusu',
        mechanicId: selectedMaster,
      };

      // Electrical-specific fields
      if (selectedService === 'elektrik-elektronik') {
        if (electricalSystemType) appointmentData.electricalSystemType = electricalSystemType;
        if (electricalProblemType) appointmentData.electricalProblemType = electricalProblemType;
        appointmentData.electricalUrgencyLevel = electricalUrgencyLevel;
        appointmentData.isRecurring = isRecurring;
        if (lastWorkingCondition) appointmentData.lastWorkingCondition = lastWorkingCondition;
      }

      console.log('📤 MaintenancePlanScreen: Gönderilen veri:', appointmentData);

      const response = await axios.post(`${API_URL}/appointments`, appointmentData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('📥 MaintenancePlanScreen: Backend yanıtı:', response.data);

      if (response.data && response.data.success) {
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
      } else {
        Alert.alert('Hata', response.data?.message || 'Randevu oluşturulamadı');
      }
    } catch (error: any) {
      console.error('❌ MaintenancePlanScreen: Randevu oluşturma hatası:', error);
      console.error('❌ MaintenancePlanScreen: Hata detayı:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Randevu oluşturulurken bir hata oluştu';
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
    
    // Electrical hizmeti için özel adım
    if (step === 4 && selectedService === 'elektrik-elektronik') {
      setStep(5); // Electrical-specific step
      return;
    }
    
    if (step === 5) {
      // Electrical için step 5 = electrical details, step 6 = notes/final
      if (selectedService === 'elektrik-elektronik') {
        if (!electricalSystemType || !electricalProblemType) {
          Alert.alert('Uyarı', 'Lütfen elektrik sistemi tipini ve problem tipini seçin');
          return;
        }
        setStep(6); // Notes step for electrical
      } else {
        createAppointment(); // Final step for non-electrical
      }
      return;
    }
    
    if (step === 6) {
      createAppointment(); // Final step for electrical
      return;
    }
    
    setStep(step + 1);
  };

  // Geri butonuna basınca normal çalışsın (sadece step'i azalt)
  const handleBackButton = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      // İlk adımdaysa ana sayfaya git
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.navigate('Main', { screen: 'Home' });
    }
  };

  // İptal butonuna basınca uyarı göster
  const handleCancelButton = () => {
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
      'Bakım Planı İptal Edilecek',
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
            // Electrical state reset
            setElectricalSystemType('');
            setElectricalProblemType('');
            setElectricalUrgencyLevel('normal');
            setIsRecurring(false);
            setLastWorkingCondition('');
            // Ana sayfaya git
            navigation.navigate('Main', { screen: 'Home' });
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
            <Ionicons name="chevron-back" size={24} color="#3b82f6" />
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
            <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
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
    // Electrical için 6 step, diğerleri için 5 step
    const totalSteps = selectedService === 'elektrik-elektronik' ? 6 : 5;
    const stepsArray = Array.from({ length: totalSteps }, (_, i) => i + 1);
    
    return (
      <View style={styles.stepIndicatorContainer}>
        {stepsArray.map((stepNumber) => (
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
            {stepNumber < totalSteps && (
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
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : vehicles.length > 0 ? (
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
                      <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="car-off" size={64} color="#9ca3af" />
                <Text style={styles.emptyStateTitle}>Araç Bulunamadı</Text>
                <Text style={styles.emptyStateDescription}>
                  Henüz eklenmiş bir aracınız bulunmuyor. Önce garajınıza araç eklemeniz gerekiyor.
                </Text>
                <TouchableOpacity 
                  style={styles.addVehicleButton}
                  onPress={() => {
                    // Garaj ekranına yönlendir
                    // Garaj ekranına yönlendiriliyor
                    navigation.navigate('Garage' as never);
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.addVehicleText}>Araç Ekle</Text>
                </TouchableOpacity>
              </View>
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
              {serviceTypes.map((service, index) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    selectedService === service.id && styles.serviceCardSelected,
                    index % 2 === 1 && styles.serviceCardRight,
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
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : masters.length === 0 ? (
              <View style={{alignItems:'center', marginTop:20, padding: 16, backgroundColor: '#fef3c7', borderRadius: 12, borderWidth: 1, borderColor: '#fbbf24'}}>
                <Text style={{ color: '#92400e', textAlign: 'center', marginBottom: 8, fontSize: 14, fontWeight: '600' }}>
                  Uygun usta veya dükkan bulunamadı.
                </Text>
                <Text style={{ color: '#d97706', textAlign: 'center', fontWeight:'600', fontSize: 13 }}>
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
                          <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                        )}
                      </TouchableOpacity>
                    ));
                  } catch (err) {
                    return <View style={{ padding: 16, backgroundColor: '#fee2e2', borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5' }}>
                      <Text style={{ color: '#dc2626', textAlign: 'center', fontWeight: '600', fontSize: 14 }}>Listeleme hatası oluştu.</Text>
                    </View>;
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
                <Ionicons name="calendar-outline" size={24} color="#3b82f6" />
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
        // Electrical için electrical details step, diğerleri için notes step
        if (selectedService === 'elektrik-elektronik') {
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Elektrik Arıza Detayları</Text>
              <Text style={styles.stepDescription}>
                Elektrik arızası hakkında detaylı bilgi verin
              </Text>
              
              <Text style={styles.inputLabel}>Elektrik Sistemi Tipi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {electricalSystems.map((system) => (
                  <TouchableOpacity
                    key={system.id}
                    style={[
                      styles.serviceCard,
                      electricalSystemType === system.id && styles.serviceCardSelected,
                      { marginRight: 12 }
                    ]}
                    onPress={() => setElectricalSystemType(system.id)}
                  >
                    <MaterialCommunityIcons
                      name={system.icon as any}
                      size={24}
                      color={electricalSystemType === system.id ? '#fff' : '#0066cc'}
                    />
                    <Text
                      style={[
                        styles.serviceName,
                        { fontSize: 12, marginTop: 8 },
                        electricalSystemType === system.id && styles.serviceNameSelected,
                      ]}
                    >
                      {system.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Problem Tipi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {electricalProblems.map((problem) => (
                  <TouchableOpacity
                    key={problem.id}
                    style={[
                      styles.timeSlot,
                      electricalProblemType === problem.id && styles.timeSlotSelected,
                    ]}
                    onPress={() => setElectricalProblemType(problem.id)}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        electricalProblemType === problem.id && styles.timeSlotTextSelected,
                      ]}
                    >
                      {problem.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Son Çalışma Durumu (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Son çalıştığı durumu belirtin..."
                value={lastWorkingCondition}
                onChangeText={setLastWorkingCondition}
              />

              <View style={styles.phoneShareContainer}>
                <Text style={styles.phoneShareText}>Tekrarlayan arıza</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={isRecurring ? '#3b82f6' : '#ffffff'}
                  ios_backgroundColor="#e2e8f0"
                />
              </View>

              <View style={styles.phoneShareContainer}>
                <Text style={styles.phoneShareText}>Acil durum</Text>
                <Switch
                  value={electricalUrgencyLevel === 'acil'}
                  onValueChange={(value) => setElectricalUrgencyLevel(value ? 'acil' : 'normal')}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={electricalUrgencyLevel === 'acil' ? '#3b82f6' : '#ffffff'}
                  ios_backgroundColor="#e2e8f0"
                />
              </View>
            </View>
          );
        } else {
          // Notlar step for non-electrical
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
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={sharePhone ? '#3b82f6' : '#ffffff'}
                  ios_backgroundColor="#e2e8f0"
                />
              </View>
            </View>
          );
        }

      case 6:
        // Notes step for electrical
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
                trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                thumbColor={sharePhone ? '#3b82f6' : '#ffffff'}
                ios_backgroundColor="#e2e8f0"
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
            <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bakım Planla</Text>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelButton}
          >
            <Ionicons name="close" size={24} color="#ef4444" />
          </TouchableOpacity>
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
              style={[styles.footerButton, { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0' }]}
              onPress={handleBackButton}
            >
              <Ionicons name="arrow-back" size={20} color="#3b82f6" />
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
                  {(step === 5 && selectedService !== 'elektrik-elektronik') || step === 6 ? 'Randevu Oluştur' : 'İleri'}
                </Text>
                {((step === 5 && selectedService !== 'elektrik-elektronik') || step === 6) ? null : (
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: '#1e293b',
    flex: 1,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  stepIndicatorContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stepIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  stepIndicatorActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  stepIndicatorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepIndicatorLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
    marginHorizontal: 6,
  },
  stepIndicatorLineCompleted: {
    backgroundColor: '#10b981',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  vehiclesList: {
    maxHeight: 350,
  },
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  vehicleCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  vehicleInfo: {
    flex: 1,
    padding: 16,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 18,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  serviceCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginRight: '2%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceCardRight: {
    marginRight: 0,
  },
  serviceCardSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  serviceName: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 18,
  },
  serviceNameSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  timeContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: '#0f172a',
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weekDay: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emptyDay: {
    opacity: 0,
  },
  selectedDay: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  dayText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  availableSlotsContainer: {
    marginTop: 20,
  },
  availableSlotsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 12,
  },
  timeSlotSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  notesContainer: {
    marginBottom: 20,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  phoneShareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  phoneShareText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    flex: 1,
  },
  footerContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButtonText: {
    color: '#3b82f6',
  },
  masterCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  masterCardDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  availabilityContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  addVehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default MaintenancePlanScreen; 