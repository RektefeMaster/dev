import { apiClient } from '../http/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '@/constants/config';
import { ApiResponse, Mechanic } from '@/shared/types/common';
import { createErrorResponse, createSuccessResponse, ErrorCode } from '../../../../shared/types';

export const ProfileService = {
  async getProfile(): Promise<ApiResponse<Mechanic>> {
    try {
      const response = await apiClient.get('/mechanic/me');
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Get profile error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Profil bilgileri alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getMechanicProfile(): Promise<ApiResponse<Mechanic>> {
    return this.getProfile();
  },

  async updateProfile(data: Partial<Mechanic>): Promise<ApiResponse<Mechanic>> {
    try {
      const response = await apiClient.put('/mechanic/me', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Update profile error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Profil güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateWorkingHours(hours: unknown[]): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/users/working-hours', { hours });
      return response.data;
    } catch (error: unknown) {
      console.error('Update working hours error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Çalışma saatleri güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateServiceCategories(categories: string[]): Promise<ApiResponse<void>> {
    try {
      console.log('🔧 API SERVICE: updateServiceCategories called with:', categories);
      console.log('🔧 API SERVICE: categories type:', typeof categories, 'isArray:', Array.isArray(categories));
      const requestBody = { categories };
      console.log('📤 API SERVICE: Request body:', JSON.stringify(requestBody));
      console.log('📤 API SERVICE: BASE_URL:', API_CONFIG.BASE_URL);
      console.log('📤 API SERVICE: Full URL:', `${API_CONFIG.BASE_URL}/users/service-categories`);
      const response = await apiClient.put('/users/service-categories', requestBody);
      console.log('📥 API SERVICE: Response status:', response.status);
      console.log('📥 API SERVICE: Response data:', JSON.stringify(response.data));
      console.log('📥 API SERVICE: Response.data.success:', response.data?.success);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ API SERVICE: Update service categories error:', error);
      const err = error as any;
      console.error('❌ API SERVICE: Error message:', err.message);
      console.error('❌ API SERVICE: Error response:', err.response?.data);
      console.error('❌ API SERVICE: Error status:', err.response?.status);
      console.error('❌ API SERVICE: Request config:', err.config?.url);
      if (err.response?.status === 403) {
        return createErrorResponse(
          ErrorCode.FORBIDDEN,
          err.response?.data?.message || 'Hizmet kategorilerini değiştirmek için admin yetkisi gereklidir. Lütfen bizimle iletişime geçin.',
          err.response?.data?.error?.details
        );
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        err.response?.data?.message || 'Servis kategorileri güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async updateUserProfile(data: Partial<Mechanic>): Promise<ApiResponse<Mechanic>> {
    try {
      const response = await apiClient.put('/mechanic/me', data);
      return response.data;
    } catch (error: unknown) {
      console.error('Update user profile error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Profil güncellenemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Change password error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Şifre değiştirilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async logout(): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/auth/logout');
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      return createSuccessResponse(null, 'Başarıyla çıkış yapıldı');
    } catch (error: unknown) {
      console.error('Logout error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Çıkış yapılamadı',
        err.response?.data?.error?.details
      );
    }
  }
};
