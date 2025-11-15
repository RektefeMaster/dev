import { Request, Response, NextFunction } from 'express';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createPaginatedResponse,
  ErrorCode 
} from '../../../shared/types/apiResponse';

export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string;
  const startTime = Date.now();

  // Success response formatter - shared/types/apiResponse.ts formatını kullan
  res.success = (data?: any, message?: string, statusCode: number = 200) => {
    const responseTime = Date.now() - startTime;
    const response = createSuccessResponse(data, message, requestId);
    
    // Add response time to meta
    if (response.meta) {
      response.meta.responseTime = responseTime;
    }
    
    return res.status(statusCode).json(response);
  };

  // Error response formatter - shared/types/apiResponse.ts formatını kullan
  res.error = (error: string, message?: string, statusCode: number = 400) => {
    const errorCode = statusCode === 400 ? ErrorCode.BAD_REQUEST :
                     statusCode === 401 ? ErrorCode.UNAUTHORIZED :
                     statusCode === 403 ? ErrorCode.FORBIDDEN :
                     statusCode === 404 ? ErrorCode.NOT_FOUND :
                     statusCode === 409 ? ErrorCode.RESOURCE_CONFLICT :
                     statusCode === 429 ? ErrorCode.RATE_LIMIT_EXCEEDED :
                     ErrorCode.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json(createErrorResponse(errorCode, message || error, null, requestId));
  };

  // Validation error formatter - shared/types/apiResponse.ts formatını kullan
  res.validationError = (errors: Record<string, string[]>, statusCode: number = 400) => {
    return res.status(statusCode).json(createErrorResponse(
      ErrorCode.VALIDATION_FAILED, 
      'Veri doğrulama hatası', 
      { errors }, 
      requestId
    ));
  };

  // Paginated response formatter - shared/types/apiResponse.ts formatını kullan
  res.paginated = (
    data: any[], 
    page: number, 
    limit: number, 
    total: number, 
    message?: string,
    statusCode: number = 200
  ) => {
    return res.status(statusCode).json(createPaginatedResponse(data, page, limit, total, message, requestId));
  };

  // Unauthorized response formatter - shared/types/apiResponse.ts formatını kullan
  res.unauthorized = (message?: string) => {
    return res.status(401).json(createErrorResponse(ErrorCode.UNAUTHORIZED, message, null, requestId));
  };

  // Forbidden response formatter - shared/types/apiResponse.ts formatını kullan
  res.forbidden = (message?: string) => {
    return res.status(403).json(createErrorResponse(ErrorCode.FORBIDDEN, message, null, requestId));
  };

  // Not found response formatter - shared/types/apiResponse.ts formatını kullan
  res.notFound = (resource?: string) => {
    const message = resource ? `${resource} bulunamadı` : 'Kaynak bulunamadı';
    return res.status(404).json(createErrorResponse(ErrorCode.NOT_FOUND, message, null, requestId));
  };

  // Server error response formatter - shared/types/apiResponse.ts formatını kullan
  res.serverError = (message?: string) => {
    return res.status(500).json(createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, message, null, requestId));
  };

  // Rate limit response formatter - shared/types/apiResponse.ts formatını kullan
  res.rateLimit = () => {
    return res.status(429).json(createErrorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, undefined, null, requestId));
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
