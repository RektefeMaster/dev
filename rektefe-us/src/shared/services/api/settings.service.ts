import { apiClient } from '../http/client';
import { ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';

export const SettingsService = {
  async getNotificationSettings(): Promise<ApiResponse<{ settings: unknown }>> {
    try {
      const response = await apiClient.get('/users/notification-settings');
      return response.data;
    } catch (error: unknown) {
      console.error('Get notification settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim ayarları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getPrivacySettings(): Promise<ApiResponse<{ settings: unknown }>> {
    try {
      const response = await apiClient.get('/users/privacy-settings');
      return response.data;
    } catch (error: unknown) {
      console.error('Get privacy settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Gizlilik ayarları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getJobSettings(): Promise<ApiResponse<{ settings: unknown }>> {
    try {
      const response = await apiClient.get('/users/job-settings');
      return response.data;
    } catch (error: unknown) {
      console.error('Get job settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş ayarları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getAppSettings(): Promise<ApiResponse<{ settings: unknown }>> {
    try {
      const response = await apiClient.get('/users/app-settings');
      return response.data;
    } catch (error: unknown) {
      console.error('Get app settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Uygulama ayarları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getSecuritySettings(): Promise<ApiResponse<{ settings: unknown }>> {
    try {
      const response = await apiClient.get('/users/security-settings');
      return response.data;
    } catch (error: unknown) {
      console.error('Get security settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Güvenlik ayarları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async updateNotificationSettings(settings: unknown): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/users/notification-settings', settings);
      return response.data;
    } catch (error: unknown) {
      console.error('Update notification settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim ayarları güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updatePrivacySettings(settings: unknown): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/users/privacy-settings', settings);
      return response.data;
    } catch (error: unknown) {
      console.error('Update privacy settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Gizlilik ayarları güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateJobSettings(settings: unknown): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/users/job-settings', settings);
      return response.data;
    } catch (error: unknown) {
      console.error('Update job settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş ayarları güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateAppSettings(settings: unknown): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/users/app-settings', settings);
      return response.data;
    } catch (error: unknown) {
      console.error('Update app settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Uygulama ayarları güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateSecuritySettings(settings: unknown): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/users/security-settings', settings);
      return response.data;
    } catch (error: unknown) {
      console.error('Update security settings error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Güvenlik ayarları güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  }
};
