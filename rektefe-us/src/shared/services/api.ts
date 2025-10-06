/**
 * REKTEFE MECHANIC APP - API SERVICE
 * 
 * Bu dosya, mechanic uygulaması için optimize edilmiş API servislerini içerir.
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
  async register(data: RegisterData): Promise<ApiResponse<{ user: Mechanic; token: string }>> {
    try {
      const response = await apiClient.post('/api/auth/register', {
        ...data,
        userType: UserType.MECHANIC
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
  async login(email: string, password: string): Promise<ApiResponse<{ user: Mechanic; token: string }>> {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
        userType: UserType.MECHANIC
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
  },

  async verifyEmail(code: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/api/auth/verify-email', { code });
      return response.data;
    } catch (error: any) {
      console.error('Verify email error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'E-posta doğrulanamadı', error.response?.data?.error?.details);
    }
  },

  async sendEmailVerification(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/api/auth/send-verification');
      return response.data;
    } catch (error: any) {
      console.error('Send email verification error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Doğrulama e-postası gönderilemedi', error.response?.data?.error?.details);
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Şifre sıfırlama e-postası gönderilemedi', error.response?.data?.error?.details);
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/api/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error: any) {
      console.error('Reset password error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Şifre sıfırlanamadı', error.response?.data?.error?.details);
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
   * Randevu detayları
   */
  async getAppointmentDetails(id: string): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.get(`/api/appointments/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Get appointment details error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu detayları alınamadı',
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
   * Randevu durumu güncelleme
   */
  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.put(`/api/appointments/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Update appointment status error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu durumu güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Randevu kabul etme
   */
  async acceptAppointment(id: string): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.put(`/api/appointments/${id}/accept`);
      return response.data;
    } catch (error: any) {
      console.error('Accept appointment error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu kabul edilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Randevu reddetme
   */
  async rejectAppointment(id: string, reason?: string): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.put(`/api/appointments/${id}/reject`, { reason });
      return response.data;
    } catch (error: any) {
      console.error('Reject appointment error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu reddedilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Eksik metodlar ekleniyor
  async getMechanicAppointments(status?: string, filters?: any): Promise<ApiResponse<{ appointments: any[] }>> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (filters) Object.assign(params, filters);
      
      const response = await apiClient.get('/api/appointments/mechanic', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic appointments error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevular alınamadı', error.response?.data?.error?.details);
    }
  },

  async getMechanicAppointmentCounts(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/api/mechanic/appointments/counts');
      return response.data;
    } catch (error: any) {
      console.error('Get appointment counts error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu sayıları alınamadı', error.response?.data?.error?.details);
    }
  },

  async getAppointmentById(id: string): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.get(`/api/appointments/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Get appointment by ID error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu detayları alınamadı', error.response?.data?.error?.details);
    }
  },

  async approveAppointment(id: string, data?: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/api/appointments/${id}/approve`, data);
      return response.data;
    } catch (error: any) {
      console.error('Approve appointment error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu onaylanamadı', error.response?.data?.error?.details);
    }
  },

  async updateJobStatus(id: string, status: string, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/api/appointments/${id}/job-status`, { status, notes });
      return response.data;
    } catch (error: any) {
      console.error('Update job status error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş durumu güncellenemedi', error.response?.data?.error?.details);
    }
  },

  async referJob(id: string, mechanicId?: string, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/api/appointments/${id}/refer`, { mechanicId, notes });
      return response.data;
    } catch (error: any) {
      console.error('Refer job error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş yönlendirilemedi', error.response?.data?.error?.details);
    }
  },

  async sendCustomerApproval(id: string, items?: any[], totalAmount?: number, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/api/appointments/${id}/customer-approval`, { items, totalAmount, notes });
      return response.data;
    } catch (error: any) {
      console.error('Send customer approval error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri onayı gönderilemedi', error.response?.data?.error?.details);
    }
  },

  async getJobStory(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/api/appointments/${id}/job-story`);
      return response.data;
    } catch (error: any) {
      console.error('Get job story error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş hikayesi alınamadı', error.response?.data?.error?.details);
    }
  },

  async addJobStoryPhoto(id: string, photoUri: string, caption?: string): Promise<ApiResponse<any>> {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      if (caption) formData.append('caption', caption);

      const response = await apiClient.post(`/api/appointments/${id}/job-story/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error: any) {
      console.error('Add job story photo error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Fotoğraf eklenemedi', error.response?.data?.error?.details);
    }
  },

  async deleteJobStoryPhoto(id: string, photoId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete(`/api/appointments/${id}/job-story/photo/${photoId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete job story photo error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Fotoğraf silinemedi', error.response?.data?.error?.details);
    }
  },

  async getAvailableStatuses(): Promise<ApiResponse<{ statuses: string[] }>> {
    try {
      const response = await apiClient.get('/api/appointments/available-statuses');
      return response.data;
    } catch (error: any) {
      console.error('Get available statuses error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Durumlar alınamadı', error.response?.data?.error?.details);
    }
  },

  async getTrustedMechanics(): Promise<ApiResponse<{ mechanics: any[] }>> {
    try {
      const response = await apiClient.get('/api/mechanics/trusted');
      return response.data;
    } catch (error: any) {
      console.error('Get trusted mechanics error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Güvenilir ustalar alınamadı', error.response?.data?.error?.details);
    }
  },

  async checkCustomerLoyalty(customerId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/api/customers/${customerId}/loyalty`);
      return response.data;
    } catch (error: any) {
      console.error('Check customer loyalty error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri sadakat bilgisi alınamadı', error.response?.data?.error?.details);
    }
  },

  async updateAppointmentPriceIncrease(id: string, amount?: number, reason?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/api/appointments/${id}/price-increase`, { amount, reason });
      return response.data;
    } catch (error: any) {
      console.error('Update price increase error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Fiyat artışı güncellenemedi', error.response?.data?.error?.details);
    }
  },

  handleError(error: any) {
    console.error('API Error:', error);
    if (error.response) {
      return error.response.data;
    }
    return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Bir hata oluştu', null);
  },

  async getRecentActivity(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/api/mechanic/dashboard/recent-activity');
      return response.data;
    } catch (error: any) {
      console.error('Get recent activity error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Son aktiviteler alınamadı', error.response?.data?.error?.details);
    }
  },

  async getRecentRatings(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/api/mechanic/ratings/recent');
      return response.data;
    } catch (error: any) {
      console.error('Get recent ratings error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Son değerlendirmeler alınamadı', error.response?.data?.error?.details);
    }
  },

  async getRatingStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/api/mechanic/ratings/stats');
      return response.data;
    } catch (error: any) {
      console.error('Get rating stats error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Değerlendirme istatistikleri alınamadı', error.response?.data?.error?.details);
    }
  },

  async getAppointmentStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/api/mechanic/dashboard/stats');
      return response.data;
    } catch (error: any) {
      console.error('Get appointment stats error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu istatistikleri alınamadı', error.response?.data?.error?.details);
    }
  }
};

