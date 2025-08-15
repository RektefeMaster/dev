import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ResponseHandler {
  // Success responses
  static success<T>(
    res: Response,
    data: T,
    message: string = 'İşlem başarılı',
    statusCode: number = 200
  ) {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = 'Kayıt başarıyla oluşturuldu'
  ) {
    return this.success(res, data, message, 201);
  }

  static updated<T>(
    res: Response,
    data: T,
    message: string = 'Kayıt başarıyla güncellendi'
  ) {
    return this.success(res, data, message, 200);
  }

  static deleted(
    res: Response,
    message: string = 'Kayıt başarıyla silindi'
  ) {
    const response: ApiResponse = {
      success: true,
      message
    };

    return res.status(200).json(response);
  }

  // Error responses
  static error(
    res: Response,
    message: string = 'Bir hata oluştu',
    statusCode: number = 500,
    errors?: string[]
  ) {
    const response: ApiResponse = {
      success: false,
      message,
      errors
    };

    return res.status(statusCode).json(response);
  }

  static badRequest(
    res: Response,
    message: string = 'Geçersiz istek',
    errors?: string[]
  ) {
    return this.error(res, message, 400, errors);
  }

  static unauthorized(
    res: Response,
    message: string = 'Yetkilendirme gerekli'
  ) {
    return this.error(res, message, 401);
  }

  static forbidden(
    res: Response,
    message: string = 'Bu işlem için yetkiniz yok'
  ) {
    return this.error(res, message, 403);
  }

  static notFound(
    res: Response,
    message: string = 'Kayıt bulunamadı'
  ) {
    return this.error(res, message, 404);
  }

  static conflict(
    res: Response,
    message: string = 'Çakışma oluştu'
  ) {
    return this.error(res, message, 409);
  }

  // Pagination response
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Veriler başarıyla getirildi'
  ) {
    const totalPages = Math.ceil(total / limit);
    
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    return res.status(200).json(response);
  }
}
