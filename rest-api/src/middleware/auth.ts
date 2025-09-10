import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

export const auth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('🔐 Auth middleware - Request:', {
      url: req.url,
      method: req.method,
      authHeader: authHeader ? 'Mevcut' : 'Yok',
      token: token ? 'Mevcut' : 'Yok'
    });
    
    if (!token) {
      console.log('❌ Auth middleware - Token bulunamadı');
      res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; userType: 'driver' | 'mechanic' };
      console.log('✅ Auth middleware - Token doğrulandı:', { userId: decoded.userId, userType: decoded.userType });
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('🔐 Auth middleware - Token verification failed:', jwtError);
      res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
      return;
    }
  } catch (error) {
    console.error('🔐 Auth middleware - General error:', error);
    res.status(401).json({ message: 'Yetkilendirme hatası' });
  }
}; 
