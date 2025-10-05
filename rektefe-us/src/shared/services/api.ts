import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '@/constants/config';
import { 
  Appointment, 
  MechanicProfile, 
  Conversation, 
  Message, 
  Rating,
  Notification,
  Payment,
  Vehicle,
  ServiceCategory,
  ApiResponse,
  User
} from '@/shared/types';
import { isTokenExpired } from '@/shared/utils/tokenUtils';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: string | null) => void;
    reject: (error?: Error) => void;
  }> = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - basit token yönetimi
    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          return config;
        } catch (error) {
          return Promise.reject(error);
        }
      },
      (error: Error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - token yenileme ve hata yönetimi
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        const originalRequest = error.config;
        
        // 401 Unauthorized handling - Token yenileme mekanizması
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (__DEV__) {
            console.log('🔄 401 hatası - token yenileme deneniyor...');
          }
          
          // Önce mevcut token'ı kontrol et
          const currentToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
          
          if (!currentToken || !refreshToken) {
            if (__DEV__) {
              console.log('❌ Token veya refresh token bulunamadı - logout yapılıyor');
            }
            await this.logout();
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            // Token yenileme devam ediyorsa, isteği kuyruğa al
            if (__DEV__) {
              console.log('⏳ Token yenileme devam ediyor - istek kuyruğa alınıyor');
            }
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            if (__DEV__) {
              console.log('🔄 Token yenileme başlatılıyor...');
            }
            const newToken = await this.refreshToken();
            if (newToken) {
              if (__DEV__) {
                console.log('✅ Token başarıyla yenilendi');
              }
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              
              // Kuyruktaki istekleri işle
              this.processQueue(null, newToken);
              
              return this.api(originalRequest);
            } else {
              if (__DEV__) {
                console.log('❌ Token yenileme başarısız - logout yapılıyor');
              }
              // Token yenileme başarısız, logout yap
              this.processQueue(new Error('Token refresh failed'), null);
              await this.logout();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            if (__DEV__) {
              console.log('❌ Token yenileme hatası:', refreshError);
            }
            this.processQueue(refreshError, null);
            await this.logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      console.log('🔍 Refresh Token Debug:');
      console.log('refreshToken exists:', !!refreshToken);
      console.log('refreshToken preview:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null');
      
      if (!refreshToken) {
        if (__DEV__) {
          console.log('❌ Refresh token bulunamadı - token yenileme atlanıyor');
        }
        return null;
      }

      // Refresh token'ın geçerliliğini kontrol et
      if (isTokenExpired(refreshToken)) {
        if (__DEV__) {
          console.log('❌ Refresh token süresi dolmuş');
        }
        // Geçersiz refresh token'ı temizle
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.AUTH_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER_ID
        ]);
        return null;
      }

      if (__DEV__) {
        console.log('🔄 Refresh token ile yeni token alınıyor...');
      }
      
      console.log('🔍 API Refresh Request:');
      console.log('URL:', `${API_URL}/auth/refresh-token`);
      console.log('refreshToken preview:', refreshToken.substring(0, 20) + '...');
      
      const response = await axios.post(`${API_URL}/auth/refresh-token`, {
        refreshToken
      });

      console.log('🔍 API Refresh Response:');
      console.log('status:', response.status);
      console.log('data:', response.data);

      if (response.data && response.data.success) {
        const { token } = response.data.data;
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          if (__DEV__) {
            console.log('✅ Token başarıyla yenilendi ve kaydedildi');
          }
          return token;
        } else {
          if (__DEV__) {
            console.log('❌ Yeni token alınamadı');
          }
          return null;
        }
      } else {
        if (__DEV__) {
          console.log('❌ Token yenileme response başarısız:', response.data);
        }
        return null;
      }
    } catch (error: unknown) {
      if (__DEV__) {
        console.error('❌ Token yenileme hatası:', error);
        
        // Detaylı hata loglama
        if (error && typeof error === 'object' && 'response' in error) {
          console.log('❌ Response error:', (error as any).response.status, (error as any).response.data);
        } else if (error && typeof error === 'object' && 'request' in error) {
          console.log('❌ Request error:', (error as any).request);
        }
      }
      
      // Token yenileme başarısızsa tüm token'ları temizle
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID
      ]);
      
      return null;
    }
  }

  private handleError(error: unknown): any {
    // Detaylı error logging - sadece development'ta
    if (__DEV__) {
      console.error('API Error Details:', {
        message: error && typeof error === 'object' && 'message' in error ? (error as any).message : 'Unknown error',
        status: error && typeof error === 'object' && 'response' in error ? (error as any).response?.status : undefined,
        statusText: error && typeof error === 'object' && 'response' in error ? (error as any).response?.statusText : undefined,
        url: error && typeof error === 'object' && 'config' in error ? (error as any).config?.url : undefined,
        method: error && typeof error === 'object' && 'config' in error ? (error as any).config?.method : undefined,
        data: error && typeof error === 'object' && 'response' in error ? (error as any).response?.data : undefined
      });
    }
    
    if (error && typeof error === 'object' && 'response' in error) {
      // Server responded with error status
      const status = (error as any).response.status;
      let message = 'Server error occurred';
      
      // Status code'a göre özel mesajlar
      switch (status) {
        case 401:
          message = 'Yetkilendirme hatası - Lütfen tekrar giriş yapın';
          break;
        case 403:
          message = 'Erişim reddedildi - Bu işlem için yetkiniz yok';
          break;
        case 404:
          message = (error as any).response.data?.message || 'İstenen kaynak bulunamadı';
          // 404 hatası için özel log
          console.log('⚠️ 404 Hatası:', {
            url: (error as any).config?.url,
            message: (error as any).response.data?.message,
            suggestion: 'Profil oluşturma gerekebilir'
          });
          break;
        case 500:
          message = 'Sunucu hatası - Lütfen daha sonra tekrar deneyin';
          break;
        default:
          message = (error as any).response.data?.message || `HTTP ${status} hatası`;
      }
      
      return {
        success: false,
        message,
        data: null,
        status
      };
    } else if (error && typeof error === 'object' && 'request' in error) {
      // Request was made but no response received
      return {
        success: false,
        message: 'Network error - please check your connection',
        data: null
      };
    } else {
      // Something else happened
      return {
        success: false,
        message: (error && typeof error === 'object' && 'message' in error ? (error as any).message : 'An unexpected error occurred'),
        data: null
      };
    }
  }

  // ===== AUTH ENDPOINTS =====
  async login(email: string, password: string, userType: 'mechanic' | 'driver' = 'mechanic'): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    try {
      const response = await this.api.post('/auth/login', { 
        email, 
        password, 
        userType 
      });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async register(userData: any): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    try {
      // userType'ı otomatik olarak 'mechanic' olarak ayarla
      const registerData = {
        ...userData,
        userType: 'mechanic'
      };
      const response = await this.api.post('/auth/register', registerData);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      if (__DEV__) {
        console.log('🚪 API Service: Logout başlatılıyor...');
      }
      
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.USER_DATA
      ]);
      
      if (__DEV__) {
        console.log('✅ API Service: Logout tamamlandı');
      }
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      if (__DEV__) {
        console.error('❌ API Service: Logout hatası:', error);
      }
      return this.handleError(error);
    }
  }

  // ===== MECHANIC PROFILE ENDPOINTS =====
  async getMechanicProfile(): Promise<ApiResponse<MechanicProfile>> {
    try {
      const response = await this.api.get('/mechanic/me');
      return response.data as ApiResponse<MechanicProfile>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateMechanicProfile(profileData: Partial<MechanicProfile>): Promise<ApiResponse<MechanicProfile>> {
    try {
      const response = await this.api.put('/mechanic/me', profileData);
      return response.data as ApiResponse<MechanicProfile>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUserProfile(profileData: { userType?: 'user' | 'mechanic' | 'driver' | 'admin'; [key: string]: any }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/profile', profileData);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async uploadProfileImage(imageUri: string): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const response = await this.api.post('/mechanic/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data as ApiResponse<{ imageUrl: string }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicAppointmentCounts(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/mechanic/appointments/counts');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== APPOINTMENT ENDPOINTS =====
  async getAppointments(status?: string, page = 1, limit = 20): Promise<ApiResponse<Appointment[]>> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await this.api.get(`/appointments/mechanic?${params.toString()}`);
      return response.data as ApiResponse<Appointment[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppointmentById(appointmentId: string): Promise<ApiResponse<Appointment>> {
    try {
      const response = await this.api.get(`/appointments/${appointmentId}`);
      return response.data as ApiResponse<Appointment>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string): Promise<ApiResponse<Appointment>> {
    try {
      const response = await this.api.put(`/appointments/${appointmentId}/status`, {
        status,
        notes
      });
      return response.data as ApiResponse<Appointment>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppointmentStats(): Promise<ApiResponse<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }>> {
    try {
      const response = await this.api.get('/mechanic/dashboard/stats');
      return response.data as ApiResponse<{
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        cancelled: number;
      }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicCustomers(searchQuery?: string): Promise<ApiResponse<any[]>> {
    try {
      // Usta uygulaması için doğru endpoint - müşteri listesi
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const response = await this.api.get(`/customers${params}`);
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTodaySchedule(): Promise<ApiResponse<Appointment[]>> {
    try {
      const response = await this.api.get('/mechanic/dashboard/today-schedule');
      return response.data as ApiResponse<Appointment[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanic/dashboard/recent-activity');
      const data = response.data as ApiResponse<any[]>;
      
      // Translate service names in activity data
      if (data.success && data.data) {
        data.data = data.data.map(activity => ({
          ...activity,
          description: activity.appointment?.serviceType 
            ? `${translateServiceName(activity.appointment.serviceType)} - ${activity.appointment.customer?.name || 'Müşteri'}`
            : activity.description
        }));
      }
      
      return data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== WALLET ENDPOINTS =====
  async getWalletBalance(): Promise<ApiResponse<{ balance: number }>> {
    try {
      const response = await this.api.get('/mechanic/wallet');
      return response.data as ApiResponse<{ balance: number }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicWallet(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/mechanic/wallet');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRecentTransactions(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanic/wallet/transactions');
      const data = response.data as ApiResponse<any[]>;
      
      // Translate service names in transaction data
      if (data.success && data.data) {
        data.data = data.data.map(transaction => ({
          ...transaction,
          description: transaction.appointment?.serviceType 
            ? `${translateServiceName(transaction.appointment.serviceType)} - ${transaction.description || 'İş tamamlandı'}`
            : transaction.description
        }));
      }
      
      return data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicEarnings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/mechanic-earnings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicServiceRequests(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/service-requests/mechanic-requests');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== RATING ENDPOINTS =====
  async getRecentRatings(): Promise<ApiResponse<Rating[]>> {
    try {
      // Yeni endpoint kullan - direkt userId ile
      const response = await this.api.get('/appointment-ratings/current/recent');
      const data = response.data as ApiResponse<Rating[]>;
      
      // Translate service names in rating data
      if (data.success && data.data) {
        data.data = data.data.map(rating => ({
          ...rating,
          appointmentId: rating.appointment?.serviceType 
            ? translateServiceName(rating.appointment.serviceType) 
            : rating.appointmentId
        }));
      }
      
      return data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRatingStats(): Promise<ApiResponse<any>> {
    try {
      // Yeni endpoint kullan - direkt userId ile
      const response = await this.api.get('/appointment-ratings/current/stats');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== MESSAGE ENDPOINTS =====
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    try {
      const response = await this.api.get('/message/conversations');
      return response.data as ApiResponse<Conversation[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<ApiResponse<Message[]>> {
    try {
      const response = await this.api.get(`/message/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
      return response.data as ApiResponse<Message[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // getConversationMessages - getMessages ile aynı işlevi görür
  async getConversationMessages(conversationId: string, page = 1, limit = 50): Promise<ApiResponse<Message[]>> {
    return this.getMessages(conversationId, page, limit);
  }

  async sendMessage(messageData: { receiverId: string, content: string, messageType?: string }): Promise<ApiResponse<Message>> {
    try {
      const response = await this.api.post('/message/send', {
        receiverId: messageData.receiverId,
        content: messageData.content,
        messageType: messageData.messageType || 'text'
      });

      return response.data as ApiResponse<Message>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUnreadMessageCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await this.api.get('/message/unread-count');
      return response.data as ApiResponse<{ count: number }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE CATEGORY ENDPOINTS =====
  async getWashJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/service-categories/wash');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTireJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/service-categories/tire');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTowingJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/service-categories/towing');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== NOTIFICATION ENDPOINTS =====
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await this.api.get('/notifications/mechanic');
      return response.data as ApiResponse<Notification[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    try {
      const response = await this.api.put('/notifications/mechanic/mark-all-read');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse> {
    try {
      const response = await this.api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE CATEGORIES =====
  async getServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
    try {
      // Backend'de service categories endpoint'i mevcut değil
      // Gelecekte /api/service-categories endpoint'i eklenebilir
      console.log('⚠️ getServiceCategories: Endpoint mevcut değil');
      return { 
        success: true, 
        message: 'Service categories endpoint mevcut değil', 
        data: [] 
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== VEHICLE ENDPOINTS =====
  async getCustomerVehicles(customerId: string): Promise<ApiResponse<Vehicle[]>> {
    try {
      // Backend'de customer vehicles endpoint'i mevcut değil
      // Gelecekte /api/customers/{id}/vehicles endpoint'i eklenebilir
      console.log('⚠️ getCustomerVehicles: Endpoint mevcut değil');
      return {
        success: true,
        message: 'Customer vehicles endpoint mevcut değil',
        data: []
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE MANAGEMENT ENDPOINTS =====
  // Service management endpoint'leri backend'de mevcut değil
  // Gerekirse gelecekte /api/services endpoint'leri eklenebilir

  // ===== EMERGENCY TOWING ENDPOINTS =====
  async getEmergencyTowingRequests(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/emergency/mechanic/emergency-requests');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAcceptedEmergencyRequests(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/emergency/mechanic/accepted-requests');
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateEmergencyRequestStatus(requestId: string, status: 'on_the_way' | 'arrived' | 'completed'): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put(`/emergency/towing-request/${requestId}/status`, { status });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SETTINGS ENDPOINTS =====
  async getUserSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/mechanic/settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUserSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/mechanic/settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNotificationSettings(): Promise<ApiResponse<any>> {
    try {
      // Backend'de /users/notification-settings endpoint'i var
      const response = await this.api.get('/users/notification-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      // Backend'de /users/notification-settings endpoint'i var
      const response = await this.api.put('/users/notification-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPrivacySettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/privacy-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updatePrivacySettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/privacy-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getJobSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/job-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateJobSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/job-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/app-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateAppSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/app-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSecuritySettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/security-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateSecuritySettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/security-settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateServiceCategories(categories: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/mechanic/service-categories', { categories });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SUPPORT ENDPOINTS =====
  async getHelpArticles(category?: string): Promise<ApiResponse<any>> {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await this.api.get(`/support/help-articles${params}`);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getHelpCategories(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/help/categories');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createSupportTicket(subject: string, message: string, priority: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/support/tickets', {
        subject,
        message,
        priority
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSupportTickets(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/support/tickets');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/app/info');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== EMAIL & PHONE VERIFICATION ENDPOINTS =====
  async sendEmailVerification(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/send-email-verification');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async verifyEmail(code: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/verify-email', { code });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendPhoneVerification(phone: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/send-phone-verification', { phone });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async verifyPhone(code: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/auth/verify-phone', { code });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SUPPLIER ENDPOINTS =====
  async getSuppliers(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/suppliers');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSupplierSpecialties(): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.api.get('/suppliers/specialties');
      return response.data as ApiResponse<string[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== STATUS NOTIFICATION ENDPOINTS =====
  async getAvailableStatuses(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/status-notifications/available-statuses');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendStatusNotification(appointmentId: string, status: string, message?: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/status-notifications', {
        appointmentId,
        status,
        message
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== LOYAL CUSTOMER ENDPOINTS =====
  async getLoyalCustomers(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/loyal-customers');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getLoyalCustomerStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/loyal-customers/stats');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== QUOTE ENDPOINTS =====
  async createQuote(quoteData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/quotes', quoteData);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getQuoteTemplates(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/quotes/templates');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getQuoteHistory(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/quotes/history');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== CUSTOMER APPROVAL ENDPOINTS =====
  async requestCustomerApproval(appointmentId: string, approvalData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/customer-approvals', {
        appointmentId,
        ...approvalData
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== JOB STORY ENDPOINTS =====
  async uploadJobStoryPhoto(appointmentId: string, photoUri: string, description?: string): Promise<ApiResponse<any>> {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'job-story.jpg',
      } as any);
      if (description) {
        formData.append('description', description);
      }

      const response = await this.api.post(`/appointments/${appointmentId}/job-story/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getJobStory(appointmentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get(`/appointments/${appointmentId}/job-story`);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteJobStoryPhoto(appointmentId: string, photoId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.delete(`/appointments/${appointmentId}/job-story/${photoId}`);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== JOB REFERRAL ENDPOINTS =====
  async createJobReferral(referralData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/job-referrals', referralData);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getReferralHistory(type = 'all', page = 1, limit = 20): Promise<ApiResponse<any>> {
    try {
      const params = new URLSearchParams();
      params.append('type', type);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const response = await this.api.get(`/job-referrals/history?${params.toString()}`);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTrustedMechanics(search?: string, serviceCategory?: string, city?: string): Promise<ApiResponse<any[]>> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (serviceCategory) params.append('serviceCategory', serviceCategory);
      if (city) params.append('city', city);
      
      const response = await this.api.get(`/job-referrals/trusted-mechanics?${params.toString()}`);
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getReferralStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/job-referrals/stats');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default new ApiService();
