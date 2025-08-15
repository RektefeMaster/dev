import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';

export class AuthController {
  // Kullanıcı kaydı
  static register = asyncHandler(async (req: Request, res: Response) => {
    console.log('Kayıt isteği alındı:', JSON.stringify(req.body, null, 2));
    
    const result = await AuthService.register(req.body);
    
    console.log('Kayıt başarılı:', { 
      name: req.body.name, 
      surname: req.body.surname, 
      email: req.body.email, 
      userType: req.body.userType, 
      userId: result.userId 
    });
    
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
    
    if (!refreshToken) {
      return ResponseHandler.badRequest(res, 'Refresh token gerekli');
    }
    
    const result = await AuthService.refreshToken(refreshToken);
    
    return ResponseHandler.success(res, result, 'Token yenilendi');
  });

  // Çıkış yapma
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı');
    }
    
    const result = await AuthService.logout(userId);
    
    return ResponseHandler.success(res, result, 'Çıkış başarılı');
  });
}
