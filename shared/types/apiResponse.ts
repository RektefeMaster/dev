/**
 * REKTEFE PROJESİ - STANDART API RESPONSE FORMATLARI
 * 
 * Bu dosya, tüm API endpoint'leri için standart response
 * formatlarını tanımlar. Tutarlılık için tüm endpoint'ler
 * bu formatları kullanmalıdır.
 */

// ===== BASE RESPONSE INTERFACES =====

export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp: string;
  requestId?: string;
  version: string;
}

export interface SuccessApiResponse<T = any> extends BaseApiResponse {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationInfo;
  meta?: ResponseMeta;
}

export interface ErrorApiResponse extends BaseApiResponse {
  success: false;
  error: ErrorInfo;
  data?: null;
}

export type ApiResponse<T = any> = SuccessApiResponse<T> | ErrorApiResponse;

// ===== SUPPORTING INTERFACES =====

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ResponseMeta {
  processingTime?: number;
  cacheHit?: boolean;
  serverTime?: string;
  environment?: string;
  timestamp?: string;
  requestId?: string;
  pagination?: PaginationInfo;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  field?: string;
  stack?: string;
  timestamp?: string;
  requestId?: string;
}

// ===== ERROR CODES =====

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_PHONE_FORMAT = 'INVALID_PHONE_FORMAT',
  
  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  USERTYPE_MISMATCH = 'USERTYPE_MISMATCH',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  APPOINTMENT_CONFLICT = 'APPOINTMENT_CONFLICT',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  
  // Odometer Specific Errors
  ERR_ODO_NEGATIVE = 'ERR_ODO_NEGATIVE',
  ERR_ODO_DECREASING = 'ERR_ODO_DECREASING',
  ERR_ODO_FUTURE_TS = 'ERR_ODO_FUTURE_TS',
  ERR_ODO_OUTLIER_SOFT = 'ERR_ODO_OUTLIER_SOFT',
  ERR_ODO_OUTLIER_HARD = 'ERR_ODO_OUTLIER_HARD',
  ERR_FEATURE_DISABLED = 'ERR_FEATURE_DISABLED',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  SMS_FAILED = 'SMS_FAILED',
  EMAIL_FAILED = 'EMAIL_FAILED',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_TIMEOUT = 'QUERY_TIMEOUT',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  
  // File & Upload Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  
  // Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE'
}

// ===== TURKISH ERROR MESSAGES =====

export const ERROR_MESSAGES_TR: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: 'Yetkilendirme gerekli. Lütfen giriş yapın.',
  [ErrorCode.FORBIDDEN]: 'Bu işlem için yetkiniz bulunmamaktadır.',
  [ErrorCode.TOKEN_EXPIRED]: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: 'Yenileme token\'ı süresi dolmuş. Lütfen tekrar giriş yapın.',
  [ErrorCode.INVALID_TOKEN]: 'Geçersiz yetkilendirme token\'ı.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Geçersiz email veya şifre.',
  
  // Validation Errors
  [ErrorCode.VALIDATION_FAILED]: 'Girilen bilgiler geçersiz.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Zorunlu alanlar eksik.',
  [ErrorCode.INVALID_INPUT_FORMAT]: 'Geçersiz veri formatı.',
  [ErrorCode.INVALID_EMAIL_FORMAT]: 'Geçersiz email formatı.',
  [ErrorCode.INVALID_PHONE_FORMAT]: 'Geçersiz telefon formatı.',
  
  // Resource Errors
  [ErrorCode.NOT_FOUND]: 'İstenen kaynak bulunamadı.',
  [ErrorCode.ALREADY_EXISTS]: 'Bu kayıt zaten mevcut.',
  [ErrorCode.USER_NOT_FOUND]: 'Kullanıcı bulunamadı.',
  [ErrorCode.BAD_REQUEST]: 'Geçersiz istek.',
  [ErrorCode.USERTYPE_MISMATCH]: 'Kullanıcı tipi uyumsuzluğu.',
  [ErrorCode.RESOURCE_CONFLICT]: 'Kaynak çakışması oluştu.',
  [ErrorCode.RESOURCE_LOCKED]: 'Kaynak kilitli, işlem yapılamıyor.',
  
  // Business Logic Errors
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'Yetersiz yetki.',
  [ErrorCode.OPERATION_NOT_ALLOWED]: 'Bu işlem şu anda yapılamaz.',
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 'İş kuralları ihlali.',
  [ErrorCode.APPOINTMENT_CONFLICT]: 'Randevu çakışması oluştu.',
  [ErrorCode.PAYMENT_REQUIRED]: 'Ödeme gerekli.',
  [ErrorCode.ERR_ODO_NEGATIVE]: 'Kilometre değeri negatif olamaz.',
  [ErrorCode.ERR_ODO_DECREASING]: 'Yeni kilometre, son doğrulama değerinin altında olamaz.',
  [ErrorCode.ERR_ODO_FUTURE_TS]: 'Gelecek tarihli kilometre kaydı kabul edilmez.',
  [ErrorCode.ERR_ODO_OUTLIER_SOFT]: 'Olağandışı kilometre artışı algılandı, değer düşük güvenle işlendi.',
  [ErrorCode.ERR_ODO_OUTLIER_HARD]: 'Olağandışı kilometre artışı incelemeye alındı.',
  [ErrorCode.ERR_FEATURE_DISABLED]: 'Bu özellik şu anda devre dışı.',
  
  // External Service Errors
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'Harici servis hatası.',
  [ErrorCode.PAYMENT_FAILED]: 'Ödeme işlemi başarısız.',
  [ErrorCode.NOTIFICATION_FAILED]: 'Bildirim gönderilemedi.',
  [ErrorCode.SMS_FAILED]: 'SMS gönderilemedi.',
  [ErrorCode.EMAIL_FAILED]: 'Email gönderilemedi.',
  
  // Database Errors
  [ErrorCode.DATABASE_ERROR]: 'Veritabanı hatası.',
  [ErrorCode.CONNECTION_FAILED]: 'Bağlantı başarısız.',
  [ErrorCode.QUERY_TIMEOUT]: 'Sorgu zaman aşımı.',
  [ErrorCode.TRANSACTION_FAILED]: 'İşlem başarısız.',
  
  // File & Upload Errors
  [ErrorCode.FILE_TOO_LARGE]: 'Dosya boyutu çok büyük.',
  [ErrorCode.INVALID_FILE_TYPE]: 'Desteklenmeyen dosya türü.',
  [ErrorCode.UPLOAD_FAILED]: 'Dosya yükleme başarısız.',
  [ErrorCode.FILE_NOT_FOUND]: 'Dosya bulunamadı.',
  
  // Server Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Sunucu hatası oluştu.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Servis şu anda kullanılamıyor.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
  [ErrorCode.MAINTENANCE_MODE]: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.'
};

