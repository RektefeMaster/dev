/**
 * Background Token Refresh Service
 * Kullanıcı aktifken token'ı otomatik yenileme
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';
import { shouldRefreshToken, getTokenTimeToExpiry } from '@/shared/utils/tokenUtils';

export class BackgroundRefreshService {
  private static refreshInterval: ReturnType<typeof setInterval> | null = null;
  private static isActive = false;
  private static lastActivityTime = Date.now();
  private static readonly ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 dakika
  private static readonly REFRESH_CHECK_INTERVAL = 15 * 60 * 1000; // 15 dakika (optimize edildi)

  /**
   * Background refresh'i başlat
   */
  static start(refreshTokenCallback: () => Promise<string | null>) {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    if (__DEV__) {
      console.log('Background token refresh başlatıldı');
    }

    // Her 15 dakikada bir kontrol et (optimize edildi)
    this.refreshInterval = setInterval(async () => {
      try {
        await this.checkAndRefreshToken(refreshTokenCallback);
      } catch (error) {
        if (__DEV__) {
          console.error('Background refresh hatası:', error);
        }
      }
    }, this.REFRESH_CHECK_INTERVAL);
  }

  /**
   * Background refresh'i durdur
   */
  static stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.isActive = false;
    if (__DEV__) {
      console.log('Background token refresh durduruldu');
    }
  }

  /**
   * Kullanıcı aktivitesini kaydet
   */
  static recordActivity() {
    this.lastActivityTime = Date.now();
  }

  /**
   * Token'ı kontrol et ve gerekirse yenile
   */
  private static async checkAndRefreshToken(refreshTokenCallback: () => Promise<string | null>) {
    // Kullanıcı aktif mi kontrol et
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    if (timeSinceLastActivity > this.ACTIVITY_TIMEOUT) {
      if (__DEV__) {
        console.log('Kullanıcı aktif değil, token yenileme atlanıyor');
      }
      return;
    }

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        return;
      }

      // Token'ın yenilenmesi gerekiyor mu? (token expiry kontrolü)
      if (shouldRefreshToken(token)) {
        const newToken = await refreshTokenCallback();
        if (__DEV__ && newToken) {
          const timeToExpiry = getTokenTimeToExpiry(token);
          console.log(`Token yenilendi (${timeToExpiry} dakika sonra dolacaktı)`);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Background token kontrol hatası:', error);
      }
    }
  }

  /**
   * Kullanıcı aktif mi kontrol et
   */
  static isUserActive(): boolean {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    return timeSinceLastActivity <= this.ACTIVITY_TIMEOUT;
  }

  /**
   * Servis durumunu döndür
   */
  static getStatus(): {
    isActive: boolean;
    isUserActive: boolean;
    timeSinceLastActivity: number;
  } {
    return {
      isActive: this.isActive,
      isUserActive: this.isUserActive(),
      timeSinceLastActivity: Date.now() - this.lastActivityTime
    };
  }
}
