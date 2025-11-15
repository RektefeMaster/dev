import { NotificationData, ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const NotificationService = {
  async getNotifications(): Promise<ApiResponse<{ notifications: NotificationData[] }>> {
    try {
      const response = await apiClient.get('/notifications');
      return response.data;
    } catch (error: unknown) {
      console.error('Get notifications error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim listesi alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async markAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error: unknown) {
      console.error('Mark notification as read error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim okundu olarak işaretlenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    return this.markAsRead(id);
  }
};

