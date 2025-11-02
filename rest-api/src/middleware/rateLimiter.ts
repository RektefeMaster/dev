/**
 * REKTEFE PROJESİ - RATE LIMITING MIDDLEWARE
 * 
 * Bu dosya, API endpoint'lerine rate limiting uygular.
 * Brute force saldırılarını ve abuse'i önler.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Genel API rate limiter
 * 15 dakikada 500 request (normal mobil uygulama kullanımı için yeterli)
 * Önceki limit (100) çok düşüktü ve normal kullanımda aşılıyordu
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 500, // 500 request per window (5x artırıldı)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.',
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false,
  // Key generator (IP based)
  keyGenerator: (req: Request) => {
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  },
});

/**
 * Auth endpoint'leri için strict rate limiter
 * 15 dakikada 5 request (brute force önleme)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 5 login/register denemesi
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla giriş denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Başarılı girişleri sayma
  keyGenerator: (req: Request) => {
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  },
});

/**
 * Strict rate limiter (hassas işlemler için)
 * 15 dakikada 10 request
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Bu işlem için çok fazla istek gönderdiniz.',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload işlemleri için limiter
 * 1 saatte 20 upload
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 20,
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla dosya yükleme isteği. Lütfen daha sonra tekrar deneyin.',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Message endpoint'leri için limiter
 * 1 dakikada 30 mesaj (spam önleme)
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30,
  message: {
    success: false,
    error: {
      code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
      message: 'Çok hızlı mesaj gönderiyorsunuz. Lütfen yavaşlayın.',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Development mode'da rate limiting'i devre dışı bırakmak için
 */
export const createLimiter = (options: any) => {
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true') {
    return (req: Request, res: Response, next: any) => next();
  }
  return rateLimit(options);
};

export default {
  apiLimiter,
  authLimiter,
  strictLimiter,
  uploadLimiter,
  messageLimiter,
  createLimiter,
};

