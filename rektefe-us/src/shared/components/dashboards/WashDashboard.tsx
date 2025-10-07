import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/shared/theme';

const { width } = Dimensions.get('window');

interface WashDashboardProps {
  navigation: any;
  stats: any;
  appointments: any[];
  recentActivity: any[];
  onRefresh: () => void;
  refreshing: boolean;
  unreadNotificationCount: number;
  unreadMessagesCount: number;
  pendingAppointmentsCount: number;
  recentRatings: any[];
  user: any;
}

const WashDashboard: React.FC<WashDashboardProps> = ({
  navigation,
  stats,
  appointments,
  recentActivity,
  onRefresh,
  refreshing,
  unreadNotificationCount,
  unreadMessagesCount,
  pendingAppointmentsCount,
  recentRatings,
  user
}) => {
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Yıkama için özel istatistikler
  const washStats = {
    ...stats,
    todayWashes: appointments.filter(apt => apt.serviceType === 'wash').length,
    completedWashes: appointments.filter(apt => apt.status === 'completed').length,
    averageWashTime: '25', // dakika
    revenuePerHour: '180', // TL
  };

  // Günün saatlerini oluştur (09:00 - 18:00)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isOccupied = Math.random() > 0.7; // Mock data
        
        slots.push({
          time: timeString,
          isOccupied,
          customer: isOccupied ? {
            name: 'Ahmet Yılmaz',
            vehicle: 'Toyota Corolla',
            service: 'İç-Dış Temizlik',
            duration: 30,
            status: 'in_progress'
          } : null,
          isCurrent: new Date().getHours() === hour && new Date().getMinutes() >= minute,
          isPast: new Date().getHours() > hour || (new Date().getHours() === hour && new Date().getMinutes() > minute),
        });
      }
    }
    setTimeSlots(slots);
  };

  useEffect(() => {
    generateTimeSlots();
  }, [selectedDate]);

  // Zaman çizelgesi slot'u
  const renderTimeSlot = (slot: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.timeSlot,
        slot.isOccupied && styles.occupiedSlot,
        slot.isCurrent && styles.currentSlot,
        slot.isPast && !slot.isOccupied && styles.pastSlot,
      ]}
      onPress={() => {
        if (!slot.isOccupied && !slot.isPast) {
          // Yeni randevu ekle
          navigation.navigate('WashService');
        } else if (slot.isOccupied) {
          // Mevcut randevu detayı
          Alert.alert('Randevu Detayı', `${slot.customer.name} - ${slot.customer.vehicle}`);
        }
      }}
    >
      <Text style={[
        styles.timeText,
        slot.isOccupied && styles.occupiedTimeText,
        slot.isCurrent && styles.currentTimeText,
      ]}>
        {slot.time}
      </Text>
      
      {slot.isOccupied && slot.customer && (
        <View style={styles.slotContent}>
          <Text style={styles.customerName} numberOfLines={1}>
            {slot.customer.name}
          </Text>
          <Text style={styles.vehicleName} numberOfLines={1}>
            {slot.customer.vehicle}
          </Text>
          <Text style={styles.serviceName} numberOfLines={1}>
            {slot.customer.service}
          </Text>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              { backgroundColor: slot.customer.status === 'in_progress' ? colors.success.main : colors.warning.main }
            ]} />
            <Text style={styles.statusText}>
              {slot.customer.status === 'in_progress' ? 'Devam Ediyor' : 'Bekliyor'}
            </Text>
          </View>
        </View>
      )}
      
      {!slot.isOccupied && !slot.isPast && (
        <View style={styles.emptySlotContent}>
          <Ionicons name="add" size={16} color={colors.primary.main} />
          <Text style={styles.emptySlotText}>Boş</Text>
        </View>
      )}
      
      {!slot.isOccupied && slot.isPast && (
        <View style={styles.pastSlotContent}>
          <Ionicons name="time" size={16} color={colors.text.tertiary} />
          <Text style={styles.pastSlotText}>Geçti</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Günlük özet widget'ı
  const renderDailySummary = () => (
    <View style={styles.summaryWidget}>
      <Text style={styles.widgetTitle}>Bugünkü Yıkama Hattı</Text>
      <View style={styles.summaryStats}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{washStats.todayWashes}</Text>
          <Text style={styles.summaryLabel}>Toplam Yıkama</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{washStats.completedWashes}</Text>
          <Text style={styles.summaryLabel}>Tamamlanan</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{washStats.averageWashTime}d</Text>
          <Text style={styles.summaryLabel}>Ort. Süre</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{washStats.revenuePerHour}₺/s</Text>
          <Text style={styles.summaryLabel}>Saatlik Gelir</Text>
        </View>
      </View>
    </View>
  );

  // Hızlı işlemler
  const renderQuickActions = () => (
    <View style={styles.quickActionsWidget}>
      <Text style={styles.widgetTitle}>Hızlı İşlemler</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('WashService')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primary.ultraLight }]}>
            <Ionicons name="add-circle" size={24} color={colors.primary.main} />
          </View>
          <Text style={styles.quickActionText}>Hızlı Kayıt</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('CarWash')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.info.ultraLight }]}>
            <Ionicons name="list" size={24} color={colors.info.main} />
          </View>
          <Text style={styles.quickActionText}>Yıkama Yönetimi</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Customers')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.success.ultraLight }]}>
            <Ionicons name="people" size={24} color={colors.success.main} />
          </View>
          <Text style={styles.quickActionText}>Müşteriler</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('CarWash', { screen: 'LoyaltyProgram' })}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.warning.ultraLight }]}>
            <Ionicons name="star" size={24} color={colors.warning.main} />
          </View>
          <Text style={styles.quickActionText}>Sadakat Programı</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Popüler hizmetler
  const renderPopularServices = () => (
    <View style={styles.servicesWidget}>
      <Text style={styles.widgetTitle}>Popüler Hizmetler</Text>
      <View style={styles.servicesList}>
        {[
          { name: 'İç-Dış Temizlik', price: '150₺', duration: '30dk', color: colors.primary.main },
          { name: 'Dış Yıkama', price: '80₺', duration: '15dk', color: colors.info.main },
          { name: 'Detaylı Temizlik', price: '300₺', duration: '60dk', color: colors.success.main },
          { name: 'Motor Temizliği', price: '120₺', duration: '20dk', color: colors.warning.main },
        ].map((service, index) => (
          <TouchableOpacity key={index} style={styles.serviceItem}>
            <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
              <Ionicons name="water" size={16} color={colors.text.inverse} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>{service.name}</Text>
              <Text style={styles.serviceDetails}>{service.price} • {service.duration}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Günlük Özet */}
      {renderDailySummary()}

      {/* Zaman Çizelgesi */}
      <View style={styles.timelineWidget}>
        <Text style={styles.widgetTitle}>Bugünkü Yıkama Sırası</Text>
        <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
          {timeSlots.map((slot, index) => renderTimeSlot(slot, index))}
        </ScrollView>
      </View>

      {/* Hızlı İşlemler */}
      {renderQuickActions()}

      {/* Popüler Hizmetler */}
      {renderPopularServices()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  summaryWidget: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  widgetTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  summaryLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  timelineWidget: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  timelineContainer: {
    maxHeight: 400,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  occupiedSlot: {
    backgroundColor: colors.success.ultraLight,
    borderColor: colors.success.main,
  },
  currentSlot: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary.main,
  },
  pastSlot: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.secondary,
  },
  timeText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    width: 60,
  },
  occupiedTimeText: {
    color: colors.success.main,
  },
  currentTimeText: {
    color: colors.primary.main,
  },
  slotContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  customerName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  vehicleName: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  serviceName: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
  },
  emptySlotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  emptySlotText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary.main,
    marginLeft: spacing.xs,
  },
  pastSlotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  pastSlotText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  quickActionsWidget: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  servicesWidget: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  servicesList: {
    gap: spacing.sm,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
  },
  serviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  serviceDetails: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

export default WashDashboard;
