/**
 * REKTEFE PROJESİ - OPTİMİZE EDİLMİŞ AUTH MIDDLEWARE
 * 
 * Bu dosya, güvenli ve performanslı authentication
 * middleware'ini içerir.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { JWTService } from '../services/optimizedAuth.service';
import { createErrorResponse, ErrorCode } from '../../../shared/types/apiResponse';
import { UserType } from '../../../shared/types/enums';

// ===== REQUEST EXTENSION =====
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: UserType;
      };
      deviceInfo?: {
        deviceId?: string;
        ipAddress?: string;
        userAgent?: string;
      };
    }
  }
}

// ===== DEVICE INFO EXTRACTOR =====
const extractDeviceInfo = (req: Request) => {
  return {
    deviceId: req.headers['x-device-id'] as string,
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string,
    userAgent: req.headers['user-agent']
  };
};

// ===== MAIN AUTH MIDDLEWARE =====
export const auth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Authorization header'ı kontrol et
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const errorResponse = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'Yetkilendirme token\'ı bulunamadı',
        { header: authHeader },
        req.headers['x-request-id'] as string
      );
      res.status(401).json(errorResponse);
      return;
    }

    // Token'ı çıkar
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      const errorResponse = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'Token bulunamadı',
        null,
        req.headers['x-request-id'] as string
      );
      res.status(401).json(errorResponse);
      return;
    }

    // Device bilgilerini çıkar
    req.deviceInfo = extractDeviceInfo(req);

    try {
      // Token'ı doğrula
      const payload = JWTService.verifyAccessToken(token);
      
      // Request'e kullanıcı bilgilerini ekle
      req.user = {
        userId: payload.userId,
        userType: payload.userType
      };

      next();
    } catch (jwtError: any) {
      // JWT hatalarını özel olarak handle et
      let errorCode = ErrorCode.INVALID_TOKEN;
      let message = 'Geçersiz token';

      if (jwtError.message.includes('expired')) {
        errorCode = ErrorCode.TOKEN_EXPIRED;
        message = 'Token süresi dolmuş';
      } else if (jwtError.message.includes('blacklist')) {
        errorCode = ErrorCode.INVALID_TOKEN;
        message = 'Token geçersiz (blacklist)';
      } else if (jwtError.message.includes('version')) {
        errorCode = ErrorCode.TOKEN_EXPIRED;
        message = 'Token versiyonu geçersiz';
      }

      const errorResponse = createErrorResponse(
        errorCode,
        message,
        process.env.NODE_ENV === 'development' ? { jwtError: jwtError.message } : null,
        req.headers['x-request-id'] as string
      );
      res.status(401).json(errorResponse);
      return;
    }
  } catch (error) {
    const errorResponse = createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Yetkilendirme hatası',
      process.env.NODE_ENV === 'development' ? { error: (error as Error).message } : null,
      req.headers['x-request-id'] as string
    );
    res.status(500).json(errorResponse);
  }
};

// ===== ROLE-BASED AUTH MIDDLEWARE =====
export const requireRole = (allowedRoles: UserType[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const errorResponse = createErrorResponse(
        ErrorCode.UNAUTHORIZED,
        'Kullanıcı bilgisi bulunamadı',
        null,
        req.headers['x-request-id'] as string
      );
      res.status(401).json(errorResponse);
      return;
    }

    if (!allowedRoles.includes(req.user.userType)) {
      const errorResponse = createErrorResponse(
        ErrorCode.FORBIDDEN,
        'Bu işlem için yetkiniz bulunmamaktadır',
        { 
          requiredRoles: allowedRoles,
          userRole: req.user.userType 
        },
        req.headers['x-request-id'] as string
      );
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
};

// ===== DRIVER ONLY MIDDLEWARE =====
export const requireDriver: RequestHandler = requireRole([UserType.DRIVER]);

// ===== MECHANIC ONLY MIDDLEWARE =====
export const requireMechanic: RequestHandler = requireRole([UserType.MECHANIC]);

// ===== OPTIONAL AUTH MIDDLEWARE =====
export const optionalAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      try {
        const payload = JWTService.verifyAccessToken(token);
        req.user = {
          userId: payload.userId,
          userType: payload.userType
        };
        req.deviceInfo = extractDeviceInfo(req);
      } catch (jwtError) {
        // Optional auth'da JWT hatalarını ignore et
        // JWT errors are silently ignored in optional auth
      }
    }
    
    next();
  } catch (error) {
    // Optional auth'da hataları ignore et
    next();
  }
};

// ===== RATE LIMITING MIDDLEWARE =====
export const rateLimitByUser: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Bu middleware production'da Redis ile implement edilecek
  // Şimdilik basit bir memory-based rate limiting
  
  const userId = req.user?.userId;
  if (!userId) {
    next();
    return;
  }

  // Rate limiting logic burada implement edilecek
  // Şimdilik geçiyoruz
  next();
};

// ===== SECURITY HEADERS MIDDLEWARE =====
export const securityHeaders: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Security headers ekle
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CORS headers (production'da daha strict olacak)
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://rektefe.com' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Device-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  next();
};

// ===== REQUEST ID MIDDLEWARE =====
export const requestId: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

// ===== EXPORT ALL =====
export default {
  auth,
  requireRole,
  requireDriver,
  requireMechanic,
  optionalAuth,
  rateLimitByUser,
  securityHeaders,
  requestId
};
