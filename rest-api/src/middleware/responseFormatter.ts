import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../types/ApiResponse';

export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string;
  const startTime = Date.now();

  // Success response formatter
  res.success = (data?: any, message?: string, statusCode: number = 200) => {
    const responseTime = Date.now() - startTime;
    const response = ResponseHelper.success(data, message, requestId);
    
    // Add response time to meta
    if (response.meta) {
      response.meta.responseTime = responseTime;
    }
    
    return res.status(statusCode).json(response);
  };

  // Error response formatter
  res.error = (error: string, message?: string, statusCode: number = 400) => {
    return res.status(statusCode).json(ResponseHelper.error(error, message, statusCode, requestId));
  };

  // Validation error formatter
  res.validationError = (errors: Record<string, string[]>, statusCode: number = 400) => {
    return res.status(statusCode).json(ResponseHelper.validationError(errors, requestId));
  };

  // Paginated response formatter
  res.paginated = (
    data: any[], 
    page: number, 
    limit: number, 
    total: number, 
    message?: string,
    statusCode: number = 200
  ) => {
    return res.status(statusCode).json(ResponseHelper.paginated(data, page, limit, total, message, requestId));
  };

  // Unauthorized response formatter
  res.unauthorized = (message?: string) => {
    return res.status(401).json(ResponseHelper.unauthorized(message, requestId));
  };

  // Forbidden response formatter
  res.forbidden = (message?: string) => {
    return res.status(403).json(ResponseHelper.forbidden(message, requestId));
  };

  // Not found response formatter
  res.notFound = (resource?: string) => {
    return res.status(404).json(ResponseHelper.notFound(resource, requestId));
  };

  // Server error response formatter
  res.serverError = (message?: string) => {
    return res.status(500).json(ResponseHelper.serverError(message, requestId));
  };

  // Rate limit response formatter
  res.rateLimit = () => {
    return res.status(429).json(ResponseHelper.rateLimit(requestId));
  };

  next();
};

// Extend Express Response interface
declare global {
  namespace Express {
    interface Response {
      success: (data?: any, message?: string, statusCode?: number) => Response;
      error: (error: string, message?: string, statusCode?: number) => Response;
      validationError: (errors: Record<string, string[]>, statusCode?: number) => Response;
      paginated: (
        data: any[], 
        page: number, 
        limit: number, 
        total: number, 
        message?: string,
        statusCode?: number
      ) => Response;
      unauthorized: (message?: string) => Response;
      forbidden: (message?: string) => Response;
      notFound: (resource?: string) => Response;
      serverError: (message?: string) => Response;
      rateLimit: () => Response;
    }
  }
}