// ===== PROFILE SERVICES =====

export const ProfileService = {
  /**
   * Profil bilgilerini getir
   */
  async getProfile(): Promise<ApiResponse<{ profile: Mechanic }>> {
    try {
      const response = await apiClient.get('/api/mechanic/me');
      return response.data;
    } catch (error: any) {
      console.error('Get profile error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Profil bilgileri alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Usta profilini getir (alias)
   */
  async getMechanicProfile(): Promise<ApiResponse<{ profile: Mechanic }>> {
    return this.getProfile();
  },

  /**
   * Profil güncelleme
   */
  async updateProfile(data: Partial<Mechanic>): Promise<ApiResponse<{ profile: Mechanic }>> {
    try {
      const response = await apiClient.put('/api/mechanic/me', data);
      return response.data;
    } catch (error: any) {
      console.error('Update profile error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Profil güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Çalışma saatleri güncelleme
   */
  async updateWorkingHours(hours: any[]): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/users/working-hours', { hours });
      return response.data;
    } catch (error: any) {
      console.error('Update working hours error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Çalışma saatleri güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Servis kategorileri güncelleme
   */
  async updateServiceCategories(categories: ServiceType[]): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/users/service-categories', { categories });
      return response.data;
    } catch (error: any) {
      console.error('Update service categories error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Servis kategorileri güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kullanıcı profilini güncelle
   */
  async updateUserProfile(data: Partial<Mechanic>): Promise<ApiResponse<Mechanic>> {
    try {
      const response = await apiClient.put('/api/mechanic/me', data);
      return response.data;
    } catch (error: any) {
      console.error('Update user profile error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Profil güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Şifre değiştirme
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error: any) {
      console.error('Change password error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Şifre değiştirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Token yenileme
   */
  async refreshToken(): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('Refresh token bulunamadı');
      }

      const response = await apiClient.post('/api/auth/refresh', {
        refreshToken
      });
      return response.data;
    } catch (error: any) {
      console.error('Refresh token error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Token yenilenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Çıkış yapma
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/api/auth/logout');
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      return createSuccessResponse(null, 'Başarıyla çıkış yapıldı');
    } catch (error: any) {
      console.error('Logout error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Çıkış yapılamadı',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== EARNINGS SERVICES =====

export const EarningsService = {
  /**
   * Kazanç özeti
   */
  async getEarningsSummary(): Promise<ApiResponse<{ earnings: any }>> {
    try {
      const response = await apiClient.get('/api/mechanic-earnings/summary');
      return response.data;
    } catch (error: any) {
      console.error('Get earnings summary error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kazanç özeti alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Ödeme geçmişi
   */
  async getPaymentHistory(): Promise<ApiResponse<{ payments: any[] }>> {
    try {
      const response = await apiClient.get('/api/mechanic-earnings/transactions');
      return response.data;
    } catch (error: any) {
      console.error('Get payment history error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Ödeme geçmişi alınamadı',
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
      const response = await apiClient.get(`/api/message/conversations/${conversationId}/messages`);
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
   * Konuşma mesajlarını getir (sayfalama ile)
   */
  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<MessageData[]>> {
    try {
      const response = await apiClient.get(`/api/message/conversations/${conversationId}/messages`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get conversation messages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Konuşma mesajları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Mesaj gönderme (text)
   */
  async sendMessage(conversationId: string, recipientId: string, text: string, metadata?: any): Promise<ApiResponse<MessageData>> {
    try {
      const response = await apiClient.post('/api/message/send', {
        conversationId,
        recipientId,
        text,
        metadata
      });
      return response.data;
    } catch (error: any) {
      console.error('Send message error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Konuşma listesi
   */
  async getConversations(): Promise<ApiResponse<{ conversations: any[] }>> {
    try {
      const response = await apiClient.get('/api/message/conversations');
      return response.data;
    } catch (error: any) {
      console.error('Get conversations error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Konuşma listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Konuşma silme
   */
  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/api/message/conversations/${conversationId}`);
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

  /**
   * Okunmamış mesaj sayısı
   */
  async getUnreadMessageCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await apiClient.get('/api/message/unread-count');
      return response.data;
    } catch (error: any) {
      console.error('Get unread message count error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Okunmamış mesaj sayısı alınamadı',
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
      const response = await apiClient.get('/api/notifications/mechanic');
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

// ===== CUSTOMER SERVICES =====

export const CustomerService = {
  /**
   * Ustanın müşterilerini getir
   */
  async getMechanicCustomers(filters?: any): Promise<ApiResponse<{ customers: any[] }>> {
    try {
      const response = await apiClient.get('/api/mechanics/customers', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic customers error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Müşteri listesi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  async getCustomerDetails(customerId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/api/customers/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get customer details error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri detayları alınamadı', error.response?.data?.error?.details);
    }
  },

  async addCustomerNote(customerId: string, note: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/api/customers/${customerId}/notes`, { note });
      return response.data;
    } catch (error: any) {
      console.error('Add customer note error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Not eklenemedi', error.response?.data?.error?.details);
    }
  }
};

// ===== FAULT REPORT SERVICES =====

export const FaultReportService = {
  /**
   * Ustanın arıza raporlarını getir
   */
  async getMechanicFaultReports(statusFilter?: string): Promise<ApiResponse<{ faultReports: any[] }>> {
    try {
      const url = statusFilter ? `/api/fault-reports/mechanic?status=${statusFilter}` : '/api/fault-reports/mechanic';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic fault reports error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Arıza raporları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Arıza raporu detayı getir
   */
  async getFaultReportById(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/api/fault-reports/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Get fault report by ID error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Arıza raporu detayı alınamadı', error.response?.data?.error?.details);
    }
  },

  /**
   * Arıza raporu için teklif gönder
   */
  async submitQuote(faultReportId: string, quoteData: {
    quoteAmount: number;
    estimatedDuration: string;
    notes: string;
  }): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/api/fault-reports/${faultReportId}/quote`, quoteData);
      return response.data;
    } catch (error: any) {
      console.error('Submit quote error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teklif gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Usta yanıtı gönder
   */
  async submitMechanicResponse(id: string, response: any): Promise<ApiResponse<any>> {
    try {
      const apiResponse = await apiClient.post(`/api/fault-reports/${id}/mechanic-response`, response);
      return apiResponse.data;
    } catch (error: any) {
      console.error('Submit mechanic response error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Yanıt gönderilemedi', error.response?.data?.error?.details);
    }
  },

  /**
   * İşi sonlandır
   */
  async finalizeWork(id: string, finalData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/api/fault-reports/${id}/finalize`, finalData);
      return response.data;
    } catch (error: any) {
      console.error('Finalize work error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş sonlandırılamadı', error.response?.data?.error?.details);
    }
  }
};

// ===== EMERGENCY SERVICES =====
export const EmergencyService = {
  /**
   * Acil çekici taleplerini getir
   */
  async getEmergencyTowingRequests(status?: string): Promise<ApiResponse<any>> {
    try {
      const url = status ? `/api/emergency/towing?status=${status}` : '/api/emergency/towing';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Get emergency towing requests error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Acil talepler alınamadı', error.response?.data?.error?.details);
    }
  },

  /**
   * Acil çekici talebine yanıt ver
   */
  async respondToEmergencyTowingRequest(id: string, responseData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/api/emergency/towing/${id}/respond`, responseData);
      return response.data;
    } catch (error: any) {
      console.error('Respond to emergency towing request error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Yanıt gönderilemedi', error.response?.data?.error?.details);
    }
  }
};

// ===== SETTINGS SERVICES =====

export const SettingsService = {
  /**
   * Bildirim ayarlarını getir
   */
  async getNotificationSettings(): Promise<ApiResponse<{ settings: any }>> {
    try {
      const response = await apiClient.get('/api/users/notification-settings');
      return response.data;
    } catch (error: any) {
      console.error('Get notification settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim ayarları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Gizlilik ayarlarını getir
   */
  async getPrivacySettings(): Promise<ApiResponse<{ settings: any }>> {
    try {
      const response = await apiClient.get('/api/users/privacy-settings');
      return response.data;
    } catch (error: any) {
      console.error('Get privacy settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Gizlilik ayarları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * İş ayarlarını getir
   */
  async getJobSettings(): Promise<ApiResponse<{ settings: any }>> {
    try {
      const response = await apiClient.get('/api/users/job-settings');
      return response.data;
    } catch (error: any) {
      console.error('Get job settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş ayarları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Uygulama ayarlarını getir
   */
  async getAppSettings(): Promise<ApiResponse<{ settings: any }>> {
    try {
      const response = await apiClient.get('/api/users/app-settings');
      return response.data;
    } catch (error: any) {
      console.error('Get app settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Uygulama ayarları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Güvenlik ayarlarını getir
   */
  async getSecuritySettings(): Promise<ApiResponse<{ settings: any }>> {
    try {
      const response = await apiClient.get('/api/users/security-settings');
      return response.data;
    } catch (error: any) {
      console.error('Get security settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Güvenlik ayarları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Bildirim ayarlarını güncelle
   */
  async updateNotificationSettings(settings: any): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/users/notification-settings', settings);
      return response.data;
    } catch (error: any) {
      console.error('Update notification settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim ayarları güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Gizlilik ayarlarını güncelle
   */
  async updatePrivacySettings(settings: any): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/users/privacy-settings', settings);
      return response.data;
    } catch (error: any) {
      console.error('Update privacy settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Gizlilik ayarları güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * İş ayarlarını güncelle
   */
  async updateJobSettings(settings: any): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/users/job-settings', settings);
      return response.data;
    } catch (error: any) {
      console.error('Update job settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş ayarları güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Uygulama ayarlarını güncelle
   */
  async updateAppSettings(settings: any): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/users/app-settings', settings);
      return response.data;
    } catch (error: any) {
      console.error('Update app settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Uygulama ayarları güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Güvenlik ayarlarını güncelle
   */
  async updateSecuritySettings(settings: any): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.put('/api/users/security-settings', settings);
      return response.data;
    } catch (error: any) {
      console.error('Update security settings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Güvenlik ayarları güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== EXPORT ALL SERVICES =====

const apiService = {
  AuthService,
  AppointmentService,
  ProfileService,
  EarningsService,
  MessageService,
  NotificationService,
  CustomerService,
  FaultReportService,
  EmergencyService,
  SettingsService,
  // Spread all service methods to top level for backward compatibility
  ...AuthService,
  ...AppointmentService,
  ...ProfileService,
  ...MessageService,
  ...CustomerService,
  ...NotificationService,
  ...FaultReportService,
  ...EmergencyService,
  handleError: AppointmentService.handleError
};

export default apiService;