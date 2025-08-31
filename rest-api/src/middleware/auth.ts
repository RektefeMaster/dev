import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Yetkilendirme token\'ı bulunamadı' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; userType: string };
      // Sadece hata durumunda log
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.error('🔐 Auth middleware - Token verification failed:', jwtError);
      return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }
  } catch (error) {
    console.error('🔐 Auth middleware - General error:', error);
    res.status(401).json({ message: 'Yetkilendirme hatası' });
  }
}; 