/**
 * REKTEFE PROJESİ - PRODUCTION-SAFE LOGGER
 * 
 * Bu dosya, production'da console.log kullanımını engeller
 * ve Winston logger'ı kullanır.
 */

import { logger as winstonLogger } from './monitoring';

/**
 * Production-safe logger wrapper
 * Development'ta console.log, production'da Winston kullanır
 */
class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static log(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    } else {
      winstonLogger.info(args.join(' '));
    }
  }

  static error(...args: any[]): void {
    if (this.isDevelopment) {
      console.error(...args);
    } else {
      winstonLogger.error(args.join(' '));
    }
  }

  static warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    } else {
      winstonLogger.warn(args.join(' '));
    }
  }

  static info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info(...args);
    } else {
      winstonLogger.info(args.join(' '));
    }
  }

  static debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    } else {
      winstonLogger.debug(args.join(' '));
    }
  }

  /**
   * Development-only logging
   * Bu log'lar production'da hiç çalışmaz
   */
  static devOnly(...args: any[]): void {
    if (this.isDevelopment) {
      console.log('[DEV]', ...args);
    }
  }
}

export default Logger;

