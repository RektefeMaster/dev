import { Request, Response } from 'express';
import Notification from '../models/Notification';

export class NotificationController {
  /**
   * Ustanın bildirimlerini getir
   */
  static async getMechanicNotifications(req: Request, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const notifications = await Notification.find({ 
        recipientId: mechanicId,
        recipientType: 'mechanic'
      })
      .sort({ createdAt: -1 })
      .limit(50);

      res.json({
        success: true,
        data: {
          notifications
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bildirimler getirilirken hata oluştu'
      });
    }
  }

  /**
   * Ustanın okunmamış bildirim sayısını getir
   */
  static async getMechanicUnreadCount(req: Request, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      
      if (!mechanicId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const count = await Notification.countDocuments({ 
        recipientId: mechanicId,
        recipientType: 'mechanic',
        isRead: false
      });

      res.json({
        success: true,
        data: {
          count
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Okunmamış bildirim sayısı alınırken hata oluştu'
      });
    }
  }

  /**
   * Şoförün bildirimlerini getir
   */
  static async getDriverNotifications(req: Request, res: Response) {
    try {
      const driverId = req.user?.userId;
      
      if (!driverId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const notifications = await Notification.find({ 
        recipientId: driverId,
        recipientType: 'driver'
      })
      .sort({ createdAt: -1 })
      .limit(50);

      res.json({
        success: true,
        data: {
          notifications
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bildirimler getirilirken hata oluştu'
      });
    }
  }

  /**
   * Şoförün okunmamış bildirim sayısını getir
   */
  static async getDriverUnreadCount(req: Request, res: Response) {
    try {
      const driverId = req.user?.userId;
      
      if (!driverId) {
        return res.status(500).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const count = await Notification.countDocuments({ 
        recipientId: driverId,
        recipientType: 'driver',
        isRead: false
      });

      res.json({
        success: true,
        data: {
          count
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Okunmamış bildirim sayısı alınırken hata oluştu'
      });
    }
  }

  /**
   * Bildirimi okundu olarak işaretle
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const notification = await Notification.findOneAndUpdate(
        { 
          _id: notificationId,
          recipientId: userId
        },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Bildirim bulunamadı'
        });
      }

      res.json({
        success: true,
        data: {
          notification
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bildirim okundu işaretlenirken hata oluştu'
      });
    }
  }

  /**
   * Bildirimi sil
   */
  static async deleteNotification(req: Request, res: Response) {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipientId: userId
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Bildirim bulunamadı'
        });
      }

      res.json({
        success: true,
        message: 'Bildirim başarıyla silindi'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bildirim silinirken bir hata oluştu'
      });
    }
  }

  /**
   * Tüm bildirimleri okundu olarak işaretle (Usta)
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const result = await Notification.updateMany(
        { 
          recipientId: userId,
          recipientType: 'mechanic',
          isRead: false
        },
        { isRead: true }
      );

      res.json({
        success: true,
        message: 'Tüm bildirimler okundu olarak işaretlendi',
        data: {
          updatedCount: result.modifiedCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Tüm bildirimler okundu işaretlenirken bir hata oluştu'
      });
    }
  }

  /**
   * Tüm bildirimleri okundu olarak işaretle (Şoför)
   */
  static async markAllAsReadDriver(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      const result = await Notification.updateMany(
        { 
          recipientId: userId,
          recipientType: 'driver',
          isRead: false
        },
        { isRead: true }
      );

      res.json({
        success: true,
        message: 'Tüm bildirimler okundu olarak işaretlendi',
        data: {
          updatedCount: result.modifiedCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Tüm bildirimler okundu işaretlenirken bir hata oluştu'
      });
    }
  }

  /**
   * Yeni bildirim oluştur
   */
  static async createNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.userType || 'driver'; // Default driver
      const { title, message, type, data, scheduledFor } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      if (!title || !message || !type) {
        return res.status(400).json({
          success: false,
          message: 'Başlık, mesaj ve tür alanları zorunludur'
        });
      }

      const notification = new Notification({
        recipientId: userId,
        recipientType: userType === 'mechanic' ? 'mechanic' : 'driver',
        title,
        message,
        type,
        data: data || {},
        isRead: false,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
      });

      await notification.save();

      res.status(201).json({
        success: true,
        message: 'Bildirim başarıyla oluşturuldu',
        data: {
          notification
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Bildirim oluşturulurken bir hata oluştu'
      });
    }
  }

  /**
   * Test bildirimi oluştur
   */
  static async createTestNotification(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const userType = req.user?.userType || 'driver';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      // Test rating reminder bildirimi oluştur
      const notification = new Notification({
        recipientId: userId,
        recipientType: userType === 'mechanic' ? 'mechanic' : 'driver',
        title: 'Test - Değerlendirme Zamanı!',
        message: 'Test Usta ile Motor Yağı Değişimi hizmeti tamamlandı. Deneyiminizi değerlendirin!',
        type: 'rating_reminder',
        data: {
          appointmentId: 'real-appointment-123',
          mechanicId: 'real-mechanic-123',
          mechanicName: 'Test Usta',
          serviceType: 'Motor Yağı Değişimi',
          appointmentDate: new Date(Date.now() - 3600000).toISOString() // 1 saat önce
        },
        isRead: false
      });

      await notification.save();

      res.status(201).json({
        success: true,
        message: 'Test bildirimi başarıyla oluşturuldu',
        data: {
          notification
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Test bildirimi oluşturulurken bir hata oluştu'
      });
    }
  }
}
