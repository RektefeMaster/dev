import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

export class AuthController {
  // Kullanıcı kaydı
  static register = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);
    
    return ResponseHandler.created(res, result, 'Kayıt başarılı!');
  });

  // Kullanıcı girişi
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, userType } = req.body;
    
    const result = await AuthService.login(email, password, userType);
    
    return ResponseHandler.success(res, result, 'Giriş başarılı!');
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
    
    const result = await AuthService.refreshToken(refreshToken);
    
    console.log('✅ Refresh token başarılı, yeni token preview:', result.token.substring(0, 20) + '...');
    
    return ResponseHandler.success(res, result, 'Token yenilendi');
  });

  // Çıkış yapma
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı');
    }
    
    const result = await AuthService.logout(userId, token);
    
    return ResponseHandler.success(res, result, 'Çıkış başarılı');
  });
}
