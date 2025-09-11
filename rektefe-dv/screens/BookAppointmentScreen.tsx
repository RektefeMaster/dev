import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '../constants/config';
import LocationService, { UserLocation } from '../services/locationService';

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

  // FaultReport'dan gelip gelmediğini kontrol et
  useEffect(() => {
    if (faultReportId) {
      setIsFromFaultReport(true);
      // FaultReport bilgilerini getir
      fetchFaultReportData();
    }
  }, [faultReportId]);

  // mechanicId yoksa usta seçim ekranına yönlendir (sadece FaultReport'dan gelmiyorsa)
  useEffect(() => {
    if (!mechanicId && !isFromFaultReport) {
      Alert.alert(
        'Usta Seçimi Gerekli',
        'Randevu almak için önce bir usta seçmelisiniz.',
        [
          {
            text: 'Usta Ara',
            onPress: () => navigation.navigate('MechanicSearch')
          },
          {
            text: 'Geri Dön',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [mechanicId, navigation, isFromFaultReport]);

  const fetchFaultReportData = async () => {
    if (!faultReportId || !token) return;
    
    try {
      const response = await fetch(`${API_URL}/fault-reports/${faultReportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setFaultReportData(data.data);
          // Otomatik doldur
          setServiceType(data.data.serviceCategory || preselectedServiceType);
          setDescription(data.data.faultDescription || preselectedDescription);
        }
      }
    } catch (error) {
      console.error('FaultReport verisi getirme hatası:', error);
    }
  };

  // Araçları getir
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!token) return;
      
      setLoadingVehicles(true);
      try {
        const response = await fetch(`${API_URL}/vehicles`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setVehicles(data.data);
          }
        }
      } catch (error) {
        console.error('Araçlar yüklenirken hata:', error);
      } finally {
        setLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, [token]);

  // Konum bilgisini al
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const locationService = LocationService.getInstance();
      const location = await locationService.getCurrentLocation();
      
      if (location) {
        setCurrentLocation(location);
        console.log('📍 BookAppointmentScreen: Konum alındı:', location);
      } else {
        console.log('📍 BookAppointmentScreen: Konum alınamadı');
      }
    } catch (error) {
      console.error('BookAppointmentScreen: Konum alma hatası:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Sayfa yüklendiğinde konum al
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const [serviceType, setServiceType] = useState(preselectedServiceType || '');
  const [selectedVehicle, setSelectedVehicle] = useState(preselectedVehicleId || '');
  const [vehicles, setVehicles] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [timeSlot, setTimeSlot] = useState('');
  const [description, setDescription] = useState(preselectedDescription || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  
  // FaultReport'dan gelen bilgiler için
  const [isFromFaultReport, setIsFromFaultReport] = useState(false);
  const [faultReportData, setFaultReportData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const services = [
    { id: 'agir-bakim', title: 'Ağır Bakım', icon: 'wrench', color: '#007AFF' },
    { id: 'genel-bakim', title: 'Genel Bakım', icon: 'tools', color: '#34C759' },
    { id: 'alt-takim', title: 'Alt Takım', icon: 'cog', color: '#FF9500' },
    { id: 'ust-takim', title: 'Üst Takım', icon: 'nut', color: '#AF52DE' },
    { id: 'kaporta-boya', title: 'Kaporta & Boya', icon: 'spray', color: '#FF3B30' },
    { id: 'elektrik-elektronik', title: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: '#FFCC00' },
    { id: 'yedek-parca', title: 'Yedek Parça', icon: 'car-wash', color: '#5856D6' },
    { id: 'lastik', title: 'Lastik Servisi', icon: 'tire', color: '#FF6B35' },
    { id: 'egzoz-emisyon', title: 'Egzoz & Emisyon', icon: 'smoke', color: '#8E8E93' },
    { id: 'ekspertiz', title: 'Ekspertiz', icon: 'magnify', color: '#5AC8FA' },
    { id: 'sigorta-kasko', title: 'Sigorta & Kasko', icon: 'shield-check', color: '#4CD964' },
    { id: 'arac-yikama', title: 'Araç Yıkama', icon: 'car-wash', color: '#007AFF' },
  ];

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const handleBookAppointment = async () => {
    
    if (!selectedVehicle) {
      Alert.alert('Hata', 'Lütfen bir araç seçin');
      return;
    }

    if (!serviceType.trim()) {
      Alert.alert('Hata', 'Lütfen hizmet türünü seçin');
      return;
    }

    if (!timeSlot) {
      Alert.alert('Hata', 'Lütfen saat seçin');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Hata', 'Açıklama en az 10 karakter olmalıdır');
      return;
    }

    // mechanicId kontrolü
    const processedMechanicId = typeof mechanicId === 'string' 
      ? mechanicId 
      : mechanicId?._id || mechanicId;

    if (!processedMechanicId) {
      Alert.alert('Hata', 'Usta bilgisi bulunamadı. Lütfen tekrar deneyin.');
      return;
    }

    try {
      setLoading(true);
      
      // Tarihi doğru formatta hazırla
      const appointmentDateObj = new Date(appointmentDate);
      appointmentDateObj.setHours(0, 0, 0, 0);
      
      // Debug: Gönderilecek veriyi logla
      const requestBody = {
        userId: userId,
        mechanicId: processedMechanicId,
        vehicleId: selectedVehicle,
        serviceType: serviceType.toLowerCase().replace(/\s+/g, '-'),
        appointmentDate: appointmentDateObj.toISOString(),
        timeSlot,
        description,
        faultReportId: faultReportId || undefined,
        // Fiyat bilgisi varsa gönder
        ...(price && {
          quotedPrice: price,
          price: price,
          finalPrice: price,
          priceSource: 'fault_report_quote'
        }),
        // Location bilgisi varsa gönder, yoksa gönderme
        ...(currentLocation && {
          location: {
            coordinates: [currentLocation.longitude, currentLocation.latitude],
            address: 'Konum bilgisi mevcut',
            city: 'Malatya',
            district: 'Battalgazi',
            neighborhood: 'Merkez'
          }
        })
      };
      
      console.log('📤 BookAppointmentScreen: Gönderilecek veri:', requestBody);
      
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 BookAppointmentScreen: API Yanıtı:', response.status, response.statusText);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ BookAppointmentScreen: Başarılı yanıt:', responseData);
        
        Alert.alert(
          '🎉 Randevu Başarıyla Oluşturuldu!',
          'Randevu talebiniz gönderildi. Usta onayı bekleniyor.\n\n💡 Randevunuzu "Randevular" kısmında takip edebilirsiniz.',
          [
            {
              text: 'Ana Sayfaya Git',
              onPress: () => {
                // Otomatik olarak Main (TabNavigator) → Home'a yönlendir
                navigation.navigate('Main', { screen: 'MainTabs' });
              }
            }
          ]
        );
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Sunucu hatası' }));
        console.error('❌ BookAppointmentScreen: API Hatası:', response.status, errorData);
        
        let errorMessage = 'Randevu oluşturulamadı';
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (response.status === 401) {
          errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
        } else if (response.status === 400) {
          errorMessage = 'Gönderilen veriler hatalı. Lütfen kontrol edin.';
        } else if (response.status >= 500) {
          errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
        }
        
        Alert.alert('Hata', errorMessage);
      }
    } catch (error: any) {
      console.error('❌ BookAppointmentScreen: Network Hatası:', error);
      
      let errorMessage = 'Randevu oluşturulurken bir hata oluştu';
      
      if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
        errorMessage = 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Bağlantı zaman aşımı. Lütfen tekrar deneyin.';
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Sunucuya bağlanılamıyor. Lütfen daha sonra tekrar deneyin.';
      }
      
      Alert.alert('Bağlantı Hatası', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canSubmitAppointment = () => {
    if (isFromFaultReport) {
      // FaultReport'dan geldiğinde sadece tarih ve saat gerekli
      return selectedVehicle && timeSlot;
    }
    return selectedVehicle && 
           serviceType.trim() && 
           timeSlot && 
           description.trim().length >= 10;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAppointmentDate(selectedDate);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <LinearGradient
        colors={[theme.colors.primary.main, theme.colors.secondary.main]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevu Al</Text>
        <View style={styles.backButton} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.mechanicInfo}>
          <Text style={[styles.mechanicName, { color: theme.colors.text.primary }]}>
            {mechanicName} {mechanicSurname}
          </Text>
          <Text style={[styles.mechanicSubtitle, { color: theme.colors.text.secondary }]}>
            {isFromFaultReport ? 'Kabul edilen teklif ile randevu oluşturun' : 'Usta ile randevu oluşturun'}
          </Text>
          {price && (
            <View style={[styles.priceContainer, { backgroundColor: theme.colors.success.light }]}>
              <MaterialCommunityIcons name="currency-try" size={20} color={theme.colors.success.main} />
              <Text style={[styles.priceText, { color: theme.colors.success.main }]}>
                {new Intl.NumberFormat('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                }).format(price)}
              </Text>
            </View>
          )}
        </View>

        {/* FaultReport Bilgileri */}
        {isFromFaultReport && faultReportData && (
          <View style={[styles.faultReportInfo, { backgroundColor: theme.colors.background.card }]}>
            <View style={styles.faultReportHeader}>
              <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary.main} />
              <Text style={[styles.faultReportTitle, { color: theme.colors.text.primary }]}>
                Arıza Bildirimi Bilgileri
              </Text>
            </View>
            <View style={styles.faultReportContent}>
              <View style={styles.faultReportItem}>
                <Text style={[styles.faultReportLabel, { color: theme.colors.text.secondary }]}>Araç:</Text>
                <Text style={[styles.faultReportValue, { color: theme.colors.text.primary }]}>
                  {faultReportData.vehicleId?.brand} {faultReportData.vehicleId?.modelName} - {faultReportData.vehicleId?.plateNumber}
                </Text>
              </View>
              <View style={styles.faultReportItem}>
                <Text style={[styles.faultReportLabel, { color: theme.colors.text.secondary }]}>Hizmet:</Text>
                <Text style={[styles.faultReportValue, { color: theme.colors.text.primary }]}>
                  {faultReportData.serviceCategory}
                </Text>
              </View>
              <View style={styles.faultReportItem}>
                <Text style={[styles.faultReportLabel, { color: theme.colors.text.secondary }]}>Açıklama:</Text>
                <Text style={[styles.faultReportValue, { color: theme.colors.text.primary }]}>
                  {faultReportData.faultDescription}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Araç Seçimi */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Araç Seçimi
          </Text>
          {loadingVehicles ? (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.card }]}>
              <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
                Araçlar yükleniyor...
              </Text>
            </View>
          ) : (
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
                    size={24}
                    color={selectedVehicle === vehicle._id ? '#FFFFFF' : theme.colors.primary.main}
                  />
                  <Text style={[
                    styles.vehicleText,
                    { color: selectedVehicle === vehicle._id ? '#FFFFFF' : theme.colors.text.primary }
                  ]}>
                    {vehicle.brand} {vehicle.modelName}
                  </Text>
                  <Text style={[
                    styles.vehiclePlate,
                    { color: selectedVehicle === vehicle._id ? '#FFFFFF' : theme.colors.text.secondary }
                  ]}>
                    {vehicle.plateNumber}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Hizmet Türü
            {isFromFaultReport && (
              <Text style={[styles.readonlyLabel, { color: theme.colors.text.secondary }]}> (Arıza bildiriminden)</Text>
            )}
          </Text>
          {isFromFaultReport ? (
            <View style={[styles.readonlyField, { backgroundColor: theme.colors.background.secondary }]}>
              <Text style={[styles.readonlyText, { color: theme.colors.text.primary }]}>
                {faultReportData?.serviceCategory || serviceType}
              </Text>
            </View>
          ) : (
            <View style={styles.serviceGrid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceChip,
                    serviceType === service.id && {
                      backgroundColor: service.color,
                      borderColor: service.color
                    }
                  ]}
                  onPress={() => setServiceType(service.id)}
                >
                  <MaterialCommunityIcons
                    name={service.icon as any}
                    size={20}
                    color={serviceType === service.id ? '#FFFFFF' : service.color}
                  />
                  <Text style={[
                    styles.serviceText,
                    serviceType === service.id && styles.serviceTextSelected
                  ]}>
                    {service.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Tarih
          </Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.colors.background.card }]}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary.main} />
            <Text style={[styles.dateText, { color: theme.colors.text.primary }]}>
              {appointmentDate.toLocaleDateString('tr-TR')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Saat
          </Text>
          <View style={styles.timeGrid}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  timeSlot === time && {
                    backgroundColor: theme.colors.primary.main,
                    borderColor: theme.colors.primary.main
                  }
                ]}
                onPress={() => setTimeSlot(time)}
              >
                <Text style={[
                  styles.timeText,
                  timeSlot === time && styles.timeTextSelected
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Açıklama
            {isFromFaultReport && (
              <Text style={[styles.readonlyLabel, { color: theme.colors.text.secondary }]}> (Arıza bildiriminden)</Text>
            )}
          </Text>
          {isFromFaultReport ? (
            <View style={[styles.readonlyField, { backgroundColor: theme.colors.background.secondary }]}>
              <Text style={[styles.readonlyText, { color: theme.colors.text.primary }]}>
                {faultReportData?.faultDescription || description}
              </Text>
            </View>
          ) : (
            <>
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
                // minLength is not a valid TextInput prop; validation handled separately
              />
              <View style={styles.descriptionFooter}>
                <Text style={[
                  styles.characterCount,
                  { color: description.length < 10 ? theme.colors.error.main : theme.colors.text.secondary }
                ]}>
                  {description.length}/500 karakter
                </Text>
                {description.length < 10 && description.length > 0 && (
                  <Text style={[styles.validationMessage, { color: theme.colors.error.main }]}>
                    En az 10 karakter gerekli
                  </Text>
                )}
                {description.length >= 10 && (
                  <Text style={[styles.validationMessage, { color: theme.colors.success.main }]}>
                    ✓ Açıklama yeterli
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            { backgroundColor: canSubmitAppointment() ? theme.colors.primary.main : theme.colors.border.primary },
            loading && styles.bookButtonDisabled
          ]}
          onPress={handleBookAppointment}
          disabled={loading || !canSubmitAppointment()}
        >
          <Text style={styles.bookButtonText}>
            {loading ? 'Gönderiliyor...' : 'Randevu Talebi Gönder'}
          </Text>
        </TouchableOpacity>
        
        {!canSubmitAppointment() && (
          <View style={styles.validationSummary}>
            <Text style={[styles.validationSummaryText, { color: theme.colors.error.main }]}>
              {isFromFaultReport 
                ? 'Randevu oluşturmak için tarih ve saat seçin:'
                : 'Randevu oluşturmak için tüm alanları doldurun:'
              }
            </Text>
            {!selectedVehicle && (
              <Text style={[styles.validationItem, { color: theme.colors.error.main }]}>
                • Araç seçimi gerekli
              </Text>
            )}
            {!isFromFaultReport && !serviceType && (
              <Text style={[styles.validationItem, { color: theme.colors.error.main }]}>
                • Hizmet türü seçimi gerekli
              </Text>
            )}
            {!timeSlot && (
              <Text style={[styles.validationItem, { color: theme.colors.error.main }]}>
                • Saat seçimi gerekli
              </Text>
            )}
            {!isFromFaultReport && description.length < 10 && (
              <Text style={[styles.validationItem, { color: theme.colors.error.main }]}>
                • Açıklama en az 10 karakter olmalı
              </Text>
            )}
          </View>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={appointmentDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  mechanicInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  mechanicName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  mechanicSubtitle: {
    fontSize: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
  },
  serviceText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  serviceTextSelected: {
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  timeTextSelected: {
    color: '#FFFFFF',
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
  },
  bookButton: {
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  descriptionFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  validationMessage: {
    fontSize: 12,
    fontWeight: '500',
  },
  validationSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  validationSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  validationItem: {
    fontSize: 14,
    marginLeft: 16,
    marginBottom: 8,
  },
  // FaultReport styles
  faultReportInfo: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faultReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  faultReportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  faultReportContent: {
    gap: 8,
  },
  faultReportItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  faultReportLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 80,
    marginRight: 8,
  },
  faultReportValue: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  // Readonly field styles
  readonlyLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  readonlyField: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readonlyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Vehicle selection styles
  loadingContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  vehicleScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  vehicleCard: {
    width: 140,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  vehiclePlate: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default BookAppointmentScreen;
