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

interface TireDashboardProps {
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

const TireDashboard: React.FC<TireDashboardProps> = ({
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
  const [tireHotelData, setTireHotelData] = useState({
    totalTires: 120,
    winterTires: 45,
    summerTires: 75,
    dueForChange: 15,
  });

  // Lastik için özel istatistikler
  const tireStats = {
    ...stats,
    todayJobs: appointments.filter(apt => apt.serviceType === 'tire').length,
    completedJobs: appointments.filter(apt => apt.status === 'completed').length,
    averageJobTime: '35', // dakika
    seasonalRevenue: '12,500', // TL
  };

  // Bugünkü ajanda öğeleri
  const todayAgendaItems = appointments
    .filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      const today = new Date();
      return aptDate.toDateString() === today.toDateString() && apt.serviceType === 'tire';
    })
    .map(apt => ({
      id: apt._id,
      time: new Date(apt.appointmentDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      customer: `${apt.userId?.name || ''} ${apt.userId?.surname || ''}`.trim(),
      vehicle: `${apt.vehicleId?.brand || ''} ${apt.vehicleId?.modelName || ''}`.trim(),
      service: apt.notes || 'Lastik değişimi',
      status: apt.status,
    }));

  // Lastik Oteli widget'ı
  const renderTireHotelWidget = () => (
    <View style={styles.tireHotelWidget}>
      <View style={styles.widgetHeader}>
        <Text style={styles.widgetTitle}>Lastik Oteli Yönetimi</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TireHotel')}>
          <Text style={styles.widgetActionText}>Yönet</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.tireHotelStats}>
        <View style={styles.tireStatItem}>
          <View style={styles.tireStatIcon}>
            <Ionicons name="car" size={20} color={colors.primary.main} />
          </View>
          <View style={styles.tireStatContent}>
            <Text style={styles.tireStatValue}>{tireHotelData.totalTires}</Text>
            <Text style={styles.tireStatLabel}>Toplam Lastik</Text>
          </View>
        </View>

        <View style={styles.tireStatItem}>
          <View style={styles.tireStatIcon}>
            <Ionicons name="snow" size={20} color={colors.info.main} />
          </View>
          <View style={styles.tireStatContent}>
            <Text style={styles.tireStatValue}>{tireHotelData.winterTires}</Text>
            <Text style={styles.tireStatLabel}>Kış Lastiği</Text>
          </View>
        </View>

        <View style={styles.tireStatItem}>
          <View style={styles.tireStatIcon}>
            <Ionicons name="sunny" size={20} color={colors.warning.main} />
          </View>
          <View style={styles.tireStatContent}>
            <Text style={styles.tireStatValue}>{tireHotelData.summerTires}</Text>
            <Text style={styles.tireStatLabel}>Yaz Lastiği</Text>
          </View>
        </View>

        <View style={styles.tireStatItem}>
          <View style={styles.tireStatIcon}>
            <Ionicons name="alert-circle" size={20} color={colors.error.main} />
          </View>
          <View style={styles.tireStatContent}>
            <Text style={styles.tireStatValue}>{tireHotelData.dueForChange}</Text>
            <Text style={styles.tireStatLabel}>Değişim Zamanı</Text>
          </View>
        </View>
      </View>

      {/* Proaktif Aksiyon Butonu */}
      {tireHotelData.dueForChange > 0 && (
        <TouchableOpacity style={styles.proactiveActionButton}>
          <Ionicons name="notifications" size={20} color={colors.text.inverse} />
          <Text style={styles.proactiveActionText}>
            {tireHotelData.dueForChange} müşteriye hatırlatma gönder
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Bugünkü ajanda widget'ı
  const renderTodayAgendaWidget = () => (
    <View style={styles.widget}>
      <View style={styles.widgetHeader}>
        <Text style={styles.widgetTitle}>Bugünkü Lastik İşleri</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
          <Text style={styles.widgetActionText}>Tümünü Gör</Text>
        </TouchableOpacity>
      </View>
      
      {todayAgendaItems.length > 0 ? (
        <View style={styles.agendaList}>
          {todayAgendaItems.slice(0, 4).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.agendaItem}
              onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
            >
              <View style={styles.agendaTimeContainer}>
                <Text style={styles.agendaTime}>{item.time}</Text>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              </View>
              <View style={styles.agendaContent}>
                <Text style={styles.agendaCustomer}>{item.customer}</Text>
                <Text style={styles.agendaVehicle}>{item.vehicle}</Text>
                <Text style={styles.agendaService} numberOfLines={1}>{item.service}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyAgenda}>
          <Ionicons name="car-outline" size={32} color={colors.text.tertiary} />
          <Text style={styles.emptyAgendaText}>Bugün için lastik işi yok</Text>
        </View>
      )}
    </View>
  );

  // Hızlı eylemler
  const renderQuickActions = () => (
    <View style={styles.widget}>
      <Text style={styles.widgetTitle}>Hızlı Eylemler</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('TireService')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primary.ultraLight }]}>
            <Ionicons name="add-circle" size={24} color={colors.primary.main} />
          </View>
          <Text style={styles.quickActionText}>Yeni İş</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => Alert.alert('QR Tarayıcı', 'QR kod tarayıcı açılacak')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.info.ultraLight }]}>
            <Ionicons name="qr-code" size={24} color={colors.info.main} />
          </View>
          <Text style={styles.quickActionText}>QR Tarayıcı</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('ServiceCatalog')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.success.ultraLight }]}>
            <Ionicons name="list" size={24} color={colors.success.main} />
          </View>
          <Text style={styles.quickActionText}>Hizmetler</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickActionItem}
          onPress={() => navigation.navigate('Customers')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.warning.ultraLight }]}>
            <Ionicons name="people" size={24} color={colors.warning.main} />
          </View>
          <Text style={styles.quickActionText}>Müşteriler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Mevsimsel uyarılar
  const renderSeasonalAlerts = () => {
    const currentMonth = new Date().getMonth();
    const isWinterSeason = currentMonth >= 10 || currentMonth <= 2;
    const isSummerSeason = currentMonth >= 3 && currentMonth <= 9;

    return (
      <View style={styles.seasonalWidget}>
        <View style={styles.seasonalHeader}>
          <Ionicons 
            name={isWinterSeason ? "snow" : "sunny"} 
            size={24} 
            color={isWinterSeason ? colors.info.main : colors.warning.main} 
          />
          <Text style={styles.seasonalTitle}>
            {isWinterSeason ? 'Kış Sezonu' : 'Yaz Sezonu'}
          </Text>
        </View>
        
        <Text style={styles.seasonalMessage}>
          {isWinterSeason 
            ? 'Kış lastiği sezonu aktif. Müşterilerinize hatırlatma gönderebilirsiniz.'
            : 'Yaz lastiği sezonu aktif. Kış lastiklerini depolayabilirsiniz.'
          }
        </Text>

        <TouchableOpacity style={styles.seasonalActionButton}>
          <Text style={styles.seasonalActionText}>
            {isWinterSeason ? 'Kış Lastiği Hatırlatması Gönder' : 'Yaz Lastiği Hatırlatması Gönder'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Günlük istatistikler
  const renderDailyStats = () => (
    <View style={styles.widget}>
      <Text style={styles.widgetTitle}>Günlük Özet</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tireStats.todayJobs}</Text>
          <Text style={styles.statLabel}>Bugünkü İşler</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tireStats.completedJobs}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tireStats.averageJobTime}d</Text>
          <Text style={styles.statLabel}>Ort. Süre</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tireStats.seasonalRevenue}₺</Text>
          <Text style={styles.statLabel}>Sezonluk Gelir</Text>
        </View>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning.main;
      case 'confirmed': return colors.info.main;
      case 'in-progress': return colors.primary.main;
      case 'completed': return colors.success.main;
      default: return colors.text.tertiary;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Lastik Oteli Widget */}
      {renderTireHotelWidget()}

      {/* Mevsimsel Uyarılar */}
      {renderSeasonalAlerts()}

      {/* Bugünkü Ajanda */}
      {renderTodayAgendaWidget()}

      {/* Hızlı Eylemler */}
      {renderQuickActions()}

      {/* Günlük İstatistikler */}
      {renderDailyStats()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
  },
  widget: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  widgetTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  widgetActionText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary.main,
    fontWeight: '600',
  },
  tireHotelWidget: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  tireHotelStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  tireStatItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tireStatIcon: {
    marginRight: spacing.md,
  },
  tireStatContent: {
    flex: 1,
  },
  tireStatValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tireStatLabel: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
  },
  proactiveActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  proactiveActionText: {
    color: colors.text.inverse,
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  seasonalWidget: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.info.main,
    ...shadows.small,
  },
  seasonalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  seasonalTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  seasonalMessage: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  seasonalActionButton: {
    backgroundColor: colors.info.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  seasonalActionText: {
    color: colors.text.inverse,
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
  },
  agendaList: {
    gap: spacing.sm,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  agendaTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  agendaTime: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  agendaContent: {
    flex: 1,
  },
  agendaCustomer: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  agendaVehicle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  agendaService: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  emptyAgenda: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyAgendaText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});

export default TireDashboard;
