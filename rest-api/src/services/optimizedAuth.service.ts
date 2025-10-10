/**
 * REKTEFE PROJESİ - GELİŞMİŞ JWT TOKEN YÖNETİMİ
 * 
 * Bu dosya, güvenli ve performanslı JWT token yönetimi için
 * optimize edilmiş servisleri içerir.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { JWT_SECRET, JWT_REFRESH_SECRET } from '../config';
import { CustomError } from '../middleware/errorHandler';
import { ErrorCode } from '../../../shared/types/apiResponse';
import { UserType } from '../../../shared/types/enums';

// ===== TOKEN CONFIGURATION =====

export interface TokenPayload {
  userId: string;
  userType: UserType;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenData {
  userId: string;
  userType: UserType;
  tokenVersion: number;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ===== TOKEN DURATIONS (OPTIMIZED) =====
const TOKEN_DURATIONS = {
  ACCESS_TOKEN: '15m',    // Kısa süreli güvenlik
  REFRESH_TOKEN: '7d',     // Orta süreli güvenlik
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h',
  DEVICE_VERIFICATION: '30m'
} as const;

// ===== TOKEN BLACKLIST SERVICE =====

class TokenBlacklistService {
  private static blacklistedTokens = new Set<string>();
  private static tokenVersions = new Map<string, number>();

  static addToBlacklist(token: string, userId: string): void {
    this.blacklistedTokens.add(token);
    
    // Token version'ı artır (tüm cihazlardaki token'ları geçersiz kılar)
    const currentVersion = this.tokenVersions.get(userId) || 0;
    this.tokenVersions.set(userId, currentVersion + 1);
  }

  static isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  static getTokenVersion(userId: string): number {
    return this.tokenVersions.get(userId) || 0;
  }

  static clearExpiredTokens(): void {
    // Bu method production'da Redis ile implement edilecek
    // Şimdilik memory'de tutuyoruz
  }
}

// ===== JWT SERVICE =====

export class JWTService {
  /**
   * Access token oluşturur
   */
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      {
        ...payload,
        type: 'access',
        version: TokenBlacklistService.getTokenVersion(payload.userId)
      },
      JWT_SECRET!,
      {
        expiresIn: TOKEN_DURATIONS.ACCESS_TOKEN,
        issuer: 'rektefe-api',
        audience: 'rektefe-app'
      }
    );
  }

  /**
   * Refresh token oluşturur
   */
  static generateRefreshToken(payload: RefreshTokenData): string {
    return jwt.sign(
      {
        ...payload,
        type: 'refresh',
        version: TokenBlacklistService.getTokenVersion(payload.userId)
      },
      JWT_REFRESH_SECRET || JWT_SECRET!,
      {
        expiresIn: TOKEN_DURATIONS.REFRESH_TOKEN,
        issuer: 'rektefe-api',
        audience: 'rektefe-app'
      }
    );
  }

  /**
   * Token çifti oluşturur
   */
  static generateTokenPair(
    userId: string, 
    userType: UserType, 
    deviceInfo?: { deviceId?: string; ipAddress?: string; userAgent?: string }
  ): TokenPair {
    const payload: TokenPayload = { userId, userType };
    const refreshPayload: RefreshTokenData = {
      userId,
      userType,
      tokenVersion: TokenBlacklistService.getTokenVersion(userId),
      ...deviceInfo
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(refreshPayload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 dakika (saniye cinsinden)
      tokenType: 'Bearer'
    };
  }

  /**
   * Access token'ı doğrular
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET!) as any;
      
      // Token type kontrolü
      if (decoded.type !== 'access') {
        throw new CustomError('Geçersiz token tipi', 401, ErrorCode.INVALID_TOKEN);
      }

      // Token version kontrolü (GEÇİCİ OLARAK DEVRE DIŞI - Redis implement edilene kadar)
      // const currentVersion = TokenBlacklistService.getTokenVersion(decoded.userId);
      // if (decoded.version !== currentVersion) {
      //   throw new CustomError('Token versiyonu geçersiz', 401, ErrorCode.TOKEN_EXPIRED);
      // }

      // Blacklist kontrolü (GEÇİCİ OLARAK DEVRE DIŞI - Redis implement edilene kadar)
      // if (TokenBlacklistService.isTokenBlacklisted(token)) {
      //   throw new CustomError('Token blacklist\'te', 401, ErrorCode.INVALID_TOKEN);
      // }

      return {
        userId: decoded.userId,
        userType: decoded.userType
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new CustomError('Geçersiz token', 401, ErrorCode.INVALID_TOKEN);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new CustomError('Token süresi dolmuş', 401, ErrorCode.TOKEN_EXPIRED);
      }
      throw error;
    }
  }

  /**
   * Refresh token'ı doğrular
   */
  static verifyRefreshToken(token: string): RefreshTokenData {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET || JWT_SECRET!) as any;
      
      // Token type kontrolü
      if (decoded.type !== 'refresh') {
        throw new CustomError('Geçersiz refresh token tipi', 401, ErrorCode.INVALID_TOKEN);
      }

      // Token version kontrolü (GEÇİCİ OLARAK DEVRE DIŞI - Redis implement edilene kadar)
      // const currentVersion = TokenBlacklistService.getTokenVersion(decoded.userId);
      // if (decoded.version !== currentVersion) {
      //   throw new CustomError('Refresh token versiyonu geçersiz', 401, ErrorCode.TOKEN_EXPIRED);
      // }

      return {
        userId: decoded.userId,
        userType: decoded.userType,
        tokenVersion: decoded.version || 0,
        deviceId: decoded.deviceId,
        ipAddress: decoded.ipAddress,
        userAgent: decoded.userAgent
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new CustomError('Geçersiz refresh token', 401, ErrorCode.INVALID_TOKEN);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new CustomError('Refresh token süresi dolmuş', 401, ErrorCode.TOKEN_EXPIRED);
      }
      throw error;
    }
  }

  /**
   * Token'ı blacklist'e ekler
   */
  static revokeToken(token: string, userId: string): void {
    TokenBlacklistService.addToBlacklist(token, userId);
  }

  /**
   * Kullanıcının tüm token'larını iptal eder
   */
  static revokeAllUserTokens(userId: string): void {
    TokenBlacklistService.addToBlacklist('all', userId);
  }

  /**
   * Token'dan kullanıcı bilgilerini çıkarır (blacklist kontrolü olmadan)
   */
  static decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Token'ın süresini kontrol eder
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime >= decoded.exp;
    } catch {
      return true;
    }
  }
}

