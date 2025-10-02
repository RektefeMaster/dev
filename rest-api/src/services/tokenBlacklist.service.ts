/**
 * Token Blacklist Service
 * Redis ile token blacklist yönetimi
 */

import { CacheManager } from '../config/cache';

export class TokenBlacklistService {
  private static readonly BLACKLIST_PREFIX = 'blacklist:token:';
  private static readonly USER_TOKENS_PREFIX = 'user:tokens:';

  /**
   * Token'ı blacklist'e ekler
   */
  static async addToBlacklist(token: string, userId: string, expiresIn: number = 3600): Promise<void> {
    try {
      const tokenKey = `${this.BLACKLIST_PREFIX}${token}`;
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      
      // Token'ı blacklist'e ekle
      await CacheManager.set(tokenKey, {
        userId,
        blacklistedAt: new Date().toISOString(),
        reason: 'logout'
      }, { ttl: expiresIn });
      
      // Kullanıcının aktif token'larını da takip et
      const userTokens = await CacheManager.get<string[]>(userTokensKey) || [];
      userTokens.push(token);
      await CacheManager.set(userTokensKey, userTokens, { ttl: expiresIn });
      
      console.log(`✅ Token blacklist'e eklendi: ${userId}`);
    } catch (error) {
      console.error('❌ Token blacklist hatası:', error);
    }
  }

  /**
   * Token'ın blacklist'te olup olmadığını kontrol eder
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenKey = `${this.BLACKLIST_PREFIX}${token}`;
      const blacklistData = await CacheManager.get(tokenKey);
      return !!blacklistData;
    } catch (error) {
      console.error('❌ Token blacklist kontrol hatası:', error);
      return false;
    }
  }

  /**
   * Kullanıcının tüm token'larını blacklist'e ekler (logout all devices)
   */
  static async blacklistAllUserTokens(userId: string): Promise<void> {
    try {
      const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
      const userTokens = await CacheManager.get<string[]>(userTokensKey) || [];
      
      // Tüm token'ları blacklist'e ekle
      for (const token of userTokens) {
        await this.addToBlacklist(token, userId, 3600);
      }
      
      // Kullanıcı token listesini temizle
      await CacheManager.del(userTokensKey);
      
      console.log(`✅ Kullanıcının tüm token'ları blacklist'e eklendi: ${userId}`);
    } catch (error) {
      console.error('❌ Kullanıcı token blacklist hatası:', error);
    }
  }

  /**
   * Token'ı blacklist'ten kaldırır (nadiren kullanılır)
   */
  static async removeFromBlacklist(token: string): Promise<void> {
    try {
      const tokenKey = `${this.BLACKLIST_PREFIX}${token}`;
      await CacheManager.del(tokenKey);
      console.log(`✅ Token blacklist'ten kaldırıldı`);
    } catch (error) {
      console.error('❌ Token blacklist kaldırma hatası:', error);
    }
  }

  /**
   * Blacklist istatistiklerini döndürür
   */
  static async getBlacklistStats(): Promise<{
    totalBlacklistedTokens: number;
    recentBlacklists: number;
  }> {
    try {
      // Bu fonksiyon Redis'in SCAN komutu ile implement edilebilir
      // Şimdilik basit bir response döndürüyoruz
      return {
        totalBlacklistedTokens: 0,
        recentBlacklists: 0
      };
    } catch (error) {
      console.error('❌ Blacklist stats hatası:', error);
      return {
        totalBlacklistedTokens: 0,
        recentBlacklists: 0
      };
    }
  }
}
