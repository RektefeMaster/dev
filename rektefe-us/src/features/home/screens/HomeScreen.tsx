import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Rating, RatingItem } from '@/shared/types';
import { colors } from '@/shared/theme';
import { translateServiceName } from '@/shared/utils/serviceTranslator';
import { DrawerActions } from '@react-navigation/native';
import { CardNav } from '@/shared/components';
import { hasFaultReportFeature, getServiceCategory, getNotificationTypeText, getJobTypeText } from '@/shared/utils/serviceTypeHelpers';

interface Appointment {
  _id: string;
  serviceType: string;
  appointmentDate: string | Date;
  status: string;
  userId?: {
    name: string;
    surname: string;
    phone?: string;
  } | string;
  vehicleId?: {
    brand: string;
    modelName: string;
    plateNumber?: string;
  } | string;
  notes?: string;
  price?: number;
  timeSlot?: string;
}

interface Stats {
  todayConfirmedAppointments: number;
  todayEarnings: number;
  averageRating: number;
  totalRatings: number;
  activeJobs: number;
}

interface Activity {
  _id: string;
  type: string;
  description: string;
  createdAt: string | Date;
  appointmentId?: string;
  amount?: number;
  status?: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated } = useAuth();
  
  // Debug log'ları - sadece geliştirme sırasında gerekli
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    todayConfirmedAppointments: 0,
    todayEarnings: 0,
    averageRating: 0,
    totalRatings: 0,
    activeJobs: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [recentRatings, setRecentRatings] = useState<RatingItem[]>([]);
  const [faultReportsCount, setFaultReportsCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);
  
  // Real-time güncelleme için
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Usta yetenekleri tanımı
const mechanicCapabilities = [
    {
      id: 'towing',
      title: 'Çekici Hizmeti',
      icon: 'car',
      color: '#EF4444',
      description: 'Acil kurtarma hizmetleri'
    },
    {
      id: 'repair',
      title: 'Tamir & Bakım',
      icon: 'construct',
      color: '#3B82F6',
      description: 'Arıza tespit ve onarım'
    },
    {
      id: 'wash',
      title: 'Yıkama Hizmeti',
      icon: 'water',
      color: '#10B981',
      description: 'Araç temizlik hizmetleri'
    },
    {
      id: 'tire',
      title: 'Lastik & Parça',
      icon: 'car',
      color: '#F59E0B',
      description: 'Lastik ve yedek parça'
    }
  ];

  // Ustanın yeteneklerine göre dinamik menü oluştur - useMemo ile optimize edildi
  const navItems = useMemo(() => {
    // İş Yönetimi menüleri
    const workManagementItems = [
      {
        id: 'messages',
        label: 'Mesajlaşma',
        links: [
          {
            label: 'Müşteri Mesajları',
            onPress: () => navigation.navigate('Messages'),
          },
          {
            label: 'Sohbet',
            onPress: () => navigation.navigate('Messages'),
          },
        ],
      },
      {
        id: 'calendar',
        label: 'Takvim',
        links: [
          {
            label: 'Günlük Görünüm',
            onPress: () => navigation.navigate('Calendar'),
          },
          {
            label: 'Haftalık Görünüm',
            onPress: () => navigation.navigate('Calendar'),
          },
        ],
      },
      {
        id: 'servicecatalog',
        label: 'Hizmet Kataloğu',
        links: [
          {
            label: 'Hizmetleri Görüntüle',
            onPress: () => navigation.navigate('ServiceCatalog'),
          },
          {
            label: 'Yeni Hizmet Ekle',
            onPress: () => navigation.navigate('ServiceCatalog'),
          },
        ],
      },
    ];

    // Finansal menüler
    const financialItems = [
      {
        id: 'financial',
        label: 'Cüzdan',
        links: [
          {
            label: 'Bakiye',
            onPress: () => navigation.navigate('Wallet'),
          },
          {
            label: 'Gelir Raporu',
            onPress: () => navigation.navigate('FinancialTracking'),
          },
          {
            label: 'Ödeme Geçmişi',
            onPress: () => navigation.navigate('FinancialTracking'),
          },
        ],
      },
      {
        id: 'reports',
        label: 'Raporlar',
        links: [
          {
            label: 'Analitik Raporlar',
            onPress: () => navigation.navigate('Reports'),
          },
          {
            label: 'Günlük Rapor',
            onPress: () => navigation.navigate('EndOfDay'),
          },
        ],
      },
    ];

    // Hesap menüleri
    const accountItems = [
      {
        id: 'profile',
        label: 'Profil',
        links: [
          {
            label: 'Profil Ayarları',
            onPress: () => navigation.navigate('Profile'),
          },
          {
            label: 'Müşteri Defterim',
            onPress: () => navigation.navigate('Customers'),
          },
          {
            label: 'Yardım Merkezi',
            onPress: () => navigation.navigate('Support'),
          },
          {
            label: 'Uygulama Ayarları',
            onPress: () => navigation.navigate('Settings'),
          },
        ],
      },
    ];

    // Ustanın yeteneklerine göre hizmet kategorileri ekle
    const userCapabilities = user?.serviceCategories || [];
    const capabilityItems = [];

    // Hizmet kategorileri - daha detaylı menüler
    if (userCapabilities.includes('cekici') || userCapabilities.includes('towing') || userCapabilities.includes('Çekici')) {
      capabilityItems.push({
        id: 'towing',
        label: 'Çekici Hizmetleri',
        links: [
          {
            label: 'ACİL ÇEKİCİ BİLDİRİMLERİ',
            onPress: () => navigation.navigate('EmergencyNotification'),
            isEmergency: true,
          },
          {
            label: 'Aktif Çekici İşleri',
            onPress: () => navigation.navigate('TowingService'),
          },
          {
            label: 'Çekici Geçmişi',
            onPress: () => navigation.navigate('TowingService'),
          },
          {
            label: 'Araç Durumu',
            onPress: () => navigation.navigate('TowingService'),
          },
        ],
      });
    }

    if (userCapabilities.includes('tamir-bakim') || userCapabilities.includes('repair')) {
      capabilityItems.push({
        id: 'repair',
        label: 'Tamir Hizmetleri',
        links: [
          {
            label: 'Arıza Bildirimleri',
            onPress: () => navigation.navigate('FaultReports'),
          },
          {
            label: 'Aktif Tamir İşleri',
            onPress: () => navigation.navigate('RepairService'),
          },
          {
            label: 'Tamir Geçmişi',
            onPress: () => navigation.navigate('RepairService'),
          },
        ],
      });
    }

    if (userCapabilities.includes('arac-yikama') || userCapabilities.includes('wash')) {
      capabilityItems.push({
        id: 'wash',
        label: 'Yıkama Hizmetleri',
        links: [
          {
            label: 'Aktif Yıkama İşleri',
            onPress: () => navigation.navigate('WashService'),
          },
          {
            label: 'Yıkama Paketleri',
            onPress: () => navigation.navigate('WashService'),
          },
          {
            label: 'Yıkama Geçmişi',
            onPress: () => navigation.navigate('WashService'),
          },
        ],
      });
    }

    if (userCapabilities.includes('lastik') || userCapabilities.includes('tire')) {
      capabilityItems.push({
        id: 'tire',
        label: 'Lastik Hizmetleri',
        links: [
          {
            label: 'Aktif Lastik İşleri',
            onPress: () => navigation.navigate('TireService'),
          },
          {
            label: 'Lastik Geçmişi',
            onPress: () => navigation.navigate('TireService'),
          },
        ],
      });
    }

    // Tüm menüleri birleştir: Hizmet kategorileri + İş Yönetimi + Finansal + Hesap
    return [...capabilityItems, ...workManagementItems, ...financialItems, ...accountItems];
  }, [user?.serviceCategories, navigation]); // Sadece user capabilities değiştiğinde yeniden hesapla

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData();
      startAutoRefresh();
    } else {
      setLoading(false);
    }

    // App state değişikliklerini dinle
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription?.remove();
    };
  }, [isAuthenticated, user?._id]); // Sadece user ID'si değiştiğinde tetikle

  // Arıza bildirimleri için özel polling - daha az sıklıkta
  useEffect(() => {
    if (isAuthenticated && user) {
      // Her 10 dakikada bir arıza bildirimlerini kontrol et (daha az sıklıkta)
      const faultReportInterval = setInterval(() => {
        checkFaultReports();
      }, 600000); // 10 dakika (600 saniye)

      return () => clearInterval(faultReportInterval);
    }
  }, [isAuthenticated, user]);

  // Loading animasyonu
  useEffect(() => {
    if (loading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      
      return () => spinAnimation.stop();
    }
  }, [loading, spinValue]);

  // Sayfa odaklandığında veri yenile - ama sadece gerektiğinde
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user) {
        fetchDashboardData();
      }
    }, [isAuthenticated, user?._id])
  );

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App aktif olduğunda veri yenile
      if (isAuthenticated && user) {
        fetchDashboardData();
      }
    }
    appState.current = nextAppState;
  }, [isAuthenticated, user]); // 🚀 OPTIMIZE: useCallback

  const startAutoRefresh = useCallback(() => {
    // Her 5 dakikada bir veri yenile (daha az sıklıkta)
    intervalRef.current = setInterval(() => {
      if (isAuthenticated && user && appState.current === 'active') {
        fetchDashboardData(false); // Loading gösterme
      }
    }, 300000); // 5 dakika (300 saniye)
  }, [isAuthenticated, user]); // 🚀 OPTIMIZE: useCallback

  const fetchDashboardData = async (showLoading = true) => {
    try {
      // Authentication kontrolü
      if (!isAuthenticated || !user) {
        console.log('❌ Not authenticated, skipping dashboard data fetch');
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      
      // Paralel olarak tüm verileri çek
      const [
        todayAppointmentsRes,
        todayCompletedRes,
        activityRes,
        ratingsRes,
        ratingStatsRes,
        appointmentStatsRes,
        faultReportsRes,
        notificationsRes,
        conversationsRes,
        pendingAppointmentsRes
      ] = await Promise.allSettled([
        apiService.getMechanicAppointments('confirmed'),
        apiService.getMechanicAppointments('completed'),
        apiService.getRecentActivity(),
        apiService.getRecentRatings(),
        apiService.getRatingStats(),
        apiService.getAppointmentStats(),
        apiService.getMechanicFaultReports('pending'),
        apiService.getNotifications(),
        apiService.getConversations(),
        apiService.getMechanicAppointments('pending')
      ]);

      // Bugünkü onaylanan randevular
      if (todayAppointmentsRes.status === 'fulfilled' && todayAppointmentsRes.value.success && todayAppointmentsRes.value.data) {
        const appointments = Array.isArray(todayAppointmentsRes.value.data) 
          ? todayAppointmentsRes.value.data 
          : [];
        
        // Sadece bugünkü randevuları filtrele
        const today = new Date();
        const todayAppointments = appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.appointmentDate);
          return appointmentDate.toDateString() === today.toDateString();
        });
        
        setTodayAppointments(todayAppointments);
        setStats(prev => ({
          ...prev,
          todayConfirmedAppointments: todayAppointments.length
        }));
      }

      // Bugünkü kazanç hesapla
      if (todayCompletedRes.status === 'fulfilled' && todayCompletedRes.value.success && todayCompletedRes.value.data) {
        const completedAppointments = Array.isArray(todayCompletedRes.value.data) 
          ? todayCompletedRes.value.data 
          : [];
        
        const today = new Date();
        const todayCompleted = completedAppointments.filter(appointment => {
          const appointmentDate = new Date(appointment.appointmentDate);
          return appointmentDate.toDateString() === today.toDateString();
        });
        
        const todayEarnings = todayCompleted.reduce((total, appointment) => {
          return total + (appointment.price || 0);
        }, 0);
        
        setStats(prev => ({
          ...prev,
          todayEarnings
        }));
      }

      // Son aktiviteler
      if (activityRes.status === 'fulfilled' && activityRes.value.success && activityRes.value.data) {
        // Backend'den gelen veri formatını kontrol et
        let activities = [];
        const data = activityRes.value.data;
        if ('activities' in data && data.activities) {
          // Eğer data.activities varsa (mechanic/dashboard/recent-activity endpoint'i)
          activities = Array.isArray(data.activities) 
            ? data.activities 
            : [];
        } else if (Array.isArray(data)) {
          // Eğer data direkt array ise (activity/recent endpoint'i)
          activities = data;
        }
        
        // Debug log removed - data format issue resolved
        
        // Mevcut activity formatını yeni formata dönüştür
        const formattedActivities = activities.map((activity) => ({
          _id: activity.id || activity._id,
          type: activity.type || 'appointment_created',
          description: activity.title || activity.description || getActivityDescription(activity.type || 'appointment_created'),
          createdAt: activity.time ? new Date(activity.time) : activity.date ? new Date(activity.date) : new Date(),
          appointmentId: activity.id || activity._id,
          amount: activity.amount,
          status: activity.status
        }));
        setRecentActivity(formattedActivities);
      }

      // Son değerlendirmeler
      if (ratingsRes.status === 'fulfilled' && ratingsRes.value.success && ratingsRes.value.data) {
        const ratings = Array.isArray(ratingsRes.value.data) 
          ? ratingsRes.value.data 
          : [];
        setRecentRatings(ratings);
      }

      // Rating istatistikleri
      if (ratingStatsRes.status === 'fulfilled' && ratingStatsRes.value.success && ratingStatsRes.value.data) {
        const { averageRating, totalRatings } = ratingStatsRes.value.data;
        setStats(prev => ({
          ...prev,
          averageRating: averageRating || 0,
          totalRatings: totalRatings || 0
        }));
      }

      // Appointment istatistikleri (aktif iş sayısı için)
      if (appointmentStatsRes.status === 'fulfilled' && appointmentStatsRes.value.success && appointmentStatsRes.value.data) {
        const { activeJobs, todayEarnings: statsTodayEarnings, rating } = appointmentStatsRes.value.data;
        setStats(prev => ({
          ...prev,
          activeJobs: activeJobs || 0,
          todayEarnings: statsTodayEarnings || prev.todayEarnings,
          averageRating: rating || prev.averageRating
        }));
      }

      // Arıza bildirimleri sayısı
      if (faultReportsRes.status === 'fulfilled' && faultReportsRes.value.success && faultReportsRes.value.data) {
        const faultReports = Array.isArray(faultReportsRes.value.data) 
          ? faultReportsRes.value.data 
          : [];
        setFaultReportsCount(faultReports.length);
      }

      // Okunmamış bildirim sayısı
      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.success && notificationsRes.value.data) {
        // Backend'den gelen veri formatını kontrol et
        let notifications = [];
        const data = notificationsRes.value.data;
        if ('notifications' in data && data.notifications) {
          // Eğer data.notifications varsa (notifications/mechanic endpoint'i)
          notifications = Array.isArray(data.notifications) 
            ? data.notifications 
            : [];
        } else if (Array.isArray(data)) {
          // Eğer data direkt array ise
          notifications = data;
        }
        
        // Debug log removed - data format issue resolved
        
        const unreadCount = notifications.filter((notification) => 
          !notification.read && !notification.isRead
        ).length;
        
        setUnreadNotificationCount(unreadCount);
      }

      // Okunmamış mesaj sayısı
      if (conversationsRes.status === 'fulfilled' && conversationsRes.value.success && conversationsRes.value.data) {
        const conversations = Array.isArray(conversationsRes.value.data) 
          ? conversationsRes.value.data 
          : [];
        
        const unreadMessages = conversations.reduce((total: number, conversation: any) => {
          return total + (conversation.unreadCount || 0);
        }, 0);
        
        setUnreadMessagesCount(unreadMessages);
      }

      // Onay bekleyen randevu sayısı
      if (pendingAppointmentsRes.status === 'fulfilled' && pendingAppointmentsRes.value.success && pendingAppointmentsRes.value.data) {
        const pendingAppointments = Array.isArray(pendingAppointmentsRes.value.data) 
          ? pendingAppointmentsRes.value.data 
          : [];
        
        setPendingAppointmentsCount(pendingAppointments.length);
      }

    } catch (error) {
      // Cancel edilen istekleri handle et (error logging yapma)
      if (error?.name === 'CanceledError' || error?.message?.includes('No authentication token')) {
        // Silent cancellation - no logging
        return;
      }
      
      console.log('❌ fetchDashboardData error:', error);
      console.log('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchDashboardData(false); // Loading gösterme
    } catch (error) {
      console.log('❌ onRefresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Arıza bildirimlerini kontrol et (polling için)
  const checkFaultReports = async () => {
    try {
      const response = await apiService.getMechanicFaultReports('pending');
      if (response.success && response.data) {
        const faultReports = Array.isArray(response.data) ? response.data : [];
        setFaultReportsCount(faultReports.length);
        }
    } catch (error) {
      }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNavItemPress = (item: any) => {
    };

  const handleNavLinkPress = (link: any) => {
    if (link.onPress) {
      link.onPress();
    }
  };

  const getPrimaryServiceText = useMemo(() => {
    const userCapabilities = user?.serviceCategories || [];
    
    console.log('🔍 HomeScreen getPrimaryServiceText Debug:');
    console.log('User serviceCategories:', userCapabilities);
    
    // Öncelik sırası: repair > towing > wash > tire
    // Backend'den gelen format: 'repair', 'towing', 'wash', 'tire', 'bodywork'
    if (userCapabilities.includes('repair') || userCapabilities.includes('tamir-bakim') || userCapabilities.includes('Genel Bakım')) {
      console.log('✅ Hizmet: Tamir & Bakım Randevuları');
      return 'Tamir & Bakım Randevuları';
    } else if (userCapabilities.includes('towing') || userCapabilities.includes('cekici') || userCapabilities.includes('Çekici Hizmeti')) {
      console.log('✅ Hizmet: Çekici İşleri');
      return 'Çekici İşleri';
    } else if (userCapabilities.includes('wash') || userCapabilities.includes('arac-yikama') || userCapabilities.includes('Yıkama Hizmeti')) {
      console.log('✅ Hizmet: Yıkama İşleri');
      return 'Yıkama İşleri';
    } else if (userCapabilities.includes('tire') || userCapabilities.includes('lastik') || userCapabilities.includes('Lastik & Parça')) {
      console.log('✅ Hizmet: Lastik İşleri');
      return 'Lastik İşleri';
    } else if (userCapabilities.includes('bodywork') || userCapabilities.includes('kaporta')) {
      console.log('✅ Hizmet: Kaporta İşleri');
      return 'Kaporta İşleri';
    } else {
      console.log('⚠️ Varsayılan: Randevular');
      return 'Randevular';
    }
  }, [user?.serviceCategories]);

  const handleCtaPress = () => {
    // Kullanıcının hizmet kategorisine göre öncelik sırasına göre yönlendir
    const userCapabilities = user?.serviceCategories || [];
    
    // Öncelik sırası: repair > towing > wash > tire > bodywork
    // Backend'den gelen format: 'repair', 'towing', 'wash', 'tire', 'bodywork'
    if (userCapabilities.includes('repair') || userCapabilities.includes('tamir-bakim') || userCapabilities.includes('Genel Bakım')) {
      navigation.navigate('Appointments');
    } else if (userCapabilities.includes('towing') || userCapabilities.includes('cekici') || userCapabilities.includes('Çekici Hizmeti')) {
      navigation.navigate('TowingService');
    } else if (userCapabilities.includes('wash') || userCapabilities.includes('arac-yikama') || userCapabilities.includes('Yıkama Hizmeti')) {
      navigation.navigate('CarWash');
    } else if (userCapabilities.includes('tire') || userCapabilities.includes('lastik') || userCapabilities.includes('Lastik & Parça')) {
      navigation.navigate('TireService');
    } else if (userCapabilities.includes('bodywork') || userCapabilities.includes('kaporta')) {
      navigation.navigate('Bodywork');
    } else {
      navigation.navigate('Appointments');
    }
  };

  // Bugünkü randevuları zaman sırasına göre sırala
  const getSortedTodayAppointments = useCallback(() => {
    return todayAppointments
      .sort((a, b) => {
        const timeA = a.timeSlot || '00:00';
        const timeB = b.timeSlot || '00:00';
        return timeA.localeCompare(timeB);
      })
      .slice(0, 3); // İlk 3 randevuyu göster
  }, [todayAppointments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View 
          style={[
            styles.loadingSpinner,
            {
              transform: [{
                rotate: spinValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }]
            }
          ]} 
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* CardNav Drawer */}
      <CardNav
        logoAlt="Rektefe"
        items={navItems}
        onItemPress={handleNavItemPress}
        onLinkPress={handleNavLinkPress}
        onCtaPress={handleCtaPress}
        ctaText={getPrimaryServiceText}
        baseColor="#FFFFFF"
        menuColor="#1E293B"
        buttonBgColor="#3B82F6"
        buttonTextColor="#FFFFFF"
        maxItems={3}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enhanced Modern Header */}
        <View style={styles.modernHeader}>
          <View style={styles.headerTop}>
            <View style={styles.headerContent}>
              <View style={styles.greetingContainer}>
                <Text style={styles.headerGreeting}>
                  {getGreeting()}
                </Text>
                <Text style={styles.headerName}>
                  {getPersonalGreeting(user?.name)}
                </Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Bugün {stats.activeJobs} aktif işin var
              </Text>
            </View>
            
            {/* Enhanced Notification Button */}
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons 
                  name="notifications-outline" 
                  size={24} 
                  color="#1E293B" 
                />
                {unreadNotificationCount > 0 && (
                  <View style={[
                    styles.notificationBadge,
                    unreadNotificationCount > 9 && styles.notificationBadgeWide,
                    unreadNotificationCount > 99 && styles.notificationBadgeExtraWide
                  ]}>
                    <Text style={[
                      styles.notificationBadgeText,
                      unreadNotificationCount > 9 && styles.notificationBadgeTextSmall
                    ]}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Enhanced Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigation.navigate('Appointments')}
                activeOpacity={0.7}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="briefcase" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.statNumber}>{stats.activeJobs}</Text>
                <Text style={styles.statLabel}>Aktif İş</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigation.navigate('FinancialTracking')}
                activeOpacity={0.7}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="cash" size={24} color="#10B981" />
                </View>
                <Text style={[
                  styles.statNumber,
                  stats.todayEarnings > 9999 && styles.statNumberSmall
                ]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  ₺{stats.todayEarnings > 999999 ? 
                    (stats.todayEarnings / 1000000).toFixed(1) + 'M' : 
                    stats.todayEarnings > 9999 ? 
                    (stats.todayEarnings / 1000).toFixed(1) + 'K' : 
                    stats.todayEarnings.toLocaleString('tr-TR')
                  }
                </Text>
                <Text style={styles.statLabel}>Bugün Kazanç</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => navigation.navigate('Reviews')}
                activeOpacity={0.7}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="star" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Ortalama Puan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bugün ki Ajanda - Dinamik Dashboard */}
        <View style={styles.agendaSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bugün ki Ajandanız</Text>
            <Text style={styles.sectionSubtitle}>
              {(todayAppointments.length > 0 || unreadMessagesCount > 0 || pendingAppointmentsCount > 0) 
                ? 'Aksiyon gerektiren öğeler' 
                : 'Bugün için planlanmış iş yok'
              }
            </Text>
          </View>
            
            <View style={styles.agendaContainer}>
              {/* Bugün ki Randevular */}
              {todayAppointments.length > 0 && (
                <View style={styles.agendaItem}>
                  <View style={styles.agendaItemHeader}>
                    <View style={styles.agendaItemIcon}>
                      <Ionicons name="calendar" size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.agendaItemTitle}>Bugün ki Randevular</Text>
                    <Text style={styles.agendaItemCount}>{todayAppointments.length}</Text>
                  </View>
                  <View style={styles.appointmentsList}>
                    {getSortedTodayAppointments().map((appointment, index) => (
                      <View key={appointment._id || index} style={styles.appointmentItem}>
                        <View style={styles.appointmentTime}>
                          <Text style={styles.appointmentTimeText}>
                            {appointment.timeSlot || '09:00'}
                          </Text>
                        </View>
                        <View style={styles.appointmentDetailsNew}>
                          <Text style={styles.appointmentCustomer}>
                            {typeof appointment.userId === 'object' && appointment.userId 
                              ? `${appointment.userId.name} ${appointment.userId.surname}`
                              : 'Müşteri'
                            }
                          </Text>
                          <Text style={styles.appointmentService}>
                            {translateServiceName(appointment.serviceType)}
                          </Text>
                          {typeof appointment.vehicleId === 'object' && appointment.vehicleId && (
                            <Text style={styles.appointmentVehicle}>
                              {appointment.vehicleId.brand} {appointment.vehicleId.modelName}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity 
                          style={styles.appointmentAction}
                          onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment._id })}
                        >
                          <Ionicons name="chevron-forward" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Aksiyon Gerektiren Öğeler - Öncelikli */}
              {(unreadMessagesCount > 0 || pendingAppointmentsCount > 0) && (
                <View style={styles.actionItemsContainer}>
                  <Text style={styles.actionItemsTitle}>Acil Aksiyonlar</Text>
                  
                  {unreadMessagesCount > 0 && (
                    <TouchableOpacity 
                      style={[styles.actionItem, styles.actionItemUrgent]}
                      onPress={() => navigation.navigate('Messages')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionItemIcon}>
                        <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
                        <View style={styles.actionBadge}>
                          <Text style={styles.actionBadgeText}>{unreadMessagesCount}</Text>
                        </View>
                      </View>
                      <View style={styles.actionItemContent}>
                        <Text style={styles.actionItemTitle}>Cevaplanmamış Mesajlar</Text>
                        <Text style={styles.actionItemSubtitle}>
                          {unreadMessagesCount} müşteri sizi bekliyor
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}

                  {pendingAppointmentsCount > 0 && (
                    <TouchableOpacity 
                      style={[styles.actionItem, styles.actionItemWarning]}
                      onPress={() => navigation.navigate('Appointments')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.actionItemIcon}>
                        <Ionicons name="time" size={24} color="#FFFFFF" />
                        <View style={styles.actionBadge}>
                          <Text style={styles.actionBadgeText}>{pendingAppointmentsCount}</Text>
                        </View>
                      </View>
                      <View style={styles.actionItemContent}>
                        <Text style={styles.actionItemTitle}>Onay Bekleyen Randevular</Text>
                        <Text style={styles.actionItemSubtitle}>
                          {pendingAppointmentsCount} randevu onayınızı bekliyor
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

        {/* Enhanced Quick Actions */}
        <View style={styles.quickActionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
            <Text style={styles.sectionSubtitle}>En sık kullanılan işlemler</Text>
          </View>
          
          <View style={styles.quickActions}>
            {user?.serviceCategories?.includes('towing') && (
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('TowingService')}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionGradient, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="car" size={28} color="#EF4444" />
                </View>
                <Text style={styles.quickActionText}>Çekici İşleri</Text>
                <Text style={styles.quickActionSubtext}>Aktif çekici işleri</Text>
              </TouchableOpacity>
            )}

            {(user?.serviceCategories?.includes('repair') || user?.serviceCategories?.includes('Genel Bakım')) && (
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('RepairService')}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionGradient, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="construct" size={28} color="#3B82F6" />
                </View>
                <Text style={styles.quickActionText}>Tamir İşleri</Text>
                <Text style={styles.quickActionSubtext}>Arıza tespit ve onarım</Text>
              </TouchableOpacity>
            )}

            {user?.serviceCategories?.includes('wash') && (
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('WashService')}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionGradient, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="water" size={28} color="#10B981" />
                </View>
                <Text style={styles.quickActionText}>Yıkama İşleri</Text>
                <Text style={styles.quickActionSubtext}>Araç temizlik hizmetleri</Text>
              </TouchableOpacity>
            )}

            {user?.serviceCategories?.includes('tire') && (
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('TireService')}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionGradient, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="car" size={28} color="#F59E0B" />
                </View>
                <Text style={styles.quickActionText}>Lastik İşleri</Text>
                <Text style={styles.quickActionSubtext}>Lastik ve yedek parça</Text>
              </TouchableOpacity>
            )}

            {/* Arıza Bildirimleri - Sadece ilgili hizmet türleri için */}
            {hasFaultReportFeature(user?.serviceCategories) && (
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => navigation.navigate('FaultReports')}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionGradient, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="warning" size={28} color="#EF4444" />
                  {faultReportsCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{faultReportsCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickActionText}>
                  {getNotificationTypeText(getServiceCategory(user?.serviceCategories), 'fault_report')}
                </Text>
                {faultReportsCount > 0 ? (
                  <Text style={styles.quickActionSubtext}>{faultReportsCount} yeni bildirim</Text>
                ) : (
                  <Text style={styles.quickActionSubtext}>Bekleyen bildirimler</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionGradient, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="wallet" size={28} color="#6B7280" />
              </View>
              <Text style={styles.quickActionText}>Cüzdan</Text>
              <Text style={styles.quickActionSubtext}>Gelir ve ödemeler</Text>
            </TouchableOpacity>

            {/* Müşteri Defteri - Araç geçmişi dahil */}
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Customers')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionGradient, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="people" size={28} color="#BE185D" />
              </View>
              <Text style={styles.quickActionText}>Müşteri Defteri</Text>
              <Text style={styles.quickActionSubtext}>Müşteri ve araç bilgileri</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Recent Ratings */}
        {recentRatings.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Değerlendirmeler</Text>
              <Text style={styles.sectionSubtitle}>Müşteri geri bildirimleri</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Support')}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingsContainer}>
              {recentRatings.slice(0, 3).map((rating, index) => (
                <View key={rating._id || index} style={styles.ratingCard}>
                  <View style={styles.ratingHeader}>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>
                        {rating.customer ? `${rating.customer.name} ${rating.customer.surname}` : `Müşteri ${rating.driverId?.slice(-4) || 'XXXX'}`}
                      </Text>
                      <Text style={styles.serviceInfo}>
                        {translateServiceName(rating.appointment?.serviceType) || rating.appointmentId || 'Servis'}
                      </Text>
                    </View>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= rating.rating ? 'star' : 'star-outline'}
                          size={18}
                          color={star <= rating.rating ? '#F59E0B' : '#D1D5DB'}
                        />
                      ))}
                      <Text style={styles.ratingNumber}>({rating.rating})</Text>
                    </View>
                  </View>
                  {rating.comment && (
                    <Text style={styles.ratingComment}>"{rating.comment}"</Text>
                  )}
                  <Text style={styles.ratingTime}>
                    {new Date(rating.createdAt).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />

      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  if (hour >= 18 && hour < 22) return 'İyi akşamlar';
  return 'İyi geceler';
};

const getPersonalGreeting = (name?: string) => {
  if (!name) return 'Usta';
  return `${name} Usta`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'confirmed': return '#10B981';
    case 'in-progress': return '#3B82F6';
    case 'completed': return '#8B5CF6';
    case 'cancelled': return '#EF4444';
    default: return '#6B7280';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Bekliyor';
    case 'confirmed': return 'Onaylandı';
    case 'in-progress': return 'Devam Ediyor';
    case 'completed': return 'Tamamlandı';
    case 'cancelled': return 'İptal';
    default: return 'Bilinmiyor';
  }
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'appointment_created': return 'calendar-outline';
    case 'appointment_confirmed': return 'checkmark-circle-outline';
    case 'appointment_completed': return 'checkmark-done-circle-outline';
    case 'payment_received': return 'card-outline';
    case 'rating_received': return 'star-outline';
    case 'appointment_in-progress': return 'time-outline';
    case 'appointment_pending': return 'time-outline';
    case 'appointment_cancelled': return 'close-circle-outline';
    default: return 'information-circle-outline';
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'appointment_created': return '#3B82F6';
    case 'appointment_confirmed': return '#10B981';
    case 'appointment_completed': return '#8B5CF6';
    case 'payment_received': return '#10B981';
    case 'rating_received': return '#F59E0B';
    case 'appointment_in-progress': return '#F59E0B';
    case 'appointment_pending': return '#F59E0B';
    case 'appointment_cancelled': return '#EF4444';
    default: return '#6B7280';
  }
};

const getActivityBgColor = (type: string) => {
  switch (type) {
    case 'appointment_created': return '#EBF4FF';
    case 'appointment_confirmed': return '#F0FDF4';
    case 'appointment_completed': return '#F3E8FF';
    case 'payment_received': return '#F0FDF4';
    case 'rating_received': return '#FEF3C7';
    case 'appointment_in-progress': return '#FEF3C7';
    case 'appointment_pending': return '#FEF3C7';
    case 'appointment_cancelled': return '#FEF2F2';
    default: return '#F9FAFB';
  }
};

const getActivityDescription = (type: string) => {
  switch (type) {
    case 'appointment_created': return 'Yeni randevu oluşturuldu';
    case 'appointment_confirmed': return 'Randevu onaylandı';
    case 'appointment_completed': return 'İş tamamlandı';
    case 'payment_received': return 'Ödeme alındı';
    case 'rating_received': return 'Değerlendirme alındı';
    case 'appointment_in-progress': return 'İş devam ediyor';
    case 'appointment_pending': return 'Randevu bekliyor';
    case 'appointment_cancelled': return 'Randevu iptal edildi';
    default: return 'Aktivite';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#E2E8F0',
    borderTopColor: '#3B82F6',
  },
  modernHeader: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 32,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerGreeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3B82F6',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  notificationButton: {
    position: 'relative',
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notificationIconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    // İkonu kapatmaması için daha küçük ve üstte
  },
  notificationBadgeWide: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 5,
    top: -7,
    right: -7,
  },
  notificationBadgeExtraWide: {
    minWidth: 26,
    height: 20,
    paddingHorizontal: 6,
    top: -8,
    right: -8,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  notificationBadgeTextSmall: {
    fontSize: 9,
    lineHeight: 11,
  },

  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
    minHeight: 28,
  },
  statNumberSmall: {
    fontSize: 20,
    minHeight: 28,
  },

  quickActionsSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    minWidth: 120,
    flex: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quickActionGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickActionSubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  appointmentsSection: {
    marginTop: 30,
  },
  appointmentsListOld: {
    gap: 16,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceType: {
    fontSize: 17,
    color: '#64748B',
    fontWeight: '500',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleInfo: {
    fontSize: 17,
    color: '#64748B',
    fontWeight: '500',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  notesText: {
    fontSize: 15,
    color: '#64748B',
    flex: 1,
    fontWeight: '500',
  },
  emptyAppointments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#374151',
    marginTop: 18,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 17,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  recentSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 6,
  },
  activityTime: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingsContainer: {
    gap: 20,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
  },
  serviceInfo: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
    marginLeft: 8,
  },
  ratingComment: {
    fontSize: 17,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  ratingTime: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 100,
  },

  // Bugün ki Ajanda Stilleri
  agendaSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  agendaContainer: {
    gap: 20,
  },
  agendaItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  agendaItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  agendaItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agendaItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  agendaItemCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appointmentTime: {
    width: 60,
    alignItems: 'center',
  },
  appointmentTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  appointmentDetailsNew: {
    flex: 1,
    marginLeft: 16,
  },
  appointmentCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  appointmentService: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  appointmentVehicle: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  appointmentAction: {
    padding: 8,
  },

  // Aksiyon Öğeleri Stilleri
  actionItemsContainer: {
    gap: 12,
    marginTop: 8,
  },
  actionItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: 64,
  },
  actionItemUrgent: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.2,
    borderColor: '#EF4444',
  },
  actionItemWarning: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.2,
    borderColor: '#F59E0B',
  },
  actionItemIcon: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionItemContent: {
    flex: 1,
  },
  actionItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionItemSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
});
