import axios from 'axios';
import { API_CONFIG } from '@/constants/config';
import { authStorage } from '@/shared/utils/authStorage';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];
let isRateLimited = false;
let rateLimitResetTime: number | null = null;
let rateLimitTimer: NodeJS.Timeout | null = null;

export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

const setRateLimitStatus = (resetTimeMs: number) => {
  if (rateLimitTimer) {
    clearTimeout(rateLimitTimer);
    rateLimitTimer = null;
  }

  isRateLimited = true;
  rateLimitResetTime = Date.now() + resetTimeMs;

  rateLimitTimer = setTimeout(() => {
    isRateLimited = false;
    rateLimitResetTime = null;
    rateLimitTimer = null;
    if (__DEV__) {
      console.log('Rate limit süresi doldu');
    }
  }, resetTimeMs);
};

const getRateLimitResetTime = (error: any): number => {
  const headers = error.response?.headers || {};

  if (__DEV__) {
    console.log('🔍 Rate limit header kontrolü:');
    console.log('  - retry-after:', headers['retry-after'] || headers['Retry-After']);
    console.log('  - ratelimit-reset:', headers['ratelimit-reset'] || headers['RateLimit-Reset'] || headers['rate-limit-reset']);
    console.log(
      '  - Tüm header keys:',
      Object.keys(headers).filter(key => key.toLowerCase().includes('rate') || key.toLowerCase().includes('retry'))
    );
  }

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

  const rateLimitReset =
    headers['ratelimit-reset'] ||
    headers['RateLimit-Reset'] ||
    headers['rate-limit-reset'] ||
    headers['x-ratelimit-reset'];
  if (rateLimitReset) {
    const resetTimestamp = parseInt(rateLimitReset, 10);
    if (!isNaN(resetTimestamp) && resetTimestamp > 0) {
      const resetTimeMs = resetTimestamp * 1000;
      const remainingMs = resetTimeMs - Date.now();
      if (remainingMs > 0 && remainingMs < 60 * 60 * 1000) {
        if (__DEV__) {
          console.log(`✅ RateLimit-Reset bulundu: ${Math.ceil(remainingMs / 60000)} dakika kaldı`);
        }
        return remainingMs;
      }
      if (remainingMs > 0 && __DEV__) {
        console.log(`⚠️ RateLimit-Reset çok uzun (${Math.ceil(remainingMs / 60000)} dakika), default 15 dakika kullanılıyor`);
      }
    }
  }

  if (__DEV__) {
    console.log('⚠️ Header bulunamadı, default 15 dakika kullanılıyor');
  }
  return 15 * 60 * 1000;
};