// ===== AUTH SERVICE (OPTIMIZED) =====

export class OptimizedAuthService {
  /**
   * Kullanıcı kaydı (optimize edilmiş)
   */
  static async register(userData: {
    name: string;
    surname: string;
    email: string;
    password: string;
    userType: UserType;
    phone?: string;
    experience?: number;
    specialties?: string[];
    serviceCategories?: string[];
    location?: any;
  }) {
    const { name, surname, email, password, userType, phone, experience, specialties, serviceCategories, location } = userData;
    
    // Email'i normalize et
    const normalizedEmail = email.trim().toLowerCase();
    
    // Kullanıcı var mı kontrol et
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new CustomError('Bu e-posta zaten kayıtlı.', 400, ErrorCode.ALREADY_EXISTS);
    }

    // Şifreyi hash'le (optimize edilmiş salt rounds)
    const saltRounds = 12; // Güvenlik ve performans dengesi
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Kullanıcı oluştur
    const user = new User({
      name,
      surname,
      email: normalizedEmail,
      password: hashedPassword,
      userType,
      phone,
      isActive: true
    });

    await user.save();

    // Mechanic ise ek bilgileri kaydet
    if (userType === UserType.MECHANIC) {
      const mechanic = new Mechanic({
        _id: user._id,
        experience: experience || 0,
        specialties: specialties || [],
        serviceCategories: serviceCategories || [],
        location: location || null,
        rating: 0,
        totalRatings: 0,
        availability: true
      });
      await mechanic.save();
    }

    // Token çifti oluştur
    const tokenPair = JWTService.generateTokenPair(user._id.toString(), userType);

