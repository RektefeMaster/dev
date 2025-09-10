import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiService } from './api';

// Bildirim davranışını yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
        console.log('Push notifications sadece fiziksel cihazlarda çalışır');
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
        console.log('Push notification izni verilmedi');
        return null;
      }

      // Expo push token al - yeni API
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        this.expoPushToken = token.data;
        console.log('Expo Push Token:', this.expoPushToken);

        // Token'ı backend'e gönder
        await this.sendTokenToBackend(this.expoPushToken);

        return this.expoPushToken;
      } catch (tokenError) {
        console.warn('Expo push token alınamadı, dev modunda çalışıyor olabilir:', tokenError);
        return null;
      }
    } catch (error) {
      console.error('Push notification kaydı hatası:', error);
      return null;
    }
  }

  /**
   * Token'ı backend'e gönder
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      await apiService.updatePushToken(token);
      console.log('Push token backend\'e gönderildi');
    } catch (error) {
      console.error('Push token gönderme hatası:', error);
    }
  }

  /**
   * Bildirim dinleyicilerini başlat
   */
  startListening(): void {
    // Uygulama açıkken gelen bildirimler
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Bildirim alındı:', notification);
      this.handleNotificationReceived(notification);
    });

    // Bildirime tıklanma
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Bildirime tıklandı:', response);
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
    console.log('Bildirim işlendi:', notification.request.content);
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
    console.log('Bildirim türüne göre yönlendirme:', data);
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

      console.log('Yerel bildirim planlandı:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Yerel bildirim hatası:', error);
      throw error;
    }
  }

  /**
   * Planlanmış bildirimi iptal et
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Bildirim iptal edildi:', notificationId);
    } catch (error) {
      console.error('Bildirim iptal hatası:', error);
    }
  }

  /**
   * Tüm planlanmış bildirimleri iptal et
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Tüm bildirimler iptal edildi');
    } catch (error) {
      console.error('Tüm bildirimleri iptal hatası:', error);
    }
  }

  /**
   * Badge sayısını güncelle
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('Badge sayısı güncellendi:', count);
    } catch (error) {
      console.error('Badge güncelleme hatası:', error);
    }
  }

  /**
   * Badge sayısını temizle
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('Badge temizlendi');
    } catch (error) {
      console.error('Badge temizleme hatası:', error);
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
      console.error('Bildirim ayarları alınamadı:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      await apiService.updateNotificationSettings(settings);
      console.log('Bildirim ayarları güncellendi');
    } catch (error) {
      console.error('Bildirim ayarları güncellenemedi:', error);
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
      console.error('Test bildirimi hatası:', error);
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
