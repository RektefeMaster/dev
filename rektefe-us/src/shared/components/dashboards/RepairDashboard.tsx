import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '@/shared/theme';
import { CardNav } from '@/shared/components';

interface RepairDashboardProps {
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

const RepairDashboard: React.FC<RepairDashboardProps> = ({
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
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [waitingParts, setWaitingParts] = useState<any[]>([]);

  // Tamir ve Bakım için özel istatistikler
  const repairStats = {
    ...stats,
    pendingDiagnosis: appointments.filter(apt => apt.status === 'pending').length,
    waitingForParts: appointments.filter(apt => apt.status === 'waiting_parts').length,
    inProgress: appointments.filter(apt => apt.status === 'in-progress').length,
    completedToday: appointments.filter(apt => apt.status === 'completed').length,
  };

  // Bugünkü ajanda öğeleri
  const todayAgendaItems = appointments
    .filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      const today = new Date();
      return aptDate.toDateString() === today.toDateString();
    })
    .map(apt => ({
      id: apt._id,
      time: new Date(apt.appointmentDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      customer: `${apt.userId?.name || ''} ${apt.userId?.surname || ''}`.trim(),
      vehicle: `${apt.vehicleId?.brand || ''} ${apt.vehicleId?.modelName || ''}`.trim(),
      issue: apt.notes || 'Arıza tespiti yapılacak',
      status: apt.status,
      priority: getPriority(apt.status)
    }));

  const getPriority = (status: string) => {
    switch (status) {
      case 'pending': return 'high';
      case 'waiting_parts': return 'medium';
      case 'in-progress': return 'high';
      default: return 'low';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.error.main;
      case 'medium': return colors.warning.main;
      case 'low': return colors.success.main;
      default: return colors.text.tertiary;
    }
  };

  // Durum bekleyen işler widget'ı
  const renderPendingJobsWidget = () => (
    <View style={styles.widget}>
      <Text style={styles.widgetTitle}>Durum Bekleyen İşler</Text>
      <View style={styles.widgetGrid}>
        <TouchableOpacity style={styles.widgetItem} onPress={() => navigation.navigate('Appointments')}>
          <View style={[styles.widgetBadge, { backgroundColor: colors.error.main }]}>
            <Text style={styles.widgetBadgeText}>{repairStats.pendingDiagnosis}</Text>
          </View>
          <Text style={styles.widgetItemText}>Onay Bekliyor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.widgetItem} onPress={() => navigation.navigate('Appointments')}>
          <View style={[styles.widgetBadge, { backgroundColor: colors.warning.main }]}>
            <Text style={styles.widgetBadgeText}>{repairStats.waitingForParts}</Text>
          </View>
          <Text style={styles.widgetItemText}>Parça Bekleniyor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.widgetItem} onPress={() => navigation.navigate('Appointments')}>
          <View style={[styles.widgetBadge, { backgroundColor: colors.info.main }]}>
            <Text style={styles.widgetBadgeText}>{repairStats.inProgress}</Text>
          </View>
          <Text style={styles.widgetItemText}>İşleme Alındı</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Bugünkü ajanda widget'ı
  const renderTodayAgendaWidget = () => (
    <View style={styles.widget}>
      <View style={styles.widgetHeader}>
        <Text style={styles.widgetTitle}>Bugünkü Ajandanız</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
          <Text style={styles.widgetActionText}>Tümünü Gör</Text>
        </TouchableOpacity>
      </View>
      {todayAgendaItems.length > 0 ? (
        <View style={styles.agendaList}>
          {todayAgendaItems.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.agendaItem}
              onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
            >
              <View style={styles.agendaTimeContainer}>
                <Text style={styles.agendaTime}>{item.time}</Text>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
              </View>
              <View style={styles.agendaContent}>
                <Text style={styles.agendaCustomer}>{item.customer}</Text>
                <Text style={styles.agendaVehicle}>{item.vehicle}</Text>
                <Text style={styles.agendaIssue} numberOfLines={1}>{item.issue}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyAgenda}>
          <Ionicons name="calendar-outline" size={32} color={colors.text.tertiary} />
          <Text style={styles.emptyAgendaText}>Bugün için randevu yok</Text>
        </View>
      )}
    </View>
  );

  // Hızlı eylemler widget'ı
  const renderQuickActionsWidget = () => (
    <View style={styles.widget}>
      <Text style={styles.widgetTitle}>Hızlı Eylemler</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('QuickQuote')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primary.ultraLight }]}>
            <Ionicons name="document-text" size={24} color={colors.primary.main} />
          </View>
          <Text style={styles.quickActionText}>Teklif Oluştur</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('ServiceCatalog')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.info.ultraLight }]}>
            <Ionicons name="list" size={24} color={colors.info.main} />
          </View>
          <Text style={styles.quickActionText}>Hizmet Kataloğu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('Suppliers')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.warning.ultraLight }]}>
            <Ionicons name="business" size={24} color={colors.warning.main} />
          </View>
          <Text style={styles.quickActionText}>Parçacılar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('Bodywork')}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.warning.ultraLight }]}>
            <Ionicons name="construct" size={24} color={colors.warning.main} />
          </View>
          <Text style={styles.quickActionText}>Kaporta/Boya</Text>
        </TouchableOpacity>
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
      {/* Durum Bekleyen İşler */}
      {renderPendingJobsWidget()}

      {/* Bugünkü Ajanda */}
      {renderTodayAgendaWidget()}

      {/* Hızlı Eylemler */}
      {renderQuickActionsWidget()}

      {/* Genel İstatistikler */}
      <View style={styles.widget}>
        <Text style={styles.widgetTitle}>Günlük Özet</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{repairStats.completedToday}</Text>
            <Text style={styles.statLabel}>Tamamlanan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{repairStats.todayEarnings}₺</Text>
            <Text style={styles.statLabel}>Kazanç</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{repairStats.averageRating}/5</Text>
            <Text style={styles.statLabel}>Puan</Text>
          </View>
        </View>
      </View>
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
  widgetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  widgetItem: {
    alignItems: 'center',
    flex: 1,
  },
  widgetBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  widgetBadgeText: {
    color: colors.text.inverse,
    fontSize: typography.h4.fontSize,
    fontWeight: 'bold',
  },
  widgetItemText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
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
  priorityDot: {
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
  agendaIssue: {
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

export default RepairDashboard;
