import { Request, Response } from 'express';

/**
 * Standard API error response interface
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Standard API success response interface
 */
export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Common error types used throughout the application
 */
export enum ErrorCodes {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  
  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // External Service Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  
  // Database Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  
  // File & Upload Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_MAPPING: Record<ErrorCodes, number> = {
  // 401 Unauthorized
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  
  // 403 Forbidden
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
  
  // 400 Bad Request
  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.INVALID_INPUT_FORMAT]: 400,
  [ErrorCodes.BUSINESS_RULE_VIOLATION]: 400,
  [ErrorCodes.OPERATION_NOT_ALLOWED]: 400,
  
  // 404 Not Found
  [ErrorCodes.NOT_FOUND]: 404,
  
  // 409 Conflict
  [ErrorCodes.ALREADY_EXISTS]: 409,
  [ErrorCodes.RESOURCE_CONFLICT]: 409,
  
  // 413 Payload Too Large
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  
  // 415 Unsupported Media Type
  [ErrorCodes.INVALID_FILE_TYPE]: 415,
  
  // 422 Unprocessable Entity
  [ErrorCodes.UPLOAD_FAILED]: 422,
  
  // 429 Too Many Requests
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  
  // 502 Bad Gateway
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.PAYMENT_FAILED]: 502,
  
  // 503 Service Unavailable
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.NOTIFICATION_FAILED]: 503,
  
  // 500 Internal Server Error
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.CONNECTION_FAILED]: 500,
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 500,
};

/**
 * Turkish error messages for user-friendly responses
 */
const ERROR_MESSAGES_TR: Record<ErrorCodes, string> = {
  // Authentication & Authorization
  [ErrorCodes.UNAUTHORIZED]: 'Yetkilendirme gerekli. Lütfen giriş yapın.',
  [ErrorCodes.FORBIDDEN]: 'Bu işlem için yetkiniz bulunmamaktadır.',
  [ErrorCodes.TOKEN_EXPIRED]: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
  [ErrorCodes.INVALID_TOKEN]: 'Geçersiz yetkilendirme token\'ı.',
  
  // Validation Errors
  [ErrorCodes.VALIDATION_FAILED]: 'Girilen bilgiler geçersiz.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Zorunlu alanlar eksik.',
  [ErrorCodes.INVALID_INPUT_FORMAT]: 'Geçersiz veri formatı.',
  
  // Resource Errors
  [ErrorCodes.NOT_FOUND]: 'İstenen kaynak bulunamadı.',
  [ErrorCodes.ALREADY_EXISTS]: 'Bu kayıt zaten mevcut.',
  [ErrorCodes.RESOURCE_CONFLICT]: 'Kaynak çakışması oluştu.',
  
  // Business Logic Errors
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'Yetersiz yetki.',
  [ErrorCodes.OPERATION_NOT_ALLOWED]: 'Bu işlem şu anda yapılamaz.',
  [ErrorCodes.BUSINESS_RULE_VIOLATION]: 'İş kuralları ihlali.',
  
  // External Service Errors
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'Harici servis hatası.',
  [ErrorCodes.PAYMENT_FAILED]: 'Ödeme işlemi başarısız.',
  [ErrorCodes.NOTIFICATION_FAILED]: 'Bildirim gönderilemedi.',
  
  // Database Errors
  [ErrorCodes.DATABASE_ERROR]: 'Veritabanı hatası.',
  [ErrorCodes.CONNECTION_FAILED]: 'Bağlantı başarısız.',
  
  // File & Upload Errors
  [ErrorCodes.FILE_TOO_LARGE]: 'Dosya boyutu çok büyük.',
  [ErrorCodes.INVALID_FILE_TYPE]: 'Desteklenmeyen dosya türü.',
  [ErrorCodes.UPLOAD_FAILED]: 'Dosya yükleme başarısız.',
  
  // Server Errors
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'Sunucu hatası oluştu.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'Servis şu anda kullanılamıyor.',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'İstek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
};

/**
 * Enhanced error handler utility class
 */
