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
      // Rate limit durumunu sadece bilgi amaçlı logla - istekleri bloke ETME
      // İstekler normal şekilde gönderilmeye devam edecek, backend 429 dönecek
      // Önemli olan: Rate limit geldiğinde logout YAPILMAMASI (response interceptor'da handle ediliyor)
      if (isRateLimited && config.url && !config.url.includes('/auth/') && __DEV__) {
        const remainingTime = rateLimitResetTime ? rateLimitResetTime - Date.now() : 0;
        const remainingMinutes = Math.ceil(remainingTime / 60000);
        
        if (__DEV__) {
          console.warn(`Rate limit aktif (${remainingMinutes} dakika kaldı): ${config.url}`);
        }
      }
      
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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
      return Promise.reject(error);
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
    if (__DEV__ && (response.config.url?.includes('/auth/') || response.config.url?.includes('/users/profile'))) {
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
        if (__DEV__) {
          console.log('Token yenileme devam ediyor, kuyrukta bekleniyor...');
        }
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          // Token'ı hem headers'a hem de config'e ekle
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          originalRequest.headers.common = originalRequest.headers.common || {};
          originalRequest.headers.common['Authorization'] = 'Bearer ' + token;
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
          { refreshToken },
          { timeout: 10000 } // 10 saniye timeout
        );

        if (response.data.success && response.data.data?.token) {
          const newToken = response.data.data.token;
          const newRefreshToken = response.data.data.refreshToken;
          const userData = response.data.data.user;

          if (__DEV__) {
            console.log('Yeni token alındı');
          }

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

          // Header'ı güncelle - tüm olası yerlerde
          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers.common = originalRequest.headers.common || {};
          originalRequest.headers.common['Authorization'] = 'Bearer ' + newToken;
          
          // Request config'i yeniden oluştur (axios immutable config sorunu için)
          const updatedConfig = {
            ...originalRequest,
            headers: {
              ...originalRequest.headers,
              'Authorization': 'Bearer ' + newToken,
              common: {
                ...originalRequest.headers.common,
                'Authorization': 'Bearer ' + newToken
              }
            }
          };

          if (__DEV__) {
            console.log('Token başarıyla yenilendi');
          }
          
          processQueue(null, newToken);
          isRefreshing = false;

          // Original request'i yeniden dene - güncellenmiş config ile
          return apiClient(updatedConfig);
        } else {
          if (__DEV__) {
            console.error('Refresh response başarısız:', response.data);
          }
          throw new Error('Token yenileme başarısız: Invalid response');
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
  async register(data: RegisterData): Promise<ApiResponse<{ user: Driver; token: string }>> {
    try {
      const response = await apiClient.post('/auth/register', {
        ...data,
        userType: UserType.DRIVER
      });
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const refreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = userData?._id || userData?.id;
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
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
        userType: UserType.DRIVER
      });
      
      // Token'ları storage'a kaydet
      if (response.data.success && response.data.data) {
        const token = response.data.data.token;
        const refreshToken = response.data.data.refreshToken;
        const userData = response.data.data.user;
        const userId = response.data.data.userId || userData?._id || userData?.id;
        
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
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
        STORAGE_KEYS.USER_DATA
      ]);
      if (__DEV__) {
        console.log('Logout tamamlandı');
      }
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
      if (__DEV__) {
      console.error('Get vehicles error:', error);
      }
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
      if (__DEV__) {
      console.error('Add vehicle error:', error);
      }
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
      if (__DEV__) {
      console.error('Update vehicle error:', error);
      }
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
      if (__DEV__) {
      console.error('Delete vehicle error:', error);
      }
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
      if (__DEV__) {
      console.error('Get appointments error:', error);
      }
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
      if (__DEV__) {
      console.error('Create appointment error:', error);
      }
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
      if (__DEV__) {
      console.error('Update appointment error:', error);
      }
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
      if (__DEV__) {
      console.error('Cancel appointment error:', error);
      }
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
      if (__DEV__) {
      console.error('Get mechanics error:', error);
      }
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
      if (__DEV__) {
      console.error('Get nearby mechanics error:', error);
      }
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
      if (__DEV__) {
      console.error('Get mechanic details error:', error);
      }
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
      const response = await apiClient.get('/message/conversations');
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('MessageService: Get conversations error:', error);
      }
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
      if (__DEV__) {
      console.error('Get messages error:', error);
      }
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
      if (__DEV__) {
      console.error('Send message error:', error);
      }
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
      // Rate limit hatası (429) - sessizce işle, log etme
      if (error.response?.status === 429) {
        if (__DEV__) {
          console.log('Notifications rate limit hatası (429), sessizce işleniyor');
        }
        return createErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit aşıldı',
          error.response?.data?.error?.details
        );
      }
      
      if (__DEV__) {
      console.error('Get notifications error:', error);
      }
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
      if (__DEV__) {
      console.error('Mark notification as read error:', error);
      }
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
      if (__DEV__) {
      console.error('Mark all notifications as read error:', error);
      }
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
      if (__DEV__) {
      console.error('Delete notification error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim silinemedi',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== PARTS SERVICES (MARKETPLACE) =====

export const PartsService = {
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
      // Rate limit hatası (429) - sessizce işle, log etme
      if (error.response?.status === 429) {
        if (__DEV__) {
          console.log('Search parts rate limit hatası (429), sessizce işleniyor');
        }
        return createErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Rate limit aşıldı',
          error.response?.data?.error?.details
        );
      }
      
      if (__DEV__) {
      console.error('Search parts error:', error);
      }
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
      if (__DEV__) {
      console.error('Get part detail error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Parça detayı yüklenemedi',
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
      if (__DEV__) {
      console.error('Create reservation error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rezervasyon oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Rezervasyonu iptal et
   */
  async cancelReservation(reservationId: string, reason?: string, cancelledBy?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/parts/reservations/${reservationId}/cancel`, {
        reason,
        cancelledBy
      });
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Cancel reservation error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Rezervasyon iptal edilemedi',
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
      if (__DEV__) {
      console.error('Get my reservations error:', error);
      }
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
      if (__DEV__) {
        console.error('Negotiate reservation price error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Pazarlık teklifi gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Teslim aldığını onayla ve ödemeyi tamamla
   */
  async confirmDelivery(
    reservationId: string,
    paymentData?: {
      paymentMethod?: 'cash' | 'wallet' | 'card';
      cardInfo?: {
        cardNumber: string;
        cardHolderName: string;
        expiryMonth: string;
        expiryYear: string;
        cvv: string;
      };
    }
  ): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/parts/reservations/${reservationId}/confirm-delivery`, paymentData);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Confirm delivery error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teslim onaylanamadı',
        error.response?.data?.error?.details
      );
    }
  }
};

// ===== BODYWORK SERVICES =====

export const BodyworkService = {
  /**
   * Müşteri bodywork işi oluştur
   */
  async createBodyworkJob(data: {
    vehicleId: string;
    mechanicId?: string;
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
      const response = await apiClient.post('/bodywork/customer/create', data);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Create bodywork job error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kaporta işi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Müşteri bodywork işlerini getir
   */
  async getBodyworkJobs(status?: string, page?: number, limit?: number): Promise<ApiResponse<any>> {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      const response = await apiClient.get('/bodywork/customer/jobs', { params });
      return {
        ...response.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      if (__DEV__) {
        console.error('Get bodywork jobs error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kaporta işleri getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Bodywork iş detayını getir
   */
  async getBodyworkJobById(jobId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/bodywork/customer/${jobId}`);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Get bodywork job error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'İş detayı getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Teklif onaylama/reddetme
   */
  async respondToQuote(jobId: string, action: 'accept' | 'reject', rejectionReason?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/customer/quote-response`, {
        action,
        rejectionReason
      });
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Respond to quote error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Teklif yanıtı verilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Aşama onayı
   */
  async approveStage(jobId: string, stage: string, approved: boolean, notes?: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/customer/approve-stage`, {
        stage,
        approved,
        notes
      });
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Approve stage error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Aşama onayı verilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  /**
   * Bodywork job ödeme işlemi
   */
  async processBodyworkPayment(jobId: string, amount: number, paymentMethod: 'cash' | 'card' | 'bank_transfer' = 'card'): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/bodywork/${jobId}/customer/payment`, {
        amount,
        paymentMethod
      });
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Bodywork payment error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Ödeme işlemi başarısız oldu',
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
      if (__DEV__) {
      console.error('Get user profile error:', error);
      }
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
      if (__DEV__) {
      console.error('Get appointments error:', error);
      }
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
      const response = await apiClient.get('/mechanic/list', { params: filters });
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Get mechanics error:', error);
        if (error.response) {
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
        }
      }
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
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Get mechanic details error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Usta detayları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },
  getMechanicById: async (mechanicId: string) => {
    // Alias for getMechanicDetails
    return apiService.getMechanicDetails(mechanicId);
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
      if (__DEV__) {
      console.error('Get mechanic reviews error:', error);
      }
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
      if (__DEV__) {
      console.error('Check favorite mechanic error:', error);
      }
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
      if (__DEV__) {
      console.error('Toggle favorite mechanic error:', error);
      }
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
      if (__DEV__) {
      console.error('Get nearby mechanics error:', error);
      }
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
      if (__DEV__) {
      console.error('Get mechanics by service error:', error);
      }
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
      if (__DEV__) {
      console.error('Delete message error:', error);
      }
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
      if (__DEV__) {
      console.error('Delete conversation error:', error);
      }
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
      if (__DEV__) {
      console.error('Create fault report error:', error);
      }
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
      if (__DEV__) {
      console.error('Create emergency towing request error:', error);
      }
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
      if (__DEV__) {
      console.error('Get wallet balance error:', error);
      }
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
      if (__DEV__) {
      console.error('Get wallet transactions error:', error);
      }
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
        if (__DEV__) {
        console.error('Invalid amount for addBalance:', amount);
        }
        return createErrorResponse(
          ErrorCode.INVALID_INPUT_FORMAT,
          'Geçerli miktar giriniz (1-999,999,999 TL arası)',
          { amount, type: typeof amount }
        );
      }

      const response = await apiClient.post('/wallet/add-money', { amount });
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Add balance error:', error);
      }
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
      if (__DEV__) {
      console.error('Create tire parts request error:', error);
      }
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
      if (__DEV__) {
      console.error('Get wash quote error:', error);
      }
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
      if (__DEV__) {
      console.error('Create wash order error:', error);
      }
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
      if (__DEV__) {
      console.error('Get wash order error:', error);
      }
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
      if (__DEV__) {
      console.error('Cancel wash order error:', error);
      }
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
      if (__DEV__) {
      console.error('Approve wash QA error:', error);
      }
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
      if (__DEV__) {
      console.error('Get my wash orders error:', error);
      }
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
      if (__DEV__) {
      console.error('Get wash providers error:', error);
      }
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
      if (__DEV__) {
      console.error('Get available wash slots error:', error);
      }
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
      if (__DEV__) {
      console.error('Get wash packages error:', error);
      }
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
      if (__DEV__) {
      console.error('Create wash package error:', error);
      }
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
      if (__DEV__) {
      console.error('Get my wash packages error:', error);
      }
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
      if (__DEV__) {
      console.error('Update wash package error:', error);
      }
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
      if (__DEV__) {
      console.error('Delete wash package error:', error);
      }
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
      if (__DEV__) {
      console.error('Get mechanic wash packages error:', error);
      }
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
      if (__DEV__) {
      console.error('Create wash booking error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Yıkama randevusu oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  uploadBodyworkMedia: async (uri: string, mediaType: 'image' | 'video' = 'image'): Promise<ApiResponse<{ url: string }>> => {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'media';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1] : 'jpg';
      
      const isVideo = mediaType === 'video' || uri.includes('video') || uri.includes('.mp4') || uri.includes('.mov');
      const fileType = isVideo 
        ? `video/${ext === 'mov' ? 'quicktime' : 'mp4'}` 
        : `image/${ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext}`;

      formData.append('media', {
        uri,
        type: fileType,
        name: filename,
      } as any);

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/upload/bodywork`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000, // 30 saniye (video için daha uzun)
        }
      );

      return response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.error('Upload bodywork media error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Dosya yüklenemedi',
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
      if (__DEV__) {
      console.error(`GET ${endpoint} error:`, error);
      }
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
      if (__DEV__) {
      console.error(`POST ${endpoint} error:`, error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Veri gönderilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // Bodywork Services
  createBodyworkJob: BodyworkService.createBodyworkJob,
  getBodyworkJobs: BodyworkService.getBodyworkJobs,
  getBodyworkJobById: BodyworkService.getBodyworkJobById,
  respondToQuote: BodyworkService.respondToQuote,
  approveStage: BodyworkService.approveStage,
  processBodyworkPayment: BodyworkService.processBodyworkPayment,

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
      if (__DEV__) {
        console.error('Upload profile photo error:', error);
        if (error.response) {
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
        }
      }
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
      if (__DEV__) {
        console.error('Upload cover photo error:', error);
        if (error.response) {
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
        }
      }
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
      if (__DEV__) {
      console.error('Create tire service request error:', error);
      }
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
      if (__DEV__) {
      console.error('Get my tire requests error:', error);
      }
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
      if (__DEV__) {
      console.error('Get tire service by ID error:', error);
      }
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
      if (__DEV__) {
      console.error('Get tire health history error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Lastik sağlık geçmişi getirilemedi',
        error.response?.data?.error?.details
      );
    }
  },

  // ===== PARTS MARKETPLACE =====
  
  // Market'te parça ara
  searchParts: PartsService.searchParts,
  
  // Parça detayını getir
  getPartDetail: PartsService.getPartDetail,
  
  // Rezervasyon oluştur
  createPartsReservation: PartsService.createReservation,
  
  // Rezervasyonu iptal et
  cancelPartsReservation: PartsService.cancelReservation,
  
  // Kullanıcı rezervasyonlarını getir
  getMyPartsReservations: PartsService.getMyReservations,
  negotiateReservationPrice: PartsService.negotiateReservationPrice,
  confirmPartsDelivery: PartsService.confirmDelivery,

  // Campaigns/Ads
  getAds: async () => {
    try {
      const response = await apiClient.get('/campaigns/ads');
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Get ads error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Reklamlar alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Mechanic rating stats
  getMechanicRatingStats: async (mechanicId: string) => {
    try {
      const response = await apiClient.get(`/mechanic/${mechanicId}/rating-stats`);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Get mechanic rating stats error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Usta puan istatistikleri alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Become customer
  becomeCustomer: async (mechanicId: string) => {
    try {
      const response = await apiClient.post(`/mechanic/${mechanicId}/become-customer`);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Become customer error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Müşteri kaydı yapılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Remove customer
  removeCustomer: async (mechanicId: string) => {
    try {
      const response = await apiClient.delete(`/mechanic/${mechanicId}/remove-customer`);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Remove customer error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Müşteri kaydı kaldırılamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Notification settings
  getNotificationSettings: async () => {
    try {
      const response = await apiClient.get('/users/notification-settings');
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Get notification settings error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim ayarları alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  updateNotificationSettings: async (settings: any) => {
    try {
      const response = await apiClient.put('/users/notification-settings', settings);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Update notification settings error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim ayarları güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  updatePushToken: async (pushToken: string) => {
    try {
      const response = await apiClient.put('/users/push-token', { pushToken });
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Update push token error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Push token güncellenemedi',
        error.response?.data?.error?.details
      );
    }
  },

  createNotification: async (notificationData: any) => {
    try {
      const response = await apiClient.post('/notifications', notificationData);
      return response.data;
    } catch (error: any) {
      if (__DEV__) {
      console.error('Create notification error:', error);
      }
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Bildirim oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  // Emergency Towing
  createTowingRequest: async (data: any) => {
    try {
      const response = await apiClient.post('/emergency/towing-request', data);
      return response.data;
    } catch (error: any) {
      console.error('Create towing request error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Çekici talebi oluşturulamadı',
        error.response?.data?.error?.details
      );
    }
  },

  getEmergencyTowingRequest: async (requestId: string) => {
    try {
      const response = await apiClient.get(`/emergency/towing-request/${requestId}`);
      return response.data;
    } catch (error: any) {
      console.error('Get emergency towing request error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Çekici talebi alınamadı',
        error.response?.data?.error?.details
      );
    }
  },

  cancelEmergencyTowingRequest: async (requestId: string) => {
    try {
      const response = await apiClient.delete(`/emergency/towing-request/${requestId}`);
      return response.data;
    } catch (error: any) {
      console.error('Cancel emergency towing request error:', error);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Çekici talebi iptal edilemedi',
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
  PartsService,
  apiService,
  apiClient
};
