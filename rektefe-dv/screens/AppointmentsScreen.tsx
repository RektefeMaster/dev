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
import io from 'socket.io-client';

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
  const [activeTab, setActiveTab] = useState<'current' | 'completed' | 'past'>('current');
  const [notificationSettings, setNotificationSettings] = useState({
    twoHoursBefore: true,
    oneHourBefore: true,
    oneDayBefore: false,
    customTime: false,
    customMinutes: 30
  });
  const [socket, setSocket] = useState<any>(null);

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Token bulunamadı');

      const response = await axios.get(`${API_URL}/maintenance-appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Randevuları tarihe göre sırala
      const sortedAppointments = response.data.data.sort((a: any, b: any) => 
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

  // Socket.IO bağlantısı ve bildirim dinleme
  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Kullanıcı ID'sini al ve odaya katıl
    const joinUserRoom = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Token'dan user ID'yi çıkar (JWT decode)
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId;
          
          newSocket.emit('join', userId);
          console.log('Kullanıcı odasına katıldı:', userId);
        }
      } catch (error) {
        console.error('Token decode hatası:', error);
      }
    };

    joinUserRoom();

    // Bildirim dinle
    newSocket.on('notification', (notification) => {
      console.log('Bildirim alındı:', notification);
      
      if (notification.type === 'appointment_status_update') {
        // Randevu durumu güncellendi, listeyi yenile
        fetchAppointments();
        
        // Kullanıcıya bildirim göster
        const statusText = notification.status === 'confirmed' ? 'onaylandı' : 
                          notification.status === 'rejected' ? 'reddedildi' : 'güncellendi';
        
        Alert.alert(
          notification.title,
          notification.message,
          [
            { text: 'Tamam', onPress: () => {} },
            { text: 'Randevuları Görüntüle', onPress: () => setActiveTab('current') }
          ]
        );
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // İlk yükleme ve her dakika randevu saatlerini güncelle
  useEffect(() => {
    fetchAppointments();
  }, []); // Sadece component mount olduğunda çalışsın

  // Her dakika randevu saatlerini güncelle
  useEffect(() => {
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
  }, [appointments]); // appointments değişince sadece interval'i güncelle

  // Randevu durumuna göre kategorilendirme
  const categorizeAppointments = (appointments: any[]) => {
    const current: any[] = [];
    const completed: any[] = [];
    const past: any[] = [];

    appointments.forEach(appointment => {
      const status = appointment.status;
      const paymentStatus = appointment.paymentStatus;
      
      // Güncel randevular: onay bekleyen, onaylanan, devam eden
      if (['pending', 'confirmed', 'in-progress'].includes(status)) {
        current.push(appointment);
      } 
      // Tamamlanmış randevular: usta tamamladı, ödeme bekliyor, ödeme yapıldı
      else if (['completed', 'payment_pending', 'paid'].includes(status) || 
               (status === 'completed' && (!paymentStatus || paymentStatus === 'unpaid' || paymentStatus === 'paid'))) {
        completed.push(appointment);
      }
      // Geçmiş randevular: reddedilen, iptal edilen
      else if (['rejected', 'cancelled'].includes(status)) {
        past.push(appointment);
      }
      // Diğer durumlar için varsayılan olarak geçmişe ekle
      else {
        past.push(appointment);
      }
    });

    return { current, completed, past };
  };

  // Randevuları durumlarına göre kategorilendir
  const { current, completed, past } = categorizeAppointments(appointments);
  
  // Debug: Tamamlanmış randevuları console'da göster
  useEffect(() => {
    if (activeTab === 'completed' && completed.length > 0) {
      console.log('🔍 Tamamlanmış randevular:', completed.map(r => ({
        id: r._id,
        status: r.status,
        paymentStatus: r.paymentStatus,
        price: r.price
      })));
    }
  }, [activeTab, completed]);

  // Randevuları filtrele
  const filteredAppointments = activeTab === 'current' ? current : 
                              activeTab === 'completed' ? completed : past;

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

  const handlePayment = (appointmentId: string, mechanic: any, serviceType: string) => {
    // Mekanik ismini populate edilmiş veriden türet: önce kullanıcı adı-soyadı, yoksa dükkan adı
    const derivedMechanicName = mechanic?.userId
      ? `${mechanic.userId.name || ''} ${mechanic.userId.surname || ''}`.trim()
      : (mechanic?.shopName || 'Usta');

    // Varsa backend'den gelen fiyatı kullan
    const derivedPrice = typeof mechanic?.price === 'number' ? mechanic.price : (typeof (mechanic?.appointmentPrice) === 'number' ? mechanic.appointmentPrice : undefined);

    navigation.navigate('Payment' as any, {
      appointmentId,
      mechanicId: mechanic?._id || mechanic,
      mechanicName: derivedMechanicName,
      serviceType,
      price: typeof derivedPrice === 'number' ? derivedPrice : 0,
    });
  };

  const handleViewDetails = (appointment: any) => {
    // Randevu detaylarını göster
    Alert.alert(
      'Randevu Detayları',
      `Hizmet: ${getServiceTypeName(appointment.serviceType)}\n` +
      `Tarih: ${format(new Date(appointment.appointmentDate), 'dd MMMM yyyy HH:mm', { locale: tr })}\n` +
      `Araç: ${appointment.vehicleId?.brand} ${appointment.vehicleId?.modelName} (${appointment.vehicleId?.plateNumber})\n` +
      `Usta: ${appointment.mechanicId?.name}\n` +
      `Ücret: ₺${appointment.price || 0}\n` +
      `Notlar: ${appointment.mechanicNotes || 'Not yok'}`
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

    // Randevu durumu için renk ve metin
    const getStatusInfo = (status: string, paymentStatus?: string) => {
      // Önce payment status'a bak, sonra general status'a bak
      if (paymentStatus === 'paid') {
        return { color: '#34C759', text: 'Ödeme Tamamlandı', icon: 'check-circle' };
      }
      
      switch (status) {
        case 'pending':
          return { color: '#FF9500', text: 'Onay Bekleniyor...', icon: 'clock-outline' };
        case 'confirmed':
          return { color: '#34C759', text: 'Onaylandı', icon: 'check-circle' };
        case 'in-progress':
          return { color: '#007AFF', text: 'İşlemde', icon: 'wrench' };
        case 'payment_pending':
          // Eğer ödeme yapılmışsa "Ödeme Tamamlandı" göster
          if (paymentStatus === 'paid') {
            return { color: '#34C759', text: 'Ödeme Tamamlandı', icon: 'check-circle' };
          }
          return { color: '#FF9500', text: 'Ödeme Bekliyor', icon: 'currency-try' };
        case 'completed':
          // Eğer status completed ama paymentStatus yoksa veya unpaid ise
          if (!paymentStatus || paymentStatus === 'unpaid') {
            return { color: '#FF9500', text: 'Ödeme Bekliyor', icon: 'currency-try' };
          }
          return { color: '#34C759', text: 'Tamamlandı', icon: 'check-circle' };
        case 'paid':
          return { color: '#34C759', text: 'Ödeme Tamamlandı', icon: 'check-circle' };
        case 'cancelled':
          return { color: '#FF3B30', text: 'İptal Edildi', icon: 'close-circle' };
        case 'rejected':
          return { color: '#FF3B30', text: 'Reddedildi', icon: 'close-circle' };
        default:
          return { color: '#8E8E93', text: 'Bilinmiyor', icon: 'help-circle' };
      }
    };

    const statusInfo = getStatusInfo(item.status, item.paymentStatus);

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
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <MaterialCommunityIcons 
              name={statusInfo.icon as any} 
              size={16} 
              color="white" 
            />
            <Text style={styles.statusText}>
              {statusInfo.text}
            </Text>
          </View>
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

          {item.rejectionReason && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#FF3B30" />
              <Text style={[styles.notes, { color: '#FF3B30' }]}>
                Red Sebebi: {item.rejectionReason}
              </Text>
            </View>
          )}

          {item.mechanicNotes && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="account-wrench" size={20} color="#007AFF" />
              <Text style={[styles.notes, { color: '#007AFF' }]}>
                Usta Notu: {item.mechanicNotes}
              </Text>
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

        {/* Ödeme butonu sadece tamamlanmış randevular tab'ında gösteriliyor */}
        {/* Tamamlanmış randevular tab'ında butonlar */}
        {activeTab === 'completed' && (
          <View style={styles.buttonContainer}>

            {/* Ödeme yapılmamışsa ödeme butonu göster */}
            {/* Ödeme bekleyen randevular için ödeme butonu göster */}
            {((item.status === 'completed' && (!item.paymentStatus || item.paymentStatus === 'unpaid')) || 
              (item.status === 'payment_pending' && item.paymentStatus !== 'paid')) && (
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={() => handlePayment(item._id, item.mechanicId, item.serviceType)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="credit-card" size={22} color="#FFFFFF" />
                <Text style={styles.paymentButtonText}>Ödeme Yap</Text>
              </TouchableOpacity>
            )}
            
            {/* Ödeme yapılmışsa ödeme detayı göster */}
            {((item.status === 'completed' && item.paymentStatus === 'paid') || 
              item.status === 'paid' || item.paymentStatus === 'paid') && (
              <View style={styles.paymentInfoContainer}>
                <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
                <Text style={styles.paymentInfoText}>Ödeme Tamamlandı</Text>
                <Text style={styles.paymentDateText}>
                  {item.paymentDate ? format(new Date(item.paymentDate), 'dd.MM.yyyy HH:mm', { locale: tr }) : 'Tarih bilgisi yok'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => handleViewDetails(item)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="eye" size={22} color="#3B82F6" />
              <Text style={styles.detailButtonText}>Detay Gör</Text>
            </TouchableOpacity>
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
            Güncel ({current.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <MaterialCommunityIcons 
            name="check-circle" 
            size={20} 
            color={activeTab === 'completed' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Tamamlanmış ({completed.length})
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
            Geçmiş ({past.length})
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
              name={activeTab === 'current' ? 'calendar-blank' : activeTab === 'completed' ? 'check-circle' : 'history'} 
              size={48} 
              color="#999" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'current' 
                ? 'Henüz güncel randevunuz bulunmuyor'
                : activeTab === 'completed'
                ? 'Henüz tamamlanmış randevunuz bulunmuyor'
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
    marginHorizontal: 4,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  
  // Button Container
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  
  // Payment Button
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Detail Button
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  
  // Payment Info Container
  paymentInfoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    flex: 1,
    marginRight: 12,
  },
  paymentInfoText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  paymentDateText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default AppointmentsScreen; 