export class ErrorHandler {
  /**
   * Create and send a standardized error response
   */
  static sendError(
    res: Response,
    errorCode: ErrorCodes,
    customMessage?: string,
    details?: any,
    req?: Request
  ): void {
    const statusCode = ERROR_STATUS_MAPPING[errorCode] || 500;
    const message = customMessage || ERROR_MESSAGES_TR[errorCode];
    const requestId = req?.headers['x-request-id'] as string;

    const errorResponse: ApiError = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    // Log error for debugging (except client errors) - use Winston logger
    if (statusCode >= 500) {
      import('../utils/monitoring').then(({ logger }) => {
        logger.error('Server Error:', {
          errorCode,
          message,
          details,
          timestamp: new Date().toISOString()
        });
      });
    }

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Create and send a standardized success response
   */
  static sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    req?: Request
  ): void {
    const requestId = req?.headers['x-request-id'] as string;

    const successResponse: ApiSuccess<T> = {
      success: true,
      data,
      message,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.json(successResponse);
  }

  /**
   * Handle async route wrapper to catch unhandled promises
   */
  static asyncHandler(fn: (req: Request, res: Response, next: Function) => Promise<any>) {
    return (req: Request, res: Response, next: Function) => {
      Promise.resolve(fn(req, res, next)).catch((err: any) => next(err));
    };
  }

  /**
   * Handle common validation errors from Joi
   */
  static handleValidationError(error: any, res: Response, req?: Request): void {
    const details = error.details?.map((detail: any) => ({
      field: detail.path?.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    this.sendError(res, ErrorCodes.VALIDATION_FAILED, error.message, details, req);
  }

  /**
   * Handle MongoDB/Mongoose errors
   */
  static handleDatabaseError(error: any, res: Response, req?: Request): void {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      this.sendError(
        res, 
        ErrorCodes.ALREADY_EXISTS, 
        `${field} zaten mevcut`, 
        { field }, 
        req
      );
      return;
    }

    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      this.sendError(res, ErrorCodes.VALIDATION_FAILED, 'Veri doğrulama hatası', details, req);
      return;
    }

    if (error.name === 'CastError') {
      this.sendError(res, ErrorCodes.INVALID_INPUT_FORMAT, 'Geçersiz ID formatı', null, req);
      return;
    }

    // Generic database error
    this.sendError(res, ErrorCodes.DATABASE_ERROR, 'Veritabanı işlemi başarısız', null, req);
  }

  /**
   * Handle JWT related errors
   */
  static handleJWTError(error: any, res: Response, req?: Request): void {
    if (error.name === 'JsonWebTokenError') {
      this.sendError(res, ErrorCodes.INVALID_TOKEN, 'Geçersiz token', undefined, req);
      return;
    }

    if (error.name === 'TokenExpiredError') {
      this.sendError(res, ErrorCodes.TOKEN_EXPIRED, 'Token süresi dolmuş', undefined, req);
      return;
    }

    this.sendError(res, ErrorCodes.UNAUTHORIZED, 'Yetkisiz erişim', undefined, req);
  }
}

/**
 * Common validation helper functions
 */
export class ValidationHelper {
  /**
   * Check if user exists and is authorized
   */
  static checkUserExists(user: any, res: Response, req?: Request): boolean {
    if (!user) {
      ErrorHandler.sendError(res, ErrorCodes.NOT_FOUND, 'Kullanıcı bulunamadı', null, req);
      return false;
    }
    return true;
  }

  /**
   * Check if resource exists
   */
  static checkResourceExists(resource: any, resourceName: string, res: Response, req?: Request): boolean {
    if (!resource) {
      ErrorHandler.sendError(res, ErrorCodes.NOT_FOUND, `${resourceName} bulunamadı`, null, req);
      return false;
    }
    return true;
  }

  /**
   * Check user permission
   */
  static checkPermission(condition: boolean, res: Response, req?: Request): boolean {
    if (!condition) {
      ErrorHandler.sendError(res, ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Yetersiz yetki', undefined, req);
      return false;
    }
    return true;
  }
}

export default ErrorHandler;