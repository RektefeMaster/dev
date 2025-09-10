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
      console.error('Bildirimler getirilirken hata:', error);
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
      console.error('Okunmamış bildirim sayısı alınırken hata:', error);
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
      console.error('Bildirimler getirilirken hata:', error);
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
      console.error('Okunmamış bildirim sayısı alınırken hata:', error);
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

      console.log('Mark as read request:', { notificationId, userId });

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

      console.log('Notification found and updated:', notification);

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
      console.error('Bildirim okundu işaretlenirken hata:', error);
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

      console.log('Delete notification request:', { notificationId, userId });

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

      console.log('Notification deleted:', notification);

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
      console.error('Bildirim silinirken hata:', error);
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
      console.error('Tüm bildirimler okundu işaretlenirken hata:', error);
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

      console.log('Mark all as read driver request:', { userId });

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

      console.log('Mark all as read result:', result);

      res.json({
        success: true,
        message: 'Tüm bildirimler okundu olarak işaretlendi',
        data: {
          updatedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Tüm bildirimler okundu işaretlenirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Tüm bildirimler okundu işaretlenirken bir hata oluştu'
      });
    }
  }
}
