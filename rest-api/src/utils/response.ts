import { Response } from 'express';
import { ErrorCode, createErrorResponse, createSuccessResponse, createPaginatedResponse } from '../../../shared/types/apiResponse';
import Logger from './logger';

/**
 * Custom Error Class
 * @deprecated Use CustomError from '../middleware/errorHandler' instead
 * This class is kept for backward compatibility
 */
export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: ErrorCode;

  constructor(message: string, statusCode: number = 500, errorCode?: ErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Response Handler Class
 * @deprecated Use ErrorHandler from '../middleware/errorHandler' for consistency
 * This class is kept for backward compatibility but will be phased out
 */
export class ResponseHandler {
  /**
   * Success Response
   * @deprecated Use ErrorHandler.sendSuccess() instead
   */
  static success(res: Response, data?: any, message: string = 'İşlem başarılı') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createSuccessResponse(data, message, requestId);
    return res.status(200).json(response);
  }

  /**
   * Bad Request Response
   * @deprecated Use ErrorHandler.sendError() with ErrorCode.BAD_REQUEST instead
   */
  static badRequest(res: Response, message: string = 'Geçersiz istek') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createErrorResponse(ErrorCode.BAD_REQUEST, message, null, requestId);
    return res.status(400).json(response);
  }

  /**
   * Unauthorized Response
   * @deprecated Use ErrorHandler.sendUnauthorized() instead
   */
  static unauthorized(res: Response, message: string = 'Yetkisiz erişim') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createErrorResponse(ErrorCode.UNAUTHORIZED, message, null, requestId);
    return res.status(401).json(response);
  }

  /**
   * Forbidden Response
   * @deprecated Use ErrorHandler.sendForbidden() instead
   */
  static forbidden(res: Response, message: string = 'Erişim reddedildi') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createErrorResponse(ErrorCode.FORBIDDEN, message, null, requestId);
    return res.status(403).json(response);
  }

  /**
   * Not Found Response
   * @deprecated Use ErrorHandler.sendNotFound() instead
   */
  static notFound(res: Response, message: string = 'Kaynak bulunamadı') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createErrorResponse(ErrorCode.NOT_FOUND, message, null, requestId);
    return res.status(404).json(response);
  }

  /**
   * Conflict Response
   * @deprecated Use ErrorHandler.sendError() with ErrorCode.RESOURCE_CONFLICT instead
   */
  static conflict(res: Response, message: string = 'Çakışma hatası') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createErrorResponse(ErrorCode.RESOURCE_CONFLICT, message, null, requestId);
    return res.status(409).json(response);
  }

  /**
   * Internal Server Error Response
   * @deprecated Use ErrorHandler.sendError() with ErrorCode.INTERNAL_SERVER_ERROR instead
   */
  static error(res: Response, message: string = 'Sunucu hatası') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, message, null, requestId);
    return res.status(500).json(response);
  }

  /**
   * Created Response
   * @deprecated Use ErrorHandler.sendCreated() instead
   */
  static created(res: Response, data?: any, message: string = 'Kaynak oluşturuldu') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createSuccessResponse(data, message, requestId);
    return res.status(201).json(response);
  }

  /**
   * No Content Response
   */
  static noContent(res: Response) {
    return res.status(204).send();
  }

  /**
   * Updated Response
   * @deprecated Use ErrorHandler.sendSuccess() instead
   */
  static updated(res: Response, data?: any, message: string = 'Kaynak güncellendi') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createSuccessResponse(data, message, requestId);
    return res.status(200).json(response);
  }

  /**
   * Deleted Response
   * @deprecated Use ErrorHandler.sendSuccess() instead
   */
  static deleted(res: Response, message: string = 'Kaynak silindi') {
    const requestId = res.req?.headers['x-request-id'] as string;
    const response = createSuccessResponse(null, message, requestId);
    return res.status(200).json(response);
  }
}

/**
 * Send Response Helper Function
 * @deprecated Use ErrorHandler methods instead for consistency
 */
export const sendResponse = (res: Response, statusCode: number, data?: any, message?: string) => {
  const requestId = res.req?.headers['x-request-id'] as string;
  if (statusCode >= 200 && statusCode < 300) {
    const response = createSuccessResponse(data, message || 'İşlem başarılı', requestId);
    return res.status(statusCode).json(response);
  } else {
    const errorCode = statusCode === 400 ? ErrorCode.BAD_REQUEST : 
                     statusCode === 401 ? ErrorCode.UNAUTHORIZED :
                     statusCode === 403 ? ErrorCode.FORBIDDEN :
                     statusCode === 404 ? ErrorCode.NOT_FOUND :
                     statusCode === 409 ? ErrorCode.RESOURCE_CONFLICT :
                     ErrorCode.INTERNAL_SERVER_ERROR;
    const response = createErrorResponse(errorCode, message || 'Hata oluştu', null, requestId);
    return res.status(statusCode).json(response);
  }
};

/**
 * Send Success Response Helper
 * @deprecated Use ErrorHandler.sendSuccess() instead
 */
export const sendSuccess = (res: Response, data?: any, message: string = 'İşlem başarılı') => {
  return ResponseHandler.success(res, data, message);
};

/**
 * Send Error Response Helper
 * @deprecated Use ErrorHandler.sendError() instead
 */
export const sendError = (res: Response, message: string, statusCode: number = 500) => {
  const requestId = res.req?.headers['x-request-id'] as string;
  const errorCode = statusCode === 400 ? ErrorCode.BAD_REQUEST : 
                   statusCode === 401 ? ErrorCode.UNAUTHORIZED :
                   statusCode === 403 ? ErrorCode.FORBIDDEN :
                   statusCode === 404 ? ErrorCode.NOT_FOUND :
                   statusCode === 409 ? ErrorCode.RESOURCE_CONFLICT :
                   ErrorCode.INTERNAL_SERVER_ERROR;
  const response = createErrorResponse(errorCode, message, null, requestId);
  return res.status(statusCode).json(response);
};
