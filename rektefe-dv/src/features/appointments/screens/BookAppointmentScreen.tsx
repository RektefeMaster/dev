import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '@/constants/config';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { ServiceType } from '@/shared/types/common';
import { analytics } from '@/shared/utils/analytics';

const { width } = Dimensions.get('window');

interface MechanicService {
  id: string;
  name: string;
  description?: string;
  estimatedDuration?: number;
  price?: number;
}

interface WorkingHours {
  day: string;
  isOpen: boolean;
  startTime?: string;
  endTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  isBreak?: boolean;
}

type BookAppointmentScreenProps = {
  route: {
    params: {
      mechanicId: string;
      mechanicName: string;
      mechanicSurname: string;
      vehicleId?: string;
      serviceType?: string;
      description?: string;
      faultReportId?: string;
      price?: number;
    };
  };
  navigation: any;
};

const BookAppointmentScreen = ({ route, navigation }: BookAppointmentScreenProps) => {
  const { theme } = useTheme();
  const { token, userId } = useAuth();
  const { 
    mechanicId, 
    mechanicName, 
    mechanicSurname, 
    vehicleId: preselectedVehicleId, 
    serviceType: preselectedServiceType, 
    description: preselectedDescription,
    faultReportId,
    price
  } = route.params || {};

  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mechanicServices, setMechanicServices] = useState<MechanicService[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedService, setSelectedService] = useState(preselectedServiceType || '');
  const [selectedVehicle, setSelectedVehicle] = useState(preselectedVehicleId || '');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [description, setDescription] = useState(preselectedDescription || '');
  const [odometerInput, setOdometerInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const selectedVehicleData = useMemo(
    () => vehicles.find((vehicle: any) => vehicle._id === selectedVehicle),
    [vehicles, selectedVehicle]
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentStep === 4) {
      analytics.track('odo_view', { screen: 'appointment_form', mechanicId });
    }
  }, [currentStep, mechanicId]);

  useEffect(() => {
    if (selectedVehicleData?.odometerEstimate?.displayKm) {
      setOdometerInput(String(Math.round(selectedVehicleData.odometerEstimate.displayKm)));
    } else if (!selectedVehicleData) {
      setOdometerInput('');
    }
  }, [selectedVehicleData]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Arıza bildirimi için randevu oluşturuluyorsa sadece gerekli verileri yükle
      if (faultReportId) {
        await Promise.all([
          loadWorkingHours(),
          loadAvailableTimeSlots()
        ]);
        // Arıza bildirimi için direkt 3. adıma geç (tarih/saat seçimi)
        setCurrentStep(3);
      } else {
        // Normal randevu için tüm verileri yükle
        await Promise.all([
          loadMechanicServices(),
          loadWorkingHours(),
          loadVehicles(),
          loadAvailableTimeSlots()
        ]);
      }
    } catch (error) {
      console.error('Initial data load error:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadMechanicServices = async () => {
    try {
      // Fallback services based on mechanic type
      const fallbackServices: MechanicService[] = [
        { id: 'agir-bakim', name: 'Ağır Bakım', estimatedDuration: 240 },
        { id: 'genel-bakim', name: 'Genel Bakım', estimatedDuration: 120 },
        { id: 'alt-takim', name: 'Alt Takım', estimatedDuration: 90 },
        { id: 'ust-takim', name: 'Üst Takım', estimatedDuration: 90 },
        { id: 'kaporta-boya', name: 'Kaporta & Boya', estimatedDuration: 480 },
        { id: 'elektrik-elektronik', name: 'Elektrik-Elektronik', estimatedDuration: 120 },
      ];
      setMechanicServices(fallbackServices);
    } catch (error) {
      console.error('Services load error:', error);
    }
  };

  const loadWorkingHours = async () => {
    try {
      // Fallback working hours
      const fallbackHours: WorkingHours[] = [
        { day: 'Pazartesi', isOpen: true, startTime: '08:00', endTime: '18:00', breakStartTime: '12:00', breakEndTime: '13:00' },
        { day: 'Salı', isOpen: true, startTime: '08:00', endTime: '18:00', breakStartTime: '12:00', breakEndTime: '13:00' },
        { day: 'Çarşamba', isOpen: true, startTime: '08:00', endTime: '18:00', breakStartTime: '12:00', breakEndTime: '13:00' },
        { day: 'Perşembe', isOpen: true, startTime: '08:00', endTime: '18:00', breakStartTime: '12:00', breakEndTime: '13:00' },
        { day: 'Cuma', isOpen: true, startTime: '08:00', endTime: '18:00', breakStartTime: '12:00', breakEndTime: '13:00' },
        { day: 'Cumartesi', isOpen: true, startTime: '09:00', endTime: '16:00' },
        { day: 'Pazar', isOpen: false },
      ];
      setWorkingHours(fallbackHours);
    } catch (error) {
      console.error('Working hours load error:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const { data } = await withErrorHandling(
        () => apiService.getVehicles(),
        { showErrorAlert: false }
      );

      if (data && (data as any).success) {
        setVehicles((data as any).data || []);
      }
    } catch (error) {
      console.error('Vehicles load error:', error);
    }
  };

  const loadAvailableTimeSlots = async () => {
    try {
      // Generate fallback time slots
      generateFallbackTimeSlots();
    } catch (error) {
      console.error('Time slots load error:', error);
      generateFallbackTimeSlots();
    }
  };

  const generateFallbackTimeSlots = () => {
    const dayOfWeek = selectedDate.getDay();
    const workingDay = workingHours.find(day => 
      day.day === ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][dayOfWeek]
    );

    if (!workingDay || !workingDay.isOpen) {
      setAvailableTimeSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const startHour = parseInt(workingDay.startTime?.split(':')[0] || '8');
    const endHour = parseInt(workingDay.endTime?.split(':')[0] || '18');
    const breakStart = parseInt(workingDay.breakStartTime?.split(':')[0] || '12');
    const breakEnd = parseInt(workingDay.breakEndTime?.split(':')[0] || '13');

    for (let hour = startHour; hour < endHour; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const isBreak = hour >= breakStart && hour < breakEnd;
      
      slots.push({
        time: timeStr,
        available: !isBreak && Math.random() > 0.3, // Random availability
        isBreak
      });
    }

    setAvailableTimeSlots(slots);
  };

  useEffect(() => {
    loadAvailableTimeSlots();
  }, [selectedDate, workingHours]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setSelectedTimeSlot(''); // Reset time slot when date changes
    }
  };

  const handleBookAppointment = async () => {
    // Arıza bildirimi için validation
    if (faultReportId) {
      if (!selectedTimeSlot) {
        Alert.alert('Hata', 'Lütfen bir saat seçin');
        return;
      }
    } else {
      // Normal randevu için validation
      if (!selectedVehicle) {
        Alert.alert('Hata', 'Lütfen bir araç seçin');
        return;
      }

      if (!selectedService) {
        Alert.alert('Hata', 'Lütfen bir hizmet seçin');
        return;
      }

      if (!selectedTimeSlot) {
        Alert.alert('Hata', 'Lütfen bir saat seçin');
        return;
      }

      if (!description.trim() || description.trim().length < 10) {
        Alert.alert('Hata', 'Açıklama en az 10 karakter olmalıdır');
        return;
      }
    }

    if (!odometerInput) {
      Alert.alert('Hata', 'Kilometre bilgisi zorunludur.');
      return;
    }
    try {
      setSubmitting(true);
      
      let response;
      
      if (faultReportId) {
        // Arıza bildirimi için özel endpoint kullan
        const appointmentData = {
          faultReportId: faultReportId,
          appointmentDate: selectedDate.toISOString(),
          timeSlot: selectedTimeSlot,
          ...(odometerInput
            ? {
                odometer: {
                  km: Number(odometerInput),
                  timestampUtc: new Date().toISOString(),
                  source: 'user_manual',
                  evidenceType: 'none',
                },
              }
            : {}),
        };

        try {
          response = await withErrorHandling(
            () => apiService.post(`/fault-reports/${faultReportId}/create-appointment`, appointmentData),
            { showErrorAlert: false }
          );
        } catch (error) {
          console.log('⚠️ Özel endpoint başarısız, normal endpoint deneniyor');
          // Fallback: Normal endpoint kullan
          const normalAppointmentData = {
            userId: userId,
            mechanicId: mechanicId === 'temp' ? 'unknown' : mechanicId,
            vehicleId: preselectedVehicleId,
            serviceType: preselectedServiceType as ServiceType,
            appointmentDate: selectedDate,
            timeSlot: selectedTimeSlot,
            description: preselectedDescription,
            faultReportId: faultReportId,
            location: {
              latitude: 0,
              longitude: 0,
              address: 'Konum belirtilmemiş'
            },
            ...(price && {
              quotedPrice: price,
              price: price,
              finalPrice: price,
              priceSource: 'fault_report_quote'
            }),
            ...(odometerInput
              ? {
                  odometer: {
                    km: Number(odometerInput),
                    timestampUtc: new Date().toISOString(),
                    source: 'user_manual',
                    evidenceType: 'none',
                  },
                }
              : {}),
          };

          response = await withErrorHandling(
            () => apiService.createAppointment(normalAppointmentData),
            { showErrorAlert: false }
          );
        }
      } else {
        // Normal randevu için mevcut endpoint kullan
        const appointmentData = {
          userId: userId,
          mechanicId: mechanicId,
          vehicleId: selectedVehicle,
          serviceType: selectedService as ServiceType,
          appointmentDate: selectedDate,
          timeSlot: selectedTimeSlot,
          description: description.trim(),
          location: {
            latitude: 0, // TODO: Gerçek konum bilgisi ekle
            longitude: 0,
            address: 'Konum belirtilmemiş'
          },
          ...(odometerInput
            ? {
                odometer: {
                  km: Number(odometerInput),
                  timestampUtc: new Date().toISOString(),
                  source: 'user_manual',
                  evidenceType: 'none',
                },
              }
            : {}),
        };

        response = await withErrorHandling(
          () => apiService.createAppointment(appointmentData),
          { showErrorAlert: false }
        );
      }

      const { data } = response;

      if (data && (data as any).success) {
        analytics.track('odo_update_submit', {
          vehicleId: selectedVehicle || preselectedVehicleId,
          offline: false,
          source: 'appointment_booking',
          km: Number(odometerInput) || undefined,
        });
        Alert.alert(
          'Başarılı!',
          'Randevu talebiniz başarıyla gönderildi. Usta onayı bekleniyor.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Hata', (data as any).message || 'Randevu oluşturulamadı');
      }
    } catch (error) {
      console.error('Appointment creation error:', error);
      Alert.alert('Hata', 'Randevu oluşturulurken bir hata oluştu');
      analytics.track('odo_update_reject_general', {
        vehicleId: selectedVehicle || preselectedVehicleId,
        context: 'appointment_booking',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedVehicle;
      case 2:
        return selectedService;
      case 3:
        return selectedTimeSlot;
      case 4:
        return description.trim().length >= 10 && !!odometerInput;
      default:
        return false;
    }
  };

  const getCurrentDayWorkingHours = () => {
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return workingHours.find(day => day.day === dayNames[dayOfWeek]);
  };

  const renderServiceCard = (service: MechanicService) => (
    <TouchableOpacity
      key={service.id}
      style={[
        styles.serviceCard,
        { backgroundColor: theme.colors.background.card },
        selectedService === service.id && {
          backgroundColor: theme.colors.primary.main,
          borderColor: theme.colors.primary.main
        }
      ]}
      onPress={() => setSelectedService(service.id)}
    >
      <View style={styles.serviceHeader}>
        <MaterialCommunityIcons
          name="wrench"
          size={24}
          color={selectedService === service.id ? '#fff' : theme.colors.primary.main}
        />
        <Text style={[
          styles.serviceName,
          { color: selectedService === service.id ? '#fff' : theme.colors.text.primary }
        ]}>
          {service.name}
        </Text>
      </View>
      {service.description && (
        <Text style={[
          styles.serviceDescription,
          { color: selectedService === service.id ? 'rgba(255,255,255,0.8)' : theme.colors.text.secondary }
        ]}>
          {service.description}
        </Text>
      )}
      <View style={styles.serviceFooter}>
        {service.estimatedDuration && (
          <View style={styles.serviceInfo}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color={selectedService === service.id ? '#fff' : theme.colors.text.secondary}
            />
            <Text style={[
              styles.serviceInfoText,
              { color: selectedService === service.id ? '#fff' : theme.colors.text.secondary }
            ]}>
              ~{service.estimatedDuration} dk
            </Text>
          </View>
        )}
        {service.price && (
          <View style={styles.serviceInfo}>
            <MaterialCommunityIcons
              name="currency-try"
              size={16}
              color={selectedService === service.id ? '#fff' : theme.colors.success.main}
            />
            <Text style={[
              styles.serviceInfoText,
              { color: selectedService === service.id ? '#fff' : theme.colors.success.main }
            ]}>
              {service.price}₺
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTimeSlot = (slot: TimeSlot) => (
    <TouchableOpacity
      key={slot.time}
      style={[
        styles.timeSlotCard,
        { backgroundColor: theme.colors.background.card },
        selectedTimeSlot === slot.time && {
          backgroundColor: theme.colors.primary.main,
          borderColor: theme.colors.primary.main
        },
        !slot.available && {
          backgroundColor: theme.colors.background.secondary,
          opacity: 0.5
        },
        slot.isBreak && {
          backgroundColor: theme.colors.warning.light,
          borderColor: theme.colors.warning.main
        }
      ]}
      onPress={() => slot.available && !slot.isBreak && setSelectedTimeSlot(slot.time)}
      disabled={!slot.available || slot.isBreak}
    >
      <Text style={[
        styles.timeSlotText,
        { color: selectedTimeSlot === slot.time ? '#fff' : theme.colors.text.primary },
        !slot.available && { color: theme.colors.text.tertiary },
        slot.isBreak && { color: theme.colors.warning.main }
      ]}>
        {slot.time}
      </Text>
      {slot.isBreak && (
        <Text style={[styles.breakText, { color: theme.colors.warning.main }]}>
          Mola
        </Text>
      )}
      {!slot.available && !slot.isBreak && (
        <Text style={[styles.unavailableText, { color: theme.colors.text.tertiary }]}>
          Dolu
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            { backgroundColor: currentStep >= step ? theme.colors.primary.main : theme.colors.background.secondary },
            { borderColor: currentStep >= step ? theme.colors.primary.main : theme.colors.border.primary }
          ]}>
            <Text style={[
              styles.stepText,
              { color: currentStep >= step ? '#fff' : theme.colors.text.secondary }
            ]}>
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              { backgroundColor: currentStep > step ? theme.colors.primary.main : theme.colors.border.primary }
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderWorkingHoursInfo = () => {
    const todayHours = getCurrentDayWorkingHours();
    
    if (!todayHours || !todayHours.isOpen) {
      return (
        <View style={[styles.workingHoursCard, { backgroundColor: theme.colors.error.light }]}>
          <MaterialCommunityIcons name="close-circle" size={24} color={theme.colors.error.main} />
          <Text style={[styles.workingHoursText, { color: theme.colors.error.main }]}>
            Bu gün kapalı
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.workingHoursCard, { backgroundColor: theme.colors.success.light }]}>
        <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.success.main} />
        <View style={styles.workingHoursInfo}>
          <Text style={[styles.workingHoursText, { color: theme.colors.success.main }]}>
            Açık: {todayHours.startTime} - {todayHours.endTime}
          </Text>
          {todayHours.breakStartTime && (
            <Text style={[styles.breakHoursText, { color: theme.colors.warning.main }]}>
              Mola: {todayHours.breakStartTime} - {todayHours.breakEndTime}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary.main} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
            Usta bilgileri yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary.main} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary.main, theme.colors.primary.dark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {faultReportId ? 'Arıza Randevusu' : 'Randevu Al'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {mechanicName} {mechanicSurname}
            {faultReportId && price && ` • ₺${price.toLocaleString('tr-TR')}`}
          </Text>
        </View>
        <View style={styles.backButton} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step Indicator - Arıza bildirimi için gizle */}
        {!faultReportId && renderStepIndicator()}

        {/* Arıza Bildirimi Bilgi Kartı */}
        {faultReportId && (
          <View style={[styles.faultReportInfo, { backgroundColor: theme.colors.info.light, borderColor: theme.colors.info.main }]}>
            <MaterialCommunityIcons name="information" size={24} color={theme.colors.info.main} />
            <View style={styles.faultReportInfoContent}>
              <Text style={[styles.faultReportInfoTitle, { color: theme.colors.info.main }]}>
                Arıza Bildirimi Randevusu
              </Text>
              <Text style={[styles.faultReportInfoText, { color: theme.colors.text.secondary }]}>
                Araç, hizmet ve açıklama bilgileri arıza bildiriminizden alınmıştır. Sadece tarih ve saat seçmeniz yeterlidir.
              </Text>
              {price && (
                <Text style={[styles.faultReportInfoPrice, { color: theme.colors.success.main }]}>
                  Teklif Edilen Fiyat: ₺{price.toLocaleString('tr-TR')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Step 1: Vehicle Selection */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
              Araç Seçimi
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
              Hangi aracınız için randevu almak istiyorsunuz?
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
              {vehicles.map((vehicle: any) => (
                <TouchableOpacity
                  key={vehicle._id}
                  style={[
                    styles.vehicleCard,
                    { backgroundColor: theme.colors.background.card },
                    selectedVehicle === vehicle._id && {
                      backgroundColor: theme.colors.primary.main,
                      borderColor: theme.colors.primary.main
                    }
                  ]}
                  onPress={() => setSelectedVehicle(vehicle._id)}
                >
                  <MaterialCommunityIcons
                    name="car"
                    size={32}
                    color={selectedVehicle === vehicle._id ? '#fff' : theme.colors.primary.main}
                  />
                  <Text style={[
                    styles.vehicleBrand,
                    { color: selectedVehicle === vehicle._id ? '#fff' : theme.colors.text.primary }
                  ]}>
                    {vehicle.brand} {vehicle.modelName}
                  </Text>
                  <Text style={[
                    styles.vehiclePlate,
                    { color: selectedVehicle === vehicle._id ? '#fff' : theme.colors.text.secondary }
                  ]}>
                    {vehicle.plateNumber}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedVehicleData?.odometerEstimate && (
              <View style={[styles.odometerPreviewCard, { backgroundColor: theme.colors.background.card }]}>
                <Text style={[styles.odometerPreviewLabel, { color: theme.colors.text.secondary }]}>
                  Tahmini Kilometre
                </Text>
                <Text style={[styles.odometerPreviewValue, { color: theme.colors.text.primary }]}>
                  ≈ {Math.round(selectedVehicleData.odometerEstimate.displayKm).toLocaleString('tr-TR')} km
                </Text>
                <Text style={[styles.odometerPreviewMeta, { color: theme.colors.text.secondary }]}>
                  Son doğrulama:{' '}
                  {new Date(selectedVehicleData.odometerEstimate.lastTrueTsUtc).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Service Selection */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
              Hizmet Seçimi
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
              Hangi hizmeti almak istiyorsunuz?
            </Text>
            
            <View style={styles.servicesGrid}>
              {mechanicServices.map(renderServiceCard)}
            </View>
          </View>
        )}

        {/* Step 3: Date & Time Selection */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
              Tarih & Saat Seçimi
            </Text>
            
            {/* Working Hours Info */}
            {renderWorkingHoursInfo()}
            
            {/* Date Selection */}
            <View style={styles.dateSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>
                Tarih Seçin
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.colors.background.card }]}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary.main} />
                <Text style={[styles.dateText, { color: theme.colors.text.primary }]}>
                  {selectedDate.toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time Slots */}
            <View style={styles.timeSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>
                Müsait Saatler
              </Text>
              <View style={styles.timeSlotsGrid}>
                {availableTimeSlots.map(renderTimeSlot)}
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Description */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
              Randevu Detayları
            </Text>
            <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
              Randevunuz hakkında detayları belirtin
            </Text>

            <View style={styles.odometerInputContainer}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>
                Gösterge Kilometresi
              </Text>
              <View
                style={[
                  styles.odometerInputWrapper,
                  {
                    backgroundColor: theme.colors.background.card,
                    borderColor: theme.colors.border.primary,
                  },
                ]}
              >
                <TextInput
                  style={[styles.odometerInput, { color: theme.colors.text.primary }]}
                  keyboardType="number-pad"
                  value={odometerInput}
                  onChangeText={(text) => setOdometerInput(text.replace(/[^\d]/g, ''))}
                  placeholder="Örn. 128450"
                  placeholderTextColor={theme.colors.text.secondary}
                />
                <Text style={[styles.odometerUnit, { color: theme.colors.text.secondary }]}>km</Text>
              </View>
              <Text style={[styles.odometerHelper, { color: theme.colors.text.secondary }]}>
                Tahmini değer: ≈{' '}
                {selectedVehicleData?.odometerEstimate
                  ? Math.round(selectedVehicleData.odometerEstimate.displayKm).toLocaleString('tr-TR')
                  : '-'}{' '}
                km
              </Text>
            </View>
            
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>
                Açıklama
              </Text>
              <TextInput
                style={[styles.descriptionInput, { 
                  backgroundColor: theme.colors.background.card,
                  color: theme.colors.text.primary,
                  borderColor: description.length < 10 ? theme.colors.error.main : theme.colors.border.primary
                }]}
                placeholder="Randevu detaylarını açıklayın... (en az 10 karakter)"
                placeholderTextColor={theme.colors.text.secondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.characterCount}>
                <Text style={[
                  styles.characterCountText,
                  { color: description.length < 10 ? theme.colors.error.main : theme.colors.text.secondary }
                ]}>
                  {description.length}/500 karakter
                </Text>
                {description.length < 10 && description.length > 0 && (
                  <Text style={[styles.validationMessage, { color: theme.colors.error.main }]}>
                    En az 10 karakter gerekli
                  </Text>
                )}
              </View>
            </View>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.background.card }]}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text.primary }]}>
                Randevu Özeti
              </Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Usta:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                  {mechanicName} {mechanicSurname}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Hizmet:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                  {mechanicServices.find(s => s.id === selectedService)?.name}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Tarih:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                  {selectedDate.toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.text.secondary }]}>Saat:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text.primary }]}>
                  {selectedTimeSlot}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.backNavButton, { borderColor: theme.colors.primary.main }]}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={[styles.navButtonText, { color: theme.colors.primary.main }]}>
                Geri
              </Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 4 ? (
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.nextButton,
                { backgroundColor: canProceedToNextStep() ? theme.colors.primary.main : theme.colors.background.secondary }
              ]}
              onPress={() => canProceedToNextStep() && setCurrentStep(currentStep + 1)}
              disabled={!canProceedToNextStep()}
            >
              <Text style={[
                styles.navButtonText,
                { color: canProceedToNextStep() ? '#fff' : theme.colors.text.tertiary }
              ]}>
                İleri
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.navButton,
                styles.submitButton,
                { backgroundColor: canProceedToNextStep() ? theme.colors.success.main : theme.colors.background.secondary }
              ]}
              onPress={handleBookAppointment}
              disabled={!canProceedToNextStep() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[
                  styles.navButtonText,
                  { color: canProceedToNextStep() ? '#fff' : theme.colors.text.tertiary }
                ]}>
                  Randevu Oluştur
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  faultReportInfo: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  faultReportInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  faultReportInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  faultReportInfoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  faultReportInfoPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  vehicleScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  odometerPreviewCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  odometerPreviewLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  odometerPreviewValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
  },
  odometerPreviewMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  vehicleCard: {
    width: 160,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleBrand: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  vehiclePlate: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  serviceDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfoText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  workingHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  workingHoursInfo: {
    marginLeft: 12,
  },
  workingHoursText: {
    fontSize: 16,
    fontWeight: '600',
  },
  breakHoursText: {
    fontSize: 14,
    marginTop: 2,
  },
  dateSection: {
    marginBottom: 24,
  },
  timeSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlotCard: {
    width: (width - 76) / 3,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
  },
  breakText: {
    fontSize: 12,
    marginTop: 4,
  },
  unavailableText: {
    fontSize: 12,
    marginTop: 4,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  odometerInputContainer: {
    marginTop: 20,
    marginBottom: 12,
  },
  odometerInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  odometerInput: {
    flex: 1,
    fontSize: 16,
  },
  odometerUnit: {
    marginLeft: 8,
    fontWeight: '600',
  },
  odometerHelper: {
    marginTop: 8,
    fontSize: 12,
  },
  characterCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  validationMessage: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNavButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  nextButton: {
    // backgroundColor set dynamically
  },
  submitButton: {
    // backgroundColor set dynamically
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookAppointmentScreen;