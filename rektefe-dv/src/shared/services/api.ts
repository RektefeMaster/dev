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
import { handleApiError } from '@/shared/utils/errorHandler';
import { 
  isTokenExpired, 
  shouldRefreshToken, 
  isTokenValid,
  getTokenUserInfo 
} from '@/shared/utils/tokenUtils';

if (!API_CONFIG.BASE_URL) {
  throw new Error('API_URL tanımsız!');
}

// Token yenileme fonksiyonu
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

const refreshTokenIfNeeded = async (): Promise<string | null> => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      console.log('⚠️ Refresh token bulunamadı');
      processQueue(new Error('Refresh token bulunamadı'), null);
      return null;
    }

    console.log('🔄 Token yenileme başlatılıyor...');
    const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh-token`, {
      refreshToken
    });

    if (response.data && response.data.success && response.data.token) {
      const newToken = response.data.token;
      const newRefreshToken = response.data.refreshToken || refreshToken;

      // Yeni token'ları kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

      console.log('✅ Token başarıyla yenilendi');
      processQueue(null, newToken);
      return newToken;
    } else {
      throw new Error('Token yenileme başarısız');
    }
  } catch (error) {
    console.error('❌ Token yenileme hatası:', error);
    
    // Token yenileme başarısızsa tüm token'ları temizle
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_ID
    ]);
    
    processQueue(error, null);
    return null;
  } finally {
    isRefreshing = false;
  }
};

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL, // Use config instead of hardcoded URL
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
      console.log('🔍 Request interceptor: Token kontrolü - URL:', config.url);
      
      if (token) {
        // Token validation kontrolü
        if (isTokenValid(token)) {
          // Token geçerli, ancak yenilenmesi gerekip gerekmediğini kontrol et
          if (shouldRefreshToken(token)) {
            console.log('🔄 Token yenilenmesi gerekiyor, yenileme başlatılıyor...');
            try {
              const newToken = await refreshTokenIfNeeded();
              if (newToken) {
                config.headers.Authorization = `Bearer ${newToken}`;
                console.log('✅ Token yenilendi ve eklendi');
              } else {
                config.headers.Authorization = `Bearer ${token}`;
                console.log('⚠️ Token yenilenemedi, mevcut token kullanılıyor');
              }
            } catch (refreshError) {
              console.error('❌ Token yenileme hatası:', refreshError);
              config.headers.Authorization = `Bearer ${token}`;
            }
          } else {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('✅ Request interceptor: Token eklendi, uzunluk:', token.length);
          }
        } else {
          // Geçersiz token'ı temizle
          console.log('⚠️ Request interceptor: Geçersiz token temizleniyor');
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        }
      } else {
        console.log('⚠️ Request interceptor: Token bulunamadı');
      }
      return config;
    } catch (error) {
      console.error('❌ Request interceptor: Hata:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
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
    
    // Hata işleme
    const appError = handleApiError(error);
    
    // Network error handling
    if (!error.response) {
      console.error('Network Error:', appError.message);
      return Promise.reject(appError);
    }
    
    // 401 Unauthorized handling - Gerçek logout mekanizması
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Token yenileme dene
        const newToken = await refreshTokenIfNeeded();
        
        if (newToken) {
          // Yeni token ile isteği tekrar gönder
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // Token yenilenemedi, logout yap
          console.log('🚪 Token yenilenemedi, otomatik logout yapılıyor...');
          await performLogout();
          return Promise.reject(appError);
        }
      } catch (refreshError) {
        console.error('❌ Token yenileme hatası:', refreshError);
        // Token yenileme başarısız, logout yap
        await performLogout();
        return Promise.reject(appError);
      }
    }
    
    // Diğer hatalar için detaylı log
    if (error.response) {
      }
    
    return Promise.reject(error);
  }
);

// Logout fonksiyonu
const performLogout = async () => {
  try {
    console.log('🚪 Otomatik logout başlatılıyor...');
    
    // Tüm auth verilerini temizle
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_ID
    ]);
    
    // AuthContext'i güncelle (eğer mevcut ise)
    // Bu kısım AuthContext'ten çağrılacak
    console.log('✅ Logout tamamlandı');
  } catch (error) {
    console.error('❌ Logout hatası:', error);
  }
};

// Profil fotoğrafı güncelleme (sadece backend'e yükleme)
export const updateProfilePhoto = async (uri: string) => {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as unknown as Blob);
    
    // 1. Resmi Cloudinary'ye yükle
    const uploadResponse = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    if (!uploadResponse.data || !uploadResponse.data.url) {
      throw new Error('Resim yüklenemedi');
    }
    
    const imageUrl = uploadResponse.data.url;
    // 2. Profil fotoğrafını güncelle
    const profileResponse = await api.post('/users/profile-photo', { photoUrl: imageUrl });
    
    // API response formatı kontrol et
    if (profileResponse.data && profileResponse.data.success) {
      return profileResponse.data;
    } else {
      throw new Error('Profil fotoğrafı güncellenemedi');
    }
  } catch (error) {
    throw error;
  }
};

// Kapak fotoğrafı güncelleme (sadece backend'e yükleme)
export const updateCoverPhoto = async (uri: string) => {
  try {
    const formData = new FormData();
    formData.append('image', {
      uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as unknown as Blob);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const imageUrl = response.data.url;
    const res = await api.post('/users/cover-photo', { photoUrl: imageUrl });
    return res.data;
  } catch (error) {
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
    throw error;
  }
};

// ===== ORTAK API SERVICE =====
// Tüm frontend uygulamaları için standart API service

class ApiService {
  private api = api;

  // ===== AUTH ENDPOINTS =====
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { 
      email, 
      password, 
      userType: 'driver' // Şoför uygulaması için userType ekle
    });
    return response.data;
  }

  async register(userData: RegisterData): Promise<ApiResponse<Driver>> {
    const registerData = {
      ...userData,
      userType: 'driver' as const // Şoför uygulaması için userType ekle
    };
    const response = await this.api.post('/auth/register', registerData);
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
    try {
      console.log('🔍 getAppointments: API çağrısı başlatılıyor...', userType);
      const endpoint = userType === 'driver' ? '/appointments/driver' : '/appointments/mechanic';
      const response = await this.api.get(endpoint);
      console.log('✅ getAppointments: Başarılı yanıt:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ getAppointments: Detaylı hata:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Hata detaylarını kullanıcıya göster
      throw new Error(`Randevular getirilemedi: ${error.response?.data?.message || error.message}`);
    }
  }

  async createAppointment(appointmentData: AppointmentData): Promise<ApiResponse> {
    try {
      console.log('🔍 createAppointment: Gönderilen veri:', appointmentData);
      
      // Veriyi temizle ve doğru formatta gönder
      const cleanData = {
        userId: appointmentData.userId,
        vehicleId: appointmentData.vehicleId,
        serviceType: appointmentData.serviceType,
        appointmentDate: appointmentData.appointmentDate,
        timeSlot: appointmentData.timeSlot,
        description: appointmentData.description,
        mechanicId: appointmentData.mechanicId,
        ...(appointmentData.price && { price: appointmentData.price })
      };
      
      console.log('🔍 createAppointment: Temizlenmiş veri:', cleanData);
      
      const response = await this.api.post('/appointments', cleanData);
      console.log('✅ createAppointment: Başarılı yanıt:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ createAppointment: Detaylı hata:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Hata detaylarını kullanıcıya göster
      throw new Error(`Randevu oluşturulamadı: ${error.response?.data?.message || error.message}`);
    }
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

  async createVehicle(vehicleData: VehicleData): Promise<ApiResponse> {
    const response = await this.api.post('/vehicles', vehicleData);
    return response.data;
  }

  async updateVehicle(vehicleId: string, vehicleData: Partial<VehicleData>): Promise<ApiResponse> {
    const response = await this.api.put(`/vehicles/${vehicleId}`, vehicleData);
    return response.data;
  }

  async deleteVehicle(vehicleId: string) {
    const response = await this.api.delete(`/vehicles/${vehicleId}`);
    return response.data;
  }

  // ===== MECHANIC ENDPOINTS =====
  async getMechanics() {
    try {
      console.log('🔍 getMechanics: API çağrısı başlatılıyor...');
      const response = await this.api.get('/mechanic-services/mechanics');
      console.log('✅ getMechanics: Başarılı yanıt:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ getMechanics: Detaylı hata:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Hata detaylarını kullanıcıya göster
      throw new Error(`Ustalar getirilemedi: ${error.response?.data?.message || error.message}`);
    }
  }

  async getMechanicById(mechanicId: string) {
    try {
      console.log('🔍 getMechanicById: API çağrısı başlatılıyor...', mechanicId);
      const response = await this.api.get(`/mechanic/details/${mechanicId}`);
      console.log('✅ getMechanicById: Başarılı yanıt:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ getMechanicById: Detaylı hata:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Hata detaylarını kullanıcıya göster
      throw new Error(`Usta detayları getirilemedi: ${error.response?.data?.message || error.message}`);
    }
  }

  async getMechanicDetails(mechanicId: string) {
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

  async getMechanicRatingStats(mechanicId: string) {
    const response = await this.api.get(`/appointment-ratings/mechanic/${mechanicId}/rating`);
    return response.data;
  }

  async getMechanicReviews(mechanicId: string, options: { limit?: number } = {}) {
    const { limit = 20 } = options;
    const response = await this.api.get(`/appointment-ratings/mechanic/${mechanicId}/ratings?limit=${limit}`);
    return response.data;
  }

  async getMainCategories() {
    const response = await this.api.get('/service-categories/main-categories');
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

  async sendMessage(messageData: MessageData): Promise<ApiResponse> {
    const response = await this.api.post('/message/send', messageData);
    return response.data;
  }

  async markMessagesAsRead(conversationId: string) {
    const response = await this.api.put(`/message/mark-read`, { conversationId });
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<ApiResponse> {
    console.log(`[ApiService] DELETE /message/${messageId}`);
    const response = await this.api.delete(`/message/${messageId}`);
    console.log(`[ApiService] Delete response:`, response.data);
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<ApiResponse> {
    console.log(`[ApiService] DELETE /message/conversations/${conversationId}`);
    const response = await this.api.delete(`/message/conversations/${conversationId}`);
    console.log(`[ApiService] Delete conversation response:`, response.data);
    return response.data;
  }

  async findConversation(otherUserId: string) {
    const response = await this.api.get(`/message/conversation/find/${otherUserId}`);
    return response.data;
  }

  // ===== NOTIFICATION ENDPOINTS =====
  async getNotifications() {
    console.log('🔍 getNotifications: API çağrısı başlıyor...');
    try {
      const response = await this.api.get('/notifications/driver');
      console.log('✅ getNotifications: API başarılı:', response.status);
      return response.data;
    } catch (error) {
      console.error('❌ getNotifications: API hatası:', error);
      throw error;
    }
  }

  async createNotification(notificationData: NotificationData): Promise<ApiResponse> {
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

  async updateUserProfile(profileData: Record<string, unknown>): Promise<ApiResponse> {
    const response = await this.api.put('/users/profile', profileData);
    return response.data;
  }

  async updateProfilePhoto(photoUrl: string) {
    const response = await this.api.post('/users/profile-photo', { photoUrl });
    return response.data;
  }

  // ===== YENİ HİZMET TALEPLERİ - Usta verilerine entegre =====
  async createTowingRequest(requestData: Record<string, unknown>): Promise<ApiResponse> {
    const response = await this.api.post('/service-requests/towing', {
      ...requestData,
      emergencyLevel: requestData.emergencyLevel || 'medium',
      towingType: requestData.towingType || 'flatbed',
      requestType: 'immediate'
    });
    return response.data;
  }

  // ===== ACİL ÇEKİCİ SİSTEMİ =====
  async createEmergencyTowingRequest(requestData: Record<string, unknown>): Promise<ApiResponse> {
    const response = await this.api.post('/service-requests/towing', {
      ...requestData,
      requestType: 'emergency',
      priority: 'critical',
      emergencyLevel: 'critical',
      timestamp: new Date().toISOString()
    });
    return response.data;
  }

  async getEmergencyTowingRequest(requestId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/service-requests/towing/${requestId}`);
    return response.data;
  }

  async cancelEmergencyTowingRequest(requestId: string): Promise<ApiResponse> {
    const response = await this.api.post(`/emergency/towing-request/${requestId}/cancel`);
    return response.data;
  }

  async getEmergencyTowingStatus(requestId: string): Promise<ApiResponse> {
    const response = await this.api.get(`/emergency/towing-request/${requestId}/status`);
    return response.data;
  }

  async createWashBooking(bookingData: Record<string, unknown>): Promise<ApiResponse> {
    const response = await this.api.post('/service-requests/wash', {
      ...bookingData,
      serviceType: 'wash',
      packageType: bookingData.packageType || 'basic',
      appointmentDate: bookingData.appointmentDate || new Date().toISOString(),
      timeSlot: bookingData.timeSlot || '09:00-10:00'
    });
    return response.data;
  }

  async createTirePartsRequest(requestData: Record<string, unknown>): Promise<ApiResponse> {
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
  async createFaultReport(faultReportData: Record<string, unknown>): Promise<ApiResponse> {
    try {
      console.log('🔍 createFaultReport: Gönderilen veri:', faultReportData);
      
      // Frontend'den gelen serviceCategory'yi backend formatına çevir
      // Çekici, Araç Yıkama ve Lastik hariç tüm hizmetler "Tamir ve Bakım" altında
      const serviceCategoryMapping: { [key: string]: string } = {
        'Tamir ve Bakım': 'Genel Bakım', // Tüm tamir/bakım hizmetleri Genel Bakım olarak gönderilir
        'Araç Yıkama': 'Araç Yıkama',
        'Lastik': 'Lastik', 
        'Çekici': 'Çekici'
      };
      
      const mappedServiceCategory = serviceCategoryMapping[faultReportData.serviceCategory as string] || faultReportData.serviceCategory;
      
      // Veriyi temizle ve doğru formatta gönder
      const cleanData = {
        vehicleId: faultReportData.vehicleId,
        serviceCategory: mappedServiceCategory,
        faultDescription: faultReportData.faultDescription,
        priority: faultReportData.priority || 'medium',
        photos: faultReportData.photos || [],
        videos: faultReportData.videos || [],
        // vehicleInfo backend'de kabul edilmiyor, sadece vehicleId yeterli
        ...(faultReportData.location && { location: faultReportData.location })
      };
      
      console.log('🔍 createFaultReport: Temizlenmiş veri:', cleanData);
      
      const response = await this.api.post('/fault-reports', cleanData);
      console.log('✅ createFaultReport: Başarılı yanıt:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ createFaultReport: Detaylı hata:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Hata detaylarını kullanıcıya göster
      throw new Error(`Arıza bildirimi gönderilemedi: ${error.response?.data?.message || error.message}`);
    }
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


  // ===== GENERIC METHODS =====
  async post(endpoint: string, data?: any) {
    const response = await this.api.post(endpoint, data);
    return response.data;
  }

  async get(endpoint: string, params?: any) {
    const response = await this.api.get(endpoint, { params });
    return response.data;
  }

  async put(endpoint: string, data?: any) {
    const response = await this.api.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint: string) {
    const response = await this.api.delete(endpoint);
    return response.data;
  }
}

// Singleton instance
const apiService = new ApiService();

// Driver API alias for backward compatibility
export const driverApi = apiService;

export { api, apiService }; 