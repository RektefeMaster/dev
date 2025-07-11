import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { AuthRequest } from '../types/express';

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Auth Middleware - Gelen token:', token);
    
    if (!token) {
      console.log('Auth Middleware - Token bulunamadı');
      return res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; userType: string };
      console.log('Auth Middleware - Token doğrulandı:', decoded);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('Auth Middleware - Token doğrulama hatası:', jwtError);
      return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }
  } catch (error) {
    console.error('Auth Middleware - Genel hata:', error);
    res.status(401).json({ message: 'Yetkilendirme hatası' });
  }
}; 