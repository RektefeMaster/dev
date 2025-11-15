import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';
import { RegisterData, ApiResponse, Mechanic } from '@/shared/types/common';
import { UserType, createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const AuthService = {
  async register(data: RegisterData): Promise<ApiResponse<{ user: Mechanic; token: string }>> {
    try {
      const response = await apiClient.post('/auth/register', {
        ...data,
        userType: UserType.MECHANIC
      });
      
      if (response.data.success && response.data.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        console.error('Register error:', (error as any).response?.status || (error as any).message);
      }
      
      const err = error as any;
      if (err.response?.data?.message) {
        return createErrorResponse(
          err.response.data.error?.code || ErrorCode.INTERNAL_SERVER_ERROR,
          err.response.data.message,
          err.response?.data?.error?.details
        );
      }
      
      if (err.response?.data?.error?.message) {
        return createErrorResponse(
          ErrorCode.VALIDATION_FAILED,
          err.response.data.error.message,
          err.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        err.message || 'Kayıt işlemi sırasında bir hata oluştu',
        err.response?.data?.error?.details
      );
    }
  },

  async login(email: string, password: string): Promise<ApiResponse<{ user: Mechanic; token: string }>> {
    try {
      if (__DEV__) {
        console.log('Login attempt:', email);
      }
      
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        userType: UserType.MECHANIC
      });
      
      if (response.data.success && response.data.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.data.token);
        
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.data.refreshToken);
        }
        
        if (__DEV__) {
          console.log('Login successful');
        }
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        console.error('Login error:', (error as any).response?.status || (error as any).message);
      }
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INVALID_CREDENTIALS,
        err.response?.data?.message || 'Giriş bilgileri hatalı',
        err.response?.data?.error?.details
      );
    }
  },

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }
      
      const response = await apiClient.post('/auth/refresh-token', {
        refreshToken
      });
      
      if (response.data.success && response.data.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error: unknown) {
      if (__DEV__) {
        console.error('Refresh token error:', (error as any).response?.status || (error as any).message);
      }
      return createErrorResponse(
        ErrorCode.REFRESH_TOKEN_EXPIRED,
        'Token yenileme başarısız',
        (error as any).response?.data?.error?.details
      );
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      if (__DEV__) {
        console.error('Logout error:', error);
      }
    } finally {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ID
      ]);
    }
  },

  async verifyEmail(code: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/auth/verify-email', { code });
      return response.data;
    } catch (error: unknown) {
      console.error('Verify email error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'E-posta doğrulanamadı', (error as any).response?.data?.error?.details);
    }
  },

  async sendEmailVerification(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/auth/send-verification');
      return response.data;
    } catch (error: unknown) {
      console.error('Send email verification error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Doğrulama e-postası gönderilemedi', (error as any).response?.data?.error?.details);
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: unknown) {
      console.error('Forgot password error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Şifre sıfırlama e-postası gönderilemedi', (error as any).response?.data?.error?.details);
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error: unknown) {
      console.error('Reset password error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Şifre sıfırlanamadı', (error as any).response?.data?.error?.details);
    }
  }
};

