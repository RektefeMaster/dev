import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiService from '@/shared/services/api';

// Bildirim davranışını yapılandır
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  }

export interface NotificationSettings {
  pushNotifications: boolean;
  appointmentNotifications: boolean;
  paymentNotifications: boolean;
  messageNotifications: boolean;
  systemNotifications: boolean;
  marketingNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Push notification izinlerini iste ve token al
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      // Mevcut izinleri kontrol et
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // İzin yoksa iste
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Expo push token al - yeni API
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        this.expoPushToken = token.data;
        // Token'ı backend'e gönder
        await this.sendTokenToBackend(this.expoPushToken);

        return this.expoPushToken;
      } catch (tokenError) {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Token'ı backend'e gönder
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      await apiService.updatePushToken(token);
      } catch (error) {
      }
  }

  /**
   * Bildirim dinleyicilerini başlat
   */
  startListening(): void {
    // Uygulama açıkken gelen bildirimler
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      this.handleNotificationReceived(notification);
    });

    // Bildirime tıklanma
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Bildirim dinleyicilerini durdur
   */
  stopListening(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  /**
   * Gelen bildirimi işle
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    // Bildirim geldiğinde yapılacak işlemler
    // Örneğin: Badge sayısını güncelle, ses çal, vb.
    }

  /**
   * Bildirime tıklanma işlemi
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    
    if (data?.type) {
      // Bildirim türüne göre yönlendirme yap
      this.navigateBasedOnNotificationType(data);
    }
  }

  /**
   * Bildirim türüne göre yönlendirme
   */
  private navigateBasedOnNotificationType(data: any): void {
    // Bu fonksiyon navigation context'i gerektirir
    // Navigation service ile entegre edilecek
    }

  /**
   * Yerel bildirim gönder
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: trigger || null,
      });

      return notificationId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Planlanmış bildirimi iptal et
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (error) {
      }
  }

  /**
   * Tüm planlanmış bildirimleri iptal et
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (error) {
      }
  }

  /**
   * Badge sayısını güncelle
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      } catch (error) {
      }
  }

  /**
   * Badge sayısını temizle
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      } catch (error) {
      }
  }

  /**
   * Bildirim ayarlarını al
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      // AsyncStorage'dan ayarları al
      const settings = await apiService.getNotificationSettings();
      return settings.data || this.getDefaultSettings();
    } catch (error) {
      return this.getDefaultSettings();
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      await apiService.updateNotificationSettings(settings);
      } catch (error) {
      throw error;
    }
  }

  /**
   * Varsayılan ayarlar
   */
  private getDefaultSettings(): NotificationSettings {
    return {
      pushNotifications: true,
      appointmentNotifications: true,
      paymentNotifications: true,
      messageNotifications: true,
      systemNotifications: true,
      marketingNotifications: false,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }

  /**
   * Test bildirimi gönder
   */
  async sendTestNotification(): Promise<void> {
    try {
      await this.scheduleLocalNotification(
        'Test Bildirimi',
        'Bu bir test bildirimidir. Bildirim sistemi çalışıyor!',
        { type: 'test' }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Expo push token'ı al
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default NotificationService.getInstance();
