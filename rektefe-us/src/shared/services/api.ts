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
      // Rate limit durumunu sadece bilgi amaçlı logla - istekleri bloke ETME
      // İstekler normal şekilde gönderilmeye devam edecek, backend 429 dönecek
      // Önemli olan: Rate limit geldiğinde logout YAPILMAMASI (response interceptor'da handle ediliyor)
      if (isRateLimited && config.url && !config.url.includes('/auth/')) {
        const remainingTime = rateLimitResetTime ? rateLimitResetTime - Date.now() : 0;
        const remainingMinutes = Math.ceil(remainingTime / 60000);
        
        if (__DEV__) {
          console.log(`⚠️ Rate limit aktif (${remainingMinutes} dakika kaldı), istek gönderiliyor ama 429 gelebilir: ${config.url}`);
        }
      }
      
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      
      // Token yoksa ve auth gerektiren endpoint ise isteği iptal et
      if (!token && config.url && !config.url.includes('/auth/')) {
        if (__DEV__) {
          console.log('⚠️ Token yok - istek iptal ediliyor:', config.url);
        }
        const cancelToken = axios.CancelToken.source();
        cancelToken.cancel('No authentication token');
        config.cancelToken = cancelToken.token;
        return config;
      }
      
      // Production'da request logları kapatıldı - sadece gerekirse __DEV__ kontrolü ile log
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Request ID ekle
      config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      return config;
    } catch (error) {
      if (__DEV__) {
        console.error('Request interceptor error:', error);
      }
      return config;
    }
  },
  (error) => {
    if (__DEV__) {
      console.error('Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// ===== RESPONSE INTERCEPTOR =====

let isRefreshing = false;
let failedQueue: any[] = [];
let isRateLimited = false; // Rate limit durumunu takip et
let rateLimitResetTime: number | null = null; // Rate limit reset zamanı
let rateLimitTimer: NodeJS.Timeout | null = null; // Rate limit timer (memory leak önleme)

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

/**
 * Rate limit durumunu ayarla ve timer başlat/sıfırla
 */
const setRateLimitStatus = (resetTimeMs: number) => {
  // Eğer zaten bir timer varsa, önce temizle (memory leak önleme)
  if (rateLimitTimer) {
    clearTimeout(rateLimitTimer);
    rateLimitTimer = null;
  }

  // Rate limit durumunu aktif et
  isRateLimited = true;
  rateLimitResetTime = Date.now() + resetTimeMs;

  // Timer başlat
  rateLimitTimer = setTimeout(() => {
    isRateLimited = false;
    rateLimitResetTime = null;
    rateLimitTimer = null;
    if (__DEV__) {
      console.log('Rate limit süresi doldu');
    }
  }, resetTimeMs);
};

/**
 * Rate limit reset zamanını backend header'larından al
 * Öncelik sırası: Retry-After > RateLimit-Reset > Default (15 dakika)
 */
const getRateLimitResetTime = (error: any): number => {
  const headers = error.response?.headers || {};
  
  // Debug: Header'ları logla
  if (__DEV__) {
    console.log('🔍 Rate limit header kontrolü:');
    console.log('  - retry-after:', headers['retry-after'] || headers['Retry-After']);
    console.log('  - ratelimit-reset:', headers['ratelimit-reset'] || headers['RateLimit-Reset'] || headers['rate-limit-reset']);
    console.log('  - Tüm header keys:', Object.keys(headers).filter(k => k.toLowerCase().includes('rate') || k.toLowerCase().includes('retry')));
  }
  
  // Retry-After header'ı (saniye cinsinden) - case-insensitive
  const retryAfter = headers['retry-after'] || headers['Retry-After'] || headers['retryafter'];
  if (retryAfter) {
    const retryAfterSeconds = parseInt(retryAfter, 10);
    if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
      const ms = retryAfterSeconds * 1000;
      if (__DEV__) {
        console.log(`✅ Retry-After bulundu: ${retryAfterSeconds} saniye (${Math.ceil(ms / 60000)} dakika)`);
      }
      return ms;
    }
  }
  
  // RateLimit-Reset header'ı (Unix timestamp - saniye) - case-insensitive
  const rateLimitReset = headers['ratelimit-reset'] || 
                         headers['RateLimit-Reset'] || 
                         headers['rate-limit-reset'] ||
                         headers['x-ratelimit-reset'];
  if (rateLimitReset) {
    const resetTimestamp = parseInt(rateLimitReset, 10);
    if (!isNaN(resetTimestamp) && resetTimestamp > 0) {
      const resetTimeMs = resetTimestamp * 1000; // timestamp'i ms'ye çevir
      const remainingMs = resetTimeMs - Date.now();
      // Eğer geçmiş bir zaman değilse ve makul bir süre ise (1 saatten az)
      if (remainingMs > 0 && remainingMs < 60 * 60 * 1000) {
        if (__DEV__) {
          console.log(`✅ RateLimit-Reset bulundu: ${Math.ceil(remainingMs / 60000)} dakika kaldı`);
        }
        return remainingMs;
      } else if (remainingMs > 0) {
        // Eğer 1 saatten fazla ise, backend window süresini kullan (15 dakika)
        if (__DEV__) {
          console.log(`⚠️ RateLimit-Reset çok uzun (${Math.ceil(remainingMs / 60000)} dakika), default 15 dakika kullanılıyor`);
        }
      }
    }
  }
  
  // Default: 15 dakika (backend'in default windowMs değeri)
  if (__DEV__) {
    console.log('⚠️ Header bulunamadı, default 15 dakika kullanılıyor');
  }
  return 15 * 60 * 1000;
};

apiClient.interceptors.response.use(
  (response) => {
    // Production'da success logları kapat - sadece development'ta kritik endpoint'ler için
    if (__DEV__ && (response.config.url?.includes('/auth/') || response.config.url?.includes('/mechanic/me'))) {
      console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    // Error response'ları sadece development'ta logla
    if (__DEV__ && error.response) {
      console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
      // Sadece 5xx hatalarında detaylı log
      if (error.response?.status >= 500) {
        console.error('Error Details:', error.response?.data);
      }
    }
    
    const originalRequest = error.config;
    
    // Rate limit (429) hatası - SADECE logout yapma, token refresh yapma
    // İstekler normal şekilde devam edecek, sadece 429 hatası dönecek
    // Kullanıcı oturum açık kalacak, logout YAPILMAYACAK
    if (error.response?.status === 429) {
      if (__DEV__) {
        const resetTimeMs = getRateLimitResetTime(error);
        const resetMinutes = Math.ceil(resetTimeMs / 60000);
        console.warn(`Rate limit (429) - ${resetMinutes} dakika sonra tekrar deneyin`);
      }
      
      // Backend'den gelen rate limit reset zamanını al (bilgi amaçlı)
      const resetTimeMs = getRateLimitResetTime(error);
      
      // Rate limit durumunu sadece bilgi amaçlı set et (istekleri bloke etmek için değil)
      setRateLimitStatus(resetTimeMs);
      
      // Hata mesajını döndür - UI bu hatayı handle edecek, logout yapılmayacak
      return Promise.reject(error);
    }
    
    // Rate limit aktifse, 401 hatalarını da görmezden gel (token refresh yapma, logout yapma)
    if (isRateLimited && error.response?.status === 401) {
      if (__DEV__) {
        console.warn('Rate limit aktif, 401 hatası görmezden geliniyor');
      }
      return Promise.reject(error);
    }
    
    // 401 Unauthorized - token refresh dene (rate limit yoksa)
    if (error.response?.status === 401 && !originalRequest._retry && !isRateLimited) {
      if (isRefreshing) {
        // Başka bir request zaten refresh yapıyorsa bekle
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
          if (__DEV__) {
            console.error('Refresh token bulunamadı');
          }
          throw new Error('No refresh token');
        }

        if (__DEV__) {
          console.log('Token yenileniyor...');
        }
        
        // Refresh token endpoint'ini çağır
        const response = await axios.post(
          `${API_CONFIG.BASE_URL}/auth/refresh-token`,
          { refreshToken }
        );

        if (response.data.success && response.data.data?.token) {
          const newToken = response.data.data.token;
          const newRefreshToken = response.data.data.refreshToken;

          if (__DEV__) {
            console.log('Yeni token alındı');
          }

          // Yeni token'ları kaydet
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
          }

          // Header'ı güncelle
          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;

          if (__DEV__) {
            console.log('Token başarıyla yenilendi');
          }
          
          processQueue(null, newToken);
          isRefreshing = false;

          // Original request'i yeniden dene
          return apiClient(originalRequest);
        } else {
          if (__DEV__) {
            console.error('Refresh response başarısız:', response.data);
          }
          throw new Error('Token refresh response invalid');
        }
      } catch (refreshError: any) {
        if (__DEV__) {
          console.error('Token yenileme başarısız:', refreshError.message);
          if (refreshError.response?.status >= 500) {
            console.error('Error Response:', refreshError.response?.data);
          }
        }
        
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // 1. Rate limit hatası - logout yapma
        if (refreshError.response?.status === 429 || isRateLimited) {
          if (__DEV__) {
            console.warn('Token refresh rate limit hatası (429), logout yapılmıyor');
          }
          
          // Eğer refresh sırasında rate limit hatası geldiyse, durumu ayarla
          if (refreshError.response?.status === 429) {
            const resetTimeMs = getRateLimitResetTime(refreshError);
            setRateLimitStatus(resetTimeMs);
          }
          
          return Promise.reject(refreshError);
        }
        
        // 2. Network hatası (timeout, connection error vb.) - logout yapma, token geçerli kalabilir
        if (!refreshError.response) {
          if (__DEV__) {
            console.warn('Token refresh network hatası, logout yapılmıyor');
          }
          return Promise.reject(refreshError);
        }
        
        // 3. 5xx Server hatası - logout yapma, sunucu sorunu geçici olabilir
        if (refreshError.response?.status >= 500) {
          if (__DEV__) {
            console.warn('Token refresh sunucu hatası, logout yapılmıyor');
          }
          return Promise.reject(refreshError);
        }
        
        // 4. 401 hatası - Backend'den gelen error code'a bakarak karar ver
        if (refreshError.response?.status === 401) {
          const errorCode = refreshError.response?.data?.error?.code;
          const errorMessage = refreshError.response?.data?.error?.message || '';
          
          // Gerçek auth hataları: INVALID_TOKEN, TOKEN_EXPIRED, USER_NOT_FOUND
          const isRealAuthError = 
            errorCode === 'INVALID_TOKEN' || 
            errorCode === 'TOKEN_EXPIRED' || 
            errorCode === 'USER_NOT_FOUND' ||
            errorMessage.includes('Geçersiz refresh token') ||
            errorMessage.includes('refresh token süresi dolmuş') ||
            errorMessage.includes('Kullanıcı bulunamadı');
          
          if (isRealAuthError) {
            // Gerçek auth hatası - logout yap
            if (__DEV__) {
              console.warn('Refresh token geçersiz, oturum sonlandırılıyor. Error Code:', errorCode);
            }
            
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
          } else {
            // 401 ama gerçek auth hatası değil (belki rate limit veya başka bir durum)
            if (__DEV__) {
              console.warn('401 hatası ama gerçek auth hatası değil. Error Code:', errorCode);
            }
            return Promise.reject(refreshError);
          }
        }
        
        // 5. Diğer hatalar (400, 403, 404 vb.) - logout yapma, beklenmedik hata olabilir
        if (__DEV__) {
          console.warn('Token refresh beklenmedik hata');
        }
        return Promise.reject(refreshError);
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
  async register(data: RegisterData): Promise<ApiResponse<{ user: Mechanic; token: string }>> {
    try {
      const response = await apiClient.post('/auth/register', {
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
      if (__DEV__) {
        console.error('Register error:', error.response?.status || error.message);
      }
      
      // Backend'den gelen hata mesajını yakala
      if (error.response?.data?.message) {
        return createErrorResponse(
          error.response.data.error?.code || ErrorCode.INTERNAL_SERVER_ERROR,
          error.response.data.message,
          error.response?.data?.error?.details
        );
      }
      
      // Validation hatası varsa
      if (error.response?.data?.error?.message) {
        return createErrorResponse(
          ErrorCode.VALIDATION_FAILED,
          error.response.data.error.message,
          error.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error.message || 'Kayıt işlemi sırasında bir hata oluştu',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kullanıcı girişi
   */
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
      
      // Token'ları storage'a kaydet
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
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }
      
      const response = await apiClient.post('/auth/refresh-token', {
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
      await apiClient.post('/auth/logout');
    } catch (error) {
      if (__DEV__) {
        console.error('Logout error:', error);
      }
      // API hatası olsa bile devam et, storage'ı temizle
    } finally {
      // Tüm auth verilerini temizle (manuel logout)
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.USER_ID
      ]);
    }
  },

  async verifyEmail(code: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/auth/verify-email', { code });
      return response.data;
    } catch (error: any) {
      console.error('Verify email error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'E-posta doğrulanamadı', error.response?.data?.error?.details);
    }
  },

  async sendEmailVerification(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/auth/send-verification');
      return response.data;
    } catch (error: any) {
      console.error('Send email verification error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Doğrulama e-postası gönderilemedi', error.response?.data?.error?.details);
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Şifre sıfırlama e-postası gönderilemedi', error.response?.data?.error?.details);
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, newPassword });
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
      const response = await apiClient.get('/appointments/mechanic', { params });
      return response.data;
    } catch (error: any) {
      // Cancel edilen istekleri handle et (error logging yapma)
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('❌ Get appointments error:', error);
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
      const response = await apiClient.get(`/appointments/${id}`);
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
   * Randevu durumu güncelleme
   */
  async updateAppointmentStatus(id: string, status: AppointmentStatus, price?: number): Promise<ApiResponse<{ appointment: any }>> {
    try {
      // Status ve price'ı tek request'te gönder
      const payload: any = { status };
      if (price !== undefined && price > 0) {
        payload.price = price;
        console.log(`💰 Randevu fiyatı ile birlikte güncelleniyor: ${price}₺`);
      }
      
      const response = await apiClient.put(`/appointments/${id}/status`, payload);
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
      const response = await apiClient.put(`/appointments/${id}/accept`);
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
      const response = await apiClient.put(`/appointments/${id}/reject`, { rejectionReason: reason });
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
      
      const response = await apiClient.get('/appointments/mechanic', { params });
      return response.data;
    } catch (error: any) {
      // Cancel edilen istekleri handle et (error logging yapma)
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get mechanic appointments error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevular alınamadı', error.response?.data?.error?.details);
    }
  },

  async getMechanicAppointmentCounts(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/appointments/counts');
      return response.data;
    } catch (error: any) {
      console.error('Get appointment counts error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu sayıları alınamadı', error.response?.data?.error?.details);
    }
  },

  /**
   * Usta için servis taleplerini getir (towing, repair, etc.)
   */
  async getMechanicServiceRequests(status?: string, serviceType?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (serviceType) params.serviceType = serviceType;
      
      const response = await apiClient.get('/appointments/mechanic', { params });
      return response.data;
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('❌ Get service requests error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Servis talepleri alınamadı', error.response?.data?.error?.details);
    }
  },

  async getAppointmentById(id: string): Promise<ApiResponse<{ appointment: any }>> {
    try {
      const response = await apiClient.get(`/appointments/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Get appointment by ID error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu detayları alınamadı', error.response?.data?.error?.details);
    }
  },

  async approveAppointment(id: string, data?: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/approve`, data);
      return response.data;
    } catch (error: any) {
      console.error('Approve appointment error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Randevu onaylanamadı', error.response?.data?.error?.details);
    }
  },


  async startAppointment(id: string): Promise<ApiResponse<any>> {
    try {
      console.log('🔍 API: Starting appointment:', id);
      const response = await apiClient.put(`/appointments/${id}/start`);
      console.log('✅ API: Appointment started:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Start appointment error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş başlatılamadı', error.response?.data?.error?.details);
    }
  },

  async completeAppointment(id: string, data: {
    completionNotes: string;
    price?: number;
    estimatedDuration?: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('🔍 API: Completing appointment:', id, data);
      const response = await apiClient.put(`/appointments/${id}/complete`, data);
      console.log('✅ API: Appointment completed:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Complete appointment error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş tamamlanamadı', error.response?.data?.error?.details);
    }
  },

  async addExtraCharge(id: string, data: {
    amount: number;
    reason: string;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('🔍 API: Adding extra charge:', id, data);
      const response = await apiClient.post(`/appointments/${id}/extra-charges`, data);
      console.log('✅ API: Extra charge added:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Add extra charge error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Ek ücret eklenemedi', error.response?.data?.error?.details);
    }
  },







  async updateJobStatus(id: string, status: string, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/job-status`, { status, notes });
      return response.data;
    } catch (error: any) {
      console.error('Update job status error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş durumu güncellenemedi', error.response?.data?.error?.details);
    }
  },

  async referJob(id: string, mechanicId?: string, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/appointments/${id}/refer`, { mechanicId, notes });
      return response.data;
    } catch (error: any) {
      console.error('Refer job error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'İş yönlendirilemedi', error.response?.data?.error?.details);
    }
  },

  async sendCustomerApproval(id: string, items?: any[], totalAmount?: number, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/appointments/${id}/customer-approval`, { items, totalAmount, notes });
      return response.data;
    } catch (error: any) {
      console.error('Send customer approval error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri onayı gönderilemedi', error.response?.data?.error?.details);
    }
  },

  async getJobStory(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/appointments/${id}/job-story`);
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

      const response = await apiClient.post(`/appointments/${id}/job-story/photo`, formData, {
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
      const response = await apiClient.delete(`/appointments/${id}/job-story/photo/${photoId}`);
      return response.data;
    } catch (error: any) {
      console.error('Delete job story photo error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Fotoğraf silinemedi', error.response?.data?.error?.details);
    }
  },

  async getAvailableStatuses(): Promise<ApiResponse<{ statuses: string[] }>> {
    try {
      const response = await apiClient.get('/appointments/available-statuses');
      return response.data;
    } catch (error: any) {
      console.error('Get available statuses error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Durumlar alınamadı', error.response?.data?.error?.details);
    }
  },

  async getTrustedMechanics(): Promise<ApiResponse<{ mechanics: any[] }>> {
    try {
      const response = await apiClient.get('/job-referrals/trusted-mechanics');
      return response.data;
    } catch (error: any) {
      console.error('Get trusted mechanics error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Güvenilir ustalar alınamadı', error.response?.data?.error?.details);
    }
  },

  async checkCustomerLoyalty(customerId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/customers/${customerId}/loyalty`);
      return response.data;
    } catch (error: any) {
      console.error('Check customer loyalty error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri sadakat bilgisi alınamadı', error.response?.data?.error?.details);
    }
  },

  async updateAppointmentPriceIncrease(id: string, amount?: number, reason?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/appointments/${id}/price-increase`, { amount, reason });
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
      const response = await apiClient.get('/mechanic/dashboard/recent-activity');
      return response.data;
    } catch (error: any) {
      console.error('Get recent activity error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Son aktiviteler alınamadı', error.response?.data?.error?.details);
    }
  },

  async getRecentRatings(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/appointment-ratings/current/recent');
      return response.data;
    } catch (error: any) {
      // Cancel edilen istekleri handle et (error logging yapma)
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get recent ratings error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Son değerlendirmeler alınamadı', error.response?.data?.error?.details);
    }
  },

  async getRatingStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/appointment-ratings/current/stats');
      return response.data;
    } catch (error: any) {
      // Cancel edilen istekleri handle et (error logging yapma)
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get rating stats error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Değerlendirme istatistikleri alınamadı', error.response?.data?.error?.details);
    }
  },

  async getAppointmentStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/dashboard/stats');
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
  async getProfile(): Promise<ApiResponse<Mechanic>> {
    try {
      const response = await apiClient.get('/mechanic/me');
      return response.data;
    } catch (error: any) {
      console.error('❌ Get profile error:', error);
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
  async getMechanicProfile(): Promise<ApiResponse<Mechanic>> {
    return this.getProfile();
  },

  /**
   * Profil güncelleme
   */
  async updateProfile(data: Partial<Mechanic>): Promise<ApiResponse<Mechanic>> {
    try {
      const response = await apiClient.put('/mechanic/me', data);
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
      const response = await apiClient.put('/users/working-hours', { hours });
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
    } catch (error: any) {
      console.error('❌ API SERVICE: Update service categories error:', error);
      console.error('❌ API SERVICE: Error message:', error.message);
      console.error('❌ API SERVICE: Error response:', error.response?.data);
      console.error('❌ API SERVICE: Error status:', error.response?.status);
      console.error('❌ API SERVICE: Request config:', error.config?.url);
      
      // 403 Forbidden - Admin yetkisi gerekli
      if (error.response?.status === 403) {
        return createErrorResponse(
          ErrorCode.FORBIDDEN,
          error.response?.data?.message || 'Hizmet kategorilerini değiştirmek için admin yetkisi gereklidir. Lütfen bizimle iletişime geçin.',
          error.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error.response?.data?.message || 'Servis kategorileri güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kullanıcı profilini güncelle
   */
  async updateUserProfile(data: Partial<Mechanic>): Promise<ApiResponse<Mechanic>> {
    try {
      const response = await apiClient.put('/mechanic/me', data);
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
      const response = await apiClient.put('/auth/change-password', {
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
   * Çıkış yapma
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/auth/logout');
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
      const response = await apiClient.get('/mechanic-earnings/summary');
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
      const response = await apiClient.get('/mechanic-earnings/transactions');
      return response.data;
    } catch (error: any) {
      console.error('Get payment history error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Ödeme geçmişi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Usta kazançlarını getir (Reports için)
   */
  async getMechanicEarnings(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/wallet');
      if (response.data.success && response.data.data) {
        const wallet = response.data.data;
        // Wallet verisini earnings formatına dönüştür
        return createSuccessResponse({
          thisMonth: wallet.balance || 0,
          completedJobs: 0, // Bu bilgi appointment'lardan gelmeli
          averagePerJob: 0,
          pendingPayments: wallet.pendingAmount || 0,
          allTime: wallet.totalEarnings || 0
        });
      }
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic earnings error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kazanç bilgileri alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Gerçek appointment verilerine dayalı kazanç özeti getir
   */
  async getEarningsSummaryByPeriod(period: 'thisMonth' | 'lastMonth' | 'allTime' = 'thisMonth'): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/earnings-summary', {
        params: { period }
      });
      return response.data;
    } catch (error: any) {
      console.error('Get earnings summary by period error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kazanç özeti alınamadı',
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
   * Konuşma mesajlarını getir (sayfalama ile)
   */
  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<MessageData[]>> {
    try {
      const response = await apiClient.get(`/message/conversations/${conversationId}/messages`, {
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
      const response = await apiClient.post('/message/send', {
        receiverId: recipientId, // Backend receiverId bekliyor
        content: text, // Backend content bekliyor
        messageType: 'text',
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
      console.log('🌐 API: Getting conversations...');
      const response = await apiClient.get('/message/conversations');
      console.log('🌐 API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get conversations error:', error);
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

  /**
   * Okunmamış mesaj sayısı
   */
  async getUnreadMessageCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await apiClient.get('/message/unread-count');
      return response.data;
    } catch (error: any) {
      // Cancel edilen istekleri handle et (error logging yapma)
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get unread message count error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Okunmamış mesaj sayısı alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Mesaj polling - yeni mesajları kontrol et
   */
  async pollMessages(lastMessageId?: string): Promise<ApiResponse<MessageData[]>> {
    try {
      const params = lastMessageId ? { lastMessageId } : {};
      const response = await apiClient.get('/message/poll-messages', { params });
      return response.data;
    } catch (error: any) {
      console.error('Poll messages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj polling başarısız',
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
      const response = await apiClient.get('/notifications');
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
   * Bildirim okundu olarak işaretleme (alternatif isim)
   */
  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    return this.markAsRead(id);
  }
};

// ===== CUSTOMER SERVICES =====

export const CustomerService = {
  /**
   * Ustanın müşterilerini getir
   */
  async getMechanicCustomers(filters?: any): Promise<ApiResponse<{ customers: any[] }>> {
    try {
      const response = await apiClient.get('/customers', { params: filters });
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
      const response = await apiClient.get(`/customers/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get customer details error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Müşteri detayları alınamadı', error.response?.data?.error?.details);
    }
  },

  async addCustomerNote(customerId: string, note: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/customers/${customerId}/notes`, { note });
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
  async getMechanicFaultReports(statusFilter?: string): Promise<ApiResponse<any[] | { faultReports: any[] }>> {
    try {
      const url = statusFilter ? `/fault-reports/mechanic/reports?status=${statusFilter}` : '/fault-reports/mechanic/reports';
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
   * Arıza raporu detayı getir (Mechanic için)
   */
  async getFaultReportById(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/fault-reports/mechanic/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Get fault report by ID error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Arıza raporu detayı alınamadı', error.response?.data?.error?.details);
    }
  },

  /**
   * Arıza raporu için teklif gönder (Mechanic)
   */
  async submitQuote(faultReportId: string, quoteData: {
    quoteAmount: number;
    estimatedDuration: string;
    notes: string;
  }): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/fault-reports/${faultReportId}/quote`, quoteData);
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
      const apiResponse = await apiClient.post(`/fault-reports/${id}/response`, response);
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
      const response = await apiClient.post(`/fault-reports/${id}/finalize`, finalData);
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
   * Acil çekici taleplerini getir (Mechanic için)
   */
  async getEmergencyTowingRequests(status?: string): Promise<ApiResponse<any>> {
    try {
      const url = status ? `/emergency/mechanic/emergency-requests?status=${status}` : '/emergency/mechanic/emergency-requests';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error: any) {
      console.error('Get emergency towing requests error:', error);
      return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Acil talepler alınamadı', error.response?.data?.error?.details);
    }
  },

  /**
   * Acil çekici talebine yanıt ver (Mechanic)
   */
  async respondToEmergencyTowingRequest(id: string, responseData: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/emergency/mechanic-response', { requestId: id, ...responseData });
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
      const response = await apiClient.get('/users/notification-settings');
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
      const response = await apiClient.get('/users/privacy-settings');
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
      const response = await apiClient.get('/users/job-settings');
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
      const response = await apiClient.get('/users/app-settings');
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
      const response = await apiClient.get('/users/security-settings');
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
      const response = await apiClient.put('/users/notification-settings', settings);
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
      const response = await apiClient.put('/users/privacy-settings', settings);
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
      const response = await apiClient.put('/users/job-settings', settings);
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
      const response = await apiClient.put('/users/app-settings', settings);
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
      const response = await apiClient.put('/users/security-settings', settings);
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

// ===== WALLET SERVICES =====

export const WalletService = {
  /**
   * Usta cüzdan bilgilerini getir
   */
  async getMechanicWallet(): Promise<ApiResponse<{ balance: number; totalEarnings: number; pendingAmount: number; thisMonthEarnings: number }>> {
    try {
      console.log('🔍 [API] getMechanicWallet çağrılıyor...');
      const response = await apiClient.get('/mechanic/wallet');
      console.log('📦 [API] Backend response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data) {
        const wallet = response.data.data;
        console.log('💰 [API] Wallet balance:', wallet.balance);
        console.log('📊 [API] Transactions sayısı:', wallet.transactions?.length || 0);
        
        // Backend'den gelen veriyi kullan (backend zaten hesaplamış)
        const thisMonthEarnings = wallet.thisMonthEarnings || 0;
        const lastMonthEarnings = wallet.lastMonthEarnings || 0;
        const pendingAmount = wallet.pendingAmount || 0;
        const totalEarnings = wallet.totalEarnings || 0;

        const result = {
          balance: wallet.balance || 0,
          totalEarnings,
          pendingAmount,
          thisMonthEarnings,
          lastMonthEarnings
        };
        
        console.log('✅ [API] Dönüştürülen veri:', result);
        return createSuccessResponse(result);
      }
      
      console.log('⚠️ [API] Response data yok veya success false');
      return response.data;
    } catch (error: any) {
      // Cancel edilen istekleri handle et (error logging yapma)
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('❌ [API] Get mechanic wallet error:', error);
      console.error('❌ [API] Error response:', error.response?.data);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Cüzdan bilgileri alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Cüzdan işlemlerini getir
   */
  async getWalletTransactions(limit: number = 10): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/wallet/transactions', {
        params: { limit }
      });
      // Backend'den gelen veri zaten transactions array'i, doğru formatta return et
      if (response.data.success && Array.isArray(response.data.data)) {
        const transactions = response.data.data.slice(0, limit);
        return {
          ...response.data,
          data: transactions
        } as ApiResponse<any>;
      }
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

  /**
   * Para çekme talebi
   */
  async requestWithdrawal(amount: number, accountInfo: any): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post('/wallet/withdraw', {
        amount,
        accountInfo
      });
      return response.data;
    } catch (error: any) {
      console.error('Request withdrawal error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Para çekme talebi gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Son işlemleri getir (alias for getWalletTransactions)
   */
  async getRecentTransactions(limit: number = 10): Promise<ApiResponse<{ transactions: any[] }>> {
    return this.getWalletTransactions(limit);
  },

  /**
   * Wallet debug bilgisi (development için)
   */
  async getWalletDebugInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/wallet/debug');
      return response.data;
    } catch (error: any) {
      console.log('Wallet debug info not available');
      return createSuccessResponse({ message: 'Debug endpoint not available' });
    }
  }
};

// ===== TIRE HOTEL SERVICE =====

const TireHotelService = {
  /**
   * Lastik seti depoya yerleştir
   */
  async storeTireSet(data: {
    customerId: string;
    vehicleId: string;
    tireSet: {
      season: 'summer' | 'winter';
      brand: string;
      model: string;
      size: string;
      condition: 'new' | 'used' | 'good' | 'fair' | 'poor';
      treadDepth: number[];
      productionYear?: number;
      notes?: string;
    };
    storageFee: number;
    photos?: string[];
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/tire-storage/store', data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Store tire set error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik seti yerleştirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Barkod ile lastik seti bul
   */
  async findTireSetByBarcode(barcode: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/tire-storage/find/${barcode}`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Find tire set error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik seti bulunamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Lastik seti teslim et
   */
  async retrieveTireSet(tireStorageId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/tire-storage/retrieve/${tireStorageId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Retrieve tire set error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik seti teslim edilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Depo durumunu getir
   */
  async getTireDepotStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/tire-storage/depot-status');
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get depot status error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Depo durumu getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Sezonluk hatırlatma gönder
   */
  async sendSeasonalReminders(season: 'summer' | 'winter'): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/tire-storage/send-seasonal-reminders', { season });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Send seasonal reminders error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hatırlatma gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Depo düzeni oluştur/güncelle
   */
  async setupDepot(corridors: Array<{
    name: string;
    racks: number;
    slotsPerRack: number;
  }>): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/tire-storage/setup-depot', { corridors });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Setup depot error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Depo düzeni oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Hatırlatma ayarlarını oluştur/güncelle
   */
  async setupReminders(settings: {
    summerReminder: {
      enabled: boolean;
      startDate: string;
      endDate: string;
      message: string;
    };
    winterReminder: {
      enabled: boolean;
      startDate: string;
      endDate: string;
      message: string;
    };
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/tire-storage/setup-reminders', settings);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Setup reminders error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hatırlatma ayarları oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== BODYWORK SERVICE =====

const BodyworkService = {
  /**
   * Yeni kaporta/boya işi oluştur
   */
  async createBodyworkJob(data: {
    customerId: string;
    vehicleId: string;
    damageInfo: {
      description: string;
      photos: string[];
      videos?: string[];
      damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
      severity: 'minor' | 'moderate' | 'major' | 'severe';
      affectedAreas: string[];
      estimatedRepairTime: number;
    };
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/bodywork/create', data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Create bodywork job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kaporta işi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Teklif hazırla
   */
  async prepareQuote(jobId: string, quoteData: {
    partsToReplace: Array<{
      partName: string;
      partNumber?: string;
      brand: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
    partsToRepair: Array<{
      partName: string;
      laborHours: number;
      laborRate: number;
      notes?: string;
    }>;
    paintMaterials: Array<{
      materialName: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
    validityDays?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/prepare-quote`, quoteData);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Prepare quote error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teklif hazırlanamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Teklifi gönder
   */
  async sendQuote(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/send-quote`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Send quote error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teklif gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * İş akışı aşamasını güncelle
   */
  async updateWorkflowStage(jobId: string, stageData: {
    stage: string;
    status: 'in_progress' | 'completed' | 'skipped';
    photos?: string[];
    notes?: string;
    assignedTo?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/bodywork/${jobId}/workflow-stage`, stageData);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Update workflow stage error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş akışı güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Müşteri onayı iste
   */
  async requestCustomerApproval(jobId: string, stage: string, photos?: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/request-approval`, {
        stage,
        photos
      });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Request customer approval error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Müşteri onayı istenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kalite kontrol yap
   */
  async performQualityCheck(jobId: string, qualityData: {
    passed: boolean;
    checkedBy: string;
    issues?: string[];
    photos?: string[];
    notes?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/quality-check`, qualityData);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Perform quality check error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kalite kontrol yapılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Ustanın kaporta işlerini getir
   */
  async getBodyworkJobs(status?: string): Promise<ApiResponse<any>> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/bodywork/mechanic-jobs', { params });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get bodywork jobs error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kaporta işleri getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kaporta işi detayını getir
   */
  async getBodyworkJobById(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/bodywork/${jobId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get bodywork job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş detayı getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Şablon oluştur
   */
  async createTemplate(data: {
    name: string;
    description: string;
    damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
    severity: 'minor' | 'moderate' | 'major' | 'severe';
    workflowTemplate: Array<{
      stage: string;
      stageName: string;
      estimatedHours: number;
      requiredPhotos: number;
      description: string;
      order: number;
    }>;
    standardParts: Array<{
      partName: string;
      partNumber?: string;
      brand: string;
      estimatedPrice: number;
      notes?: string;
    }>;
    standardMaterials: Array<{
      materialName: string;
      estimatedQuantity: number;
      estimatedPrice: number;
      notes?: string;
    }>;
    laborRates: {
      hourlyRate: number;
      overtimeRate: number;
      weekendRate: number;
    };
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/bodywork/templates', data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Create template error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Şablon oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Şablonları getir
   */
  async getTemplates(damageType?: string, severity?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = {};
      if (damageType) params.damageType = damageType;
      if (severity) params.severity = severity;
      
      const response = await apiClient.get('/bodywork/templates', { params });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get templates error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Şablonlar getirilemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== CAR WASH SERVICE =====

const CarWashService = {
  /**
   * Yeni yıkama paketi oluştur
   */
  async createCarWashPackage(data: {
    name: string;
    description: string;
    packageType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom';
    services: Array<{
      serviceName: string;
      serviceType: 'exterior' | 'interior' | 'engine' | 'special';
      duration: number;
      price: number;
      description: string;
      isOptional: boolean;
      order: number;
    }>;
    basePrice: number;
    vehicleTypeMultipliers: {
      car: number;
      suv: number;
      truck: number;
      motorcycle: number;
      van: number;
    };
    features: {
      includesInterior: boolean;
      includesExterior: boolean;
      includesEngine: boolean;
      includesWaxing: boolean;
      includesPolishing: boolean;
      includesDetailing: boolean;
      ecoFriendly: boolean;
      premiumProducts: boolean;
    };
    images?: string[];
    thumbnail?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/carwash/packages', data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Create car wash package error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paket oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Paketleri getir
   */
  async getCarWashPackages(packageType?: string): Promise<ApiResponse<any>> {
    try {
      const params = packageType ? { packageType } : {};
      const response = await apiClient.get('/carwash/packages', { params });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get car wash packages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paketler getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yıkama işi oluştur
   */
  async createCarWashJob(data: {
    customerId: string;
    vehicleId: string;
    packageId: string;
    vehicleInfo: {
      brand: string;
      model: string;
      year: number;
      plateNumber: string;
      vehicleType: 'car' | 'suv' | 'truck' | 'motorcycle' | 'van';
      color: string;
      size: 'small' | 'medium' | 'large' | 'extra_large';
    };
    location: {
      address: string;
      coordinates: { lat: number; lng: number };
      isMobile: boolean;
    };
    specialRequests?: string[];
    notes?: string;
    scheduledAt?: Date;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/carwash/jobs', data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Create car wash job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yıkama işi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yıkama işini başlat
   */
  async startCarWashJob(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/carwash/jobs/${jobId}/start`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Start car wash job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş başlatılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Hizmeti tamamla
   */
  async completeCarWashService(jobId: string, serviceName: string, photos?: string[], notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/carwash/jobs/${jobId}/services/${serviceName}/complete`, {
        photos,
        notes
      });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Complete car wash service error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Hizmet tamamlanamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yıkama işini tamamla
   */
  async completeCarWashJob(jobId: string, qualityData: {
    passed: boolean;
    checkedBy: string;
    issues?: string[];
    photos?: string[];
    customerRating?: number;
    customerFeedback?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/carwash/jobs/${jobId}/complete`, qualityData);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Complete car wash job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş tamamlanamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yıkama işlerini getir
   */
  async getCarWashJobs(status?: string, date?: string): Promise<ApiResponse<any>> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (date) params.date = date;
      
      const response = await apiClient.get('/carwash/jobs', { params });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get car wash jobs error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yıkama işleri getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yıkama işi detayını getir
   */
  async getCarWashJobById(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/carwash/jobs/${jobId}`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get car wash job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş detayı getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Sadakat programı oluştur/güncelle
   */
  async setupLoyaltyProgram(data: {
    programName: string;
    description: string;
    loyaltyLevels: Array<{
      level: 'bronze' | 'silver' | 'gold' | 'platinum';
      levelName: string;
      minVisits: number;
      minSpent: number;
      benefits: {
        discountPercentage: number;
        priorityService: boolean;
        freeUpgrades: boolean;
        specialOffers: boolean;
        birthdayDiscount: number;
      };
      color: string;
      icon: string;
    }>;
    campaigns?: Array<any>;
    referralProgram?: any;
    birthdayCampaign?: any;
    pointsSystem?: any;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/carwash/loyalty-program', data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Setup loyalty program error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Sadakat programı oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Sadakat programını getir
   */
  async getLoyaltyProgram(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/carwash/loyalty-program');
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get loyalty program error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Sadakat programı getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // ===== YENİ WASH MODÜLÜ METODLARI =====

  /**
   * Yıkama paketi oluştur (yeni API)
   */
  async createWashPackage(data: {
    name: string;
    description: string;
    packageType: 'quick_exterior' | 'standard' | 'detailed_interior' | 'ceramic_protection' | 'engine' | 'custom';
    basePrice: number;
    duration: number;
    services: Array<{
      name: string;
      category: 'exterior' | 'interior' | 'engine' | 'special';
      order: number;
    }>;
    extras?: Array<{
      name: string;
      description: string;
      price: number;
      duration: number;
    }>;
    availableFor?: 'shop' | 'mobile' | 'both';
    requirements?: {
      requiresPower?: boolean;
      requiresWater?: boolean;
      requiresCoveredArea?: boolean;
    };
  }): Promise<ApiResponse<any>> {
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

  /**
   * Kendi paketlerimi getir (yeni API)
   */
  async getMyWashPackages(): Promise<ApiResponse<any>> {
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

  /**
   * Paketi güncelle (yeni API)
   */
  async updateWashPackage(packageId: string, data: any): Promise<ApiResponse<any>> {
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

  /**
   * Paketi sil (yeni API)
   */
  async deleteWashPackage(packageId: string): Promise<ApiResponse<any>> {
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

  /**
   * Tüm paketleri getir (yeni API)
   */
  async getAllWashPackages(params?: { providerId?: string; type?: string }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/wash/packages', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get all wash packages error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Paketler getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * İşletme siparişlerini getir (yeni API)
   */
  async getWashJobs(status?: string): Promise<ApiResponse<any>> {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/wash/jobs', { params });
      return response.data;
    } catch (error: any) {
      console.error('Get wash jobs error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İşler getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Siparişi kabul et (yeni API)
   */
  async acceptWashJob(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/accept`);
      return response.data;
    } catch (error: any) {
      console.error('Accept wash job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş kabul edilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Check-in yap (yeni API)
   */
  async checkInWashJob(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/checkin`);
      return response.data;
    } catch (error: any) {
      console.error('Check-in wash job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Check-in yapılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * İşi başlat (yeni API)
   */
  async startWashJob(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/start`);
      return response.data;
    } catch (error: any) {
      console.error('Start wash job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş başlatılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * İlerleme güncelle (yeni API)
   */
  async updateWashProgress(jobId: string, data: {
    stepIndex: number;
    photos?: string[];
    notes?: string;
    completed?: boolean;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/progress`, data);
      return response.data;
    } catch (error: any) {
      console.error('Update wash progress error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İlerleme güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * QA gönder (yeni API)
   */
  async submitWashQA(jobId: string, data: {
    photosBefore: string[];
    photosAfter: string[];
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/wash/jobs/${jobId}/qa-submit`, data);
      return response.data;
    } catch (error: any) {
      console.error('Submit wash QA error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'QA gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Provider profili oluştur/güncelle (yeni API)
   */
  async setupWashProvider(data: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/wash/provider/setup', data);
      return response.data;
    } catch (error: any) {
      console.error('Setup wash provider error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İşletme ayarları kaydedilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kendi provider profilimi getir (yeni API)
   */
  async getMyWashProvider(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/wash/provider/my-profile');
      return response.data;
    } catch (error: any) {
      console.error('Get my wash provider error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İşletme profili getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },
};

// ===== REPORT SERVICES =====
export const ReportService = {
  /**
   * Günlük rapor getir
   */
  async getEndOfDayReport(date: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/end-of-day/report', { 
        params: { date } 
      });
      return response.data;
    } catch (error: any) {
      console.error('Get end of day report error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Günlük rapor alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Detaylı usta raporları
   */
  async getDetailedStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/reports/detailed-stats');
      return response.data;
    } catch (error: any) {
      console.error('Get detailed stats error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Detaylı raporlar alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Usta rapor özeti
   */
  async getSummary(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/mechanic/reports/summary');
      return response.data;
    } catch (error: any) {
      console.error('Get report summary error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rapor özeti alınamadı',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== PARTS MARKETPLACE SERVICE =====

export const PartsService = {
  /**
   * Ustanın parçalarını listele
   */
  async getMechanicParts(filters?: { isPublished?: boolean; isActive?: boolean; category?: string }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/parts/mechanic', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Get mechanic parts error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Parçalar yüklenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Yeni parça ekle
   */
  async createPart(data: {
    partName: string;
    brand: string;
    partNumber?: string;
    description?: string;
    photos?: string[];
    category: string;
    compatibility: {
      makeModel: string[];
      years: { start: number; end: number };
      engine?: string[];
      vinPrefix?: string[];
      notes?: string;
    };
    stock: {
      quantity: number;
      lowThreshold: number;
    };
    pricing: {
      unitPrice: number;
      oldPrice?: number;
      currency: string;
      isNegotiable: boolean;
    };
    condition: string;
    warranty?: {
      months: number;
      description: string;
    };
    isPublished?: boolean;
  }): Promise<ApiResponse<any>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] createPart çağrıldı:', {
          partName: data.partName,
          category: data.category,
          stockQuantity: data.stock.quantity,
          unitPrice: data.pricing.unitPrice,
          photosCount: data.photos?.length || 0,
        });
      }
      
      // Photos array kontrolü - undefined veya boş array olabilir
      const payload = {
        ...data,
        photos: data.photos && data.photos.length > 0 ? data.photos : [],
      };
      
      const response = await apiClient.post('/parts', payload);
      
      if (__DEV__) {
        console.log('✅ [API] createPart başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
          partId: response.data?.data?._id,
        });
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [API] createPart error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
          errorDetails: error.response?.data,
        });
      }
      
      // 401 hatası için özel handling
      if (error.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          error.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          error.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        error.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        error.response?.data?.message || 'Parça oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Parça güncelle
   */
  async updatePart(partId: string, data: any): Promise<ApiResponse<any>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] updatePart çağrıldı:', {
          partId,
          dataKeys: Object.keys(data),
          hasStock: !!data.stock,
          stockData: data.stock,
        });
      }
      
      const response = await apiClient.put(`/parts/${partId}`, data);
      
      if (__DEV__) {
        console.log('✅ [API] updatePart başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
        });
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [API] updatePart error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
          errorDetails: error.response?.data,
        });
      }
      
      // 401 hatası için özel handling
      if (error.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          error.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          error.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        error.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        error.response?.data?.message || 'Parça güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Market'te parça ara
   */
  async searchParts(filters?: {
    query?: string;
    category?: string;
    makeModel?: string;
    year?: number;
    vin?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/parts/market', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Search parts error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Arama yapılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Parça detayını getir
   */
  async getPartDetail(partId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/parts/${partId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get part detail error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Parça detayı yüklenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Parça fotoğrafı yükle
   */
  async uploadPartPhoto(photoUri: string): Promise<ApiResponse<any>> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      const response = await apiClient.post('/upload/parts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error: any) {
      console.error('Upload part photo error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR, 
        'Fotoğraf yüklenemedi', 
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Rezervasyon oluştur
   */
  async createReservation(data: {
    partId: string;
    vehicleId?: string;
    quantity: number;
    delivery: {
      method: string;
      address?: string;
    };
    payment: {
      method: string;
    };
  }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post('/parts/reserve', data);
      return response.data;
    } catch (error: any) {
      console.error('Create reservation error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rezervasyon oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Rezervasyonu onayla
   */
  async approveReservation(reservationId: string): Promise<ApiResponse<any>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] approveReservation çağrıldı:', reservationId);
      }
      
      const response = await apiClient.post(`/parts/reservations/${reservationId}/approve`);
      
      if (__DEV__) {
        console.log('✅ [API] approveReservation başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
          dataStatus: response.data?.data?.status,
        });
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [API] approveReservation error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
      }
      
      // 401 hatası için özel handling
      if (error.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          error.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          error.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        error.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        error.response?.data?.message || 'Rezervasyon onaylanamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Rezervasyonu iptal et
   */
  async cancelReservation(reservationId: string, reason?: string, cancelledBy?: string): Promise<ApiResponse<any>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] cancelReservation çağrıldı:', {
          reservationId,
          reason,
          cancelledBy,
        });
      }
      
      const response = await apiClient.post(`/parts/reservations/${reservationId}/cancel`, {
        reason,
        cancelledBy
      });
      
      if (__DEV__) {
        console.log('✅ [API] cancelReservation başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
        });
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [API] cancelReservation error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
      }
      
      // 401 hatası için özel handling
      if (error.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          error.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          error.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        error.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        error.response?.data?.message || 'Rezervasyon iptal edilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Usta rezervasyonlarını getir
   */
  async getMechanicReservations(filters?: { status?: string }): Promise<ApiResponse<any>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] getMechanicReservations çağrıldı, filters:', filters);
      }
      
      const response = await apiClient.get('/parts/mechanic/reservations', { params: filters });
      
      if (__DEV__) {
        console.log('✅ [API] getMechanicReservations başarılı:', {
          success: response.data?.success,
          hasData: !!response.data?.data,
          dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 0,
        });
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [API] getMechanicReservations error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
      }
      
      // 401 hatası için özel handling
      if (error.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          error.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          error.response?.data?.error?.details
        );
      }
      
      // Diğer hatalar için genel error response
      return createErrorResponse(
        error.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        error.response?.data?.message || 'Rezervasyonlar yüklenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Kullanıcı rezervasyonlarını getir
   */
  async getMyReservations(filters?: { status?: string }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('/parts/my-reservations', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Get my reservations error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rezervasyonlar yüklenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Rezervasyon için pazarlık teklifi gönder
   */
  async negotiateReservationPrice(
    reservationId: string,
    requestedPrice: number,
    message?: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/parts/reservations/${reservationId}/negotiate`, {
        requestedPrice,
        message
      });
      return response.data;
    } catch (error: any) {
      console.error('Negotiate reservation price error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Pazarlık teklifi gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Pazarlık teklifini yanıtla (Usta için)
   */
  async respondToNegotiation(
    reservationId: string,
    action: 'accept' | 'reject',
    counterPrice?: number
  ): Promise<ApiResponse<any>> {
    try {
      if (__DEV__) {
        console.log('🔍 [API] respondToNegotiation çağrıldı:', {
          reservationId,
          action,
          counterPrice,
        });
      }
      
      const response = await apiClient.post(`/parts/reservations/${reservationId}/negotiation-response`, {
        action,
        counterPrice
      });
      
      if (__DEV__) {
        console.log('✅ [API] respondToNegotiation başarılı:', {
          success: response.data?.success,
          message: response.data?.message,
        });
      }
      
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ [API] respondToNegotiation error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
      }
      
      // 401 hatası için özel handling
      if (error.response?.status === 401) {
        return createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          error.response?.data?.message || 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          error.response?.data?.error?.details
        );
      }
      
      return createErrorResponse(
        error.response?.status >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST,
        error.response?.data?.message || 'Pazarlık yanıtı verilemedi',
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
  WalletService,
  TireHotelService,
  BodyworkService,
  CarWashService,
  ReportService,
  PartsService,
  // Spread all service methods to top level for backward compatibility
  ...AuthService,
  ...AppointmentService,
  ...ProfileService,
  ...EarningsService,
  ...MessageService,
  ...CustomerService,
  ...NotificationService,
  ...FaultReportService,
  ...EmergencyService,
  ...WalletService,
  ...TireHotelService,
  ...BodyworkService,
  ...CarWashService,
  ...ReportService,
  ...PartsService,
  handleError: AppointmentService.handleError,
  // Backward compatibility aliases
  getWashJobs: CarWashService.getCarWashJobs,

  // ===== TIRE SERVICE =====
  
  // Lastik işlerini getir (Usta için)
  getTireJobs: async (filters?: { status?: string; serviceType?: string }) => {
    try {
      const response = await apiClient.get('/tire-service/jobs', { params: filters });
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Get tire jobs error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik işleri getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // İşi kabul et
  acceptTireJob: async (jobId: string) => {
    try {
      const response = await apiClient.patch(`/tire-service/${jobId}/accept`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Accept tire job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş kabul edilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // İşi başlat
  startTireJob: async (jobId: string) => {
    try {
      const response = await apiClient.patch(`/tire-service/${jobId}/start`);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Start tire job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş başlatılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // İşi tamamla
  completeTireJob: async (jobId: string, data: {
    notes?: string;
    finalPrice?: number;
    warrantyInfo?: {
      duration: number;
      conditions: string[];
    };
  }) => {
    try {
      const response = await apiClient.patch(`/tire-service/${jobId}/complete`, data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Complete tire job error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş tamamlanamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Fiyat teklifi gönder
  sendTirePriceQuote: async (jobId: string, quoteData: {
    amount: number;
    breakdown?: {
      labor?: number;
      parts?: number;
      tax?: number;
    };
    notes?: string;
    estimatedDuration?: number;
  }) => {
    try {
      const response = await apiClient.post(`/tire-service/${jobId}/price-quote`, quoteData);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Send tire price quote error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Fiyat teklifi gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Lastik sağlık kontrolü kaydet
  saveTireHealthCheck: async (data: {
    vehicleId: string;
    userId: string;
    checkDate?: Date;
    treadDepth: [number, number, number, number];
    pressure: [number, number, number, number];
    condition: [string, string, string, string];
    overallCondition: string;
    photos?: string[];
    recommendations: string[];
    issues?: string[];
    notes?: string;
    nextCheckDate?: Date;
    nextCheckKm?: number;
  }) => {
    try {
      const response = await apiClient.post('/tire-service/health-check', data);
      return createSuccessResponse(response.data.data);
    } catch (error: any) {
      console.error('Save tire health check error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik sağlık kontrolü kaydedilemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

export default apiService;
