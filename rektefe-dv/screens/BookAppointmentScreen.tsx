import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '../constants/config';

type BookAppointmentScreenProps = {
  route: {
    params: {
      mechanicId: string;
      mechanicName: string;
      mechanicSurname: string;
    };
  };
  navigation: any;
};

const BookAppointmentScreen = ({ route, navigation }: BookAppointmentScreenProps) => {
  const { theme } = useTheme();
  const { token, userId } = useAuth();
  const { mechanicId, mechanicName, mechanicSurname } = route.params || {};

  // mechanicId yoksa usta seçim ekranına yönlendir
  useEffect(() => {
    if (!mechanicId) {
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
  }, [mechanicId, navigation]);

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

  const [serviceType, setServiceType] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [timeSlot, setTimeSlot] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const services = [
    { id: 'agir-bakim', title: 'Ağır Bakım', icon: 'wrench', color: '#007AFF' },
    { id: 'genel-bakim', title: 'Genel Bakım', icon: 'tools', color: '#34C759' },
    { id: 'alt-takim', title: 'Alt Takım', icon: 'cog', color: '#FF9500' },
    { id: 'ust-takim', title: 'Üst Takım', icon: 'nut', color: '#AF52DE' },
    { id: 'kaporta-boya', title: 'Kaporta/Boya', icon: 'spray', color: '#FF3B30' },
    { id: 'elektrik-elektronik', title: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: '#FFCC00' },
    { id: 'yedek-parca', title: 'Yedek Parça', icon: 'car-wash', color: '#5856D6' },
    { id: 'lastik', title: 'Lastik', icon: 'tire', color: '#FF6B35' },
    { id: 'egzoz-emisyon', title: 'Egzoz & Emisyon', icon: 'smoke', color: '#8E8E93' },
    { id: 'ekspertiz', title: 'Ekspertiz', icon: 'magnify', color: '#5AC8FA' },
    { id: 'sigorta-kasko', title: 'Sigorta/Kasko', icon: 'shield-check', color: '#4CD964' },
    { id: 'arac-yikama', title: 'Araç Yıkama', icon: 'car-wash', color: '#007AFF' },
  ];

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const handleBookAppointment = async () => {
    console.log('🔍 BookAppointmentScreen: Randevu oluşturma başlatılıyor...');
    console.log('🔍 BookAppointmentScreen: Seçilen araç:', selectedVehicle);
    console.log('🔍 BookAppointmentScreen: Seçilen hizmet:', serviceType);
    console.log('🔍 BookAppointmentScreen: Seçilen saat:', timeSlot);
    console.log('🔍 BookAppointmentScreen: Açıklama uzunluğu:', description.length);
    
    if (!selectedVehicle) {
      console.log('❌ BookAppointmentScreen: Araç seçimi eksik');
      Alert.alert('Hata', 'Lütfen bir araç seçin');
      return;
    }

    if (!serviceType.trim()) {
      console.log('❌ BookAppointmentScreen: Hizmet türü seçimi eksik');
      Alert.alert('Hata', 'Lütfen hizmet türünü seçin');
      return;
    }

    if (!timeSlot) {
      console.log('❌ BookAppointmentScreen: Saat seçimi eksik');
      Alert.alert('Hata', 'Lütfen saat seçin');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      console.log('❌ BookAppointmentScreen: Açıklama yetersiz:', description.length, 'karakter');
      Alert.alert('Hata', 'Açıklama en az 10 karakter olmalıdır');
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
        mechanicId,
        vehicleId: selectedVehicle,
        serviceType: serviceType.toLowerCase().replace(/\s+/g, '-'),
        appointmentDate: appointmentDateObj.toISOString(),
        timeSlot,
        description
      };
      
      console.log('🔍 BookAppointmentScreen: Gönderilecek veri:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        console.log('✅ BookAppointmentScreen: Randevu başarıyla oluşturuldu!');
        console.log('✅ BookAppointmentScreen: Response status:', response.status);
        
        Alert.alert(
          '🎉 Randevu Başarıyla Oluşturuldu!',
          'Randevu talebiniz gönderildi. Usta onayı bekleniyor.\n\n💡 Randevunuzu "Randevular" kısmında takip edebilirsiniz.',
          [
            {
              text: 'Ana Sayfaya Git',
              onPress: () => {
                console.log('✅ BookAppointmentScreen: Ana sayfaya yönlendiriliyor');
                // Otomatik olarak Main (TabNavigator) → Home'a yönlendir
                navigation.navigate('Main', { screen: 'MainTabs' });
              }
            }
          ]
        );
      } else {
        const errorData = await response.json();
        console.error('❌ BookAppointmentScreen: API Hatası:', response.status, errorData);
        Alert.alert('Hata', `Randevu oluşturulamadı: ${errorData.message || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('❌ BookAppointmentScreen: Network Hatası:', error);
      Alert.alert('Hata', 'Randevu oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const canSubmitAppointment = () => {
    return selectedVehicle && 
           serviceType.trim() && 
           timeSlot && 
           description.trim().length >= 10;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAppointmentDate(selectedDate);
      console.log('🔍 BookAppointmentScreen: Tarih seçildi:', selectedDate.toLocaleDateString('tr-TR'));
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
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
          <Text style={[styles.mechanicName, { color: theme.colors.text }]}>
            {mechanicName} {mechanicSurname}
          </Text>
          <Text style={[styles.mechanicSubtitle, { color: theme.colors.textSecondary }]}>
            Usta ile randevu oluşturun
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Hizmet Türü
          </Text>
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
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tarih
          </Text>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: theme.colors.card }]}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
            <Text style={[styles.dateText, { color: theme.colors.text }]}>
              {appointmentDate.toLocaleDateString('tr-TR')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Saat
          </Text>
          <View style={styles.timeGrid}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeChip,
                  timeSlot === time && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Açıklama
          </Text>
          <TextInput
            style={[styles.descriptionInput, { 
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: description.length < 10 ? theme.colors.error.main : theme.colors.border
            }]}
            placeholder="Randevu detaylarını açıklayın... (en az 10 karakter)"
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            minLength={10}
          />
          <View style={styles.descriptionFooter}>
            <Text style={[
              styles.characterCount,
              { color: description.length < 10 ? theme.colors.error.main : theme.colors.textSecondary }
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
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            { backgroundColor: canSubmitAppointment() ? theme.colors.primary : theme.colors.border },
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
              Randevu oluşturmak için tüm alanları doldurun:
            </Text>
            {!selectedVehicle && (
              <Text style={[styles.validationItem, { color: theme.colors.error.main }]}>
                • Araç seçimi gerekli
              </Text>
            )}
            {!serviceType && (
              <Text style={[styles.validationItem, { color: theme.colors.error.main }]}>
                • Hizmet türü seçimi gerekli
              </Text>
            )}
            {!timeSlot && (
              <Text style={[styles.validationItem, { color: theme.colors.error.main }]}>
                • Saat seçimi gerekli
              </Text>
            )}
            {description.length < 10 && (
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
});

export default BookAppointmentScreen;
