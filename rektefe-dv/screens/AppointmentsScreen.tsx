import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';
import { format, isBefore, addHours, differenceInHours, differenceInMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Appointments: undefined;
};

type AppointmentsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Appointments'>;

const AppointmentsScreen = () => {
  const navigation = useNavigation<AppointmentsScreenNavigationProp>();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUntilAppointment, setTimeUntilAppointment] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [notificationSettings, setNotificationSettings] = useState({
    twoHoursBefore: true,
    oneHourBefore: true,
    oneDayBefore: false,
    customTime: false,
    customMinutes: 30
  });

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token bulunamadı');

      const response = await axios.get(`${API_URL}/maintenance-appointments/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Randevuları tarihe göre sırala
      const sortedAppointments = response.data.sort((a: any, b: any) => 
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      );

      setAppointments(sortedAppointments);
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        // Kullanıcıyı login ekranına yönlendir
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Her dakika randevu saatlerini güncelle
  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(() => {
      const now = new Date();
      const newTimeUntilAppointment: {[key: string]: number} = {};
      
      appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.appointmentDate);
        const minutesUntilAppointment = differenceInMinutes(appointmentDate, now);
        newTimeUntilAppointment[appointment._id] = minutesUntilAppointment;
      });
      
      setTimeUntilAppointment(newTimeUntilAppointment);
    }, 60000); // Her dakika güncelle

    return () => clearInterval(interval);
  }, [appointments]);

  // Randevuları filtrele
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    if (activeTab === 'current') {
      // Sadece zamanı gelmemiş ve iptal edilmemiş randevular
      return appointmentDate >= now && appointment.status !== 'cancelled';
    } else {
      // Geçmiş veya iptal edilen randevular
      return appointmentDate < now || appointment.status === 'cancelled';
    }
  });

  const handleCancelAppointment = async (appointmentId: string, appointmentDate: string) => {
    const appointmentDateTime = new Date(appointmentDate);
    const now = new Date();
    const minutesUntilAppointment = differenceInMinutes(appointmentDateTime, now);

    if (minutesUntilAppointment < 60) {
      Alert.alert(
        'İptal Edilemez',
        'Randevuya 1 saatten az kaldığı için iptal edilemez. Lütfen servis ile iletişime geçin.'
      );
      return;
    }

    Alert.alert(
      'Randevu İptali',
      'Randevunuz iptal edilecektir. Onaylıyor musunuz?',
      [
        {
          text: 'Vazgeç',
          style: 'cancel'
        },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) throw new Error('Token bulunamadı');

              const response = await axios.put(
                `${API_URL}/maintenance-appointments/${appointmentId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.status === 200) {
                // Randevuları yeniden yükle
                fetchAppointments();
                Alert.alert('Başarılı', 'Randevu başarıyla iptal edildi');
              }
            } catch (error: any) {
              if (error.response?.status === 401) {
                Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else if (error.response?.status === 403) {
                Alert.alert('Yetki Hatası', 'Bu randevuyu iptal etme yetkiniz yok.');
              } else if (error.response?.status === 404) {
                Alert.alert('Hata', 'Randevu bulunamadı.');
              } else {
                Alert.alert('Hata', 'Randevu iptal edilirken bir hata oluştu. Lütfen tekrar deneyin.');
              }
            }
          }
        }
      ]
    );
  };

  const handleDeleteAppointment = async (appointmentId: string, appointmentDate: string) => {
    Alert.alert(
      'Randevu Silme',
      'Bu randevuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'Vazgeç',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) throw new Error('Token bulunamadı');

              const response = await axios.delete(
                `${API_URL}/maintenance-appointments/${appointmentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.status === 200) {
                // Randevuları yeniden yükle
                fetchAppointments();
                Alert.alert('Başarılı', 'Randevu başarıyla silindi');
              }
            } catch (error: any) {
              if (error.response?.status === 401) {
                Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else if (error.response?.status === 403) {
                Alert.alert('Yetki Hatası', 'Bu randevuyu silme yetkiniz yok.');
              } else if (error.response?.status === 404) {
                Alert.alert('Hata', 'Randevu bulunamadı.');
              } else {
                Alert.alert('Hata', 'Randevu silinirken bir hata oluştu. Lütfen tekrar deneyin.');
              }
            }
          }
        }
      ]
    );
  };

  const handleNotificationSettings = (appointmentId: string) => {
    Alert.alert(
      'Bildirim Ayarları',
      'Randevu hatırlatıcılarını özelleştirin',
      [
        {
          text: 'Vazgeç',
          style: 'cancel'
        },
        {
          text: 'Kaydet',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) throw new Error('Token bulunamadı');

              await axios.put(
                `${API_URL}/maintenance-appointments/${appointmentId}/notification-settings`,
                notificationSettings,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              Alert.alert('Başarılı', 'Bildirim ayarları güncellendi');
            } catch (error: any) {
              if (error.response?.status === 401) {
                Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else if (error.response?.status === 403) {
                Alert.alert('Yetki Hatası', 'Bu randevunun bildirim ayarlarını değiştirme yetkiniz yok.');
              } else if (error.response?.status === 404) {
                Alert.alert('Hata', 'Randevu bulunamadı.');
              } else {
                Alert.alert('Hata', 'Bildirim ayarları güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
              }
            }
          }
        }
      ]
    );
  };

  const getServiceTypeName = (type: string) => {
    const serviceTypes: {[key: string]: string} = {
      'agir': 'Ağır Bakım',
      'genel': 'Genel Bakım',
      'alt': 'Alt Takım',
      'ust': 'Üst Takım',
      'kaporta': 'Kaporta/Boya',
      'elektrik': 'Elektrik-Elektronik',
      'yedek': 'Yedek Parça',
      'lastik': 'Lastik',
      'egzoz': 'Egzoz & Emisyon',
      'ekspertiz': 'Ekspertiz',
      'sigorta': 'Sigorta/Kasko',
      'yikama': 'Araç Yıkama'
    };
    return serviceTypes[type] || type;
  };

  const getServiceIcon = (type: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    const serviceIcons: {[key: string]: keyof typeof MaterialCommunityIcons.glyphMap} = {
      'agir': 'wrench',
      'genel': 'tools',
      'alt': 'cog',
      'ust': 'nut',
      'kaporta': 'spray',
      'elektrik': 'lightning-bolt',
      'yedek': 'car-wash',
      'lastik': 'tire',
      'egzoz': 'smoke',
      'ekspertiz': 'magnify',
      'sigorta': 'shield-check',
      'yikama': 'car-wash'
    };
    return serviceIcons[type] || 'tools';
  };

  const renderAppointmentItem = ({ item }: { item: any }) => {
    const appointmentDate = new Date(item.appointmentDate);
    const minutesUntilAppointment = timeUntilAppointment[item._id] || differenceInMinutes(appointmentDate, new Date());
    const canCancel = minutesUntilAppointment >= 60;
    const isPast = appointmentDate < new Date();

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <MaterialCommunityIcons 
            name={getServiceIcon(item.serviceType)} 
            size={24} 
            color="#007AFF" 
          />
          <Text style={styles.serviceType}>
            {getServiceTypeName(item.serviceType)}
          </Text>
          {item.status === 'pending' && !isPast && (
            <Text style={styles.statusPending}>
              Beklemede
            </Text>
          )}
          {item.status === 'confirmed' && (
            <Text style={styles.statusConfirmed}>
              Onaylandı
            </Text>
          )}
          {item.status === 'completed' && (
            <Text style={styles.statusCompleted}>
              Tamamlandı
            </Text>
          )}
          {item.status === 'cancelled' && (
            <Text style={styles.statusCancelled}>
              İptal Edildi
            </Text>
          )}
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={20} color="#666" />
            <Text style={styles.dateTime}>
              {format(appointmentDate, 'dd MMMM yyyy', { locale: tr })}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
            <Text style={styles.dateTime}>
              {format(appointmentDate, 'HH:mm', { locale: tr })}
            </Text>
          </View>

          {item.vehicleId && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="car" size={20} color="#666" />
              <Text style={styles.detailText}>
                {item.vehicleId.brand} {item.vehicleId.modelName} ({item.vehicleId.plateNumber})
              </Text>
            </View>
          )}

          {item.mechanicId && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account-wrench" size={20} color="#666" />
              <Text style={styles.detailText}>
                {item.mechanicId.name} ({item.mechanicId.shopType === 'usta' ? 'Usta' : 'Dükkan'})
              </Text>
            </View>
          )}

          {item.notes && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="note-text" size={20} color="#666" />
              <Text style={styles.notes}>{item.notes}</Text>
            </View>
          )}

          {item.status === 'pending' && !isPast && (
            <View style={styles.timeRemainingContainer}>
              <MaterialCommunityIcons name="clock-alert" size={20} color="#FF9500" />
              <Text style={styles.timeRemainingText}>
                {minutesUntilAppointment >= 60 
                  ? `${Math.floor(minutesUntilAppointment / 60)} saat ${minutesUntilAppointment % 60} dakika kaldı`
                  : `${minutesUntilAppointment} dakika kaldı`}
              </Text>
            </View>
          )}

          {isPast && (
            <View style={styles.pastAppointmentContainer}>
              <MaterialCommunityIcons name="clock-check" size={20} color="#34C759" />
              <Text style={styles.pastAppointmentText}>Tamamlanmış Randevu</Text>
            </View>
          )}

          {item.status === 'pending' && !isPast && (
            <View style={styles.notificationSettingsContainer}>
              <TouchableOpacity
                style={styles.notificationSettingsButton}
                onPress={() => handleNotificationSettings(item._id)}
              >
                <MaterialCommunityIcons name="bell-outline" size={20} color="#007AFF" />
                <Text style={styles.notificationSettingsText}>Bildirim Ayarları</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.status === 'pending' && canCancel && !isPast && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelAppointment(item._id, item.appointmentDate)}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.cancelButtonText}>İptal Et</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending' && !canCancel && !isPast && (
          <View style={styles.cannotCancelContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#FF9500" />
            <Text style={styles.cannotCancelText}>
              Randevuya 1 saatten az kaldığı için iptal edilemez
            </Text>
          </View>
        )}

        {(activeTab === 'past' && (isPast || item.status === 'cancelled')) && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteAppointment(item._id, item.appointmentDate)}
          >
            <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
            <Text style={styles.deleteButtonText}>Randevuyu Sil</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevularım</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}
        >
          <MaterialCommunityIcons 
            name="calendar-clock" 
            size={20} 
            color={activeTab === 'current' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            Güncel Randevular
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <MaterialCommunityIcons 
            name="history" 
            size={20} 
            color={activeTab === 'past' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Geçmiş Randevular
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointmentItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name={activeTab === 'current' ? 'calendar-blank' : 'history'} 
              size={48} 
              color="#999" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'current' 
                ? 'Henüz güncel randevunuz bulunmuyor'
                : 'Geçmiş randevunuz bulunmuyor'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
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
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#FF9500',
  },
  statusConfirmed: {
    backgroundColor: '#E3F2FD',
    color: '#007AFF',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#34C759',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
    color: '#FF3B30',
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 8,
    flex: 1,
  },
  timeRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  timeRemainingText: {
    color: '#FF9500',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#FF3B30',
    marginLeft: 4,
    fontWeight: '500',
  },
  cannotCancelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  cannotCancelText: {
    color: '#FF9500',
    marginLeft: 4,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  pastAppointmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  pastAppointmentText: {
    color: '#34C759',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    marginLeft: 4,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
  },
  notificationSettingsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  notificationSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  notificationSettingsText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AppointmentsScreen; 