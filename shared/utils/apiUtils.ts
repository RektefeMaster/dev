/**
 * Ortak API yardımcı fonksiyonları
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  status?: number;
}

export interface TokenQueue {
  resolve: (value?: string | null) => void;
  reject: (error?: Error) => void;
}

/**
 * Token queue'yu işler
 */
export const processTokenQueue = (
  failedQueue: TokenQueue[],
  error: Error | null,
  token: string | null = null
) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
};

/**
 * API hata mesajını standardize eder
 */
export const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    if ('response' in error) {
      const axiosError = error as any;
      return axiosError.response?.data?.message || axiosError.message || 'API hatası oluştu';
    }
    if ('message' in error) {
      return (error as Error).message;
    }
  }
  return 'Bilinmeyen hata oluştu';
};

/**
 * API response'unu standardize eder
 */
export const createApiResponse = <T>(
  success: boolean,
  data: T | null = null,
  message: string = '',
  status?: number
): ApiResponse<T> => {
  return {
    success,
    data: data || undefined,
    message,
    status
  };
};

/**
 * Başarılı API response'u oluşturur
 */
export const createSuccessResponse = <T>(data: T, message: string = 'İşlem başarılı'): ApiResponse<T> => {
  return createApiResponse(true, data, message);
};

/**
 * Hatalı API response'u oluşturur
 */
export const createErrorResponse = (message: string, status?: number): ApiResponse => {
  return createApiResponse(false, null, message, status);
};

/**
 * Endpoint'in auth gerektirip gerektirmediğini kontrol eder
 */
export const requiresAuth = (url: string): boolean => {
  const authRequiredEndpoints = [
    '/mechanic/', '/appointments/', '/notifications/',
    '/message/', '/wallet/', '/settings', '/profile',
    '/vehicles/', '/customers/', '/emergency/'
  ];
  
  return authRequiredEndpoints.some(endpoint => url.includes(endpoint));
};

/**
 * API URL'ini temizler
 */
export const cleanApiUrl = (url: string): string => {
  return url.startsWith('/') ? url : `/${url}`;
};
