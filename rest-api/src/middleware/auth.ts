import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { TokenBlacklistService } from '../services/tokenBlacklist.service';

export const auth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('🔍 Auth Middleware Debug:');
    console.log('authHeader:', authHeader);
    console.log('token preview:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('URL:', req.url);
    
    if (!token) {
      console.log('❌ Auth Middleware: Token bulunamadı');
      res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı' });
      return;
    }

    // Token'ın blacklist'te olup olmadığını kontrol et
    const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({ message: 'Token geçersiz (blacklist)' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; userType: 'driver' | 'mechanic' };
      console.log('✅ Auth Middleware: Token geçerli');
      console.log('decoded user:', decoded);
      console.log('decoded userId:', decoded.userId);
      console.log('decoded userType:', decoded.userType);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.log('❌ Auth Middleware: JWT hatası:', jwtError);
      res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
      return;
    }
  } catch (error) {
    res.status(401).json({ message: 'Yetkilendirme hatası' });
  }
}; 
