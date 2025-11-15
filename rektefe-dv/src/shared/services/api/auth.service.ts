/**
 * Auth Service
 * Bu dosya Cursor worktree hatası nedeniyle oluşturulmuştur.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';
import { apiClient } from '../http/client';
import { createErrorResponse, ErrorCode } from '@shared/types';
import type { ApiResponse, RegisterData, Driver, UserType } from '../../types/common';

const UserTypeEnum = {
  DRIVER: 'söför' as const
};

/**
 * Authentication Service - Kimlik doğrulama servisleri
 */
export const AuthService = {
  /**
   * Kullanıcı kaydı
   */
  async register(data: RegisterData): Promise<ApiResponse<{ user: Driver; token: string }>> {
    try {
      const response = await apiClient.post('/auth/register', {
        ...data,
        userType: UserTypeEnum.DRIVER
      });
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const refreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = userData?._id || userData?.id;
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_ISSUED_AT, Date.now().toString());
        }
        
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        } else if (__DEV__) {
          console.warn('Refresh token register response\'unda yok!');
        }
        
        if (userId) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        }
        
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
        
        if (__DEV__) {
          console.log('Register successful');
        }
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Register error:', error.response?.status || error.message);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kayıt işlemi sırasında bir hata oluştu',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kullanıcı girişi
   */
  async login(email: string, password: string): Promise<ApiResponse<{ user: Driver; token: string }>> {
    try {
      if (__DEV__) {
        console.log('Login attempt:', email);
      }
      
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        userType: UserTypeEnum.DRIVER
      });
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const refreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = response.data.data.userId || userData?._id || userData?.id;
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_ISSUED_AT, Date.now().toString());
        }
        
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        } else if (__DEV__) {
          console.warn('Refresh token login response\'unda yok!');
        }
        
        if (userId) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        }
        
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
        
        if (__DEV__) {
          console.log('Login successful');
        }
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Login error:', error.response?.status || error.message);
      }
      return createErrorResponse(
        ErrorCode.INVALID_CREDENTIALS,
        error.response?.data?.message || 'Giriş bilgileri hatalı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Token yenileme
   * NOT: Bu fonksiyon genellikle response interceptor tarafından otomatik çağrılır
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        if (__DEV__) {
          console.error('Refresh token bulunamadı');
        }
        throw new Error('Refresh token not found');
      }
      
      if (__DEV__) {
        console.log('Manual refresh token işlemi başlatılıyor...');
      }
      
      const response = await apiClient.post('/auth/refresh-token', {
        refreshToken
      });
      
      // Yeni token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const newRefreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = userData?._id || userData?.id;
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_ISSUED_AT, Date.now().toString());
        }
        
        if (newRefreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }
        
        if (userId) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        }
        
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
        
        if (__DEV__) {
          console.log('Manual refresh token successful');
        }
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Refresh token error:', error.response?.status || error.message);
      }
      return createErrorResponse(
        ErrorCode.REFRESH_TOKEN_EXPIRED,
        'Token yenileme başarısız',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Çıkış yapma
   */
  async logout(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('Logout işlemi başlatılıyor...');
      }
      await apiClient.post('/auth/logout');
    } catch (error) {
      if (__DEV__) {
        console.error('Logout API hatası:', error);
      }
      // API hatası olsa bile devam et, storage'ı temizle
    } finally {
      // Tüm auth verilerini temizle
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.TOKEN_ISSUED_AT
      ]);
      if (__DEV__) {
        console.log('Logout tamamlandı');
      }
    }
  }
};


