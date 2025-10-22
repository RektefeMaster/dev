import { Request, Response, NextFunction } from 'express';
import { 
  ErrorCode, 
  ERROR_MESSAGES_TR, 
  ERROR_STATUS_MAPPING, 
  createErrorResponse,
  ApiResponse 
} from '../../../shared/types/apiResponse';
import { logger } from '../utils/monitoring';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode: ErrorCode;

  constructor(message: string, statusCode: number = 500, errorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ===== ENHANCED ERROR HANDLER =====
export class ErrorHandler {
  /**
   * Create and send a standardized error response
   */
  static sendError(
    res: Response,
    errorCode: ErrorCode,
    customMessage?: string,
    details?: any,
    req?: Request
  ): void {
    const statusCode = ERROR_STATUS_MAPPING[errorCode] || 500;
    const message = customMessage || ERROR_MESSAGES_TR[errorCode];
    const requestId = req?.headers['x-request-id'] as string;

    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    // Log error for debugging (except client errors)
    if (statusCode >= 500) {
      logger.error('Server Error:', {
        errorCode,
        message,
        details,
        timestamp: new Date().toISOString()
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
    
    const successResponse: ApiResponse = {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.json(successResponse);
  }

  /**
   * Create and send a created response (201)
   */
  static sendCreated<T>(
    res: Response,
    data: T,
    message?: string,
    req?: Request
  ): void {
    const requestId = req?.headers['x-request-id'] as string;
    
    const successResponse: ApiResponse = {
      success: true,
      data,
      message: message || 'Kayıt başarıyla oluşturuldu',
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(201).json(successResponse);
  }

  /**
   * Create and send a paginated response
   */
  static sendPaginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string,
    req?: Request
  ): void {
    const requestId = req?.headers['x-request-id'] as string;
    const totalPages = Math.ceil(total / limit);
    
    const paginatedResponse: ApiResponse = {
      success: true,
      data,
      message: message || 'Veriler başarıyla getirildi',
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    };

    res.json(paginatedResponse);
  }

  /**
   * Create and send a not found response
   */
  static sendNotFound(
    res: Response,
    resource?: string,
    req?: Request
  ): void {
    const message = resource ? `${resource} bulunamadı` : 'Kaynak bulunamadı';
    this.sendError(res, ErrorCode.NOT_FOUND, message, null, req);
  }

  /**
   * Create and send an unauthorized response
   */
  static sendUnauthorized(
    res: Response,
    message?: string,
    req?: Request
  ): void {
    this.sendError(res, ErrorCode.UNAUTHORIZED, message, null, req);
  }

  /**
   * Create and send a forbidden response
   */
  static sendForbidden(
    res: Response,
    message?: string,
    req?: Request
  ): void {
    this.sendError(res, ErrorCode.FORBIDDEN, message, null, req);
  }

  /**
   * Create and send a validation error response
   */
  static sendValidationError(
    res: Response,
    errors: Record<string, string[]>,
    req?: Request
  ): void {
    this.sendError(res, ErrorCode.VALIDATION_FAILED, 'Veri doğrulama hatası', errors, req);
  }
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error using Winston logger
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const errorResponse = createErrorResponse(
      ErrorCode.INVALID_INPUT_FORMAT,
      'Geçersiz ID formatı',
      { field: 'id' },
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.INVALID_INPUT_FORMAT]).json(errorResponse);
  }

  // Mongoose duplicate key
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const errorResponse = createErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      'Bu veri zaten mevcut',
      { field: 'duplicate' },
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.ALREADY_EXISTS]).json(errorResponse);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values((err as any).errors).map((val: any) => ({
      field: val.path,
      message: val.message
    }));
    const errorResponse = createErrorResponse(
      ErrorCode.VALIDATION_FAILED,
      'Veri doğrulama hatası',
      details,
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.VALIDATION_FAILED]).json(errorResponse);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const errorResponse = createErrorResponse(
      ErrorCode.INVALID_TOKEN,
      'Geçersiz token',
      null,
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.INVALID_TOKEN]).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    const errorResponse = createErrorResponse(
      ErrorCode.TOKEN_EXPIRED,
      'Token süresi dolmuş',
      null,
      req.headers['x-request-id'] as string
    );
    return res.status(ERROR_STATUS_MAPPING[ErrorCode.TOKEN_EXPIRED]).json(errorResponse);
  }

  // Custom error with error code
  if (err instanceof CustomError) {
    const errorResponse = createErrorResponse(
      err.errorCode,
      err.message,
      null,
      req.headers['x-request-id'] as string
    );
    return res.status(err.statusCode).json(errorResponse);
  }

  // Default error
  const errorResponse = createErrorResponse(
    ErrorCode.INTERNAL_SERVER_ERROR,
    'Sunucu hatası oluştu',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null,
    req.headers['x-request-id'] as string
  );
  
  res.status(500).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found middleware
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const errorResponse = createErrorResponse(
    ErrorCode.NOT_FOUND,
    `Endpoint bulunamadı: ${req.originalUrl}`,
    { url: req.originalUrl, method: req.method },
    req.headers['x-request-id'] as string
  );
  res.status(404).json(errorResponse);
};
