import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '@/constants/config';
import { apiService } from '@/shared/services/api';
import { format, isBefore, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import io from 'socket.io-client';
import { translateServiceName } from '@/shared/utils/serviceTranslator';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { BackButton } from '@/shared/components';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  translateElectricalSystemType,
  translateElectricalProblemType,
  translateElectricalUrgencyLevel,
  getUrgencyLevelBadgeStyle,
  getRecurringBadgeStyle,
  getUrgencyLevelIcon
} from '@/shared/utils/electricalHelpers';

type AppointmentsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Appointments'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;
const CARD_MARGIN = 16;

interface AppointmentItem {
  _id: string;
  appointmentDate: string;
  status: string;
  paymentStatus?: string;
  serviceType: string;
  price?: number;
  vehicleId?: any;
  mechanicId?: any;
  notes?: string;
  description?: string;
  mechanicNotes?: string;
  rejectionReason?: string;
  createdAt?: string;
  paymentDate?: string;
  estimatedDuration?: number;
  electricalSystemType?: string;
  electricalProblemType?: string;
  electricalUrgencyLevel?: string;
  isRecurring?: boolean;
  faultReportId?: string;
  autoCancelled?: boolean;
  timeSlot?: string;
}

const getTintedColor = (hexColor: string, isDarkMode: boolean, fallback: string) => {
  if (!hexColor || !hexColor.startsWith('#')) {
    return fallback;
  }

  const alpha = isDarkMode ? '33' : '1A';
  return `${hexColor}${alpha}`;
};

