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
   * Bildirimi backend'e kaydet
   */
  private async saveNotificationToBackend(notificationData: any): Promise<void> {
    try {
      const response = await apiService.createNotification(notificationData);
      if (response.success) {
        console.log('✅ Bildirim backend\'e kaydedildi');
      } else {
        console.log('⚠️ Backend kayıt başarısız:', response.message);
      }
    } catch (error) {
      console.error('❌ Backend bildirim kayıt hatası:', error);
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
        console.error('Backend rating notification kayıt hatası:', error);
      }

      console.log('📅 Puanlama bildirimi planlandı:', triggerDate);
    } catch (error) {
      console.error('Puanlama bildirimi planlama hatası:', error);
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
          console.log('❌ Puanlama bildirimi iptal edildi:', appointmentId);
        }
      }
    } catch (error) {
      console.error('Puanlama bildirimi iptal hatası:', error);
    }
  }

  /**
   * Test için 1 saat geçmiş gibi puanlama bildirimi gönder
   */
  async sendTestRatingNotification(): Promise<void> {
    try {
      console.log('🔧 Test bildirimi hazırlanıyor...');
      
      // 1 saat önceki tarih oluştur
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      console.log('📅 Hizmet tamamlanma tarihi:', oneHourAgo.toLocaleString('tr-TR'));
      
      // İzin durumunu kontrol et
      const { status } = await Notifications.getPermissionsAsync();
      console.log('📱 Mevcut izin durumu:', status);
      
      if (status !== 'granted') {
        console.log('⚠️ Bildirim izni yok, izin isteniyor...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log('📱 Yeni izin durumu:', newStatus);
        
        if (newStatus !== 'granted') {
          console.log('❌ Bildirim izni verilmedi, test bildirimi gönderilemiyor');
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
        console.log('💾 Bildirim backend\'e kaydedildi');
      } catch (error) {
        console.error('❌ Backend kayıt hatası:', error);
      }

    } catch (error) {
      console.error('❌ Test puanlama bildirimi hatası:', error);
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
    
    // Puanlama bildirimi için özel işlem
    if (data?.type === 'rating_reminder') {
      console.log('⭐ Puanlama bildirimi tıklandı:', data);
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
