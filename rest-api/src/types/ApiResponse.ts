export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version: string;
    responseTime?: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
  meta?: {
    timestamp: string;
    requestId?: string;
    version: string;
  };
}

export class ResponseHelper {
  private static readonly API_VERSION = '1.0.0';

  static success<T>(data?: T, message?: string, requestId?: string): ApiResponse<T> {
    // Sanitize data - remove sensitive fields
    const sanitizedData = this.sanitizeData(data);
    
    return {
      success: true,
      data: sanitizedData,
      message: message || 'Request successful',
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static error(error: string, message?: string, statusCode?: number, requestId?: string): ApiError {
    // Sanitize error messages in production
    const sanitizedError = process.env.NODE_ENV === 'production' 
      ? this.sanitizeErrorMessage(error)
      : error;

    return {
      success: false,
      error: sanitizedError,
      message: message || 'Request failed',
      statusCode,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static validationError(errors: Record<string, string[]>, requestId?: string): ApiError {
    return {
      success: false,
      error: 'Validation Error',
      message: 'Input validation failed',
      errors,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static paginated<T>(
    data: T[], 
    page: number, 
    limit: number, 
    total: number, 
    message?: string,
    requestId?: string
  ): ApiResponse<T[]> {
    // Sanitize paginated data
    const sanitizedData = data.map(item => this.sanitizeData(item));
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data: sanitizedData,
      message: message || 'Paginated data retrieved successfully',
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static unauthorized(message?: string, requestId?: string): ApiError {
    return {
      success: false,
      error: 'Unauthorized',
      message: message || 'Authentication required',
      statusCode: 401,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static forbidden(message?: string, requestId?: string): ApiError {
    return {
      success: false,
      error: 'Forbidden',
      message: message || 'Insufficient permissions',
      statusCode: 403,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static notFound(resource?: string, requestId?: string): ApiError {
    return {
      success: false,
      error: 'Not Found',
      message: resource ? `${resource} not found` : 'Resource not found',
      statusCode: 404,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static serverError(message?: string, requestId?: string): ApiError {
    return {
      success: false,
      error: 'Internal Server Error',
      message: message || 'An unexpected error occurred',
      statusCode: 500,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  static rateLimit(requestId?: string): ApiError {
    return {
      success: false,
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version: this.API_VERSION
      }
    };
  }

  // ===== PRIVATE UTILITY METHODS =====

  private static sanitizeData<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item)) as T;
    }

    // Remove sensitive fields from objects
    const sensitiveFields = [
      'password', 
      'passwordHash', 
      'refreshToken', 
      'secret', 
      'privateKey',
      'apiKey',
      'token',
      '__v',
      'createdAt',
      'updatedAt'
    ];

    const sanitized = { ...data } as any;
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (sanitized.hasOwnProperty(key) && typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  private static sanitizeErrorMessage(error: string): string {
    // In production, sanitize sensitive error information
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /secret/gi,
      /key/gi,
      /mongodb/gi,
      /localhost/gi,
      /127\.0\.0\.1/g,
      /internal/gi
    ];

    let sanitized = error;
    
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Generic error message for production
    if (sanitized.includes('[REDACTED]') || sanitized.toLowerCase().includes('error')) {
      return 'An error occurred while processing your request';
    }

    return sanitized;
  }
}
