import { Request, Response } from 'express';
import { User } from '../models/User';
import Notification from '../models/Notification';
import { sendPushNotification } from '../services/pushNotificationService';

export class PushNotificationController {
  /**
   * Push token güncelle
   */
  static async updatePushToken(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const { token } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Push token gerekli'
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { pushToken: token },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      res.json({
        success: true,
        message: 'Push token güncellendi',
        data: { pushToken: user.pushToken }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Push token güncellenirken hata oluştu'
      });
    }
  }

  /**
   * Bildirim ayarlarını al
   */
  static async getNotificationSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      
      console.log('🔍 Backend Debug - getNotificationSettings:');
      console.log('req.user:', req.user);
      console.log('userId:', userId);
      console.log('Authorization header:', req.header('Authorization'));

      if (!userId) {
        console.log('❌ Backend: userId bulunamadı');
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const user = await User.findById(userId).select('notificationSettings');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      res.json({
        success: true,
        data: user.notificationSettings || {
          pushNotifications: true,
          appointmentNotifications: true,
          paymentNotifications: true,
          messageNotifications: true,
          systemNotifications: true,
          marketingNotifications: false,
          soundEnabled: user.notificationSettings?.soundAlerts ?? true,
          vibrationEnabled: user.notificationSettings?.vibrationAlerts ?? true
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bildirim ayarları alınırken hata oluştu'
      });
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  static async updateNotificationSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const settings = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      // Frontend'den gelen field isimlerini backend schema'ya uyarla
      const mappedSettings = {
        ...settings,
        // Frontend'den gelen soundEnabled -> backend'deki soundAlerts
        soundAlerts: settings.soundEnabled,
        // Frontend'den gelen vibrationEnabled -> backend'deki vibrationAlerts  
        vibrationAlerts: settings.vibrationEnabled,
        // Gereksiz field'ları temizle
        soundEnabled: undefined,
        vibrationEnabled: undefined
      };

      const user = await User.findByIdAndUpdate(
        userId,
        { notificationSettings: mappedSettings },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      res.json({
        success: true,
        message: 'Bildirim ayarları güncellendi',
        data: user.notificationSettings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bildirim ayarları güncellenirken hata oluştu'
      });
    }
  }

  /**
   * Test bildirimi gönder
   */
  static async sendTestNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Kullanıcı bulunamadı'
        });
      }

      if (!user.pushToken) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcının push token\'ı yok'
        });
      }

      // Test bildirimi oluştur
      const notification = new Notification({
        recipientId: userId,
        recipientType: user.userType,
        type: 'system',
        title: 'Test Bildirimi',
        message: 'Bu bir test bildirimidir. Bildirim sistemi çalışıyor!',
        isRead: false,
        data: {
          test: true,
          timestamp: new Date().toISOString()
        }
      });

      await notification.save();

      // Push notification gönder
      await sendPushNotification(user.pushToken, {
        title: 'Test Bildirimi',
        body: 'Bu bir test bildirimidir. Bildirim sistemi çalışıyor!',
        data: {
          type: 'system',
          notificationId: (notification._id as any).toString(),
          test: true
        }
      });

      res.json({
        success: true,
        message: 'Test bildirimi gönderildi',
        data: { notificationId: notification._id }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Test bildirimi gönderilirken hata oluştu'
      });
    }
  }
}
