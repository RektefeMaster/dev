import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Rating } from '../types/common';
import { DrawerActions } from '@react-navigation/native';

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
  const [recentRatings, setRecentRatings] = useState<Rating[]>([]);
  
  // Real-time güncelleme için
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🔍 HomeScreen: useEffect - isAuthenticated:', isAuthenticated, 'user:', !!user);
    
    if (isAuthenticated && user) {
      console.log('✅ HomeScreen: Kullanıcı authenticated, dashboard verisi çekiliyor');
      fetchDashboardData();
      startAutoRefresh();
    } else {
      console.log('⚠️ HomeScreen: Kullanıcı authenticated değil, loading false yapılıyor');
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

  // Sayfa odaklandığında veri yenile
  useFocusEffect(
    useCallback(() => {
      console.log('🔍 HomeScreen: useFocusEffect - isAuthenticated:', isAuthenticated, 'user:', !!user);
      if (isAuthenticated && user) {
        console.log('✅ HomeScreen: Sayfa odaklandı, dashboard verisi yenileniyor');
        fetchDashboardData();
      } else {
        console.log('⚠️ HomeScreen: Sayfa odaklandı ama kullanıcı authenticated değil');
      }
    }, [isAuthenticated, user])
  );

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App aktif olduğunda veri yenile
      if (isAuthenticated && user) {
        console.log('🔄 HomeScreen: App state değişti, dashboard verisi yenileniyor');
        fetchDashboardData();
      } else {
        console.log('⚠️ HomeScreen: App state değişti ama kullanıcı authenticated değil');
      }
    }
    appState.current = nextAppState;
  };

  const startAutoRefresh = () => {
    // Her 15 saniyede bir veri yenile (daha sık güncelleme)
    intervalRef.current = setInterval(() => {
      if (isAuthenticated && user && appState.current === 'active') {
        console.log('🔄 HomeScreen: Auto refresh - dashboard verisi yenileniyor');
        fetchDashboardData(false); // Loading gösterme
      } else {
        console.log('⚠️ HomeScreen: Auto refresh - kullanıcı authenticated değil veya app aktif değil');
      }
    }, 15000);
  };

  const fetchDashboardData = async (showLoading = true) => {
    try {
      // Authentication kontrolü
      if (!isAuthenticated || !user) {
        console.log('⚠️ HomeScreen: Kullanıcı authenticated değil, API çağrıları yapılmıyor');
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      
      console.log('🔍 HomeScreen: API çağrıları başlatılıyor, kullanıcı:', user._id);
      
      // Paralel olarak tüm verileri çek
      const [
        todayAppointmentsRes,
        todayCompletedRes,
        activityRes,
        ratingsRes,
        ratingStatsRes,
        appointmentStatsRes
      ] = await Promise.allSettled([
        apiService.getMechanicAppointments('confirmed'),
        apiService.getMechanicAppointments('completed'),
        apiService.getRecentActivity(),
        apiService.getRecentRatings(),
        apiService.getRatingStats(),
        apiService.getAppointmentStats()
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
        const activities = Array.isArray(activityRes.value.data) 
          ? activityRes.value.data 
          : [];
        
        // Mevcut activity formatını yeni formata dönüştür
        const formattedActivities = activities.map((activity: any) => ({
          _id: activity.id || activity._id,
          type: activity.type || 'appointment_created',
          description: activity.title || activity.description || getActivityDescription(activity.type || 'appointment_created'),
          createdAt: activity.time ? new Date(activity.time) : new Date(),
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

    } catch (error) {
      console.error('Dashboard veri çekme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(false); // Loading gösterme
    setRefreshing(false);
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

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
      
      {/* Modern Header with Clean Design */}
      <View style={styles.modernHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={openDrawer}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="menu" size={24} color="#1E293B" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Support')}
          >
            <Ionicons name="notifications" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerGreeting}>
            {getGreeting()}, {getPersonalGreeting(user?.name)}
          </Text>
          <Text style={styles.headerSubtitle}>
            Bugün {stats.todayConfirmedAppointments} onaylanan randevun var
          </Text>

        </View>

        {/* Modern Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="briefcase" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.statNumber}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>Aktif İş</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="cash" size={22} color="#10B981" />
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
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Ortalama Puan</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          </View>
          
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Appointments')}
            >
              <View style={[styles.quickActionGradient, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="briefcase" size={28} color="#10B981" />
              </View>
              <Text style={styles.quickActionText}>Randevular</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Wallet')}
            >
              <View style={[styles.quickActionGradient, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="wallet" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionText}>Cüzdan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Appointments with Modern Cards */}
        <View style={styles.appointmentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bugünün Randevuları</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          {todayAppointments.length > 0 ? (
            <View style={styles.appointmentsList}>
              {todayAppointments.map((appointment, index) => (
                <TouchableOpacity 
                  key={appointment._id || index} 
                  style={styles.appointmentCard}
                  onPress={() => navigation.navigate('AppointmentDetail' as any, { appointmentId: appointment._id })}
                >
                  <View style={styles.appointmentHeader}>
                    <View style={styles.timeContainer}>
                      <Ionicons name="time-outline" size={16} color="#667eea" />
                      <Text style={styles.timeText}>
                        {appointment.timeSlot || new Date(appointment.appointmentDate).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(appointment.status) }
                      ]}>
                        {getStatusText(appointment.status)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.appointmentDetails}>
                    <View style={styles.customerRow}>
                      <Ionicons name="person-outline" size={16} color="#64748B" />
                      <Text style={styles.customerName}>
                        {typeof appointment.userId === 'string' 
                          ? appointment.userId 
                          : `${appointment.userId?.name || 'Bilinmeyen'} ${appointment.userId?.surname || 'Müşteri'}`
                        }
                      </Text>
                    </View>
                    
                    <View style={styles.serviceRow}>
                      <Ionicons name="construct-outline" size={16} color="#64748B" />
                      <Text style={styles.serviceType}>{appointment.serviceType}</Text>
                    </View>
                    
                    {appointment.vehicleId && (
                      <View style={styles.vehicleRow}>
                        <Ionicons name="car-outline" size={16} color="#64748B" />
                        <Text style={styles.vehicleInfo}>
                          {typeof appointment.vehicleId === 'string' 
                            ? appointment.vehicleId
                            : `${appointment.vehicleId?.brand || 'Bilinmeyen'} ${appointment.vehicleId?.modelName || 'Araç'}`
                          }
                          {typeof appointment.vehicleId === 'object' && appointment.vehicleId?.plateNumber && 
                            ` (${appointment.vehicleId.plateNumber})`
                          }
                        </Text>
                      </View>
                    )}

                    {appointment.notes && (
                      <View style={styles.notesRow}>
                        <Ionicons name="document-text-outline" size={16} color="#64748B" />
                        <Text style={styles.notesText}>{appointment.notes}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyAppointments}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Bugün Randevu Yok</Text>
              <Text style={styles.emptyText}>
                Yeni randevu talepleri burada görünecek
              </Text>
            </View>
          )}
        </View>

        {/* Recent Activity with Real Data */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Support')}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          {recentActivity.length > 0 ? (
            <View style={styles.activityList}>
              {recentActivity.slice(0, 5).map((activity, index) => (
                <View key={activity._id || index} style={styles.activityItem}>
                  <View style={[
                    styles.activityIcon, 
                    { backgroundColor: getActivityBgColor(activity.type) }
                  ]}>
                    <Ionicons name={getActivityIcon(activity.type)} size={20} color={getActivityColor(activity.type)} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.description}</Text>
                    {activity.amount && (
                      <Text style={styles.activityAmount}>
                        {activity.type.includes('payment') || activity.type.includes('completed') ? '₺' : ''}{Number(activity.amount).toLocaleString('tr-TR')}
                      </Text>
                    )}
                    <Text style={styles.activityTime}>
                      {new Date(activity.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyAppointments}>
              <Ionicons name="time-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Henüz Aktivite Yok</Text>
              <Text style={styles.emptyText}>Yeni işler yapıldıkça burada görünecek</Text>
            </View>
          )}
        </View>

        {/* Recent Ratings */}
        {recentRatings.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Değerlendirmeler</Text>
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
                          {rating.appointment?.serviceType || rating.appointmentId || 'Servis'}
                        </Text>
                      </View>
                      <View style={styles.ratingStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= rating.rating ? 'star' : 'star-outline'}
                            size={16}
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

      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  menuButton: {
    padding: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  headerContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 17,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },

  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 6,
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 0,
    minWidth: 0, // Taşmayı önle
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
    minHeight: 26,
  },
  statNumberSmall: {
    fontSize: 18,
    minHeight: 26,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  quickActionsSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  seeAllText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    minWidth: 110,
    flex: 1,
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  appointmentsSection: {
    marginTop: 30,
  },
  appointmentsList: {
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
  },
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  activityIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
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
    gap: 16,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  customerInfo: {
    flex: 1,
  },
  serviceInfo: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 8,
  },
  ratingComment: {
    fontSize: 17,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 14,
    fontWeight: '500',
  },
  ratingTime: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