apiClient.interceptors.request.use(
  async config => {
    try {
      if (isRateLimited && config.url && !config.url.includes('/auth/') && __DEV__) {
        const remainingTime = rateLimitResetTime ? rateLimitResetTime - Date.now() : 0;
        const remainingMinutes = Math.ceil(remainingTime / 60000);
        console.warn(`Rate limit aktif (${remainingMinutes} dakika kaldı): ${config.url}`);
      }

      const token = await authStorage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      return config;
    } catch (error) {
      if (__DEV__) {
        console.error('Request interceptor error:', error);
      }
      return Promise.reject(error);
    }
  },
  error => {
    if (__DEV__) {
      console.error('Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    if (__DEV__ && (response.config.url?.includes('/auth/') || response.config.url?.includes('/users/profile'))) {
      console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async error => {
    if (__DEV__ && error.response) {
      console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`);
      if (error.response?.status >= 500) {
        console.error('Error Details:', error.response?.data);
      }
    }

    const originalRequest = error.config;

    if (error.response?.status === 429) {
      if (__DEV__) {
        const resetTimeMs = getRateLimitResetTime(error);
        const resetMinutes = Math.ceil(resetTimeMs / 60000);
        console.warn(`Rate limit (429) - ${resetMinutes} dakika sonra tekrar deneyin`);
      }

      const resetTimeMs = getRateLimitResetTime(error);
      setRateLimitStatus(resetTimeMs);

      return Promise.reject(error);
    }

    if (isRateLimited && error.response?.status === 401) {
      if (__DEV__) {
        console.warn('Rate limit aktif, 401 hatası görmezden geliniyor');
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isRateLimited) {
      if (isRefreshing) {
        if (__DEV__) {
          console.log('Token yenileme devam ediyor, kuyrukta bekleniyor...');
        }
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            originalRequest.headers.common = originalRequest.headers.common || {};
            originalRequest.headers.common['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch(Promise.reject);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await authStorage.getRefreshToken();

        if (!refreshToken) {
          if (__DEV__) {
            console.error('Refresh token bulunamadı');
          }
          throw new Error('No refresh token');
        }

        if (__DEV__) {
          console.log('Token yenileniyor...');
        }

        const response = await axios.post(
          `${API_CONFIG.BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 10000 }
        );

        if (response.data.success && response.data.data?.token) {
          const newToken = response.data.data.token;
          const newRefreshToken = response.data.data.refreshToken;
          const userData = response.data.data.user;

          if (__DEV__) {
            console.log('Yeni token alındı');
          }

          await authStorage.setAuthData({
            token: newToken,
            refreshToken: newRefreshToken ?? undefined,
            userId: userData?._id || userData?.id,
            userData,
          });

          apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers.common = originalRequest.headers.common || {};
          originalRequest.headers.common['Authorization'] = 'Bearer ' + newToken;

          const updatedConfig = {
            ...originalRequest,
            headers: {
              ...originalRequest.headers,
              Authorization: 'Bearer ' + newToken,
              common: {
                ...originalRequest.headers.common,
                Authorization: 'Bearer ' + newToken,
              },
            },
          };

          if (__DEV__) {
            console.log('Token başarıyla yenilendi');
          }

          processQueue(null, newToken);
          isRefreshing = false;

          return apiClient(updatedConfig);
        }

        if (__DEV__) {
          console.error('Refresh response başarısız:', response.data);
        }
        throw new Error('Token yenileme başarısız: Invalid response');
      } catch (refreshError: any) {
        if (__DEV__) {
          console.error('Token yenileme başarısız:', refreshError.message);
          if (refreshError.response?.status >= 500) {
            console.error('Error Response:', refreshError.response?.data);
          }
        }

        processQueue(refreshError, null);
        isRefreshing = false;

        if (refreshError.response?.status === 429 || isRateLimited) {
          if (__DEV__) {
            console.warn('Token refresh rate limit hatası (429), logout yapılmıyor');
          }

          if (refreshError.response?.status === 429) {
            const resetTimeMs = getRateLimitResetTime(refreshError);
            setRateLimitStatus(resetTimeMs);
          }

          return Promise.reject(refreshError);
        }

        if (!refreshError.response) {
          if (__DEV__) {
            console.warn('Token refresh network hatası, logout yapılmıyor');
          }
          return Promise.reject(refreshError);
        }

        if (refreshError.response?.status >= 500) {
          if (__DEV__) {
            console.warn('Token refresh sunucu hatası, logout yapılmıyor');
          }
          return Promise.reject(refreshError);
        }

        if (refreshError.response?.status === 401) {
          const errorCode = refreshError.response?.data?.error?.code;
          const errorMessage = refreshError.response?.data?.error?.message || '';

          const isRealAuthError =
            errorCode === 'INVALID_TOKEN' ||
            errorCode === 'TOKEN_EXPIRED' ||
            errorCode === 'USER_NOT_FOUND' ||
            errorMessage.includes('Geçersiz refresh token') ||
            errorMessage.includes('refresh token süresi dolmuş') ||
            errorMessage.includes('Kullanıcı bulunamadı');

          if (isRealAuthError) {
            if (__DEV__) {
              console.warn('Refresh token geçersiz, oturum sonlandırılıyor. Error Code:', errorCode);
            }

            await authStorage.clearAuthData();

            const customError = new Error('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
            (customError as any).isAuthError = true;
            return Promise.reject(customError);
          }

          if (__DEV__) {
            console.warn('401 hatası ama gerçek auth hatası değil. Error Code:', errorCode);
          }
          return Promise.reject(refreshError);
        }

        if (__DEV__) {
          console.warn('Token refresh beklenmedik hata');
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const api = apiClient;

