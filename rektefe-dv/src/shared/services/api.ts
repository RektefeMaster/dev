/**
 * REKTEFE DRIVER APP - API SERVICE
 * 
 * Bu dosya, driver uygulaması için optimize edilmiş API servislerini içerir.
 * Tüm API çağrıları type-safe ve error handling ile yapılır.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '@/constants/config';
import { 
  RegisterData, 
  VehicleData, 
  AppointmentData, 
  MessageData, 
  NotificationData,
  ApiResponse,
  Driver,
  Mechanic
} from '@/shared/types/common';
import { 
  AppointmentStatus, 
  ServiceType, 
  UserType,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '../../../../shared/types';

// ===== API CLIENT CONFIGURATION =====

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== REQUEST INTERCEPTOR =====

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Request ID ekle
      config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ===== RESPONSE INTERCEPTOR =====

apiClient.interceptors.response.use(
  (response) => {
    // Success response'ları logla
    console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    // Error response'ları logla
    console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
    
    // 401 Unauthorized - token'ı temizle ve login'e yönlendir
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      // Navigation to login screen would be handled by the app
    }
    
    return Promise.reject(error);
  }
);

// ===== AUTHENTICATION SERVICES =====

export const AuthService = {
  /**
   * Kullanıcı kaydı
   */
  async register(data: RegisterData): Promise<ApiResponse<{ user: Driver; token: string }>> {
    try {
      const response = await apiClient.post('/api/auth/register', {
        ...data,
        userType: UserType.DRIVER
      });
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
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
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
        userType: UserType.DRIVER
      });
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      return createErrorResponse(
        ErrorCode.INVALID_CREDENTIALS,
        'Giriş bilgileri hatalı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Token yenileme
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }
      
      const response = await apiClient.post('/api/auth/refresh', {
        refreshToken
      });
      
      // Yeni token'ı storage'a kaydet
      if (response.data.success && response.data.data.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Refresh token error:', error);
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
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Token'ları temizle
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
  }
};

// ===== VEHICLE SERVICES =====

export const VehicleService = {
  /**
   * Araç listesi
   */
  async getVehicles(): Promise<ApiResponse<{ vehicles: any[] }>> {
    try {
      const response = await apiClient.get('/api/vehicles');
      return response.data;
    } catch (error: any) {
      console.error('Get vehicles error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Araç listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yeni araç ekleme
   */
  async addVehicle(data: VehicleData): Promise<ApiResponse<{ vehicle: any }>> {
    try {
      const response = await apiClient.post('/api/vehicles', data);
      return response.data;
    } catch (error: any) {
      console.error('Add vehicle error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Araç eklenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Araç güncelleme
   */
  async updateVehicle(id: string, data: Partial<VehicleData>): Promise<ApiResponse<{ vehicle: any }>> {
    try {
      const response = await apiClient.put(`/api/vehicles/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Update vehicle error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Araç güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Araç silme
   */
  async deleteVehicle(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/api/vehicles/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete vehicle error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Araç silinemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== APPOINTMENT SERVICES =====

export const AppointmentService = {
  /**
   * Randevu listesi
   */
  async getAppointments(status?: AppointmentStatus): Promise<ApiResponse<{ appointments: any[] }>> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/api/appointments', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get appointments error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yeni randevu oluşturma
   */
  async createAppointment(data: AppointmentData): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.post('/api/appointments', data);
      return response.data;
    } catch (error: any) {
      console.error('Create appointment error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Randevu güncelleme
   */
  async updateAppointment(id: string, data: Partial<AppointmentData>): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.put(`/api/appointments/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Update appointment error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Randevu iptal etme
   */
  async cancelAppointment(id: string): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.put(`/api/appointments/${id}`, {
        status: AppointmentStatus.CANCELLED
      });
      return response.data;
    } catch (error: any) {
      console.error('Cancel appointment error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu iptal edilemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== MECHANIC SERVICES =====

export const MechanicService = {
  /**
   * Usta listesi
   */
  async getMechanics(filters?: any): Promise<ApiResponse<{ mechanics: Mechanic[] }>> {
    try {
      const response = await apiClient.get('/api/mechanics', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Get mechanics error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Usta listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yakındaki ustalar
   */
  async getNearbyMechanics(location: { latitude: number; longitude: number }, maxDistance: number = 10): Promise<ApiResponse<{ mechanics: Mechanic[] }>> {
    try {
      const response = await apiClient.get('/api/mechanics/nearby', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          maxDistance
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get nearby mechanics error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yakındaki ustalar alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Usta detayları
   */
  async getMechanicDetails(id: string): Promise<ApiResponse<{ mechanic: Mechanic }>> {
    try {
      const response = await apiClient.get(`/api/mechanics/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic details error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Usta detayları alınamadı',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== MESSAGE SERVICES =====

export const MessageService = {
  /**
   * Mesaj listesi
   */
  async getMessages(conversationId: string): Promise<ApiResponse<{ messages: MessageData[] }>> {
    try {
      const response = await apiClient.get(`/api/messages/${conversationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get messages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Mesaj gönderme
   */
  async sendMessage(data: MessageData): Promise<ApiResponse<{ message: MessageData }>> {
    try {
      const response = await apiClient.post('/api/messages', data);
      return response.data;
    } catch (error: any) {
      console.error('Send message error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== NOTIFICATION SERVICES =====

export const NotificationService = {
  /**
   * Bildirim listesi
   */
  async getNotifications(): Promise<ApiResponse<{ notifications: NotificationData[] }>> {
    try {
      const response = await apiClient.get('/api/notifications');
      return response.data;
    } catch (error: any) {
      console.error('Get notifications error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Bildirim okundu olarak işaretleme
   */
  async markAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put(`/api/notifications/${id}/read`);
      return response.data;
    } catch (error: any) {
      console.error('Mark notification as read error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim okundu olarak işaretlenemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== EXPORT ALL SERVICES =====

export default {
  AuthService,
  VehicleService,
  AppointmentService,
  MechanicService,
  MessageService,
  NotificationService
};