import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { sendAppointmentRequestNotification, sendAppointmentStatusNotification } from '../utils/notifications';
import { CustomError } from '../utils/response';
import pushNotificationService from '../services/pushNotification.service';

export class AppointmentController {
  /**
   * Yeni randevu talebi oluştur
   */
  static async createAppointment(req: Request, res: Response) {
    try {
      const { mechanicId, serviceType, appointmentDate, timeSlot, description, vehicleId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      const appointment = await AppointmentService.createAppointment({
        userId,
        mechanicId,
        serviceType,
        appointmentDate: new Date(appointmentDate),
        timeSlot,
        description,
        vehicleId
      });

      // Ustaya bildirim gönder
      try {
        await sendAppointmentRequestNotification(
          mechanicId,
          (appointment as any)._id,
          'Test Müşteri',
          serviceType,
          appointmentDate,
          timeSlot
        );
        console.log('✅ Socket bildirimi başarıyla gönderildi');
        
        // Push notification gönder
        await pushNotificationService.sendAppointmentNotification(
          mechanicId,
          'new',
          appointment
        );
        console.log('✅ Push notification başarıyla gönderildi');
        
      } catch (notificationError) {
        console.error('❌ Bildirim gönderilirken hata:', notificationError);
        // Bildirim hatası randevu oluşturmayı engellemesin
      }

      res.status(201).json({
        success: true,
        message: 'Randevu talebi başarıyla oluşturuldu',
        data: { appointment }
      });
    } catch (error) {
      console.error('Randevu oluşturma hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Randevu oluşturulurken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Driver'ın randevularını getir
   */
  static async getDriverAppointments(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      const appointments = await AppointmentService.getAppointmentsByUserId(userId);
      
      res.status(200).json({
        success: true,
        data: { appointments }
      });
    } catch (error) {
      console.error('Driver randevuları getirme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Randevular getirilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Ustanın randevularını getir
   */
  static async getMechanicAppointments(req: Request, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        throw new CustomError('Usta bilgisi bulunamadı', 401);
      }

      const appointments = await AppointmentService.getAppointmentsByMechanicId(mechanicId);
      
      res.status(200).json({
        success: true,
        data: { appointments }
      });
    } catch (error) {
      console.error('Usta randevuları getirme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Randevular getirilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Randevu detayını getir
   */
  static async getAppointmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      const appointment = await AppointmentService.getAppointmentById(id, userId);
      
      res.status(200).json({
        success: true,
        data: { appointment }
      });
    } catch (error) {
      console.error('Randevu detayı getirme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Randevu detayı getirilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Randevu durumunu güncelle (onay/red)
   */
  static async updateAppointmentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, rejectionReason, mechanicNotes } = req.body;
      const mechanicId = req.user?.userId;

      if (!mechanicId) {
        throw new CustomError('Usta bilgisi bulunamadı', 401);
      }

      const appointment = await AppointmentService.updateAppointmentStatus(
        id,
        mechanicId,
        status,
        rejectionReason,
        mechanicNotes
      );

      // Driver'a bildirim gönder
      await sendAppointmentStatusNotification(
        appointment.userId,
        'Test Usta',
        status,
        appointment.appointmentDate,
        appointment.timeSlot,
        rejectionReason
      );

      res.status(200).json({
        success: true,
        message: 'Randevu durumu başarıyla güncellendi',
        data: { appointment }
      });
    } catch (error) {
      console.error('Randevu durumu güncelleme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Randevu durumu güncellenirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * İletişim bilgilerini paylaş
   */
  static async shareContactInfo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      const contactInfo = await AppointmentService.shareContactInfo(id, userId);
      
      res.status(200).json({
        success: true,
        message: 'İletişim bilgileri paylaşıldı',
        data: { contactInfo }
      });
    } catch (error) {
      console.error('İletişim bilgileri paylaşma hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'İletişim bilgileri paylaşılırken bir hata oluştu'
        });
      }
    }
  }
}
