import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    userType: 'driver' | 'mechanic';
  };
}

// Role-based authorization middleware
export const requireRole = (allowedRoles: ('driver' | 'mechanic')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ResponseHandler.unauthorized(res, 'Yetkilendirme gerekli');
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return ResponseHandler.forbidden(
        res, 
        `Bu işlem için ${req.user.userType} yetkisi yeterli değil. Gerekli roller: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

// Sadece driver'lar için
export const requireDriver = requireRole(['driver']);

// Sadece mechanic'ler için
export const requireMechanic = requireRole(['mechanic']);

// Driver veya mechanic olabilir
export const requireAnyUser = requireRole(['driver', 'mechanic']);

// Resource ownership check middleware
export const requireOwnership = (resourceModel: any, resourceIdParam: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return ResponseHandler.unauthorized(res, 'Yetkilendirme gerekli');
      }

      const resourceId = req.params[resourceIdParam];
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return ResponseHandler.notFound(res, 'Kayıt bulunamadı');
      }

      // Resource'un kullanıcıya ait olup olmadığını kontrol et
      if (resource.userId && resource.userId.toString() !== req.user.userId) {
        return ResponseHandler.forbidden(res, 'Bu kayıt üzerinde işlem yapamazsınız');
      }

      // Resource'u request'e ekle
      (req as any).resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return ResponseHandler.error(res, 'Yetki kontrolü sırasında hata oluştu');
    }
  };
};

// Mechanic availability check middleware
export const requireMechanicAvailable = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.userType !== 'mechanic') {
      return ResponseHandler.forbidden(res, 'Bu işlem sadece ustalar için geçerlidir');
    }

    // Mechanic'in müsait olup olmadığını kontrol et
    // Bu kısım Mechanic model'ine göre implement edilebilir
    // Şimdilik basit bir kontrol yapıyoruz
    
    next();
  } catch (error) {
    console.error('Mechanic availability check error:', error);
    return ResponseHandler.error(res, 'Müsaitlik kontrolü sırasında hata oluştu');
  }
};
