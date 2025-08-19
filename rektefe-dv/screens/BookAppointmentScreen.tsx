import React, { useState } from 'react';
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
  const { token } = useAuth();
  const { mechanicId, mechanicName, mechanicSurname } = route.params;

  const [serviceType, setServiceType] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [timeSlot, setTimeSlot] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const serviceCategories = [
    { id: 'agir-bakim', title: 'Ağır Bakım', icon: 'wrench', color: '#007AFF' },
    { id: 'genel-bakim', title: 'Genel Bakım', icon: 'tools', color: '#34C759' },
    { id: 'alt-takim', title: 'Alt Takım', icon: 'cog', color: '#FF9500' },
    { id: 'ust-takim', title: 'Üst Takım', icon: 'nut', color: '#AF52DE' },
    { id: 'kaporta-boya', title: 'Kaporta/Boya', icon: 'spray', color: '#FF3B30' },
    { id: 'elektrik-elektronik', title: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: '#FF9500' },
    { id: 'yedek-parca', title: 'Yedek Parça', icon: 'car-wash', color: '#AF52DE' },
    { id: 'lastik', title: 'Lastik', icon: 'tire', color: '#007AFF' },
    { id: 'egzoz-emisyon', title: 'Egzoz & Emisyon', icon: 'smoke', color: '#AF52DE' },
    { id: 'ekspertiz', title: 'Ekspertiz', icon: 'magnify', color: '#FF9500' },
    { id: 'sigorta-kasko', title: 'Sigorta/Kasko', icon: 'shield-check', color: '#34C759' },
    { id: 'arac-yikama', title: 'Araç Yıkama', color: '#007AFF' }
  ];

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const handleBookAppointment = async () => {
    if (!serviceType.trim()) {
      Alert.alert('Hata', 'Lütfen hizmet türünü seçin');
      return;
    }

    if (!timeSlot) {
      Alert.alert('Hata', 'Lütfen saat seçin');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Hata', 'Lütfen açıklama girin');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mechanicId,
          serviceType,
          appointmentDate: appointmentDate.toISOString().split('T')[0],
          timeSlot,
          description
        })
      });

      if (response.ok) {
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
        const errorData = await response.json();
        Alert.alert('Hata', errorData.message || 'Randevu oluşturulurken bir hata oluştu');
      }
    } catch (error) {
      Alert.alert('Hata', 'Randevu oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAppointmentDate(selectedDate);
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
            {serviceCategories.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceChip,
                  serviceType === service.title && {
                    backgroundColor: service.color,
                    borderColor: service.color
                  }
                ]}
                onPress={() => setServiceType(service.title)}
              >
                <MaterialCommunityIcons
                  name={service.icon as any}
                  size={20}
                  color={serviceType === service.title ? '#FFFFFF' : service.color}
                />
                <Text style={[
                  styles.serviceText,
                  serviceType === service.title && styles.serviceTextSelected
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
              borderColor: theme.colors.border
            }]}
            placeholder="Randevu detaylarını açıklayın..."
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            { backgroundColor: theme.colors.primary },
            loading && styles.bookButtonDisabled
          ]}
          onPress={handleBookAppointment}
          disabled={loading}
        >
          <Text style={styles.bookButtonText}>
            {loading ? 'Gönderiliyor...' : 'Randevu Talebi Gönder'}
          </Text>
        </TouchableOpacity>
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
});

export default BookAppointmentScreen;
