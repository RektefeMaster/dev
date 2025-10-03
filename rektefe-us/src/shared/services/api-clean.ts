import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
import { 
  isTokenExpired, 
  shouldRefreshToken, 
  isTokenValid,
  getTokenUserInfo 
} from '@/shared/utils/tokenUtils';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
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
    // Request interceptor - proaktif token yenileme ile
    this.api.interceptors.request.use(
      async (config: any) => {
        try {
          const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          
          if (token) {
            // Token validation kontrolü
            if (isTokenValid(token)) {
              // Token geçerli, ancak yenilenmesi gerekip gerekmediğini kontrol et
              if (shouldRefreshToken(token)) {
                try {
                  const newToken = await this.refreshToken();
                  if (newToken) {
                    config.headers.Authorization = `Bearer ${newToken}`;
                  } else {
                    config.headers.Authorization = `Bearer ${token}`;
                  }
                } catch (refreshError) {
                  config.headers.Authorization = `Bearer ${token}`;
                }
              } else {
                config.headers.Authorization = `Bearer ${token}`;
              }
            } else {
              // Geçersiz token'ı temizle
              await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
              await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            }
          }
          return config;
        } catch (error) {
          return Promise.reject(error);
        }
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - token yenileme ve hata yönetimi
    this.api.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const originalRequest = error.config;
        
        // 401 Unauthorized handling - Token yenileme mekanizması
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Token yenileme devam ediyorsa, isteği kuyruğa al
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
            const newToken = await this.refreshToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              
              // Kuyruktaki istekleri işle
              this.processQueue(null, newToken);
              
              return this.api(originalRequest);
            } else {
              // Token yenileme başarısız, logout yap
              this.processQueue(new Error('Token refresh failed'), null);
              await this.logout();
              return Promise.reject(error);
            }
          } catch (refreshError) {
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

  private processQueue(error: any, token: string | null = null) {
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
      if (!refreshToken) {
        return null;
      }

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken
      });

      if (response.data.success) {
        const { token, refreshToken: newRefreshToken } = response.data.data;
        
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        
        return token;
      }

      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  private handleError(error: any): ApiResponse {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        message: error.response.data?.message || 'Server error occurred',
        data: null
      };
    } else if (error.request) {
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
        message: error.message || 'An unexpected error occurred',
        data: null
      };
    }
  }

  // ===== AUTH ENDPOINTS =====
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    try {
      const response = await this.api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async register(userData: any): Promise<ApiResponse<{ user: User; token: string; refreshToken: string }>> {
    try {
      const response = await this.api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== MECHANIC PROFILE ENDPOINTS =====
  async getMechanicProfile(): Promise<ApiResponse<MechanicProfile>> {
    try {
      const response = await this.api.get('/mechanics/profile');
      return response.data as ApiResponse<MechanicProfile>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateMechanicProfile(profileData: Partial<MechanicProfile>): Promise<ApiResponse<MechanicProfile>> {
    try {
      const response = await this.api.put('/mechanics/profile', profileData);
      return response.data as ApiResponse<MechanicProfile>;
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

      const response = await this.api.post('/mechanics/profile/image', formData, {
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
      const response = await this.api.get('/mechanics/appointments/counts');
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

      const response = await this.api.get(`/mechanics/appointments?${params.toString()}`);
      return response.data as ApiResponse<Appointment[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAppointmentById(appointmentId: string): Promise<ApiResponse<Appointment>> {
    try {
      const response = await this.api.get(`/mechanics/appointments/${appointmentId}`);
      return response.data as ApiResponse<Appointment>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string): Promise<ApiResponse<Appointment>> {
    try {
      const response = await this.api.put(`/mechanics/appointments/${appointmentId}/status`, {
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
      const response = await this.api.get('/mechanics/appointments/stats');
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

  async getTodaySchedule(): Promise<ApiResponse<Appointment[]>> {
    try {
      const response = await this.api.get('/mechanics/appointments/today');
      return response.data as ApiResponse<Appointment[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanics/activity/recent');
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
      const response = await this.api.get('/mechanics/wallet/balance');
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
      const response = await this.api.get('/mechanics/earnings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMechanicServiceRequests(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanics/service-requests');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== RATING ENDPOINTS =====
  async getRecentRatings(): Promise<ApiResponse<Rating[]>> {
    try {
      const response = await this.api.get('/mechanic/ratings/recent');
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
      const response = await this.api.get('/mechanic/ratings/stats');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== MESSAGE ENDPOINTS =====
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    try {
      const response = await this.api.get('/mechanics/conversations');
      return response.data as ApiResponse<Conversation[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<ApiResponse<Message[]>> {
    try {
      const response = await this.api.get(`/mechanics/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
      return response.data as ApiResponse<Message[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendMessage(conversationId: string, content: string, type: 'text' | 'image' | 'audio' = 'text', attachment?: any): Promise<ApiResponse<Message>> {
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('type', type);
      
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await this.api.post(`/mechanics/conversations/${conversationId}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
      const response = await this.api.get('/mechanics/services/wash');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTireJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanics/services/tire');
      return response.data as ApiResponse<any[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getTowingJobs(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.api.get('/mechanics/services/towing');
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
    return { success: true, message: 'No categories', data: [] } as any;
  }

  // ===== VEHICLE ENDPOINTS =====
  async getCustomerVehicles(customerId: string): Promise<ApiResponse<Vehicle[]>> {
    try {
      // Şimdilik boş array döndür, vehicle endpoint'i mevcut değil
      return {
        success: true,
        message: 'No vehicles available',
        data: []
      } as ApiResponse<Vehicle[]>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ===== SERVICE MANAGEMENT ENDPOINTS =====
  async getServices(): Promise<ApiResponse<any[]>> {
    return { success: true, message: 'No services', data: [] };
  }

  async getServicePackages(): Promise<ApiResponse<any[]>> {
    return { success: true, message: 'No packages', data: [] };
  }

  async addService(serviceData: any): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  async createServicePackage(packageData: any): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  async updateService(serviceId: string, serviceData: any): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  async deleteService(serviceId: string): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  async updateServicePackage(packageId: string, packageData: any): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  async deleteServicePackage(packageId: string): Promise<ApiResponse<any>> {
    return { success: false, message: 'Service management disabled' } as any;
  }

  // ===== EMERGENCY TOWING ENDPOINTS =====
  async getEmergencyTowingRequests(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/emergency/mechanic/requests');
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
      const response = await this.api.get('/users/settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateUserSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/users/settings', settings);
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNotificationSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/users/notification-settings');
      return response.data as ApiResponse<any>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
    try {
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
      const response = await this.api.put('/users/service-categories', { categories });
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
