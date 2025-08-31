import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
// Test import kaldırıldı

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
   * Driver'ın randevularını getir (hem Appointment hem MaintenanceAppointment collection'larından)
   */
  static async getDriverAppointments(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      // Sadece Appointment collection'ından veri çek
      const appointments = await AppointmentService.getAppointmentsByUserId(userId);

      // Randevuları tarihe göre sırala
      const allAppointments = appointments.sort((a, b) => 
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      );
      
      res.status(200).json({
        success: true,
        data: { appointments: allAppointments }
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

      const { status } = req.query;
      console.log('🔧 AppointmentController: getMechanicAppointments called with status filter:', status);

      const appointments = await AppointmentService.getMechanicAppointments(mechanicId, status as string);
      
      console.log('🔧 AppointmentController: Sending appointments count:', appointments.length);
      if (appointments.length > 0) {
        console.log('🔧 AppointmentController: First appointment sample:', JSON.stringify(appointments[0], null, 2));
      }
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

      console.log('🔍 AppointmentController: getAppointmentById called with id:', id);

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      const appointment = await AppointmentService.getAppointmentById(id, userId);
      
      console.log('🔍 AppointmentController: Sending appointment data:', {
        appointmentId: id,
        userId: appointment.userId,
        vehicleId: appointment.vehicleId,
        serviceType: appointment.serviceType,
        description: appointment.description
      });
      
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

  /**
   * Randevu istatistiklerini getir
   */
  static async getAppointmentStats(req: Request, res: Response) {
    try {
      const mechanicId = req.user?.userId;
      if (!mechanicId) {
        throw new CustomError('Usta bilgisi bulunamadı', 401);
      }

      const stats = await AppointmentService.getAppointmentStats(mechanicId);
      
      res.status(200).json({
        success: true,
        message: 'İstatistikler başarıyla getirildi',
        data: stats
      });
    } catch (error) {
      console.error('İstatistik getirme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'İstatistikler getirilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Bugünkü onaylanan randevuları getir
   */
  static async getTodaysAppointments(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      // Appointment collection'ından bugünkü randevuları getir
      const appointments = await AppointmentService.getTodaysAppointments(userId);

      // Randevuları tarihe göre sırala
      const allAppointments = appointments.sort((a, b) => 
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      );

      res.status(200).json({
        success: true,
        message: 'Bugünkü randevular başarıyla getirildi',
        data: { appointments: allAppointments }
      });
    } catch (error) {
      console.error('Bugünkü randevuları getirme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Bugünkü randevular getirilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Randevu arama
   */
  static async searchAppointments(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const userId = req.user?.userId;

      if (!q || typeof q !== 'string') {
        throw new CustomError('Arama terimi gerekli', 400);
      }

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      // Appointment collection'ında ara
      const appointments = await AppointmentService.searchAppointments(q, userId);

      // Randevuları tarihe göre sırala
      const allAppointments = appointments.sort((a, b) => 
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      );

      res.status(200).json({
        success: true,
        message: 'Arama sonuçları başarıyla getirildi',
        data: { appointments: allAppointments }
      });
    } catch (error) {
      console.error('Randevu arama hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Randevu arama sırasında bir hata oluştu'
        });
      }
    }
  }

  /**
   * Tarih aralığında randevuları getir
   */
  static async getAppointmentsByDateRange(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user?.userId;

      if (!startDate || !endDate) {
        throw new CustomError('Başlangıç ve bitiş tarihleri gerekli', 400);
      }

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      // Appointment collection'ından tarih aralığında randevuları getir
      const appointments = await AppointmentService.getAppointmentsByDateRange(startDate as string, endDate as string, userId);

      // Randevuları tarihe göre sırala
      const allAppointments = appointments.sort((a, b) => 
        new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime()
      );

      res.status(200).json({
        success: true,
        message: 'Tarih aralığında randevular başarıyla getirildi',
        data: { appointments: allAppointments }
      });
    } catch (error) {
      console.error('Tarih aralığında randevu getirme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Tarih aralığında randevular getirilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Mekaniğin müsaitlik durumunu getir
   */
  static async getMechanicAvailability(req: Request, res: Response) {
    try {
      const { date, mechanicId } = req.query;

      if (!date || !mechanicId) {
        throw new CustomError('Tarih ve mekanik ID gerekli', 400);
      }

      // Appointment collection'ından müsaitlik bilgisi al
      const appointments = await AppointmentService.getMechanicAvailability(date as string, mechanicId as string);

      // Müsaitlik bilgilerini hazırla
      const availability = {
        date,
        mechanicId,
        appointments: appointments,
        availableSlots: [] // Bu hesaplanabilir
      };

      res.status(200).json({
        success: true,
        message: 'Müsaitlik bilgisi başarıyla getirildi',
        data: availability
      });
    } catch (error) {
      console.error('Müsaitlik bilgisi getirme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Müsaitlik bilgisi getirilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Randevuyu iptal et
   */
  static async cancelAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      // Önce hangi collection'da olduğunu bul ve iptal et
      try {
        await AppointmentService.cancelAppointment(id, userId);
      } catch (error) {
        // Appointment collection'da bulunamazsa MaintenanceAppointment'da dene
        await AppointmentService.cancelAppointment(id, userId);
      }

      res.status(200).json({
        success: true,
        message: 'Randevu başarıyla iptal edildi'
      });
    } catch (error) {
      console.error('Randevu iptal etme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Randevu iptal edilirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  static async updateNotificationSettings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      // Bildirim ayarlarını güncelle
      await AppointmentService.updateNotificationSettings(id, req.body, userId);

      res.status(200).json({
        success: true,
        message: 'Bildirim ayarları başarıyla güncellendi'
      });
    } catch (error) {
      console.error('Bildirim ayarları güncelleme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Bildirim ayarları güncellenirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Ödeme durumunu güncelle
   */
  static async updatePaymentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      // Ödeme durumunu güncelle
      await AppointmentService.updatePaymentStatus(id, req.body, userId);

      res.status(200).json({
        success: true,
        message: 'Ödeme durumu başarıyla güncellendi'
      });
    } catch (error) {
      console.error('Ödeme durumu güncelleme hatası:', error);
      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Ödeme durumu güncellenirken bir hata oluştu'
        });
      }
    }
  }

  /**
   * Debug: Tüm randevuları getir
   */
  static async getAllAppointments(req: Request, res: Response) {
    try {
      const appointments = await AppointmentService.getAllAppointments();

      const allAppointments = appointments.map(apt => ({ ...apt.toObject(), source: 'Appointment' }));

      res.status(200).json({
        success: true,
        data: {
          totalCount: allAppointments.length,
          appointments: allAppointments
        }
      });
    } catch (error) {
      console.error('Debug endpoint hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Debug endpoint hatası'
      });
    }
  }

  /**
   * Debug: Belirli kullanıcının randevularını getir
   */
  static async getUserAppointments(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const appointments = await AppointmentService.getAppointmentsByUserId(userId);

      const allAppointments = appointments.map(apt => ({ ...apt.toObject(), source: 'Appointment' }));

      res.status(200).json({
        success: true,
        data: {
          userId,
          totalCount: allAppointments.length,
          appointments: allAppointments
        }
      });
    } catch (error) {
      console.error('Debug endpoint hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Debug endpoint hatası'
      });
    }
  }

  // Test method kaldırıldı
}
