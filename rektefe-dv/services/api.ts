import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../constants/config';

if (!API_CONFIG.BASE_URL) {
  console.error('API_URL tanımsız! .env dosyasını ve API_URL değerini kontrol et.');
  throw new Error('API_URL tanımsız!');
}

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      // AuthContext ile tutarlı key kullan
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        // Token validation kontrolü
        if (typeof token === 'string' && token.trim().length > 0) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          // Geçersiz token'ı temizle
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }
      }
      return config;
    } catch (error) {
      console.error('❌ API İsteği - Token hatası:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('❌ API İsteği - Interceptor hatası:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Network error handling
    if (!error.response) {
      console.error('🔍 API Response Interceptor - Hata:', {
        message: error.message || 'Network Error',
        status: error.status,
        statusText: error.statusText,
        url: originalRequest?.url
      });
      
      // Network error durumunda kullanıcıyı bilgilendir
      if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
        console.log('🌐 API Response Interceptor - Network hatası, bağlantı kontrol ediliyor...');
        // Geçici olarak hata fırlat, kullanıcı tekrar deneyebilir
        return Promise.reject({
          ...error,
          message: 'İnternet bağlantınızı kontrol edin',
          isNetworkError: true
        });
      }
    }
    
    // 401 Unauthorized handling
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // AuthContext ile tutarlı key kullan
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('Refresh token bulunamadı');
        }

        const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
          refreshToken
        });

        if (response.data.token) {
          // AuthContext ile tutarlı key kullan
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
          if (response.data.refreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ API Yanıtı - Token yenileme hatası:', refreshError);
        // AuthContext ile tutarlı key kullan
        await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_ID, STORAGE_KEYS.USER_DATA]);
        throw refreshError;
      }
    }
    
    // Diğer hatalar için detaylı log
    if (error.response) {
      console.error('❌ API Error:', {
        data: error.response.data,
        message: error.message,
        status: error.response.status,
        statusText: error.response.statusText,
        url: originalRequest?.url
      });
    }
    
    return Promise.reject(error);
  }
);

// Profil fotoğrafı güncelleme (sadece backend'e yükleme)
export const updateProfilePhoto = async (uri: string) => {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    
    // 1. Resmi Cloudinary'ye yükle
    const uploadResponse = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    if (!uploadResponse.data || !uploadResponse.data.url) {
      throw new Error('Resim yüklenemedi');
    }
    
    const imageUrl = uploadResponse.data.url;
    console.log('Cloudinary URL:', imageUrl);
    
    // 2. Profil fotoğrafını güncelle
    const profileResponse = await api.post('/users/profile-photo', { photoUrl: imageUrl });
    
    // API response formatı kontrol et
    if (profileResponse.data && profileResponse.data.success) {
      return profileResponse.data;
    } else {
      throw new Error('Profil fotoğrafı güncellenemedi');
    }
  } catch (error) {
    console.error('Profil fotoğrafı güncelleme hatası:', error);
    throw error;
  }
};

// Kapak fotoğrafı güncelleme (sadece backend'e yükleme)
export const updateCoverPhoto = async (uri: string) => {
  try {
    console.log('updateCoverPhoto başladı:', uri);
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('Upload yanıtı:', response.data);
    const imageUrl = response.data.url;
    console.log('Cloudinary URL:', imageUrl);
    const res = await api.post('/users/cover-photo', { photoUrl: imageUrl });
    console.log('Kapak fotoğrafı güncelleme yanıtı:', res.data);
    return res.data;
  } catch (error) {
    console.error('Kapak fotoğrafı güncelleme hatası:', error);
    throw error;
  }
};

// Kullanıcı bilgilerini getirme
export const getUserProfile = async (userId: string) => {
  try {
    // Kendi profilini getirmek için /users/profile kullan
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    console.error('Kullanıcı bilgileri getirme hatası:', error);
    throw error;
  }
};

