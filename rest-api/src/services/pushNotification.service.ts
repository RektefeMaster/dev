import { User } from '../models/User';

export class PushNotificationService {
  private static instance: PushNotificationService;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Tek kullanıcıya bildirim gönder
  async sendToUser(userId: string, title: string, body: string, data?: any): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pushToken) {
        return false;
      }

      const success = await this.sendExpoPushNotification(user.pushToken, title, body, data);
      
      return success;
    } catch (error) {
      return false;
    }
  }

  // Birden fazla kullanıcıya bildirim gönder
  async sendToMultipleUsers(userIds: string[], title: string, body: string, data?: any): Promise<number> {
    try {
      const users = await User.find({ _id: { $in: userIds }, pushToken: { $exists: true, $ne: null } });
      
      if (users.length === 0) {
        return 0;
      }

      let successCount = 0;
      const promises = users.map(async (user) => {
        const success = await this.sendExpoPushNotification(user.pushToken!, title, body, data);
        if (success) successCount++;
        return success;
      });

      await Promise.all(promises);

      return successCount;
    } catch (error) {
      return 0;
    }
  }

  // Mekaniklere bildirim gönder
  async sendToMechanics(title: string, body: string, data?: any): Promise<number> {
    try {
      const mechanics = await User.find({ 
        userType: 'mechanic', 
        pushToken: { $exists: true, $ne: null } 
      });
      
      if (mechanics.length === 0) {
        return 0;
      }

      let successCount = 0;
      const promises = mechanics.map(async (mechanic) => {
        const success = await this.sendExpoPushNotification(mechanic.pushToken!, title, body, data);
        if (success) successCount++;
        return success;
      });

      await Promise.all(promises);

      return successCount;
    } catch (error) {
      return 0;
    }
  }

  // Expo push notification gönder
  private async sendExpoPushNotification(token: string, title: string, body: string, data?: any): Promise<boolean> {
    try {
      const message = {
        to: token,
        sound: 'default',
        title: title,
        body: body,
        data: data || {},
        priority: 'high',
        channelId: 'default'
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data?.status === 'ok';
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Randevu bildirimi gönder
  async sendAppointmentNotification(
    mechanicId: string, 
    appointmentType: 'new' | 'confirmed' | 'rejected' | 'reminder',
    appointmentData: any
  ): Promise<boolean> {
    try {
      let title = '';
      let body = '';
      
      switch (appointmentType) {
        case 'new':
          title = '🚗 Yeni Randevu Talebi';
          body = 'Yeni bir randevu talebi geldi';
          break;
        case 'confirmed':
          title = '✅ Randevu Onaylandı';
          body = 'Randevunuz onaylandı';
          break;
        case 'rejected':
          title = '❌ Randevu Reddedildi';
          body = 'Randevunuz reddedildi';
          break;
        case 'reminder':
          title = '⏰ Randevu Hatırlatması';
          body = 'Randevunuz yaklaşıyor';
          break;
      }

      const data = {
        type: 'appointment',
        appointmentType,
        appointmentId: appointmentData._id,
        ...appointmentData
      };

      return await this.sendToUser(mechanicId, title, body, data);
    } catch (error) {
      return false;
    }
  }
}

export default PushNotificationService.getInstance();
