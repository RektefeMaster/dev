import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiService } from '@/shared/services/api';

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
   * Bildirimi backend'e kaydet
   */
  private async saveNotificationToBackend(notificationData: any): Promise<void> {
    try {
      const response = await apiService.createNotification(notificationData);
      if (response.success) {
        } else {
        }
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
   * 1 saat sonra puanlama bildirimi planla
   */
  async scheduleRatingNotification(
    appointmentId: string,
    mechanicName: string,
    serviceType: string,
    appointmentDate: string
  ): Promise<void> {
    try {
      // 1 saat sonra bildirim gönder
      const triggerDate = new Date();
      triggerDate.setHours(triggerDate.getHours() + 1);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Değerlendirme Zamanı!',
          body: `${mechanicName} ile ${serviceType} hizmeti tamamlandı. Deneyiminizi değerlendirin!`,
          data: {
            type: 'rating_reminder',
            appointmentId: appointmentId,
            mechanicName: mechanicName,
            serviceType: serviceType,
            appointmentDate: appointmentDate
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: triggerDate,
        },
      });

      // Backend'e de kaydet (1 saat sonra gönderilecek)
      try {
        await this.saveNotificationToBackend({
          title: 'Değerlendirme Zamanı!',
          message: `${mechanicName} ile ${serviceType} hizmeti tamamlandı. Deneyiminizi değerlendirin!`,
          type: 'rating_reminder',
          data: {
            appointmentId: appointmentId,
            mechanicName: mechanicName,
            serviceType: serviceType,
            appointmentDate: appointmentDate
          },
          scheduledFor: triggerDate.toISOString()
        });
      } catch (error) {
        }

      } catch (error) {
      }
  }

  /**
   * Puanlama bildirimi iptal et
   */
  async cancelRatingNotification(appointmentId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.appointmentId === appointmentId && 
            notification.content.data?.type === 'rating_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
      }
    } catch (error) {
      }
  }

  /**
   * Test için 1 saat geçmiş gibi puanlama bildirimi gönder
   */
  async sendTestRatingNotification(): Promise<void> {
    try {
      // 1 saat önceki tarih oluştur
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      // İzin durumunu kontrol et
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          return;
        }
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Değerlendirme Zamanı!',
          body: 'Test Usta ile Motor Yağı Değişimi hizmeti tamamlandı. Deneyiminizi değerlendirin!',
          data: {
            type: 'rating_reminder',
            appointmentId: 'real-appointment-123',
            mechanicId: 'real-mechanic-123',
            mechanicName: 'Test Usta',
            serviceType: 'Motor Yağı Değişimi',
            appointmentDate: oneHourAgo.toISOString()
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Anında gönder
      });

      // Backend'e bildirim kaydet
      try {
        await this.saveNotificationToBackend({
          title: 'Değerlendirme Zamanı!',
          message: 'Test Usta ile Motor Yağı Değişimi hizmeti tamamlandı. Deneyiminizi değerlendirin!',
          type: 'rating_reminder',
          data: {
            appointmentId: 'real-appointment-123',
            mechanicId: 'real-mechanic-123',
            mechanicName: 'Test Usta',
            serviceType: 'Motor Yağı Değişimi',
            appointmentDate: oneHourAgo.toISOString()
          }
        });
        } catch (error) {
        }

    } catch (error) {
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
    // Puanlama bildirimi için özel işlem
    if (data?.type === 'rating_reminder') {
      // Navigation service ile Rating ekranına yönlendirilecek
    }
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
