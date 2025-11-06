import { Alert } from 'react-native';
import { ERROR_MESSAGES } from '@/constants/config';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  statusCode?: number;
}

/**
 * API hatalarını kategorize eder ve kullanıcı dostu mesajlar üretir
 */
export const handleApiError = (error: any): AppError => {
  // Cancel edilen istekler (rate limit nedeniyle) - sessizce handle et
  if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || (error.message && error.message.includes('Rate limit aktif'))) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: 'İstek iptal edildi',
      originalError: error
    };
  }
  
  // Network hataları
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return {
      type: ErrorType.NETWORK,
      message: ERROR_MESSAGES.NETWORK_ERROR,
      originalError: error
    };
  }

  // HTTP status code hatalarını kontrol et
  if (error.response) {
    const statusCode = error.response.status;
    
    switch (statusCode) {
      case 429:
        // Rate limit hatası - sessizce işlenir, kullanıcıya gösterilmez
        return {
          type: ErrorType.RATE_LIMIT,
          message: 'Rate limit aşıldı',
          originalError: error,
          statusCode
        };
      
      case 401:
        return {
          type: ErrorType.AUTH,
          message: ERROR_MESSAGES.AUTH_ERROR,
          originalError: error,
          statusCode
        };
      
      case 400:
      case 422:
        return {
          type: ErrorType.VALIDATION,
          message: error.response.data?.message || 'Geçersiz veri girişi',
          originalError: error,
          statusCode
        };
      
      case 500:
      case 502:
      case 503:
        return {
          type: ErrorType.SERVER,
          message: ERROR_MESSAGES.SERVER_ERROR,
          originalError: error,
          statusCode
        };
      
      default:
        return {
          type: ErrorType.UNKNOWN,
          message: error.response.data?.message || ERROR_MESSAGES.UNKNOWN_ERROR,
          originalError: error,
          statusCode
        };
    }
  }

  // Timeout hataları
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return {
      type: ErrorType.NETWORK,
      message: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
      originalError: error
    };
  }

  // Genel hatalar
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
    originalError: error
  };
};

/**
 * Rate limit veya cancel edilen istek kontrolü
 */
export const isRateLimitOrCanceledError = (error: any): boolean => {
  return (
    error.response?.status === 429 ||
    error.name === 'CanceledError' ||
    error.code === 'ERR_CANCELED' ||
    error.message?.includes('Rate limit aktif') ||
    (error.type && error.type === ErrorType.RATE_LIMIT)
  );
};

/**
 * Hata mesajını kullanıcıya gösterir
 * Toast kullanır (Alert yerine)
 */
export const showError = (error: AppError | string, title: string = 'Hata') => {
  // Toast service'i lazy import et (circular dependency'i önlemek için)
  const toastService = require('@/shared/services/toastService').default;
  // Rate limit hatası ise kullanıcıya gösterilmez (sessizce işlenir)
  if (typeof error !== 'string' && error.type === ErrorType.RATE_LIMIT) {
    if (__DEV__) {
      console.log('Rate limit hatası, kullanıcıya gösterilmiyor');
    }
    return;
  }
  
  const message = typeof error === 'string' ? error : error.message;
  
  // Toast service ile hata göster
  toastService.error(message);
};

/**
 * Başarı mesajını kullanıcıya gösterir
 * Toast kullanır (Alert yerine)
 */
export const showSuccess = (message: string, title: string = 'Başarılı') => {
  // Toast service'i lazy import et (circular dependency'i önlemek için)
  const toastService = require('@/shared/services/toastService').default;
  toastService.success(message);
};

/**
 * Onay dialogu gösterir
 */
export const showConfirmation = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  title: string = 'Onay'
): void => {
  Alert.alert(
    title,
    message,
    [
      { text: 'İptal', style: 'cancel', onPress: onCancel },
      { text: 'Tamam', style: 'default', onPress: onConfirm }
    ]
  );
};

/**
 * API çağrılarını try-catch ile sarmalayan yardımcı fonksiyon
 */
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  options?: {
    showErrorAlert?: boolean;
    customErrorMessage?: string;
    onError?: (error: AppError) => void;
  }
): Promise<{ data: T | null; error: AppError | null }> => {
  try {
    const data = await apiCall();
    return { data, error: null };
  } catch (error: any) {
    const appError = handleApiError(error);
    
    // Hata callback'i varsa çağır
    if (options?.onError) {
      options.onError(appError);
    }
    
    // Rate limit hatası ise alert gösterilmez (sessizce işlenir)
    if (appError.type === ErrorType.RATE_LIMIT) {
      if (__DEV__) {
        console.log('Rate limit hatası, alert gösterilmiyor');
      }
      return { data: null, error: appError };
    }
    
    // Hata alert'i göster
    if (options?.showErrorAlert !== false) {
      const errorMessage = options?.customErrorMessage || appError.message;
      showError(errorMessage);
    }
    
    // Console'a log - sadece development'ta
    if (__DEV__) {
      console.error('API Error:', {
        type: appError.type,
        message: appError.message,
        statusCode: appError.statusCode,
        originalError: appError.originalError
      });
    }
    
    return { data: null, error: appError };
  }
};

/**
 * Validation hataları için özel handler
 */
export const handleValidationError = (fields: Record<string, string[]>): string => {
  const errors = Object.entries(fields)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n');
  
  return `Lütfen aşağıdaki alanları kontrol edin:\n${errors}`;
};

/**
 * Auth hataları için özel handler
 */
export const handleAuthError = (error: any): void => {
  const appError = handleApiError(error);
  
  // Rate limit hatası ise hiçbir şey yapma (sessizce işlenir)
  if (appError.type === ErrorType.RATE_LIMIT) {
    if (__DEV__) {
      console.log('Rate limit hatası, auth error handler sessizce atlanıyor');
    }
    return;
  }
  
  if (appError.type === ErrorType.AUTH) {
    // Auth hatası tespit edildi ama otomatik logout yapılmıyor
    // API interceptor zaten gerçek auth hatalarında logout'u handle ediyor
    // Burada sadece kullanıcıya hata mesajı gösteriliyor
    if (__DEV__) {
      console.log('Auth hatası tespit edildi (API interceptor logout\'u handle edecek)');
    }
  }
  
  showError(appError);
};

export default {
  handleApiError,
  showError,
  showSuccess,
  showConfirmation,
  withErrorHandling,
  handleValidationError,
  handleAuthError,
  isRateLimitOrCanceledError
};
