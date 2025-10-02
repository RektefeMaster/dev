import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { TokenBlacklistService } from '../services/tokenBlacklist.service';

export const auth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
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
      req.user = decoded;
      next();
    } catch (jwtError) {
      res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
      return;
    }
  } catch (error) {
    res.status(401).json({ message: 'Yetkilendirme hatası' });
  }
}; 