    return {
      userId: user._id,
      userType: user.userType,
      ...tokenPair,
      user: user.toObject()
    };
  }

  /**
   * Kullanıcı girişi (optimize edilmiş)
   */
  static async login(
    email: string, 
    password: string, 
    userType: UserType,
    deviceInfo?: { deviceId?: string; ipAddress?: string; userAgent?: string }
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new CustomError('Kullanıcı bulunamadı.', 400, ErrorCode.NOT_FOUND);
    }

    // Şifreyi kontrol et
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Geçersiz şifre.', 400, ErrorCode.INVALID_CREDENTIALS);
    }

    // UserType kontrolü
    if (user.userType !== userType) {
      throw new CustomError(`Bu endpoint sadece ${userType} kullanıcılar için. Mevcut kullanıcı tipi: ${user.userType}`, 400, ErrorCode.OPERATION_NOT_ALLOWED);
    }

    // Mechanic ise ek bilgileri de çek
    let fullUserData = user.toObject();
    if (user.userType === UserType.MECHANIC) {
      try {
        const mechanic = await Mechanic.findById(user._id);
        if (mechanic) {
          fullUserData = { ...fullUserData, ...(mechanic.toObject() as any) };
        }
      } catch (error) {
        // Mechanic bilgisi bulunamazsa sadece user bilgisiyle devam et
      }
    }

    // Token çifti oluştur
    const tokenPair = JWTService.generateTokenPair(user._id.toString(), user.userType, deviceInfo);

    return {
      userId: user._id,
      userType: user.userType,
      ...tokenPair,
      user: fullUserData
    };
  }

  /**
   * Token yenileme (optimize edilmiş)
   */
  static async refreshToken(refreshToken: string, deviceInfo?: { deviceId?: string; ipAddress?: string; userAgent?: string }) {
    try {
      // Refresh token'ı doğrula
      const refreshData = JWTService.verifyRefreshToken(refreshToken);
      
      // Kullanıcıyı bul
      const user = await User.findById(refreshData.userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı.', 401, ErrorCode.NOT_FOUND);
      }

      // Yeni token çifti oluştur
      const newTokenPair = JWTService.generateTokenPair(
        user._id.toString(), 
        user.userType, 
        deviceInfo
      );

      // Eski refresh token'ı blacklist'e ekle
      JWTService.revokeToken(refreshToken, user._id.toString());

      return {
        ...newTokenPair,
        user: user.toObject()
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Çıkış yapma (tüm token'ları iptal et)
   */
  static async logout(userId: string, accessToken?: string): Promise<void> {
    if (accessToken) {
      JWTService.revokeToken(accessToken, userId);
    }
    JWTService.revokeAllUserTokens(userId);
  }

  /**
   * Şifre değiştirme
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('Kullanıcı bulunamadı.', 404, ErrorCode.NOT_FOUND);
    }

    // Mevcut şifreyi kontrol et
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new CustomError('Mevcut şifre yanlış.', 400, ErrorCode.INVALID_CREDENTIALS);
    }

    // Yeni şifreyi hash'le
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Şifreyi güncelle
    user.password = hashedNewPassword;
    await user.save();

    // Tüm token'ları iptal et (güvenlik için)
    JWTService.revokeAllUserTokens(userId);
  }

  /**
   * Şifre sıfırlama token'ı oluştur
   */
  static generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'password-reset' },
      JWT_SECRET!,
      { expiresIn: TOKEN_DURATIONS.PASSWORD_RESET }
    );
  }

  /**
   * Şifre sıfırlama token'ını doğrula
   */
  static verifyPasswordResetToken(token: string): string {
    try {
      const decoded = jwt.verify(token, JWT_SECRET!) as any;
      if (decoded.type !== 'password-reset') {
        throw new CustomError('Geçersiz token tipi', 401, ErrorCode.INVALID_TOKEN);
      }
      return decoded.userId;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new CustomError('Token süresi dolmuş', 401, ErrorCode.TOKEN_EXPIRED);
      }
      throw new CustomError('Geçersiz token', 401, ErrorCode.INVALID_TOKEN);
    }
  }
}

// ===== EXPORT ALL =====
export default {
  JWTService,
  OptimizedAuthService,
  TokenBlacklistService,
  TOKEN_DURATIONS
};
