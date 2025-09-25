import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { Notification } from '@/shared/types/common';

export const useNotifications = () => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'appointment' | 'system'>('all');

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const { data, error } = await withErrorHandling(
      () => apiService.getNotifications(),
      { showErrorAlert: false }
    );

    if (data && data.success) {
      setNotifications(data.data);
    }

    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    const { data } = await withErrorHandling(
      () => apiService.markNotificationAsRead(notificationId),
      { showErrorAlert: false }
    );

    if (data && data.success) {
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const { data } = await withErrorHandling(
      () => apiService.markAllNotificationsAsRead(),
      { showErrorAlert: false }
    );

    if (data && data.success) {
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const { data } = await withErrorHandling(
      () => apiService.deleteNotification(notificationId),
      { showErrorAlert: false }
    );

    if (data && data.success) {
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
    }
  }, []);

  const filteredNotifications = useCallback(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'appointment':
        return notifications.filter(n => n.type === 'appointment');
      case 'system':
        return notifications.filter(n => n.type === 'system');
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    // State
    notifications: filteredNotifications(),
    allNotifications: notifications,
    loading,
    refreshing,
    filter,
    unreadCount,
    
    // Actions
    setFilter,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    onRefresh: () => fetchNotifications(true),
  };
};
