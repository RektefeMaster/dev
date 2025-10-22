import { Response } from 'express';

/**
 * Custom Error Class
 */
export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Response Handler Class
 */
export class ResponseHandler {
  /**
   * Success Response
   */
  static success(res: Response, data?: any, message: string = 'İşlem başarılı') {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Bad Request Response
   */
  static badRequest(res: Response, message: string = 'Geçersiz istek') {
    return res.status(400).json({
      success: false,
      message
    });
  }

  /**
   * Unauthorized Response
   */
  static unauthorized(res: Response, message: string = 'Yetkisiz erişim') {
    return res.status(401).json({
      success: false,
      message
    });
  }

  /**
   * Forbidden Response
   */
  static forbidden(res: Response, message: string = 'Erişim reddedildi') {
    return res.status(403).json({
      success: false,
      message
    });
  }

  /**
   * Not Found Response
   */
  static notFound(res: Response, message: string = 'Kaynak bulunamadı') {
    return res.status(404).json({
      success: false,
      message
    });
  }

  /**
   * Conflict Response
   */
  static conflict(res: Response, message: string = 'Çakışma hatası') {
    return res.status(409).json({
      success: false,
      message
    });
  }

  /**
   * Internal Server Error Response
   */
  static error(res: Response, message: string = 'Sunucu hatası') {
    return res.status(500).json({
      success: false,
      message
    });
  }

  /**
   * Created Response
   */
  static created(res: Response, data?: any, message: string = 'Kaynak oluşturuldu') {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  /**
   * No Content Response
   */
  static noContent(res: Response) {
    return res.status(204).send();
  }

  /**
   * Updated Response
   */
  static updated(res: Response, data?: any, message: string = 'Kaynak güncellendi') {
    return res.status(200).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Deleted Response
   */
  static deleted(res: Response, message: string = 'Kaynak silindi') {
    return res.status(200).json({
      success: true,
      message
    });
  }
}

/**
 * Send Response Helper Function
 */
export const sendResponse = (res: Response, statusCode: number, data?: any, message?: string) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message: message || (statusCode >= 200 && statusCode < 300 ? 'İşlem başarılı' : 'Hata oluştu'),
    data
  });
};

/**
 * Send Success Response Helper
 */
export const sendSuccess = (res: Response, data?: any, message: string = 'İşlem başarılı') => {
  return ResponseHandler.success(res, data, message);
};

/**
 * Send Error Response Helper
 */
export const sendError = (res: Response, message: string, statusCode: number = 500) => {
  return res.status(statusCode).json({
    success: false,
    message
  });
};
