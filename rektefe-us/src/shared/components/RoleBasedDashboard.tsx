import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '@/shared/theme';
import { useAuth } from '@/shared/context';

// Dashboard Components
import {
  RepairDashboard,
  TowingDashboard,
  WashDashboard,
  TireDashboard,
} from './dashboards';

interface RoleBasedDashboardProps {
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

const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({
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
  const { user: authUser } = useAuth();
  const currentUser = user || authUser;
  const userCapabilities = currentUser?.serviceCategories || [];

  // Ana rolü belirle (öncelik sırasına göre)
  const getPrimaryRole = () => {
    if (userCapabilities.includes('towing') || userCapabilities.includes('Çekici Hizmeti')) {
      return 'towing';
    }
    if (userCapabilities.includes('wash') || userCapabilities.includes('Yıkama Hizmeti')) {
      return 'wash';
    }
    if (userCapabilities.includes('tire') || userCapabilities.includes('Lastik & Parça')) {
      return 'tire';
    }
    if (userCapabilities.includes('repair') || userCapabilities.includes('Tamir & Bakım')) {
      return 'repair';
    }
    return 'repair'; // Varsayılan
  };

  const primaryRole = getPrimaryRole();

  const renderDashboard = () => {
    switch (primaryRole) {
      case 'towing':
        return (
          <TowingDashboard
            navigation={navigation}
            stats={stats}
            appointments={appointments}
            recentActivity={recentActivity}
            onRefresh={onRefresh}
            refreshing={refreshing}
            unreadNotificationCount={unreadNotificationCount}
            unreadMessagesCount={unreadMessagesCount}
            pendingAppointmentsCount={pendingAppointmentsCount}
            recentRatings={recentRatings}
            user={user}
          />
        );
      case 'wash':
        return (
          <WashDashboard
            navigation={navigation}
            stats={stats}
            appointments={appointments}
            recentActivity={recentActivity}
            onRefresh={onRefresh}
            refreshing={refreshing}
            unreadNotificationCount={unreadNotificationCount}
            unreadMessagesCount={unreadMessagesCount}
            pendingAppointmentsCount={pendingAppointmentsCount}
            recentRatings={recentRatings}
            user={user}
          />
        );
      case 'tire':
        return (
          <TireDashboard
            navigation={navigation}
            stats={stats}
            appointments={appointments}
            recentActivity={recentActivity}
            onRefresh={onRefresh}
            refreshing={refreshing}
            unreadNotificationCount={unreadNotificationCount}
            unreadMessagesCount={unreadMessagesCount}
            pendingAppointmentsCount={pendingAppointmentsCount}
            recentRatings={recentRatings}
            user={user}
          />
        );
      case 'repair':
      default:
        return (
          <RepairDashboard
            navigation={navigation}
            stats={stats}
            appointments={appointments}
            recentActivity={recentActivity}
            onRefresh={onRefresh}
            refreshing={refreshing}
            unreadNotificationCount={unreadNotificationCount}
            unreadMessagesCount={unreadMessagesCount}
            pendingAppointmentsCount={pendingAppointmentsCount}
            recentRatings={recentRatings}
            user={user}
          />
        );
    }
  };

  return renderDashboard();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});

export default RoleBasedDashboard;
