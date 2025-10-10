/**
 * REKTEFE PROJESİ - REQUEST TIMEOUT MIDDLEWARE
 * 
 * Uzun süren request'leri timeout ile sonlandırır.
 * Hanging request'leri önler ve daha iyi UX sağlar.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import Logger from '../utils/logger';

/**
 * Request timeout middleware
 * 
 * @param timeoutMs - Timeout süresi (ms), default 30000 (30 saniye)
 * @returns Express middleware
 */
export const requestTimeout = (timeoutMs: number = 30000): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Timeout timer başlat
    const timeout = setTimeout(() => {
      // Eğer response henüz gönderilmediyse timeout error gönder
      if (!res.headersSent) {
        Logger.warn(`⏱️ Request timeout: ${req.method} ${req.path} (${timeoutMs}ms)`);
        
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
            timeout: timeoutMs
          },
          metadata: {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path
          }
        });
      }
    }, timeoutMs);

    // Response gönderildiğinde timeout'u temizle
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    // Response kapatıldığında timeout'u temizle
    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Specific endpoint'ler için farklı timeout'lar
 */
export const timeouts = {
  short: requestTimeout(10000),    // 10 saniye - basit query'ler
  medium: requestTimeout(30000),   // 30 saniye - normal endpoint'ler (default)
  long: requestTimeout(60000),     // 60 saniye - heavy query'ler
  upload: requestTimeout(120000),  // 2 dakika - file upload'lar
};

export default requestTimeout;

