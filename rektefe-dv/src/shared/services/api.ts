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
} from '../types/common';
import { 
  AppointmentStatus, 
  ServiceType, 
  UserType
} from '../types/common';
import { 
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '../../../shared-lib/types';

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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Success response'ları logla
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    // Error response'ları logla
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
    console.error('❌ Error Details:', error.response?.data);
    
    const originalRequest = error.config;
    
    // 401 Unauthorized - token refresh dene
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Başka bir request zaten refresh yapıyorsa bekle
        console.log('⏳ Token yenileme devam ediyor, kuyrukta bekleniyor...');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        
        if (!refreshToken) {
          console.error('❌ Refresh token bulunamadı');
          throw new Error('No refresh token');
        }

        console.log('🔄 Token yenileniyor...');
        console.log('🔍 Refresh Token Preview:', refreshToken.substring(0, 20) + '...');
        
        // Refresh token endpoint'ini çağır
        const response = await axios.post(
          `${API_CONFIG.BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 10000 } // 10 saniye timeout
        );

        console.log('🔍 Refresh Response:', response.data);

        if (response.data.success && response.data.data?.token) {
          const newToken = response.data.data.token;
          const newRefreshToken = response.data.data.refreshToken;
          const userData = response.data.data.user;

          console.log('✅ Yeni token alındı');
          console.log('🔍 New Token Preview:', newToken.substring(0, 20) + '...');
          console.log('🔍 New Refresh Token:', newRefreshToken ? 'Mevcut' : 'Yok');
          console.log('🔍 User Data:', userData ? 'Mevcut' : 'Yok');

          // Yeni token'ları kaydet
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }
          
          // User data ve userId'yi de güncelle
          if (userData) {
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
            if (userData._id || userData.id) {
              await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userData._id || userData.id);
            }
          }

          // Header'ı güncelle
          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

          console.log('✅ Token başarıyla yenilendi ve kaydedildi');
          
          processQueue(null, newToken);
          isRefreshing = false;

          // Original request'i yeniden dene
          return apiClient(originalRequest);
        } else {
          console.error('❌ Refresh response başarısız:', response.data);
          throw new Error('Token yenileme başarısız: Invalid response');
        }
      } catch (refreshError: any) {
        console.error('❌ Token yenileme başarısız:', refreshError.message);
        console.error('❌ Error Response:', refreshError.response?.data);
        
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Refresh başarısız olduğunda tüm auth data'yı temizle
        console.log('🚪 Token yenilenemedi, oturum sonlandırılıyor...');
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.USER_ID
        ]);
        
        // Hata döndür - kullanıcıya logout mesajı gösterilebilir
        const customError = new Error('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
        (customError as any).isAuthError = true;
        return Promise.reject(customError);
      }
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
      console.log('🔍 Register işlemi başlatılıyor...');
      const response = await apiClient.post('/auth/register', {
        ...data,
        userType: UserType.DRIVER
      });
      
      console.log('🔍 Register response:', response.data);
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const refreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = userData?._id || userData?.id;
        
        console.log('🔍 Register - Token bilgileri:');
        console.log('  - token:', token ? `${token.substring(0, 20)}...` : 'YOK');
        console.log('  - refreshToken:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'YOK');
        console.log('  - userId:', userId);
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          console.log('✅ Auth token kaydedildi');
        }
        
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          console.log('✅ Refresh token kaydedildi');
        } else {
          console.error('❌ KRİTİK: Refresh token register response\'unda yok!');
        }
        
        if (userId) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
          console.log('✅ User ID kaydedildi');
        }
        
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          console.log('✅ User data kaydedildi');
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Register error:', error);
      console.error('❌ Register error response:', error.response?.data);
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
      console.log('🔍 AuthService.login çağrılıyor...');
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        userType: UserType.DRIVER
      });
      
      console.log('🔍 Login response:', response.data);
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const refreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = response.data.data.userId || userData?._id || userData?.id;
        
        console.log('🔍 Login - Token bilgileri:');
        console.log('  - token:', token ? `${token.substring(0, 20)}...` : 'YOK');
        console.log('  - refreshToken:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'YOK');
        console.log('  - userId:', userId);
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          console.log('✅ Auth token kaydedildi');
        }
        
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          console.log('✅ Refresh token kaydedildi');
        } else {
          console.error('❌ KRİTİK: Refresh token login response\'unda yok!');
        }
        
        if (userId) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
          console.log('✅ User ID kaydedildi');
        }
        
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
          console.log('✅ User data kaydedildi');
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Login error response:', error.response?.data);
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
        console.error('❌ Refresh token bulunamadı');
        throw new Error('Refresh token not found');
      }
      
      console.log('🔄 Manual refresh token işlemi başlatılıyor...');
      const response = await apiClient.post('/auth/refresh-token', {
        refreshToken
      });
      
      console.log('🔍 Refresh response:', response.data);
      
      // Yeni token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const newRefreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = userData?._id || userData?.id;
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          console.log('✅ Yeni token kaydedildi');
        }
        
        if (newRefreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          console.log('✅ Yeni refresh token kaydedildi');
        }
        
        if (userId) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        }
        
        if (userData) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Refresh token error:', error);
      console.error('❌ Error response:', error.response?.data);
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
      console.log('🚪 Logout işlemi başlatılıyor...');
      await apiClient.post('/auth/logout');
      console.log('✅ Backend\'e logout bildirimi gönderildi');
    } catch (error) {
      console.error('❌ Logout API hatası:', error);
      // API hatası olsa bile devam et, storage'ı temizle
    } finally {
      // Tüm auth verilerini temizle
      console.log('🧹 Storage temizleniyor...');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA
      ]);
      console.log('✅ Logout tamamlandı, tüm veriler temizlendi');
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
      const response = await apiClient.get('/vehicles');
      // Backend response formatı: { success: true, data: [...], message: "..." }
      // response.data zaten backend'den gelen wrapper'ı içeriyor
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
      const response = await apiClient.post('/vehicles', data);
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
      const response = await apiClient.put(`/vehicles/${id}`, data);
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
      const response = await apiClient.delete(`/vehicles/${id}`);
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
      const response = await apiClient.get('/appointments/driver', { params });
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
      const response = await apiClient.post('/appointments', data);
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
      const response = await apiClient.put(`/appointments/${id}`, data);
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
      const response = await apiClient.put(`/appointments/${id}/cancel`, {});
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
      const response = await apiClient.get('/mechanics', { params: filters });
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
      const response = await apiClient.get('/mechanics/nearby', {
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
      const response = await apiClient.get(`/mechanic/details/${id}`);
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
   * Konuşma listesi
   */
  async getConversations(): Promise<ApiResponse<{ conversations: any[] }>> {
    try {
      console.log('🔍 MessageService: getConversations çağrılıyor...');
      const response = await apiClient.get('/message/conversations');
      console.log('🔍 MessageService: Raw API response:', response);
      console.log('🔍 MessageService: Response data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ MessageService: Get conversations error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Konuşma listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Mesaj listesi
   */
  async getMessages(conversationId: string): Promise<ApiResponse<{ messages: MessageData[] }>> {
    try {
      const response = await apiClient.get(`/message/conversations/${conversationId}/messages`);
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
      const response = await apiClient.post('/message/send', data);
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
      const response = await apiClient.get('/notifications/driver');
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
      const response = await apiClient.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error: any) {
      console.error('Mark notification as read error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim okundu olarak işaretlenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Tüm bildirimleri okundu olarak işaretleme
   */
  async markAllAsRead(): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/notifications/driver/mark-all-read');
      return response.data;
    } catch (error: any) {
      console.error('Mark all notifications as read error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Tüm bildirimler okundu olarak işaretlenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Bildirim silme
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/notifications/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete notification error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim silinemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== EXPORT ALL SERVICES =====

export const apiService = {
  // Authentication
  login: AuthService.login,
  register: AuthService.register,
  logout: AuthService.logout,
  refreshToken: AuthService.refreshToken,
  
  // User Profile
  getUserProfile: async () => {
    try {
      const response = await apiClient.get('/users/profile');
      return response.data;
    } catch (error: any) {
      console.error('Get user profile error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kullanıcı profili alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  
  // Vehicles
  getVehicles: VehicleService.getVehicles,
  addVehicle: VehicleService.addVehicle,
  updateVehicle: VehicleService.updateVehicle,
  deleteVehicle: VehicleService.deleteVehicle,
  
  // Appointments
  getAppointments: async (userType?: string) => {
    try {
      const params = userType ? { userType } : {};
      const response = await apiClient.get('/appointments/driver', { params });
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
  createAppointment: AppointmentService.createAppointment,
  updateAppointment: AppointmentService.updateAppointment,
  cancelAppointment: AppointmentService.cancelAppointment,
  
  // Mechanics
  getMechanics: async (filters?: any) => {
    try {
      console.log('🔍 getMechanics çağrıldı, filters:', filters);
      const response = await apiClient.get('/mechanic/list', { params: filters });
      console.log('🔍 getMechanics yanıtı:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get mechanics error:', error);
      console.error('❌ Get mechanics error response:', error.response?.data);
      console.error('❌ Get mechanics error status:', error.response?.status);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Usta listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  getMechanicDetails: async (mechanicId: string) => {
    try {
      const response = await apiClient.get(`/mechanic/details/${mechanicId}`);
      console.log('🔍 getMechanicDetails API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic details error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Usta detayları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  getMechanicReviews: async (mechanicId: string, params?: any) => {
    try {
      // Mechanic details endpoint'i zaten reviews bilgilerini içeriyor
      const response = await apiClient.get(`/mechanic/details/${mechanicId}`);
      
      if (response.data.success && response.data.data) {
        // Backend'den gelen veri yapısına göre reviews'ı al
        const reviews = response.data.data.recentReviews || response.data.data.ratings || [];
        return {
          success: true,
          data: { reviews },
          message: 'Usta yorumları başarıyla getirildi'
        };
      } else {
        return {
          success: true,
          data: { reviews: [] },
          message: 'Henüz yorum bulunmuyor'
        };
      }
    } catch (error: any) {
      console.error('Get mechanic reviews error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Usta yorumları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  checkFavoriteMechanic: async (mechanicId: string) => {
    try {
      // Backend'de favorite endpoint'i yok, geçici olarak false döndür
      return {
        success: true,
        data: { isFavorite: false },
        message: 'Favori durumu kontrol edilemedi - endpoint henüz mevcut değil'
      };
    } catch (error: any) {
      console.error('Check favorite mechanic error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Favori usta kontrolü yapılamadı',
        error.response?.data?.error?.details
      );
    }
  },
  toggleFavoriteMechanic: async (mechanicId: string) => {
    try {
      // Backend'de favorite endpoint'i yok, geçici olarak mock response döndür
      return {
        success: true,
        data: { isFavorite: true },
        message: 'Favori durumu değiştirilemedi - endpoint henüz mevcut değil'
      };
    } catch (error: any) {
      console.error('Toggle favorite mechanic error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Favori usta durumu değiştirilemedi',
        error.response?.data?.error?.details
      );
    }
  },
  getNearbyMechanics: async (location: { latitude: number; longitude: number }, maxDistance: number = 10) => {
    try {
      const response = await apiClient.get('/mechanic/nearby', {
        params: {
          lat: location.latitude,
          lng: location.longitude,
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
  getMechanicsByService: async (serviceType: string) => {
    try {
      const response = await apiClient.get('/mechanic/list', {
        params: { serviceType }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get mechanics by service error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Servis ustaları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  
  // Messages
  getConversations: MessageService.getConversations,
  getMessages: MessageService.getMessages,
  sendMessage: MessageService.sendMessage,
  deleteMessage: async (messageId: string) => {
    try {
      const response = await apiClient.delete(`/message/${messageId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete message error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj silinemedi',
        error.response?.data?.error?.details
      );
    }
  },
  deleteConversation: async (conversationId: string) => {
    try {
      const response = await apiClient.delete(`/message/conversations/${conversationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete conversation error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Konuşma silinemedi',
        error.response?.data?.error?.details
      );
    }
  },
  
  // Notifications
  getNotifications: NotificationService.getNotifications,
  markNotificationAsRead: NotificationService.markAsRead,
  markAllNotificationsAsRead: NotificationService.markAllAsRead,
  deleteNotification: NotificationService.delete,
  
  // Fault Reports
  createFaultReport: async (data: any) => {
    try {
      const response = await apiClient.post('/fault-reports', data);
      return response.data;
    } catch (error: any) {
      console.error('Create fault report error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Arıza bildirimi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Emergency Towing
  createEmergencyTowingRequest: async (data: any) => {
    try {
      const response = await apiClient.post('/emergency/towing-request', data);
      return response.data;
    } catch (error: any) {
      console.error('Create emergency towing request error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Acil çekici talebi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Wallet
  getWalletBalance: async () => {
    try {
      const response = await apiClient.get('/wallet/balance');
      return response.data;
    } catch (error: any) {
      console.error('Get wallet balance error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Cüzdan bakiyesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  getWalletTransactions: async (params?: any) => {
    try {
      const response = await apiClient.get('/wallet/transactions', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get wallet transactions error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Cüzdan işlemleri alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  addBalance: async (amount: number) => {
    try {
      // Frontend'de amount validation
      if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 999999999) {
        console.error('Invalid amount for addBalance:', amount);
        return createErrorResponse(
          ErrorCode.INVALID_INPUT_FORMAT,
          'Geçerli miktar giriniz (1-999,999,999 TL arası)',
          { amount, type: typeof amount }
        );
      }

      const response = await apiClient.post('/wallet/add-money', { amount });
      return response.data;
    } catch (error: any) {
      console.error('Add balance error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error.response?.data?.message || 'Bakiye yüklenirken hata oluştu',
        error.response?.data?.error?.details
      );
    }
  },


  // Services
  createTirePartsRequest: async (data: any) => {
    try {
      const response = await apiClient.post('/services/tire-request', data);
      return response.data;
    } catch (error: any) {
      console.error('Create tire parts request error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik parça talebi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // ===== WASH SERVICES (YENİ MODÜL) =====
  
  // Fiyat teklifi al
  getWashQuote: async (data: {
    packageId: string;
    vehicleSegment: string;
    type: 'shop' | 'mobile';
    providerId: string;
    location?: { latitude: number; longitude: number };
    scheduledDate?: string;
  }) => {
    try {
      const response = await apiClient.post('/wash/quote', data);
      return response.data;
    } catch (error: any) {
      console.error('Get wash quote error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Fiyat teklifi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Sipariş oluştur
  createWashOrder: async (data: any) => {
    try {
      const response = await apiClient.post('/wash/order', data);
      return response.data;
    } catch (error: any) {
      console.error('Create wash order error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Sipariş oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Sipariş detayı
  getWashOrder: async (orderId: string) => {
    try {
      const response = await apiClient.get(`/wash/order/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get wash order error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Sipariş detayı alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Siparişi iptal et
  cancelWashOrder: async (orderId: string, reason: string) => {
    try {
      const response = await apiClient.post(`/wash/order/${orderId}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('Cancel wash order error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Sipariş iptal edilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // QA onayla
  approveWashQA: async (orderId: string, approved: boolean, feedback?: string) => {
    try {
      const response = await apiClient.post(`/wash/order/${orderId}/qa-approve`, {
        approved,
        feedback,
      });
      return response.data;
    } catch (error: any) {
      console.error('Approve wash QA error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'QA onaylanamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Sürücü siparişlerini listele
  getMyWashOrders: async (status?: string) => {
    try {
      const response = await apiClient.get('/wash/my-orders', { 
        params: status ? { status } : {} 
      });
      return response.data;
    } catch (error: any) {
      console.error('Get my wash orders error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Siparişler getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Yakındaki yıkama işletmelerini listele
  getWashProviders: async (params?: {
    latitude?: number;
    longitude?: number;
    type?: 'shop' | 'mobile';
    maxDistance?: number;
  }) => {
    try {
      const response = await apiClient.get('/wash/providers', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get wash providers error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İşletmeler getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Müsait slotları getir
  getAvailableWashSlots: async (params: {
    providerId: string;
    date: string;
    duration: number;
  }) => {
    try {
      const response = await apiClient.get('/wash/slots/available', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get available wash slots error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Müsait slotlar getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Yıkama paketlerini listele
  getWashPackages: async (params?: { providerId?: string; type?: string }) => {
    try {
      const response = await apiClient.get('/wash/packages', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get wash packages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paketler getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Usta - kendi paketlerini oluştur
  createWashPackage: async (data: any) => {
    try {
      const response = await apiClient.post('/wash/packages/create', data);
      return response.data;
    } catch (error: any) {
      console.error('Create wash package error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Usta - kendi paketlerini getir
  getMyWashPackages: async () => {
    try {
      const response = await apiClient.get('/wash/my-packages');
      return response.data;
    } catch (error: any) {
      console.error('Get my wash packages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paketler getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Usta - paketi güncelle
  updateWashPackage: async (packageId: string, data: any) => {
    try {
      const response = await apiClient.put(`/wash/packages/${packageId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Update wash package error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Usta - paketi sil
  deleteWashPackage: async (packageId: string) => {
    try {
      const response = await apiClient.delete(`/wash/packages/${packageId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete wash package error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket silinemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // ESKİ METODLAR (Geriye dönük uyumluluk için korunuyor)
  getMechanicWashPackages: async (mechanicId: string) => {
    try {
      const response = await apiClient.get(`/mechanic/${mechanicId}/wash-packages`);
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic wash packages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yıkama paketleri alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  createWashBooking: async (data: any) => {
    try {
      const response = await apiClient.post('/services/wash-booking', data);
      return response.data;
    } catch (error: any) {
      console.error('Create wash booking error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yıkama randevusu oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },
  
  // Generic GET method for TefePuan and other services
  get: async (endpoint: string, params?: any) => {
    try {
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    } catch (error: any) {
      console.error(`GET ${endpoint} error:`, error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Veri alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  
  // Generic POST method for TefePuan and other services
  post: async (endpoint: string, data?: any) => {
    try {
      const response = await apiClient.post(endpoint, data);
      return response.data;
    } catch (error: any) {
      console.error(`POST ${endpoint} error:`, error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Veri gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Photo Upload
  uploadProfilePhoto: async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri,
        name: filename,
        type,
      } as any);

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('📸 Upload token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      console.log('📸 Upload URL:', `${API_CONFIG.BASE_URL}/users/profile-photo`);
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/users/profile-photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 15000, // 15 saniye
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('📸 Upload profile photo error:', error);
      console.error('📸 Error response:', error.response?.data);
      console.error('📸 Error status:', error.response?.status);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Profil fotoğrafı yüklenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  uploadCoverPhoto: async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri,
        name: filename,
        type,
      } as any);

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('📸 Upload token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      console.log('📸 Upload URL:', `${API_CONFIG.BASE_URL}/users/cover-photo`);
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/users/cover-photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 15000, // 15 saniye
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('📸 Upload cover photo error:', error);
      console.error('📸 Error response:', error.response?.data);
      console.error('📸 Error status:', error.response?.status);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kapak fotoğrafı yüklenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // ===== TIRE SERVICE =====

  // Lastik hizmet talebi oluştur
  createTireServiceRequest: async (data: any) => {
    try {
      const response = await apiClient.post('/tire-service/request', data);
      return response.data;
    } catch (error: any) {
      console.error('Create tire service request error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik hizmet talebi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Kendi lastik taleplerimi getir
  getMyTireRequests: async (params?: { status?: string; includeCompleted?: boolean }) => {
    try {
      const response = await apiClient.get('/tire-service/my-requests', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get my tire requests error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik talepleri getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Lastik işi detayını getir
  getTireServiceById: async (jobId: string) => {
    try {
      const response = await apiClient.get(`/tire-service/${jobId}/status`);
      return response.data;
    } catch (error: any) {
      console.error('Get tire service by ID error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik iş detayı getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Lastik sağlık geçmişi getir
  getTireHealthHistory: async (vehicleId: string) => {
    try {
      const response = await apiClient.get(`/tire-service/health-history/${vehicleId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get tire health history error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik sağlık geçmişi getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Lastik & Parça talebi oluştur (Eski endpoint ile uyumluluk için)
  createTirePartsRequest: async (data: any) => {
    try {
      const response = await apiClient.post('/service-requests/tire-parts', data);
      return response.data;
    } catch (error: any) {
      console.error('Create tire parts request error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik & Parça talebi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  }
};

// Export both apiClient and api for backwards compatibility
export { apiClient, apiClient as api };

export default {
  AuthService,
  VehicleService,
  AppointmentService,
  MechanicService,
  MessageService,
  NotificationService,
  apiService,
  apiClient
};