const AppointmentsScreen = () => {
  const navigation = useNavigation<AppointmentsScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const themeColors = theme.colors;
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [washOrders, setWashOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUntilAppointment, setTimeUntilAppointment] = useState<{[key: string]: number}>({});
  const [activeTab, setActiveTab] = useState<'current' | 'completed' | 'past'>('current');
  const [viewMode, setViewMode] = useState<'appointments' | 'wash'>('appointments');
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);

  // Matematiksel olarak doğru zaman hesaplama fonksiyonu
  const calculateTimeUntilAppointment = useCallback((appointmentDate: Date): number => {
    const now = new Date();
    const diff = differenceInMinutes(appointmentDate, now);
    return Math.max(0, diff); // Negatif değerler için 0 döndür
  }, []);

  // Zaman formatı fonksiyonu - matematiksel olarak doğru
  const formatTimeRemaining = useCallback((minutes: number): string => {
    // NaN, undefined, null kontrolü
    if (typeof minutes !== 'number' || isNaN(minutes) || !isFinite(minutes)) {
      return 'Geçmiş';
    }
    
    if (minutes < 0) return 'Geçmiş';
    if (minutes < 60) return `${Math.floor(minutes)} dakika`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    
    if (hours < 24) {
      return remainingMinutes > 0 
        ? `${hours} saat ${remainingMinutes} dakika`
        : `${hours} saat`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours > 0) {
      return `${days} gün ${remainingHours} saat`;
    }
    return `${days} gün`;
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) throw new Error('Token bulunamadı');

      const response = await apiService.getAppointments('driver');
      const appointmentsData = response.data || [];

      // Randevuları tarihe göre sırala (en yeni en üstte)
      const sortedAppointments = [...appointmentsData].sort((a: any, b: any) => {
        const dateA = new Date(a.appointmentDate).getTime();
        const dateB = new Date(b.appointmentDate).getTime();
        return dateB - dateA;
      });

      setAppointments(sortedAppointments);

      // Zaman hesaplamalarını güncelle
      const now = new Date();
      const newTimeUntil: {[key: string]: number} = {};
      sortedAppointments.forEach((apt: AppointmentItem) => {
        const aptDate = new Date(apt.appointmentDate);
        newTimeUntil[apt._id] = calculateTimeUntilAppointment(aptDate);
      });
      setTimeUntilAppointment(newTimeUntil);
    } catch (error: any) {
      console.error('AppointmentsScreen: fetchAppointments hatası:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      } else {
        Alert.alert('Hata', 'Randevular yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWashOrders = async () => {
    try {
      const response = await apiService.getMyWashOrders();
      
      if (response.success && response.data) {
        const sortedOrders = [...(response.data || [])].sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        setWashOrders(sortedOrders);
      }
    } catch (error: any) {
      console.error('Yıkama siparişleri hatası:', error);
      setWashOrders([]);
    }
  };

  // Socket.IO bağlantısı
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    const joinUserRoom = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          const userId = 'temp_user_id';
          newSocket.emit('join', userId);
        }
      } catch (error) {
        console.error('Token decode hatası:', error);
      }
    };

    joinUserRoom();

    newSocket.on('notification', (notification) => {
      if (notification.type === 'appointment_status_update') {
        fetchAppointments();
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

  useEffect(() => {
    fetchAppointments();
    fetchWashOrders();
  }, []);

  // Her dakika zaman güncellemesi
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const newTimeUntil: {[key: string]: number} = {};
      
      appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.appointmentDate);
        newTimeUntil[appointment._id] = calculateTimeUntilAppointment(appointmentDate);
      });
      
      setTimeUntilAppointment(newTimeUntil);
    }, 60000); // Her 1 dakika

    return () => clearInterval(interval);
  }, [appointments, calculateTimeUntilAppointment]);

  // Randevu kategorilendirme - matematiksel olarak doğru
  const categorizeAppointments = useMemo(() => {
    const current: AppointmentItem[] = [];
    const completed: AppointmentItem[] = [];
    const past: AppointmentItem[] = [];
    const now = new Date();

    appointments.forEach(appointment => {
      const status = appointment.status;
      const paymentStatus = appointment.paymentStatus;
      const appointmentDate = new Date(appointment.appointmentDate);
      const isPast = appointmentDate.getTime() < now.getTime();

      // İptal edilmiş veya reddedilmiş randevular
      if (['rejected', 'cancelled'].includes(status)) {
        past.push(appointment);
        return;
      }

      // Tamamlanmış randevular
      if (status === 'completed') {
        if (paymentStatus === 'paid') {
          past.push(appointment);
        } else {
          completed.push(appointment);
        }
        return;
      }

      // Henüz tamamlanmamış randevular
      if (['pending', 'confirmed', 'in-progress', 'TALEP_EDILDI'].includes(status)) {
        if (['pending', 'TALEP_EDILDI'].includes(status) && isPast) {
          past.push(appointment);
        } else {
          current.push(appointment);
        }
        return;
      }

      // Bilinmeyen durumlar
      past.push(appointment);
    });

    return { current, completed, past };
  }, [appointments]);

  const { current, completed, past } = categorizeAppointments;

  // Yıkama siparişlerini kategorize et
  const categorizeWashOrders = useMemo(() => {
    const activewash: any[] = [];
    const completedwash: any[] = [];
    const cancelledwash: any[] = [];

    washOrders.forEach(order => {
      const status = order.status?.toLowerCase();
      
      if ([
        'created', 'priced', 'driver_confirmed', 'provider_accepted',
        'en_route', 'check_in', 'in_progress', 'qa_pending'
      ].includes(status)) {
        activewash.push(order);
      } else if ([
        'completed', 'paid', 'reviewed'
      ].includes(status)) {
        completedwash.push(order);
      } else if ([
        'cancelled_by_driver', 'cancelled_by_provider', 'disputed'
      ].includes(status)) {
        cancelledwash.push(order);
      } else {
        activewash.push(order);
      }
    });

    return { activewash, completedwash, cancelledwash };
  }, [washOrders]);

  const { activewash, completedwash, cancelledwash } = categorizeWashOrders;

  // Filtreleme - matematiksel olarak doğru
  const filteredAppointments = useMemo(() => {
    const tabFiltered = activeTab === 'current' ? current : 
                       activeTab === 'completed' ? completed : past;
    
    if (selectedServiceType && viewMode === 'appointments') {
      const serviceTypeFilters: {[key: string]: string[]} = {
        'tamir-bakim': ['agir-bakim', 'genel-bakim', 'alt-takim', 'ust-takim', 'egzoz-emisyon'],
        'kaporta-boya': ['kaporta-boya'],
        'elektrik-elektronik': ['elektrik-elektronik'],
        'yedek-parca': ['yedek-parca'],
        'lastik': ['lastik'],
      };
      
      const filterTypes = serviceTypeFilters[selectedServiceType];
      if (filterTypes) {
        return tabFiltered.filter((apt: AppointmentItem) => 
          filterTypes.includes(apt.serviceType)
        );
      }
    }
    
    return tabFiltered;
  }, [activeTab, current, completed, past, selectedServiceType, viewMode]);

  const filteredWashOrders = useMemo(() => {
    return activeTab === 'current' ? activewash : 
           activeTab === 'completed' ? completedwash : cancelledwash;
  }, [activeTab, activewash, completedwash, cancelledwash]);

  // Servis tipi sayıları - matematiksel olarak doğru
  const serviceTypeCounts = useMemo(() => {
    const currentTabData = activeTab === 'current' ? current : 
                          activeTab === 'completed' ? completed : past;
    
    const serviceTypes = [
      { 
        key: 'tamir-bakim', 
        filterTypes: ['agir-bakim', 'genel-bakim', 'alt-takim', 'ust-takim', 'egzoz-emisyon']
      },
      { key: 'kaporta-boya', filterTypes: ['kaporta-boya'] },
      { key: 'elektrik-elektronik', filterTypes: ['elektrik-elektronik'] },
      { key: 'yedek-parca', filterTypes: ['yedek-parca'] },
      { key: 'lastik', filterTypes: ['lastik'] },
    ];

    const counts: {[key: string]: number} = {};
    serviceTypes.forEach(service => {
      counts[service.key] = currentTabData.filter((apt: AppointmentItem) => 
        service.filterTypes.includes(apt.serviceType)
      ).length;
    });

    return counts;
  }, [activeTab, current, completed, past]);

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
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
              if (!token) throw new Error('Token bulunamadı');

              const response = await axios.put(
                `${API_URL}/appointments/${appointmentId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.status === 200) {
                fetchAppointments();
                Alert.alert('Başarılı', 'Randevu başarıyla iptal edildi');
              }
            } catch (error: any) {
              if (error.response?.status === 401) {
                Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
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

  const handlePayment = (appointmentId: string, mechanic: any, serviceType: string, appointment: AppointmentItem) => {
    const derivedMechanicName = mechanic?.userId
      ? `${mechanic.userId.name || ''} ${mechanic.userId.surname || ''}`.trim()
      : (mechanic?.shopName || 'Usta');

    const derivedPrice = appointment?.price || 0;
    const finalPrice = typeof derivedPrice === 'number' && derivedPrice > 0 ? derivedPrice : 0;
    
    const paymentParams: any = {
      appointmentId,
      mechanicId: mechanic?._id || mechanic,
      mechanicName: derivedMechanicName,
      serviceType,
      price: finalPrice,
      amount: finalPrice,
    };

    if (appointment?.faultReportId) {
      paymentParams.faultReportId = appointment.faultReportId;
    }

    navigation.navigate('Payment' as any, paymentParams);
  };

  const handleViewDetails = (appointment: AppointmentItem) => {
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

  const handleDeleteAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Randevu Silme',
      'Bu randevuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
              if (!token) throw new Error('Token bulunamadı');

              const response = await axios.delete(
                `${API_URL}/appointments/${appointmentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.status === 200) {
                fetchAppointments();
                Alert.alert('Başarılı', 'Randevu başarıyla silindi');
              }
            } catch (error: any) {
              if (error.response?.status === 401) {
                Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
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

  const getServiceTypeName = (type: string) => {
    return translateServiceName(type);
  };

  const getServiceTypeIcon = (type: string) => {
    const serviceIcons: {[key: string]: string} = {
      'agir-bakim': 'wrench',
      'genel-bakim': 'tools',
      'alt-takim': 'cog',
      'ust-takim': 'nut',
      'kaporta-boya': 'spray',
      'elektrik-elektronik': 'lightning-bolt',
      'yedek-parca': 'package-variant',
      'lastik': 'tire',
      'egzoz-emisyon': 'smoke',
      'ekspertiz': 'magnify',
      'sigorta-kasko': 'shield-check',
      'arac-yikama': 'car-wash',
    };
    return serviceIcons[type] || 'wrench';
  };

  const getStatusInfo = (
    status: string,
    paymentStatus?: string,
    appointmentDate?: Date,
    autoCancelled?: boolean
  ) => {
    const palette = theme.colors;
    if (status === 'completed' && paymentStatus === 'pending') {
      return { color: palette.warning.main, text: 'Ödeme Bekleniyor', icon: 'currency-try' as any };
    }

    if (status === 'completed' && paymentStatus === 'paid') {
      return { color: palette.success.main, text: 'Tamamlandı', icon: 'check-circle' as any };
    }

    if (autoCancelled && (status === 'cancelled' || status === 'IPTAL_EDILDI')) {
      return {
        color: palette.neutral[500],
        text: 'İşlem Yok',
        icon: 'minus-circle-outline' as any,
      };
    }

    if ((status === 'pending' || status === 'TALEP_EDILDI') && appointmentDate) {
      const now = new Date();
      if (appointmentDate.getTime() < now.getTime()) {
        return { color: palette.error.main, text: 'Onaylanmadı', icon: 'close-circle' as any };
      }
      return { color: palette.warning.main, text: 'Onay Bekleniyor', icon: 'clock-outline' as any };
    }

    switch (status) {
      case 'pending':
      case 'TALEP_EDILDI':
        return { color: palette.warning.main, text: 'Onay Bekleniyor', icon: 'clock-outline' as any };
      case 'confirmed':
        return { color: palette.success.main, text: 'Onaylandı', icon: 'check-circle' as any };
      case 'in-progress':
        return { color: palette.info.main, text: 'İşlemde', icon: 'wrench' as any };
      case 'completed':
        return { color: palette.warning.main, text: 'Ödeme Bekleniyor', icon: 'currency-try' as any };
      case 'cancelled':
      case 'IPTAL_EDILDI':
        return { color: palette.error.main, text: 'İptal Edildi', icon: 'close-circle' as any };
      case 'rejected':
        return { color: palette.error.main, text: 'Reddedildi', icon: 'close-circle' as any };
      default:
        return { color: palette.text.secondary, text: 'Bilinmiyor', icon: 'help-circle' as any };
    }
  };

  const renderAppointmentItem = ({ item }: { item: AppointmentItem }) => {
    const appointmentDate = (() => {
      try {
        if (!item.appointmentDate) return new Date();
        const date = new Date(item.appointmentDate);
        return isNaN(date.getTime()) ? new Date() : date;
      } catch {
        return new Date();
      }
    })();

    const minutesUntil = (() => {
      const value = timeUntilAppointment[item._id] ?? calculateTimeUntilAppointment(appointmentDate);
      return typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
    })();
    const canCancel = minutesUntil >= 60;
    const isPast = appointmentDate.getTime() < new Date().getTime();
    const isNotApproved = isPast && (item.status === 'pending' || item.status === 'TALEP_EDILDI');
    const statusInfo = getStatusInfo(item.status, item.paymentStatus, appointmentDate, item.autoCancelled);

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.serviceIconContainer,
                {
                  backgroundColor: getTintedColor(
                    statusInfo.color,
                    isDark,
                    themeColors.background.secondary
                  ),
                },
              ]}
            >
              <MaterialCommunityIcons
                name={getServiceTypeIcon(item.serviceType) as any}
                size={24}
                color={statusInfo.color}
              />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTypeText}>
                {getServiceTypeName(item.serviceType) || 'Bilinmeyen Hizmet'}
              </Text>
              <Text style={styles.serviceDateText}>
                {format(appointmentDate, 'dd MMMM yyyy', { locale: tr })}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <MaterialCommunityIcons name={statusInfo.icon} size={14} color={themeColors.text.inverse} />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.dateTimeSection}>
            <View style={styles.dateTimeItem}>
              <View style={styles.dateTimeIcon}>
                <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.text.primary} />
              </View>
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeLabel}>Tarih</Text>
                <Text style={styles.dateTimeValue}>
                  {format(appointmentDate, 'dd MMMM yyyy', { locale: tr })}
                </Text>
              </View>
            </View>
            <View style={styles.dateTimeDivider} />
            <View style={styles.dateTimeItem}>
              <View style={styles.dateTimeIcon}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.text.primary} />
              </View>
              <View style={styles.dateTimeContent}>
                <Text style={styles.dateTimeLabel}>Saat</Text>
                <Text style={styles.dateTimeValue}>
                  {format(appointmentDate, 'HH:mm', { locale: tr })}
                </Text>
              </View>
            </View>
          </View>

          {!!item.vehicleId && typeof item.vehicleId === 'object' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="car" size={18} color={theme.colors.text.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Araç</Text>
                <Text style={styles.infoValue}>
                  {`${item.vehicleId.brand || ''} ${item.vehicleId.modelName || ''} - ${item.vehicleId.plateNumber || ''}`.trim()}
                </Text>
              </View>
            </View>
          )}

          {!!item.mechanicId && typeof item.mechanicId === 'object' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="account-wrench" size={18} color={theme.colors.text.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Usta / Dükkan</Text>
                  <Text style={styles.infoValue}>
                    {(() => {
                      const mechanicName = item.mechanicId?.userId
                        ? `${item.mechanicId.userId.name || ''} ${item.mechanicId.userId.surname || ''}`.trim()
                        : (item.mechanicId?.name || item.mechanicId?.shopName || 'Usta');
                      const shopType = item.mechanicId?.shopType || (item.mechanicId?.userId ? 'usta' : 'dükkan');
                      return `${mechanicName} (${shopType === 'usta' ? 'Usta' : 'Dükkan'})`;
                    })()}
                  </Text>
              </View>
            </View>
          )}

          {!!item.price && typeof item.price === 'number' && item.price > 0 && (
            <View style={styles.priceSection}>
              <View style={styles.priceIcon}>
                <MaterialCommunityIcons name="currency-try" size={20} color={theme.colors.success.main} />
              </View>
              <View style={styles.priceContent}>
                <Text style={styles.priceLabel}>Fiyat</Text>
                <Text style={styles.priceValue}>
                  ₺{item.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          )}

          {!!item.estimatedDuration && typeof item.estimatedDuration === 'number' && item.estimatedDuration > 0 && !!item.status && item.status === 'completed' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="timer" size={18} color={theme.colors.text.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>İş Süresi</Text>
                <Text style={styles.infoValue}>{item.estimatedDuration} dakika</Text>
              </View>
            </View>
          )}

          {!!item.paymentStatus && activeTab === 'completed' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons 
                  name={item.paymentStatus === 'paid' ? 'check-circle' : 'clock-outline'} 
                  size={18} 
                  color={item.paymentStatus === 'paid' ? theme.colors.success.main : theme.colors.warning.main} 
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ödeme Durumu</Text>
                <Text style={[styles.infoValue, { 
                  color: item.paymentStatus === 'paid' ? theme.colors.success.main : theme.colors.warning.main 
                }]}>
                  {item.paymentStatus === 'paid' ? 'Ödendi' : 'Bekleniyor'}
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'past' && !!item.createdAt && (() => {
            try {
              const date = new Date(item.createdAt);
              if (isNaN(date.getTime())) return null;
              const formattedDate = format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
              return (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <MaterialCommunityIcons name="calendar-plus" size={18} color={theme.colors.text.secondary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Oluşturulma</Text>
                    <Text style={styles.infoValue}>
                      {formattedDate}
                    </Text>
                  </View>
                </View>
              );
            } catch {
              return null;
            }
          })()}

          {!!item.serviceType && item.serviceType === 'elektrik-elektronik' && 
           !!(item.electricalSystemType || item.electricalProblemType || item.electricalUrgencyLevel || item.isRecurring) && (
            <View style={styles.electricalSection}>
              <View style={styles.electricalHeader}>
                <MaterialCommunityIcons name="lightning-bolt" size={18} color={themeColors.warning.main} />
                <Text style={styles.electricalHeaderText}>Elektrik Detayları</Text>
                {!!item.electricalUrgencyLevel && item.electricalUrgencyLevel === 'acil' && (
                  <View style={[styles.urgencyBadge, { 
                    backgroundColor: getUrgencyLevelBadgeStyle(item.electricalUrgencyLevel).backgroundColor 
                  }]}>
                    <MaterialCommunityIcons 
                      name={getUrgencyLevelIcon(item.electricalUrgencyLevel) as any} 
                      size={12} 
                      color={getUrgencyLevelBadgeStyle(item.electricalUrgencyLevel).color} 
                    />
                    <Text style={[styles.urgencyBadgeText, { 
                      color: getUrgencyLevelBadgeStyle(item.electricalUrgencyLevel).color 
                    }]}>
                      Acil
                    </Text>
                  </View>
                )}
                {!!item.isRecurring && (
                  <View style={[styles.recurringBadge, { 
                    backgroundColor: getRecurringBadgeStyle().backgroundColor 
                  }]}>
                    <MaterialCommunityIcons name="repeat" size={12} color={getRecurringBadgeStyle().color} />
                    <Text style={[styles.recurringBadgeText, { 
                      color: getRecurringBadgeStyle().color 
                    }]}>
                      Tekrarlayan
                    </Text>
                  </View>
                )}
              </View>
              {!!item.electricalSystemType && (
                <View style={styles.electricalDetailRow}>
                  <MaterialCommunityIcons name="flash" size={16} color={themeColors.text.secondary} />
                  <Text style={styles.electricalDetailText}>
                    {`Sistem: ${translateElectricalSystemType(item.electricalSystemType) || item.electricalSystemType || ''}`}
                  </Text>
                </View>
              )}
              {!!item.electricalProblemType && (
                <View style={styles.electricalDetailRow}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={themeColors.text.secondary} />
                  <Text style={styles.electricalDetailText}>
                    {`Problem: ${translateElectricalProblemType(item.electricalProblemType) || item.electricalProblemType || ''}`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!!item.notes && item.notes.trim() !== '' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="note-text" size={18} color={themeColors.text.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Notlar</Text>
                <Text style={styles.infoValue}>{item.notes}</Text>
              </View>
            </View>
          )}

          {!!item.rejectionReason && item.rejectionReason.trim() !== '' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="close-circle" size={18} color={themeColors.error.main} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Red Sebebi</Text>
                <Text style={[styles.infoValue, { color: themeColors.error.main }]}>
                  {item.rejectionReason}
                </Text>
              </View>
            </View>
          )}

          {!!item.description && item.description.trim() !== '' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="note-text" size={18} color={themeColors.text.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Açıklama</Text>
                <Text style={styles.infoValue}>{item.description}</Text>
              </View>
            </View>
          )}

          {!!item.mechanicNotes && item.mechanicNotes.trim() !== '' && (
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <MaterialCommunityIcons name="account-wrench" size={18} color={themeColors.primary.main} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Usta Notu</Text>
                <Text style={[styles.infoValue, { color: themeColors.primary.main }]}>
                  {item.mechanicNotes}
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'current' && !!item.status && (item.status === 'pending' || item.status === 'TALEP_EDILDI') && !isPast && (
            <View style={styles.timeRemainingSection}>
              <View style={styles.timeRemainingIcon}>
                <MaterialCommunityIcons name="clock-alert" size={18} color={themeColors.warning.main} />
              </View>
              <View style={styles.timeRemainingContent}>
                <Text style={styles.timeRemainingLabel}>Kalan Süre</Text>
                <Text style={styles.timeRemainingValue}>
                  {formatTimeRemaining(minutesUntil)}
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'past' && isNotApproved && (
            <View style={styles.notApprovedSection}>
              <MaterialCommunityIcons name="close-circle" size={20} color={themeColors.error.main} />
              <Text style={styles.notApprovedText}>
                Randevu tarihi geçti ancak onaylanmadı. Lütfen yeni bir randevu oluşturun.
              </Text>
            </View>
          )}

          {activeTab === 'past' && isPast && !isNotApproved && !!item.status && item.status === 'completed' && !!item.paymentStatus && item.paymentStatus === 'paid' && (
            <View style={styles.completedSection}>
              <MaterialCommunityIcons name="check-circle" size={20} color={themeColors.success.main} />
              <Text style={styles.completedText}>Tamamlanmış Randevu</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          {activeTab === 'current' && !!item.status && (item.status === 'pending' || item.status === 'TALEP_EDILDI') && canCancel && !isPast && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelAppointment(item._id, item.appointmentDate)}
              activeOpacity={0.7}
            >
            <MaterialCommunityIcons name="close-circle" size={18} color={themeColors.error.main} />
              <Text style={styles.cancelButtonText}>İptal Et</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'current' && !!item.status && (item.status === 'pending' || item.status === 'TALEP_EDILDI') && !canCancel && !isPast && (
            <View style={styles.cannotCancelSection}>
            <MaterialCommunityIcons name="alert-circle" size={18} color={themeColors.warning.main} />
              <Text style={styles.cannotCancelText}>
                Randevuya 1 saatten az kaldığı için iptal edilemez
              </Text>
            </View>
          )}

          {activeTab === 'completed' && (
            <>
              {!!item.status && item.status === 'completed' && !!item.paymentStatus && item.paymentStatus === 'pending' && (
                <TouchableOpacity
                  style={styles.paymentButton}
                  onPress={() => handlePayment(item._id, item.mechanicId, item.serviceType, item)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="credit-card" size={20} color={themeColors.text.inverse} />
                  <Text style={styles.paymentButtonText}>Ödeme Yap</Text>
                </TouchableOpacity>
              )}

              {!!item.status && item.status === 'completed' && !!item.paymentStatus && item.paymentStatus === 'paid' && (
                <View style={styles.paymentSuccessSection}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={themeColors.success.main} />
                  <View style={styles.paymentSuccessContent}>
                    <Text style={styles.paymentSuccessText}>Ödeme Tamamlandı</Text>
                    {!!item.paymentDate && (() => {
                      try {
                        const date = new Date(item.paymentDate);
                        if (!isNaN(date.getTime())) {
                          const formattedDate = format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
                          return (
                            <Text style={styles.paymentSuccessDate}>
                              {formattedDate}
                            </Text>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => handleViewDetails(item)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="eye-outline" size={18} color={themeColors.text.primary} />
                <Text style={styles.detailButtonText}>Detayları Görüntüle</Text>
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'past' && (
            <>
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => handleViewDetails(item)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="eye-outline" size={18} color={themeColors.text.primary} />
                <Text style={styles.detailButtonText}>Detayları Görüntüle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteAppointment(item._id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="delete-outline" size={18} color={themeColors.error.main} />
                <Text style={styles.deleteButtonText}>Randevuyu Sil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderWashOrderItem = ({ item }: { item: any }) => {
    const getStatusText = (status: string | undefined): string => {
      if (!status || typeof status !== 'string') return 'Bilinmeyen';
      const statusMap: { [key: string]: string } = {
        'created': 'Oluşturuldu',
        'priced': 'Fiyatlandırıldı',
        'driver_confirmed': 'Onaylandı',
        'provider_accepted': 'Onaylandı',
        'en_route': 'Yolda',
        'check_in': 'Giriş Yapıldı',
        'in_progress': 'Yıkama Yapılıyor',
        'qa_pending': 'Kalite Kontrol',
        'completed': 'Tamamlandı',
        'paid': 'Ödendi',
        'reviewed': 'Değerlendirildi',
        'cancelled_by_driver': 'İptal Edildi',
        'cancelled_by_provider': 'İptal Edildi',
        'disputed': 'Anlaşmazlık',
      };
      return statusMap[status.toLowerCase()] || status;
    };

    const getStatusColor = (status: string | undefined) => {
      if (!status) return themeColors.text.secondary;
      const lowerStatus = status.toLowerCase();

      if (['created', 'priced', 'driver_confirmed', 'provider_accepted'].includes(lowerStatus)) {
        return themeColors.warning.main;
      }
      if (['en_route', 'check_in', 'in_progress', 'qa_pending'].includes(lowerStatus)) {
        return themeColors.primary.main;
      }
      if (['completed', 'paid', 'reviewed'].includes(lowerStatus)) {
        return themeColors.success.main;
      }
      if (['cancelled_by_driver', 'cancelled_by_provider', 'disputed'].includes(lowerStatus)) {
        return themeColors.error.main;
      }
      return themeColors.text.secondary;
    };

    const getTypeText = (type: string): string => {
      if (!type || typeof type !== 'string') return 'Yıkama Hizmeti';
      return type === 'mobile' ? 'Mobil Yıkama' : 'İşletmede Yıkama';
    };

    return (
        <View style={styles.washCard}>
        <View style={styles.washCardHeader}>
          <View style={styles.washCardTitleRow}>
            <View style={styles.washIcon}>
                <MaterialCommunityIcons name="car-wash" size={20} color={themeColors.text.inverse} />
            </View>
            <View style={styles.washTitleContainer}>
              <Text style={styles.washCardTitle}>
                {(() => {
                  if (item?.package) {
                    if (typeof item.package === 'object' && item.package !== null && item.package.name) {
                      return typeof item.package.name === 'string' ? item.package.name : 'Yıkama Hizmeti';
                    }
                    if (typeof item.package === 'string') {
                      return item.package;
                    }
                  }
                  return 'Yıkama Hizmeti';
                })()}
              </Text>
              <Text style={styles.washCardSubtitle}>
                {item?.type && typeof item.type === 'string' ? getTypeText(item.type) : 'Yıkama Hizmeti'}
              </Text>
            </View>
          </View>
          <View style={[styles.washStatusBadge, { backgroundColor: getStatusColor(item?.status) }]}>
            <Text style={styles.washStatusText}>{getStatusText(item?.status)}</Text>
          </View>
        </View>

        <View style={styles.washCardContent}>
          <View style={styles.washInfoRow}>
              <MaterialCommunityIcons name="barcode" size={16} color={themeColors.text.secondary} />
            <Text style={styles.washInfoText}>
              #{item._id ? String(item._id).slice(-8).toUpperCase() : ''}
            </Text>
          </View>

          {!!item.vehicle && typeof item.vehicle === 'object' && (
            <View style={styles.washInfoRow}>
                <MaterialCommunityIcons name="car" size={16} color={themeColors.primary.main} />
              <Text style={styles.washInfoText}>
                {`${item.vehicle?.brand || ''} ${item.vehicle?.model || ''} - ${item.vehicle?.plateNumber || ''}`.trim()}
              </Text>
            </View>
          )}

          {!!item.type && item.type === 'mobile' && !!item.location?.address && (
            <View style={styles.washInfoRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color={themeColors.error.main} />
              <Text style={styles.washInfoText} numberOfLines={1}>
                {item.location.address}
              </Text>
            </View>
          )}

          {!!item.type && item.type === 'shop' && !!item.providerId && (() => {
            const providerName = typeof item.providerId === 'object' && item.providerId !== null
              ? (item.providerId.businessName || item.providerId.name || '')
              : '';
            if (!providerName) return null;
            return (
              <View style={styles.washInfoRow}>
                  <MaterialCommunityIcons name="store" size={16} color={themeColors.success.main} />
                <Text style={styles.washInfoText}>
                  {providerName}
                </Text>
              </View>
            );
          })()}

          {!!item.scheduling?.slotStart && (() => {
            try {
              const date = new Date(item.scheduling.slotStart);
              if (isNaN(date.getTime())) return null;
              const formattedDate = format(date, 'dd MMM yyyy', { locale: tr });
              if (!formattedDate) return null;
              return (
                <View style={styles.washInfoRow}>
                    <MaterialCommunityIcons name="calendar" size={16} color={themeColors.warning.main} />
                  <Text style={styles.washInfoText}>
                    {formattedDate}
                  </Text>
                </View>
              );
            } catch {
              return null;
            }
          })()}

          <View style={styles.washPriceContainer}>
            <Text style={styles.washPriceLabel}>Toplam Tutar</Text>
            <Text style={styles.washPriceAmount}>
              {(() => {
                try {
                  const price = item.pricing?.finalPrice;
                  if (!price || isNaN(Number(price))) return '0.00 TL';
                  return `${Number(price).toFixed(2)} TL`;
                } catch {
                  return '0.00 TL';
                }
              })()}
            </Text>
          </View>
        </View>

        <View style={styles.washCardFooter}>
          <View style={styles.washCardMeta}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={themeColors.text.tertiary} />
            {!!item.createdAt && (() => {
              try {
                const date = new Date(item.createdAt);
                if (!isNaN(date.getTime())) {
                  const formattedDate = format(date, 'dd.MM.yyyy HH:mm', { locale: tr });
                  if (!formattedDate) return null;
                  return (
                    <Text style={styles.washCardMetaText}>
                      {formattedDate}
                    </Text>
                  );
                }
              } catch {}
              return null;
            })()}
          </View>
          <TouchableOpacity
            style={styles.washTrackButton}
            onPress={() => navigation.navigate('WashTracking', { orderId: item._id })}
          >
            <Text style={styles.washTrackButtonText}>
              {(() => {
                const status = item.status?.toLowerCase();
                const isActive = ['created', 'priced', 'driver_confirmed', 'provider_accepted', 'en_route', 'check_in', 'in_progress', 'qa_pending'].includes(status);
                return isActive ? 'Takip Et' : 'Detay Gör';
              })()}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={themeColors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>Randevularım</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
          <Text style={styles.loadingText}>Randevular yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const serviceTypes = [
    { key: 'tamir-bakim', name: 'Tamir Bakım', icon: 'wrench' },
    { key: 'kaporta-boya', name: 'Kaporta', icon: 'spray' },
    { key: 'elektrik-elektronik', name: 'Elektrik', icon: 'lightning-bolt' },
    { key: 'yedek-parca', name: 'Yedek Parça', icon: 'package-variant' },
    { key: 'lastik', name: 'Lastik', icon: 'tire' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Randevularım</Text>
          <Text style={styles.headerSubtitle}>
            {viewMode === 'appointments' 
              ? `${appointments.length} randevu`
              : `${washOrders.length} yıkama siparişi`}
          </Text>
        </View>
      </View>

      <View style={styles.viewModeContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'appointments' && styles.segmentButtonActive]}
            onPress={() => {
              setViewMode('appointments');
              setSelectedServiceType(null);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="calendar-check" 
              size={18} 
              color={viewMode === 'appointments' ? themeColors.text.inverse : themeColors.text.primary} 
            />
            <Text style={[styles.segmentText, viewMode === 'appointments' && styles.segmentTextActive]}>
              Randevular
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'wash' && styles.segmentButtonActive]}
            onPress={() => {
              setViewMode('wash');
              setSelectedServiceType(null);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="car-wash" 
              size={18} 
              color={viewMode === 'wash' ? themeColors.text.inverse : themeColors.text.primary} 
            />
            <Text style={[styles.segmentText, viewMode === 'wash' && styles.segmentTextActive]}>
              Yıkama
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'appointments' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.serviceTypeScrollContent}
            style={styles.serviceTypeScrollView}
          >
            {serviceTypes.map((service) => {
              const isActive = selectedServiceType === service.key;
              const count = serviceTypeCounts[service.key] || 0;
              
              return (
                <TouchableOpacity
                  key={service.key}
                  style={[styles.serviceTypeTab, isActive && styles.serviceTypeTabActive]}
                  onPress={() => setSelectedServiceType(selectedServiceType === service.key ? null : service.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name={service.icon as any} 
                    size={18} 
                    color={isActive ? themeColors.text.inverse : themeColors.text.secondary} 
                  />
                  <Text style={[styles.serviceTypeTabText, isActive && styles.serviceTypeTabTextActive]}>
                    {service.name}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.serviceTypeTabBadge, isActive && styles.serviceTypeTabBadgeActive]}>
                      <Text style={[styles.serviceTypeTabBadgeText, isActive && styles.serviceTypeTabBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'current' && styles.tabActive]}
            onPress={() => setActiveTab('current')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={viewMode === 'appointments' ? 'calendar-clock' : 'timer-sand'} 
              size={20} 
              color={activeTab === 'current' ? themeColors.text.inverse : themeColors.text.secondary} 
            />
            <Text style={[styles.tabLabel, activeTab === 'current' && styles.tabLabelActive]}>
              {viewMode === 'appointments' ? 'Güncel' : 'Aktif'}
            </Text>
            <View style={[styles.tabBadge, activeTab === 'current' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'current' && styles.tabBadgeTextActive]}>
                {viewMode === 'appointments' ? current.length : activewash.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={viewMode === 'appointments' ? 'credit-card' : 'check-circle'} 
              size={20} 
              color={activeTab === 'completed' ? themeColors.text.inverse : themeColors.text.secondary} 
            />
            <Text style={[styles.tabLabel, activeTab === 'completed' && styles.tabLabelActive]}>
              {viewMode === 'appointments' ? 'Ödeme' : 'Tamamlanan'}
            </Text>
            <View style={[styles.tabBadge, activeTab === 'completed' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'completed' && styles.tabBadgeTextActive]}>
                {viewMode === 'appointments' ? completed.length : completedwash.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.tabActive]}
            onPress={() => setActiveTab('past')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={viewMode === 'appointments' ? 'history' : 'close-circle'} 
              size={20} 
              color={activeTab === 'past' ? themeColors.text.inverse : themeColors.text.secondary} 
            />
            <Text style={[styles.tabLabel, activeTab === 'past' && styles.tabLabelActive]}>
              {viewMode === 'appointments' ? 'Geçmiş' : 'İptal'}
            </Text>
            <View style={[styles.tabBadge, activeTab === 'past' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'past' && styles.tabBadgeTextActive]}>
                {viewMode === 'appointments' ? past.length : cancelledwash.length}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={viewMode === 'appointments' ? filteredAppointments : filteredWashOrders}
        renderItem={viewMode === 'appointments' ? renderAppointmentItem : renderWashOrderItem}
        keyExtractor={(item) => String(item._id || item.id || Math.random())}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name={viewMode === 'appointments' 
                ? (activeTab === 'current' ? 'calendar-blank' : 
                   activeTab === 'completed' ? 'credit-card' : 'history')
                : (activeTab === 'current' ? 'car-wash' :
                   activeTab === 'completed' ? 'check-circle' : 'close-circle')
              } 
              size={64} 
              color={themeColors.text.tertiary} 
            />
            <Text style={styles.emptyTitle}>
              {viewMode === 'appointments'
                ? (activeTab === 'current' 
                  ? 'Henüz Randevunuz Yok'
                  : activeTab === 'completed'
                  ? 'Ödeme Bekleyen Randevu Yok'
                  : 'Geçmiş Randevu Yok')
                : (activeTab === 'current'
                  ? 'Henüz Aktif Yıkama Siparişiniz Yok'
                  : activeTab === 'completed'
                  ? 'Tamamlanan Yıkama Siparişi Yok'
                  : 'İptal Edilen Yıkama Siparişi Yok')
              }
            </Text>
            <Text style={styles.emptyText}>
              {viewMode === 'appointments'
                ? (activeTab === 'current' 
                  ? 'İlk randevunuzu oluşturmak için "Bakım Planla" kısmını kullanın'
                  : activeTab === 'completed'
                  ? 'Tamamlanan randevular burada görünecek'
                  : 'Tamamlanan veya iptal edilen randevular burada görünecek')
                : (activeTab === 'current'
                  ? 'İlk yıkama siparişinizi oluşturmak için "Araç Yıkama" kısmını kullanın'
                  : activeTab === 'completed'
                  ? 'Tamamlanan yıkama siparişleri burada görünecek'
                  : 'İptal edilen yıkama siparişleri burada görünecek')
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: any, isDark: boolean) => {
  const colors = theme.colors;
  const spacing = theme.spacing;
  const borderRadius = theme.borderRadius;
  const shadows = theme.shadows;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: CARD_PADDING,
      paddingVertical: spacing.md,
      backgroundColor: colors.background.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.primary,
    },
    headerContent: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    headerTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
      color: colors.text.primary,
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: theme.typography.caption.large.fontWeight,
      color: colors.text.secondary,
      marginTop: 2,
    },
    viewModeContainer: {
      backgroundColor: colors.background.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: CARD_PADDING,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: isDark ? colors.background.tertiary : colors.background.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.xs,
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    segmentButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm + 4,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      gap: spacing.xs,
    },
    segmentButtonActive: {
      backgroundColor: colors.background.inverse ?? colors.text.primary,
    },
    segmentText: {
      fontSize: theme.typography.body2.fontSize,
      fontWeight: theme.typography.body2.fontWeight,
      color: colors.text.primary,
    },
    segmentTextActive: {
      color: colors.text.inverse,
    },
    serviceTypeScrollView: {
      flexGrow: 0,
    },
    serviceTypeScrollContent: {
      gap: spacing.xs,
    },
    serviceTypeTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md - 2,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.primary,
      gap: spacing.xs,
      minWidth: 100,
      height: 44,
      justifyContent: 'center',
    },
    serviceTypeTabActive: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    serviceTypeTabText: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: theme.typography.caption.large.fontWeight,
      color: colors.text.secondary,
    },
    serviceTypeTabTextActive: {
      color: colors.text.inverse,
    },
    serviceTypeTabBadge: {
      backgroundColor: colors.background.quaternary,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.md,
      minWidth: 20,
      alignItems: 'center',
    },
    serviceTypeTabBadgeActive: {
      backgroundColor: colors.text.inverse,
    },
    serviceTypeTabBadgeText: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '700',
      color: colors.text.secondary,
    },
    serviceTypeTabBadgeTextActive: {
      color: colors.primary.main,
    },
    tabContainer: {
      backgroundColor: colors.background.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.primary,
      paddingVertical: spacing.sm,
    },
    tabScrollContent: {
      paddingHorizontal: CARD_PADDING,
      gap: spacing.sm,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.primary,
      gap: spacing.sm,
      minWidth: 120,
    },
    tabActive: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.main,
    },
    tabLabel: {
      fontSize: theme.typography.caption.large.fontSize + 1,
      fontWeight: theme.typography.caption.large.fontWeight,
      color: colors.text.secondary,
    },
    tabLabelActive: {
      color: colors.text.inverse,
    },
    tabBadge: {
      backgroundColor: colors.background.quaternary,
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
      minWidth: 24,
      alignItems: 'center',
    },
    tabBadgeActive: {
      backgroundColor: colors.text.inverse,
    },
    tabBadgeText: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '700',
      color: colors.text.secondary,
    },
    tabBadgeTextActive: {
      color: isDark ? colors.text.primary : colors.primary.main,
    },
    listContainer: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl + spacing.md,
    },
    appointmentCard: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.card,
      marginHorizontal: CARD_MARGIN,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.primary,
      overflow: 'hidden',
      ...shadows.card,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: CARD_PADDING,
      backgroundColor: colors.background.secondary,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.primary,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
    },
    serviceIconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    serviceInfo: {
      flex: 1,
    },
    serviceTypeText: {
      fontSize: theme.typography.body1.fontSize + 1,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    serviceDateText: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '500',
      color: colors.text.secondary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      gap: spacing.xs,
    },
    statusText: {
      color: colors.text.inverse,
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    cardContent: {
      padding: CARD_PADDING,
    },
    dateTimeSection: {
      flexDirection: 'row',
      backgroundColor: colors.background.secondary,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    dateTimeItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dateTimeIcon: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dateTimeContent: {
      flex: 1,
    },
    dateTimeLabel: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dateTimeValue: {
      fontSize: theme.typography.body1.fontSize,
      fontWeight: '700',
      color: colors.text.primary,
    },
    dateTimeDivider: {
      width: 1,
      backgroundColor: colors.border.primary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background.secondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
      color: colors.text.secondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: theme.typography.body2.fontSize + 1,
      fontWeight: '600',
      color: colors.text.primary,
      lineHeight: 22,
    },
    priceSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success.ultraLight,
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.success.light,
    },
    priceIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    priceContent: {
      flex: 1,
    },
    priceLabel: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
      color: colors.success.dark,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    priceValue: {
      fontSize: theme.typography.h4.fontSize,
      fontWeight: '700',
      color: colors.success.main,
      letterSpacing: -0.5,
    },
    electricalSection: {
      backgroundColor: colors.warning.ultraLight,
      borderRadius: borderRadius.card,
      padding: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: colors.warning.main,
    },
    electricalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    electricalHeaderText: {
      fontSize: theme.typography.body2.fontSize,
      fontWeight: '700',
      color: colors.text.primary,
      flex: 1,
    },
    urgencyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
      gap: 4,
    },
    urgencyBadgeText: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
    },
    recurringBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
      gap: 4,
    },
    recurringBadgeText: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
    },
    electricalDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.xs,
    },
    electricalDetailText: {
      fontSize: theme.typography.caption.large.fontSize + 1,
      color: colors.text.primary,
      flex: 1,
    },
    timeRemainingSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warning.ultraLight,
      borderRadius: borderRadius.card,
      padding: spacing.md - 2,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.warning.light,
      gap: spacing.sm,
    },
    timeRemainingIcon: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timeRemainingContent: {
      flex: 1,
    },
    timeRemainingLabel: {
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
      color: colors.warning.dark,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timeRemainingValue: {
      fontSize: theme.typography.body2.fontSize + 1,
      fontWeight: '700',
      color: colors.warning.main,
    },
    notApprovedSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.error.ultraLight,
      padding: spacing.sm,
      borderRadius: borderRadius.card,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.error.light,
      gap: spacing.sm,
    },
    notApprovedText: {
      color: colors.error.main,
      fontSize: theme.typography.body2.fontSize,
      fontWeight: '600',
      flex: 1,
      lineHeight: 20,
    },
    completedSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success.ultraLight,
      padding: spacing.sm,
      borderRadius: borderRadius.card,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    completedText: {
      color: colors.success.main,
      fontSize: theme.typography.body2.fontSize,
      fontWeight: '600',
    },
    cardActions: {
      paddingHorizontal: CARD_PADDING,
      paddingBottom: CARD_PADDING,
      gap: spacing.sm,
    },
    cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error.ultraLight,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.error.light,
      gap: spacing.xs,
    },
    cancelButtonText: {
      color: colors.error.main,
      fontSize: theme.typography.body2.fontSize + 1,
      fontWeight: '700',
    },
    cannotCancelSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warning.ultraLight,
      paddingVertical: spacing.md - 4,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.warning.light,
      gap: spacing.sm,
    },
    cannotCancelText: {
      color: colors.warning.main,
      fontSize: theme.typography.body2.fontSize,
      fontWeight: '600',
      flex: 1,
    },
    paymentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.success.main,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.lg + 4,
      borderRadius: borderRadius.card,
      gap: spacing.sm,
      ...shadows.button,
    },
    paymentButtonText: {
      color: colors.text.inverse,
      fontSize: theme.typography.body1.fontSize,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    paymentSuccessSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success.ultraLight,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.success.light,
      gap: spacing.sm,
    },
    paymentSuccessContent: {
      flex: 1,
    },
    paymentSuccessText: {
      color: colors.success.dark,
      fontSize: theme.typography.body2.fontSize + 1,
      fontWeight: '700',
      marginBottom: 2,
    },
    paymentSuccessDate: {
      color: colors.success.main,
      fontSize: theme.typography.caption.large.fontSize + 1,
      fontWeight: '500',
    },
    detailButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.card,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.border.primary,
      gap: spacing.xs,
    },
    detailButtonText: {
      color: colors.text.primary,
      fontSize: theme.typography.body2.fontSize + 1,
      fontWeight: '600',
    },
    deleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.error.ultraLight,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.card,
      borderWidth: 1,
      borderColor: colors.error.light,
      gap: spacing.xs,
    },
    deleteButtonText: {
      color: colors.error.main,
      fontSize: theme.typography.body2.fontSize + 1,
      fontWeight: '700',
    },
    washCard: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.card,
      marginHorizontal: CARD_MARGIN,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.primary,
      overflow: 'hidden',
      ...shadows.card,
    },
    washCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: CARD_PADDING,
      backgroundColor: colors.background.secondary,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.primary,
    },
    washCardTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
      marginRight: spacing.sm,
    },
    washIcon: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.round,
      backgroundColor: colors.primary.main,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
      flexShrink: 0,
    },
    washTitleContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    washCardTitle: {
      fontSize: theme.typography.body2.fontSize + 1,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 2,
      lineHeight: 20,
    },
    washCardSubtitle: {
      fontSize: theme.typography.caption.large.fontSize,
      color: colors.text.secondary,
      fontWeight: '500',
      lineHeight: 16,
    },
    washStatusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      minWidth: 70,
      maxWidth: 120,
      alignItems: 'center',
      flexShrink: 0,
    },
    washStatusText: {
      color: colors.text.inverse,
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 14,
    },
    washCardContent: {
      padding: CARD_PADDING,
    },
    washInfoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    washInfoText: {
      fontSize: theme.typography.body3.fontSize + 1,
      color: colors.text.primary,
      marginLeft: spacing.sm,
      flex: 1,
      fontWeight: '500',
      lineHeight: 18,
    },
    washPriceContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.secondary,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      marginTop: spacing.xs,
    },
    washPriceLabel: {
      fontSize: theme.typography.caption.large.fontSize + 1,
      color: colors.text.secondary,
      fontWeight: '500',
      flex: 1,
    },
    washPriceAmount: {
      fontSize: theme.typography.body2.fontSize + 1,
      color: colors.success.main,
      fontWeight: '700',
      flexShrink: 0,
    },
    washCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.sm,
      backgroundColor: colors.background.secondary,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border.primary,
    },
    washCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    washCardMetaText: {
      fontSize: theme.typography.caption.large.fontSize,
      color: colors.text.tertiary,
      marginLeft: spacing.xs,
      fontWeight: '500',
      flex: 1,
    },
    washTrackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary.main,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
      borderRadius: borderRadius.button,
      flexShrink: 0,
    },
    washTrackButtonText: {
      color: colors.text.inverse,
      fontSize: theme.typography.caption.large.fontSize,
      fontWeight: '600',
      marginRight: spacing.xs,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: theme.typography.body2.fontSize,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    emptyTitle: {
      marginTop: spacing.md,
      fontSize: theme.typography.body1.fontSize,
      color: colors.text.secondary,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: theme.typography.body3.fontSize + 1,
      color: colors.text.tertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
};

export default AppointmentsScreen;
