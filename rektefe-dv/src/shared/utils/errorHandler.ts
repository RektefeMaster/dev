import { Alert } from 'react-native';
import { ERROR_MESSAGES } from '@/constants/config';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
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
 * Hata mesajını kullanıcıya gösterir
 */
export const showError = (error: AppError | string, title: string = 'Hata') => {
  const message = typeof error === 'string' ? error : error.message;
  
  Alert.alert(title, message, [
    { text: 'Tamam', style: 'default' }
  ]);
};

/**
 * Başarı mesajını kullanıcıya gösterir
 */
export const showSuccess = (message: string, title: string = 'Başarılı') => {
  Alert.alert(title, message, [
    { text: 'Tamam', style: 'default' }
  ]);
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
  
  if (appError.type === ErrorType.AUTH) {
    // Auth context'e logout sinyali gönder
    // Bu kısım AuthContext'te implement edilecek
    console.log('Auth error detected, logging out user');
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
  handleAuthError
};
