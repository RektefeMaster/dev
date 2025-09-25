import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { JWT_SECRET } from '../config';

export interface TokenValidationResult {
  isValid: boolean;
  userId?: string;
  userType?: string;
  error?: string;
}

export class TokenValidationService {
  /**
   * JWT token'ı doğrular ve kullanıcı bilgilerini döndürür
   */
  static async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Token formatını kontrol et
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return {
          isValid: false,
          error: 'Token boş veya geçersiz format'
        };
      }

      // JWT token'ı decode et
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (!decoded || !decoded.userId) {
        return {
          isValid: false,
          error: 'Token içeriği geçersiz'
        };
      }

      const { userId, userType } = decoded;

      // Kullanıcının veritabanında var olup olmadığını kontrol et
      // Artık tüm kullanıcılar User model'inde
      const user = await User.findById(userId);

      if (!user) {
        return {
          isValid: false,
          error: 'Kullanıcı bulunamadı'
        };
      }

      return {
        isValid: true,
        userId,
        userType
      };

    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return {
          isValid: false,
          error: 'Geçersiz token formatı'
        };
      } else if (error.name === 'TokenExpiredError') {
        return {
          isValid: false,
          error: 'Token süresi dolmuş'
        };
      } else {
        return {
          isValid: false,
          error: 'Token doğrulama hatası'
        };
      }
    }
  }

  /**
   * Token'ı sadece format olarak kontrol eder (veritabanı sorgusu yapmaz)
   */
  static validateTokenFormat(token: string): TokenValidationResult {
    try {
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return {
          isValid: false,
          error: 'Token boş veya geçersiz format'
        };
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (!decoded || !decoded.userId) {
        return {
          isValid: false,
          error: 'Token içeriği geçersiz'
        };
      }

      return {
        isValid: true,
        userId: decoded.userId,
        userType: decoded.userType
      };

    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return {
          isValid: false,
          error: 'Geçersiz token formatı'
        };
      } else if (error.name === 'TokenExpiredError') {
        return {
          isValid: false,
          error: 'Token süresi dolmuş'
        };
      } else {
        return {
          isValid: false,
          error: 'Token doğrulama hatası'
        };
      }
    }
  }
}
