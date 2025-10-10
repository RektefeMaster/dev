/**
 * REKTEFE PROJESİ - STANDARD API RESPONSE FORMATTER
 * 
 * Tüm API endpoint'lerinde tutarlı response formatı sağlar.
 */

import { Response } from 'express';
import { ErrorCode } from '../../../shared/types/apiResponse';

/**
 * Standard API Response Interface
 */
export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode | string;
    message: string;
    details?: unknown;
    field?: string;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

/**
 * Response Formatter Class
 * Tüm API response'ları için standart format
 */
export class ResponseFormatter {
  /**
   * Success response
   */
  static success<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    metadata?: any
  ): Response {
    const response: StandardApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        ...metadata,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Success response with pagination
   */
  static successWithPagination<T>(
    res: Response,
    data: T,
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    statusCode: number = 200
  ): Response {
    const response: StandardApiResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        pagination: {
          ...pagination,
          hasMore: pagination.page * pagination.limit < pagination.total,
        },
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Created response (201)
   */
  static created<T>(res: Response, data: T, metadata?: any): Response {
    return this.success(res, data, 201, metadata);
  }

  /**
   * No content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Error response
   */
  static error(
    res: Response,
    error: {
      code: ErrorCode | string;
      message: string;
      details?: unknown;
      field?: string;
    },
    statusCode: number = 400
  ): Response {
    const response: StandardApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
        field: error.field,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Bad Request (400)
   */
  static badRequest(
    res: Response,
    message: string = 'Bad Request',
    details?: unknown
  ): Response {
    return this.error(
      res,
      {
        code: 'BAD_REQUEST',
        message,
        details,
      },
      400
    );
  }

  /**
   * Unauthorized (401)
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    details?: unknown
  ): Response {
    return this.error(
      res,
      {
        code: 'UNAUTHORIZED',
        message,
        details,
      },
      401
    );
  }

  /**
   * Forbidden (403)
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden',
    details?: unknown
  ): Response {
    return this.error(
      res,
      {
        code: 'FORBIDDEN',
        message,
        details,
      },
      403
    );
  }

  /**
   * Not Found (404)
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found',
    details?: unknown
  ): Response {
    return this.error(
      res,
      {
        code: 'NOT_FOUND',
        message,
        details,
      },
      404
    );
  }

  /**
   * Conflict (409)
   */
  static conflict(
    res: Response,
    message: string = 'Resource conflict',
    details?: unknown
  ): Response {
    return this.error(
      res,
      {
        code: 'CONFLICT',
        message,
        details,
      },
      409
    );
  }

  /**
   * Validation Error (422)
   */
  static validationError(
    res: Response,
    message: string = 'Validation failed',
    details?: unknown,
    field?: string
  ): Response {
    return this.error(
      res,
      {
        code: 'VALIDATION_ERROR',
        message,
        details,
        field,
      },
      422
    );
  }

  /**
   * Internal Server Error (500)
   */
  static serverError(
    res: Response,
    message: string = 'Internal server error',
    details?: unknown
  ): Response {
    return this.error(
      res,
      {
        code: 'INTERNAL_SERVER_ERROR',
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      500
    );
  }

  /**
   * Service Unavailable (503)
   */
  static serviceUnavailable(
    res: Response,
    message: string = 'Service temporarily unavailable',
    details?: unknown
  ): Response {
    return this.error(
      res,
      {
        code: 'SERVICE_UNAVAILABLE',
        message,
        details,
      },
      503
    );
  }
}

/**
 * Async handler wrapper - otomatik error handling
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log error
      console.error('Async Handler Error:', error);

      // Send formatted error response
      if (error.statusCode) {
        return ResponseFormatter.error(
          res,
          {
            code: error.code || 'INTERNAL_ERROR',
            message: error.message || 'An error occurred',
            details: error.details,
          },
          error.statusCode
        );
      }

      // Default server error
      return ResponseFormatter.serverError(res, error.message, error);
    });
  };
};

export default ResponseFormatter;

