import { Request, Response, NextFunction } from 'express';
import { OptimizedAuthService, JWTService } from '../services/optimizedAuth.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

export class AuthController {
  // Kullanıcı kaydı
  static register = asyncHandler(async (req: Request, res: Response) => {
    const result = await OptimizedAuthService.register(req.body);
    
    return ResponseHandler.created(res, {
      userId: result.userId,
      userType: result.userType,
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    }, 'Kayıt başarılı!');
  });

  // Kullanıcı girişi
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, userType } = req.body;
    
    const deviceInfo = {
      deviceId: req.headers['x-device-id'] as string,
      ipAddress: req.ip || req.connection.remoteAddress as string,
      userAgent: req.headers['user-agent']
    };
    
    const result = await OptimizedAuthService.login(email, password, userType, deviceInfo);
    
    return ResponseHandler.success(res, {
      userId: result.userId,
      userType: result.userType,
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    }, 'Giriş başarılı!');
  });

  // Token yenileme
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    console.log('🔍 AuthController.refreshToken Debug:');
    console.log('refreshToken exists:', !!refreshToken);
    console.log('refreshToken preview:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'null');
    
    if (!refreshToken) {
      console.log('❌ Refresh token bulunamadı');
      return ResponseHandler.badRequest(res, 'Refresh token gerekli');
    }
    
    const result = await OptimizedAuthService.refreshToken(refreshToken);
    
    console.log('✅ Refresh token başarılı, yeni token preview:', result.accessToken.substring(0, 20) + '...');
    
    return ResponseHandler.success(res, {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    }, 'Token yenilendi');
  });

  // Çıkış yapma
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı');
    }
    
    if (token) {
      JWTService.revokeToken(token, userId);
    }
    
    return ResponseHandler.success(res, { message: 'Başarıyla çıkış yapıldı' }, 'Çıkış başarılı');
  });
}
