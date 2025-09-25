import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ResponseHandler } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    userType: 'driver' | 'mechanic';
  };
}

// Role-based authorization middleware
export const requireRole = (allowedRoles: ('driver' | 'mechanic')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseHandler.unauthorized(res, 'Yetkilendirme gerekli');
      return;
    }

    if (!allowedRoles.includes(req.user.userType)) {
      ResponseHandler.forbidden(
        res,
        `Bu işlem için ${req.user.userType} yetkisi yeterli değil. Gerekli roller: ${allowedRoles.join(', ')}`
      );
      return;
    }

    next();
  };
};

// Sadece driver'lar için
export const requireDriver: RequestHandler = requireRole(['driver']);

// Sadece mechanic'ler için
export const requireMechanic: RequestHandler = requireRole(['mechanic']);

// Driver veya mechanic olabilir
export const requireAnyUser: RequestHandler = requireRole(['driver', 'mechanic']);

// Resource ownership check middleware
export const requireOwnership = (resourceModel: any, resourceIdParam: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        ResponseHandler.unauthorized(res, 'Yetkilendirme gerekli');
        return;
      }

      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        ResponseHandler.notFound(res, 'Kayıt bulunamadı');
        return;
      }

      // Resource'un kullanıcıya ait olup olmadığını kontrol et
      if (resource.userId && resource.userId.toString() !== req.user.userId) {
        ResponseHandler.forbidden(res, 'Bu kayıt üzerinde işlem yapamazsınız');
        return;
      }

      // Resource'u request'e ekle
      (req as any).resource = resource;
      next();
    } catch (error) {
      ResponseHandler.error(res, 'Yetki kontrolü sırasında hata oluştu');
    }
  };
};

// Mechanic availability check middleware
export const requireMechanicAvailable = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || req.user.userType !== 'mechanic') {
      ResponseHandler.forbidden(res, 'Bu işlem sadece ustalar için geçerlidir');
      return;
    }

    // Mechanic'in müsait olup olmadığını kontrol et
    // Bu kısım Mechanic model'ine göre implement edilebilir
    // Şimdilik basit bir kontrol yapıyoruz
    
    next();
  } catch (error) {
    ResponseHandler.error(res, 'Müsaitlik kontrolü sırasında hata oluştu');
  }
};