// ===== HTTP STATUS CODE MAPPING =====

export const ERROR_STATUS_MAPPING: Record<ErrorCode, number> = {
  // 401 Unauthorized
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  
  // 403 Forbidden
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.ERR_FEATURE_DISABLED]: 403,
  
  // 400 Bad Request
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_INPUT_FORMAT]: 400,
  [ErrorCode.INVALID_EMAIL_FORMAT]: 400,
  [ErrorCode.INVALID_PHONE_FORMAT]: 400,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.USERTYPE_MISMATCH]: 400,
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 400,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 400,
  [ErrorCode.PAYMENT_REQUIRED]: 400,
  [ErrorCode.ERR_ODO_NEGATIVE]: 400,
  [ErrorCode.ERR_ODO_FUTURE_TS]: 400,
  
  // 404 Not Found
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.FILE_NOT_FOUND]: 404,
  
  // 409 Conflict
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_CONFLICT]: 409,
  [ErrorCode.APPOINTMENT_CONFLICT]: 409,
  [ErrorCode.ERR_ODO_DECREASING]: 409,
  
  // 423 Locked
  [ErrorCode.RESOURCE_LOCKED]: 423,
  
  // 413 Payload Too Large
  [ErrorCode.FILE_TOO_LARGE]: 413,
  
  // 415 Unsupported Media Type
  [ErrorCode.INVALID_FILE_TYPE]: 415,
  
  // 422 Unprocessable Entity
  [ErrorCode.UPLOAD_FAILED]: 422,
  
  // 429 Too Many Requests
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  
  // 502 Bad Gateway
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.PAYMENT_FAILED]: 502,
  [ErrorCode.NOTIFICATION_FAILED]: 502,
  [ErrorCode.SMS_FAILED]: 502,
  [ErrorCode.EMAIL_FAILED]: 502,
  
  // 503 Service Unavailable
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.MAINTENANCE_MODE]: 503,
  [ErrorCode.CONNECTION_FAILED]: 503,
  [ErrorCode.QUERY_TIMEOUT]: 503,
  
  // 500 Internal Server Error
  // 202 Accepted (business process pending)
  [ErrorCode.ERR_ODO_OUTLIER_SOFT]: 202,
  [ErrorCode.ERR_ODO_OUTLIER_HARD]: 202,

  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.TRANSACTION_FAILED]: 500,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
};

// ===== RESPONSE BUILDER FUNCTIONS =====

/**
 * Başarılı API response'u oluşturur
 */
export const createSuccessResponse = <T>(
  data: T,
  message: string = 'İşlem başarılı',
  requestId?: string,
  pagination?: PaginationInfo,
  meta?: ResponseMeta
): SuccessApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    version: '1.0.0',
    pagination,
    meta
  };
};

/**
 * Hatalı API response'u oluşturur
 */
export const createErrorResponse = (
  errorCode: ErrorCode,
  customMessage?: string,
  details?: any,
  requestId?: string,
  field?: string
): ErrorApiResponse => {
  return {
    success: false,
    error: {
      code: errorCode,
      message: customMessage || ERROR_MESSAGES_TR[errorCode],
      details,
      field
    },
    timestamp: new Date().toISOString(),
    requestId,
    version: '1.0.0'
  };
};

/**
 * Pagination bilgisi ile başarılı response oluşturur
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Veriler başarıyla getirildi',
  requestId?: string
): SuccessApiResponse<T[]> => {
  const totalPages = Math.ceil(total / limit);
  
  return createSuccessResponse(
    data,
    message,
    requestId,
    {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  );
};

// ===== VALIDATION HELPERS =====

/**
 * Response'un başarılı olup olmadığını kontrol eder
 */
export const isSuccessResponse = <T>(response: ApiResponse<T>): response is SuccessApiResponse<T> => {
  return response.success === true;
};

/**
 * Response'un hatalı olup olmadığını kontrol eder
 */
export const isErrorResponse = <T>(response: ApiResponse<T>): response is ErrorApiResponse => {
  return response.success === false;
};

/**
 * Error response'dan error code'unu alır
 */
export const getErrorCode = <T>(response: ApiResponse<T>): ErrorCode | null => {
  return isErrorResponse(response) ? response.error.code as ErrorCode : null;
};

/**
 * Error response'dan error message'unu alır
 */
export const getErrorMessage = <T>(response: ApiResponse<T>): string | null => {
  return isErrorResponse(response) ? response.error.message : null;
};

// ===== EXPORT ALL =====
export default {
  ErrorCode,
  ERROR_MESSAGES_TR,
  ERROR_STATUS_MAPPING,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  isSuccessResponse,
  isErrorResponse,
  getErrorCode,
  getErrorMessage
};