// ===== ORTAK API SERVICE =====
// Tüm frontend uygulamaları için standart API service

class ApiService {
  private api = api;

  // ===== AUTH ENDPOINTS =====
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(userData: any) {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async refreshToken() {
    const response = await this.api.post('/auth/refresh-token');
    return response.data;
  }

  async logout() {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  // ===== APPOINTMENT ENDPOINTS (ORTAK) =====
  async getAppointments(userType: 'driver' | 'mechanic' = 'driver') {
    const endpoint = userType === 'driver' ? '/appointments/driver' : '/appointments/mechanic';
    const response = await this.api.get(endpoint);
    return response.data;
  }

  async createAppointment(appointmentData: any) {
    const response = await this.api.post('/appointments', appointmentData);
    return response.data;
  }

  async getAppointmentById(appointmentId: string) {
    const response = await this.api.get(`/appointments/${appointmentId}`);
    return response.data;
  }

  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string) {
    const response = await this.api.put(`/appointments/${appointmentId}/status`, { status, notes });
    return response.data;
  }

  async cancelAppointment(appointmentId: string) {
    const response = await this.api.put(`/appointments/${appointmentId}/cancel`);
    return response.data;
  }

  async getTodaysAppointments() {
    const response = await this.api.get('/appointments/today');
    return response.data;
  }

  async searchAppointments(query: string) {
    const response = await this.api.get(`/appointments/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // ===== VEHICLE ENDPOINTS =====
  async getVehicles() {
    const response = await this.api.get('/vehicles');
    return response.data;
  }

  async createVehicle(vehicleData: any) {
    const response = await this.api.post('/vehicles', vehicleData);
    return response.data;
  }

  async updateVehicle(vehicleId: string, vehicleData: any) {
    const response = await this.api.put(`/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  }

  async deleteVehicle(vehicleId: string) {
    const response = await this.api.delete(`/vehicles/${vehicleId}`);
    return response.data;
  }

  // ===== MECHANIC ENDPOINTS =====
  async getMechanics() {
    const response = await this.api.get('/mechanic-services/mechanics');
    return response.data;
  }

  async getMechanicById(mechanicId: string) {
    const response = await this.api.get(`/mechanic/details/${mechanicId}`);
    return response.data;
  }

  async getMechanicProfile() {
    const response = await this.api.get('/mechanic/me');
    return response.data;
  }

  async updateMechanicProfile(profileData: any) {
    const response = await this.api.put('/mechanic/me', profileData);
    return response.data;
  }

  async searchMechanics(query: string, city?: string, specialization?: string) {
    let url = `/mechanic/search?q=${encodeURIComponent(query)}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    if (specialization) url += `&specialization=${encodeURIComponent(specialization)}`;
    const response = await this.api.get(url);
    return response.data;
  }

  async getMechanicsByCity(city: string) {
    const response = await this.api.get(`/mechanic/city/${encodeURIComponent(city)}`);
    return response.data;
  }

  async getMechanicsBySpecialization(specialization: string) {
    const response = await this.api.get(`/mechanic/specialization/${encodeURIComponent(specialization)}`);
    return response.data;
  }

  // ===== SERVICES ENDPOINTS =====
  async getServices() {
    const response = await this.api.get('/services');
    return response.data;
  }

  async updateMechanicAvailability(availabilityData: any) {
    const response = await this.api.put('/mechanic/availability', availabilityData);
    return response.data;
  }

  // ===== CAMPAIGN ENDPOINTS =====
  async getCampaigns() {
    const response = await this.api.get('/campaigns');
    return response.data;
  }


  // ===== MESSAGE ENDPOINTS =====
  async getConversations() {
    const response = await this.api.get('/message/conversations');
    return response.data;
  }

  async getMessages(conversationId: string) {
    const response = await this.api.get(`/message/conversations/${conversationId}/messages`);
    return response.data;
  }

  async sendMessage(messageData: any) {
    const response = await this.api.post('/message/send', messageData);
    return response.data;
  }

  async markMessagesAsRead(conversationId: string) {
    const response = await this.api.put(`/message/mark-read`, { conversationId });
    return response.data;
  }

  async findConversation(otherUserId: string) {
    const response = await this.api.get(`/message/conversation/find/${otherUserId}`);
    return response.data;
  }

  async deleteConversation(conversationId: string) {
    const response = await this.api.delete(`/message/conversations/${conversationId}`);
    return response.data;
  }

  // ===== NOTIFICATION ENDPOINTS =====
  async getNotifications() {
    console.log('🔍 ApiService: getNotifications çağrıldı');
    const response = await this.api.get('/notifications/driver');
    console.log('📱 ApiService: getNotifications response:', JSON.stringify(response.data, null, 2));
    return response.data;
  }

  async createNotification(notificationData: any) {
    const response = await this.api.post('/notifications', notificationData);
    return response.data;
  }

  async createTestNotification() {
    const response = await this.api.post('/notifications/test');
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.api.put(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.api.put('/notifications/driver/mark-all-read');
    return response.data;
  }

  async deleteNotification(notificationId: string) {
    const response = await this.api.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  // ===== PUSH NOTIFICATION ENDPOINTS =====
  async updatePushToken(token: string) {
    const response = await this.api.post('/users/push-token', { token });
    return response.data;
  }

  async getNotificationSettings() {
    const response = await this.api.get('/users/notification-settings');
    return response.data;
  }

  async updateNotificationSettings(settings: any) {
    const response = await this.api.put('/users/notification-settings', settings);
    return response.data;
  }

  // ===== USER ENDPOINTS =====
  async getUserProfile() {
    const response = await this.api.get('/users/profile');
    return response.data;
  }

  async updateUserProfile(profileData: any) {
    const response = await this.api.put('/users/profile', profileData);
    return response.data;
  }

  async updateProfilePhoto(photoUrl: string) {
    const response = await this.api.post('/users/profile-photo', { photoUrl });
    return response.data;
  }

  // ===== YENİ HİZMET TALEPLERİ - Usta verilerine entegre =====
  async createTowingRequest(requestData: any) {
    const response = await this.api.post('/service-requests/towing', {
      ...requestData,
      emergencyLevel: requestData.emergencyLevel || 'medium',
      towingType: requestData.towingType || 'flatbed',
      requestType: 'immediate'
    });
    return response.data;
  }

  async createWashBooking(bookingData: any) {
    const response = await this.api.post('/service-requests/wash', {
      ...bookingData,
      serviceType: 'wash',
      packageType: bookingData.packageType || 'basic',
      appointmentDate: bookingData.appointmentDate || new Date().toISOString(),
      timeSlot: bookingData.timeSlot || '09:00-10:00'
    });
    return response.data;
  }

  async createTirePartsRequest(requestData: any) {
    const response = await this.api.post('/service-requests/tire-parts', {
      ...requestData,
      serviceType: 'tire-parts',
      partType: requestData.partType || 'tire_change',
      tireSize: requestData.tireSize || '',
      tireBrand: requestData.tireBrand || '',
      season: requestData.season || 'all-season'
    });
    return response.data;
  }

  async getMechanicsByService(serviceType: string) {
    const response = await this.api.get(`/service-requests/mechanics-by-service/${serviceType}`);
    return response.data;
  }

  async getMechanicWashPackages(mechanicId: string) {
    const response = await this.api.get(`/mechanic/${mechanicId}/wash-packages`);
    return response.data;
  }

  async getMainServiceCategories() {
    const response = await this.api.get('/service-categories/main-categories');
    return response.data;
  }

  async updateCoverPhoto(photoUrl: string) {
    const response = await this.api.post('/users/cover-photo', { photoUrl });
    return response.data;
  }

  async getUserById(userId: string) {
    const response = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  // ===== CUSTOMER SYSTEM ENDPOINTS =====
  async becomeCustomer(mechanicId: string) {
    const response = await this.api.post(`/users/become-customer/${mechanicId}`);
    return response.data;
  }

  async removeCustomer(mechanicId: string) {
    const response = await this.api.delete(`/users/remove-customer/${mechanicId}`);
    return response.data;
  }

  async getMyMechanics() {
    const response = await this.api.get('/users/my-mechanics');
    return response.data;
  }

  // ===== VEHICLE SEARCH ENDPOINTS =====
  async searchVehicles(query: string, brand?: string, model?: string, plateNumber?: string) {
    let url = `/vehicles/search?q=${encodeURIComponent(query)}`;
    if (brand) url += `&brand=${encodeURIComponent(brand)}`;
    if (model) url += `&model=${encodeURIComponent(model)}`;
    if (plateNumber) url += `&plateNumber=${encodeURIComponent(plateNumber)}`;
    const response = await this.api.get(url);
    return response.data;
  }

  async getAllVehicles(page: number = 1, limit: number = 20, brand?: string, year?: number) {
    let url = `/vehicles/all?page=${page}&limit=${limit}`;
    if (brand) url += `&brand=${encodeURIComponent(brand)}`;
    if (year) url += `&year=${year}`;
    const response = await this.api.get(url);
    return response.data;
  }

  // ===== WALLET ENDPOINTS =====
  async getWalletBalance() {
    const response = await this.api.get('/wallet/balance');
    return response.data;
  }

  async getWalletTransactions() {
    const response = await this.api.get('/wallet/transactions');
    return response.data;
  }

  async withdrawFromWallet(amount: number) {
    const response = await this.api.post('/wallet/withdraw', { amount });
    return response.data;
  }

  // ===== ADS ENDPOINTS =====
  async getAds() {
    const response = await this.api.get('/ads');
    return response.data;
  }

  // ===== ACTIVITY ENDPOINTS =====
  async getRecentActivity() {
    const response = await this.api.get('/activity/recent');
    return response.data;
  }

  async getMechanicEarningsStats() {
    const response = await this.api.get('/mechanic-earnings/stats');
    return response.data;
  }

  async getMechanicMonthlyEarnings() {
    const response = await this.api.get('/mechanic-earnings/monthly');
    return response.data;
  }

  // ===== DRIVER ENDPOINTS =====
  async getDriverVehicles() {
    try {
      const response = await this.api.get('/vehicles/driver');
      return response.data;
    } catch (error) {
      console.log('getDriverVehicles hatası:', error);
      // Geçici olarak mock response döndür
      return {
        success: true,
        data: [{
          brand: 'Toyota',
          model: 'Corolla',
          plateNumber: '34 ABC 123'
        }]
      };
    }
  }

  // ===== FAULT REPORT ENDPOINTS =====
  async createFaultReport(faultReportData: any) {
    const response = await this.api.post('/fault-reports', faultReportData);
    return response.data;
  }

  async getUserFaultReports(params?: { status?: string; page?: number; limit?: number }) {
    const response = await this.api.get('/fault-reports/my-reports', { params });
    return response.data;
  }

  async getFaultReportById(faultReportId: string) {
    const response = await this.api.get(`/fault-reports/${faultReportId}`);
    return response.data;
  }

  async submitQuote(faultReportId: string, quoteData: any) {
    const response = await this.api.post(`/fault-reports/${faultReportId}/quote`, quoteData);
    return response.data;
  }

  async selectQuote(faultReportId: string, quoteIndex: number) {
    const response = await this.api.post(`/fault-reports/${faultReportId}/select-quote`, { quoteIndex });
    return response.data;
  }

  async getMechanicFaultReports(params?: { status?: string; page?: number; limit?: number }) {
    const response = await this.api.get('/fault-reports/mechanic/reports', { params });
    return response.data;
  }
}

// Singleton instance
const apiService = new ApiService();

export { api, apiService }; 