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
    console.log('🔍 useNotifications: Bildirimler getiriliyor...');
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const { data, error } = await withErrorHandling(
      () => apiService.getNotifications(),
      { showErrorAlert: false }
    );

    console.log('📱 useNotifications API Response:', JSON.stringify(data, null, 2));
    console.log('📱 useNotifications Error:', error);

    if (data && data.success) {
      // API response formatını kontrol et
      let notificationsData = [];
      if (data.data && Array.isArray(data.data.notifications)) {
        notificationsData = data.data.notifications;
        console.log('✅ useNotifications: notifications array bulundu:', notificationsData.length);
      } else if (Array.isArray(data.data)) {
        notificationsData = data.data;
        console.log('✅ useNotifications: data array bulundu:', notificationsData.length);
      } else {
        console.warn('⚠️ useNotifications: Beklenmeyen API response formatı:', data);
        notificationsData = [];
      }
      setNotifications(notificationsData);
      console.log('✅ useNotifications: Bildirimler state\'e set edildi:', notificationsData.length);
    } else {
      console.log('❌ useNotifications: API başarısız veya data yok');
      setNotifications([]);
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
    if (!notifications || !Array.isArray(notifications)) {
      return [];
    }
    
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

  const unreadCount = notifications && Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0;

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
