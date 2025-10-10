import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { typography, spacing, borderRadius, shadows, dimensions as themeDimensions } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';
import { useTheme } from '@/shared/context';
import { Appointment } from '@/shared/types';

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const { themeColors: colors } = useTheme();
  const styles = createStyles(colors);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [viewMode, setViewMode] = useState<'list'>('list');

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments();
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchAppointments();
      }
    }, [isAuthenticated])
  );

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMechanicAppointments();
      
      if (response.success && response.data) {
        const appointmentsData = Array.isArray(response.data) 
          ? response.data 
          : Array.isArray((response.data as any)?.appointments) 
            ? (response.data as any).appointments 
            : [];
        
        // Gerçek API verisini set et
        setAppointments(appointmentsData);
      } else {
        setAppointments([]);
      }
    } catch (error: any) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    (navigation as any).navigate('AppointmentDetail', { appointmentId: appointment._id });
  };

  const getWeekDates = (weekOffset: number = 0) => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  const getDayAppointments = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      // Tarih karşılaştırmasını düzelt
      const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
      const targetDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return appointmentDateOnly.getTime() === targetDateOnly.getTime();
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B'; // Turuncu - Onay Bekleyen
      case 'confirmed': return '#3B82F6'; // Mavi - Onaylanmış Randevu
      case 'rejected': return '#EF4444'; // Kırmızı - Reddedildi
      case 'in-progress': return '#8B5CF6'; // Mor - Serviste
      case 'completed': return '#10B981'; // Yeşil - Tamamlanmış ve Ödemesi Alınmış
      case 'cancelled': return '#6B7280'; // Gri - İptal Edilmiş
      case 'payment-pending': return '#F59E0B'; // Turuncu - Ödeme Bekleyen
      default: return '#6B7280'; // Gri - Bilinmiyor
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Onay Bekleyen';
      case 'confirmed': return 'Onaylanmış';
      case 'rejected': return 'Reddedildi';
      case 'in-progress': return 'Serviste';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      case 'payment-pending': return 'Ödeme Bekleyen';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'in-progress': return 'construct-outline';
      case 'completed': return 'checkmark-done-outline';
      case 'cancelled': return 'close-outline';
      case 'payment-pending': return 'card-outline';
      default: return 'help-outline';
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  const renderWeekCalendar = () => {
    const weekDays = getWeekDates(currentWeek);
    const today = new Date();

    return (
      <View style={styles.calendarContainer}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Takvim</Text>
              <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
                {currentWeek === 0 ? 'Bu Hafta' : 
                 currentWeek > 0 ? `${currentWeek} Hafta Sonra` : `${Math.abs(currentWeek)} Hafta Önce`}
              </Text>
            </View>
            <View style={styles.headerStats}>
              <View style={[styles.statBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.statText, { color: colors.primary }]}>
                  {appointments.length} Randevu
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Week Navigation */}
        <View style={[styles.weekNavigation, { backgroundColor: colors.background.secondary }]}>
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.background.primary }]}
            onPress={() => navigateWeek('prev')}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          
          <View style={styles.weekInfo}>
            <Text style={[styles.weekText, { color: colors.text.primary }]}>
              {weekDays[0].toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} - {weekDays[6].toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: colors.background.primary }]}
            onPress={() => navigateWeek('next')}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <ScrollView 
          style={styles.calendarScroll} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {weekDays.map((date, dayIndex) => {
            const isToday = date.toDateString() === today.toDateString();
            const dayAppointments = getDayAppointments(date);
            
            return (
              <View key={dayIndex} style={[styles.dayCard, isToday && styles.todayCard]}>
                {/* Day Header */}
                <View style={styles.dayHeader}>
                  <View style={styles.dayInfo}>
                    <Text style={[styles.dayName, isToday && styles.todayDayName]}>
                      {date.toLocaleDateString('tr-TR', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dayDate, isToday && styles.todayDayDate]}>
                      {date.getDate()}
                    </Text>
                  </View>
                  
                  {dayAppointments.length > 0 && (
                    <View style={styles.appointmentCount}>
                      <Text style={styles.countText}>{dayAppointments.length}</Text>
                    </View>
                  )}
                </View>

                {/* Appointments */}
                {dayAppointments.length > 0 ? (
                  <View style={styles.appointmentsList}>
                    {dayAppointments.map((appointment, appIndex) => (
                      <TouchableOpacity
                        key={appIndex}
                        style={styles.appointmentItem}
                        onPress={() => handleAppointmentPress(appointment)}
                      >
                        <View style={styles.appointmentTime}>
                          <Text style={styles.timeText}>
                            {new Date(appointment.appointmentDate).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                        
                        <View style={styles.appointmentContent}>
                          <Text style={styles.customerName}>
                            {appointment.customer?.name} {appointment.customer?.surname}
                          </Text>
                          <Text style={styles.serviceType}>
                            {appointment.serviceType}
                          </Text>
                          {appointment.vehicle && (
                            <Text style={styles.vehicleInfo}>
                              {appointment.vehicle.brand} {appointment.vehicle.modelName}
                            </Text>
                          )}
                        </View>
                        
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                          <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyText}>İş yok</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      {renderWeekCalendar()}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
  },
  calendarContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  statBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  weekInfo: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  calendarScroll: {
    flex: 1,
    paddingHorizontal: themeDimensions.screenPadding,
  },
  dayCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    overflow: 'hidden',
  },
  todayCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  dayInfo: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  todayDayName: {
    color: colors.primary,
  },
  dayDate: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
  },
  todayDayDate: {
    color: colors.primary,
  },
  appointmentCount: {
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  appointmentsList: {
    padding: spacing.md,
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 72,
  },
  appointmentTime: {
    marginRight: spacing.md,
    minWidth: 50,
  },
  timeText: {
    fontSize: typography.body3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  appointmentContent: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  serviceType: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  vehicleInfo: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.tertiary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  emptyDay: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.body3.fontSize,
    color: colors.text.tertiary,
  },

  // Grid View Styles
  viewModeButtons: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  viewModeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeViewMode: {
    backgroundColor: colors.primary,
  },
});

// styles will be created inside component
