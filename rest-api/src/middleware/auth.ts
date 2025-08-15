import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
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