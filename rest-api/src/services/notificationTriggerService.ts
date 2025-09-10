import { User } from '../models/User';
import Notification from '../models/Notification';
import { sendPushNotification } from './pushNotificationService';

export interface NotificationData {
  recipientId: string;
  recipientType: 'mechanic' | 'driver';
  type: string;
  title: string;
  message: string;
  data?: any;
}

export class NotificationTriggerService {
  /**
   * Bildirim oluştur ve gönder
   */
  static async createAndSendNotification(notificationData: NotificationData): Promise<void> {
    try {
      // Kullanıcıyı bul
      const user = await User.findById(notificationData.recipientId);
      if (!user) {
        console.error('Kullanıcı bulunamadı:', notificationData.recipientId);
        return;
      }

      // Bildirim ayarlarını kontrol et
      const settings = user.notificationSettings;
      if (!this.shouldSendNotification(notificationData.type, settings)) {
        console.log('Bildirim ayarları nedeniyle gönderilmedi:', notificationData.type);
        return;
      }

      // Veritabanına bildirim kaydet
      const notification = new Notification({
        recipientId: notificationData.recipientId,
        recipientType: notificationData.recipientType,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        isRead: false
      });

      await notification.save();
      console.log('Bildirim veritabanına kaydedildi:', notification._id);

      // Push notification gönder
      if (user.pushToken && settings?.push) {
        try {
          await sendPushNotification(user.pushToken, {
            title: notificationData.title,
            body: notificationData.message,
            data: {
              type: notificationData.type,
              notificationId: (notification._id as any).toString(),
              ...notificationData.data
            }
          });
          console.log('Push notification gönderildi:', user.pushToken);
        } catch (pushError) {
          console.error('Push notification gönderme hatası:', pushError);
          // Push hatası bildirimi engellemez
        }
      }

    } catch (error) {
      console.error('Bildirim oluşturma hatası:', error);
      throw error;
    }
  }

  /**
   * Bildirim gönderilip gönderilmeyeceğini kontrol et
   */
  private static shouldSendNotification(type: string, settings: any): boolean {
    if (!settings?.pushNotifications) return false;

    switch (type) {
      case 'appointment_request':
      case 'appointment_confirmed':
      case 'appointment_cancelled':
        return settings.appointmentNotifications;
      
      case 'payment_received':
      case 'payment_pending':
        return settings.paymentNotifications;
      
      case 'new_message':
        return settings.messageNotifications;
      
      case 'system':
      case 'update':
        return settings.systemNotifications;
      
      case 'promotion':
        return settings.marketingNotifications;
      
      default:
        return true;
    }
  }

  /**
   * Randevu talebi bildirimi
   */
  static async sendAppointmentRequestNotification(
    mechanicId: string,
    driverName: string,
    serviceType: string,
    appointmentDate: string,
    appointmentTime: string
  ): Promise<void> {
    await this.createAndSendNotification({
      recipientId: mechanicId,
      recipientType: 'mechanic',
      type: 'appointment_request',
      title: 'Yeni Randevu Talebi',
      message: `${driverName} sizden ${serviceType} hizmeti için randevu talep etti. Tarih: ${appointmentDate} ${appointmentTime}`,
      data: {
        driverName,
        serviceType,
        appointmentDate,
        appointmentTime
      }
    });
  }

  /**
   * Randevu onay bildirimi
   */
  static async sendAppointmentConfirmedNotification(
    driverId: string,
    mechanicName: string,
    serviceType: string,
    appointmentDate: string,
    appointmentTime: string
  ): Promise<void> {
    await this.createAndSendNotification({
      recipientId: driverId,
      recipientType: 'driver',
      type: 'appointment_confirmed',
      title: 'Randevunuz Onaylandı',
      message: `${mechanicName} usta randevunuzu onayladı. ${serviceType} hizmeti için ${appointmentDate} ${appointmentTime}`,
      data: {
        mechanicName,
        serviceType,
        appointmentDate,
        appointmentTime
      }
    });
  }

  /**
   * Ödeme alındı bildirimi
   */
  static async sendPaymentReceivedNotification(
    mechanicId: string,
    driverName: string,
    amount: number,
    serviceType: string
  ): Promise<void> {
    await this.createAndSendNotification({
      recipientId: mechanicId,
      recipientType: 'mechanic',
      type: 'payment_received',
      title: 'Ödeme Alındı',
      message: `${driverName} müşterisinden ${amount} TL ödeme alındı. Hizmet: ${serviceType}`,
      data: {
        driverName,
        amount,
        serviceType
      }
    });
  }

  /**
   * Yeni mesaj bildirimi
   */
  static async sendNewMessageNotification(
    recipientId: string,
    recipientType: 'mechanic' | 'driver',
    senderName: string,
    messagePreview: string
  ): Promise<void> {
    await this.createAndSendNotification({
      recipientId,
      recipientType,
      type: 'new_message',
      title: 'Yeni Mesaj',
      message: `${senderName}: ${messagePreview}`,
      data: {
        senderName,
        messagePreview
      }
    });
  }

  /**
   * Değerlendirme bildirimi
   */
  static async sendRatingNotification(
    mechanicId: string,
    driverName: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    await this.createAndSendNotification({
      recipientId: mechanicId,
      recipientType: 'mechanic',
      type: 'rating_received',
      title: 'Yeni Değerlendirme',
      message: `${driverName} sizi ${rating} yıldız ile değerlendirdi${comment ? `: "${comment}"` : ''}`,
      data: {
        driverName,
        rating,
        comment
      }
    });
  }

  /**
   * İş atandı bildirimi
   */
  static async sendJobAssignedNotification(
    mechanicId: string,
    jobType: string,
    location: string,
    priority: 'high' | 'medium' | 'low'
  ): Promise<void> {
    await this.createAndSendNotification({
      recipientId: mechanicId,
      recipientType: 'mechanic',
      type: 'job_assigned',
      title: 'Yeni İş Atandı',
      message: `Size yeni bir ${jobType} işi atandı. Konum: ${location}`,
      data: {
        jobType,
        location,
        priority
      }
    });
  }

  /**
   * Sistem bildirimi
   */
  static async sendSystemNotification(
    recipientId: string,
    recipientType: 'mechanic' | 'driver',
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    await this.createAndSendNotification({
      recipientId,
      recipientType,
      type: 'system',
      title,
      message,
      data
    });
  }

  /**
   * Toplu bildirim gönder
   */
  static async sendBulkNotification(
    recipientIds: string[],
    recipientType: 'mechanic' | 'driver',
    type: string,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    const promises = recipientIds.map(recipientId => 
      this.createAndSendNotification({
        recipientId,
        recipientType,
        type,
        title,
        message,
        data
      })
    );

    await Promise.allSettled(promises);
  }
}
