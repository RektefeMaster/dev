import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { TefePointService } from '../services/tefePoint.service';
import { Wallet } from '../models/Wallet';

import { sendAppointmentRequestNotification, sendAppointmentStatusNotification } from '../utils/notifications';
import { CustomError } from '../utils/response';
import pushNotificationService from '../services/pushNotification.service';
import { NotificationTriggerService } from '../services/notificationTriggerService';

export class AppointmentController {
  /**
   * Yeni randevu talebi oluştur
   */
  static async createAppointment(req: Request, res: Response) {
    try {
      const { mechanicId, serviceType, appointmentDate, timeSlot, description, vehicleId, faultReportId } = req.body;
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
        vehicleId,
        faultReportId
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
        // Push notification gönder
        await pushNotificationService.sendAppointmentNotification(
          mechanicId,
          'new',
          appointment
        );

        // Gerçek bildirim tetikleyicisi
        const driver = await User.findById(userId);
        await NotificationTriggerService.sendAppointmentRequestNotification(
          mechanicId,
          driver?.name || 'Müşteri',
          serviceType,
          appointmentDate.split('T')[0],
          timeSlot
        );
        
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
      const appointments = await AppointmentService.getMechanicAppointments(mechanicId, status as string);
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
   * Usta fiyat belirleme (normal randevu için)
   */
  static async setAppointmentPrice(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const { price, notes } = req.body;
      const mechanicId = req.user?.userId;

      if (!mechanicId) {
        throw new CustomError('Usta bilgisi bulunamadı', 401);
      }

      if (!price || isNaN(Number(price)) || Number(price) <= 0) {
        throw new CustomError('Geçerli bir fiyat giriniz', 400);
      }

      const appointment = await AppointmentService.setAppointmentPrice(
        appointmentId,
        mechanicId,
        Number(price),
        notes
      );

      res.json({
        success: true,
        message: 'Fiyat başarıyla belirlendi',
        data: appointment
      });
    } catch (error: any) {
      console.error('Fiyat belirleme hatası:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Fiyat belirlenirken bir hata oluştu'
      });
    }
  }

  /**
   * Usta ek fiyat ekleme (arıza bildirimi randevusu için)
   */
  static async addPriceIncrease(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const { additionalAmount, reason } = req.body;
      const mechanicId = req.user?.userId;

      if (!mechanicId) {
        throw new CustomError('Usta bilgisi bulunamadı', 401);
      }

      if (!additionalAmount || isNaN(Number(additionalAmount)) || Number(additionalAmount) <= 0) {
        throw new CustomError('Geçerli bir ek fiyat giriniz', 400);
      }

      if (!reason || reason.trim().length === 0) {
        throw new CustomError('Ek fiyat sebebi gereklidir', 400);
      }

      const appointment = await AppointmentService.addPriceIncrease(
        appointmentId,
        mechanicId,
        Number(additionalAmount),
        reason.trim()
      );

      res.json({
        success: true,
        message: 'Ek fiyat başarıyla eklendi',
        data: appointment
      });
    } catch (error: any) {
      console.error('Ek fiyat ekleme hatası:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Ek fiyat eklenirken bir hata oluştu'
      });
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

      // Gerçek bildirim tetikleyicisi
      try {
        const mechanic = await User.findById(mechanicId);
        const driver = await User.findById(appointment.userId);
        
        if (status === 'confirmed') {
          await NotificationTriggerService.sendAppointmentConfirmedNotification(
            appointment.userId.toString(),
            mechanic?.name || 'Usta',
            appointment.serviceType,
            appointment.appointmentDate.toISOString().split('T')[0],
            appointment.timeSlot
          );
        } else if (status === 'rejected') {
          await NotificationTriggerService.createAndSendNotification({
            recipientId: appointment.userId.toString(),
            recipientType: 'driver',
            type: 'appointment_cancelled',
            title: 'Randevu Reddedildi',
            message: `${mechanic?.name || 'Usta'} randevunuzu reddetti${rejectionReason ? `. Sebep: ${rejectionReason}` : ''}`,
            data: {
              mechanicName: mechanic?.name,
              rejectionReason,
              appointmentDate: appointment.appointmentDate,
              timeSlot: appointment.timeSlot
            }
          });
        }
      } catch (notificationError) {
        console.error('Bildirim gönderme hatası:', notificationError);
        // Bildirim hatası ana işlemi engellemez
      }

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

  // Ödeme oluşturma
  static async createPayment(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const { paymentMethod = 'credit_card' } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      // Randevuyu bul
      const appointment = await Appointment.findById(appointmentId)
        .populate('userId', 'name surname email')
        .populate('mechanicId', 'name surname email phone');

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Randevu bulunamadı'
        });
      }

      // Sadece randevu sahibi ödeme yapabilir
      if (appointment.userId._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bu randevu için ödeme yapma yetkiniz yok'
        });
      }

      // Sadece belirli durumlarda ödeme yapılabilir
      if (!['TALEP_EDILDI', 'PLANLANDI', 'SERVISTE', 'ODEME_BEKLIYOR'].includes(appointment.status)) {
        return res.status(400).json({
          success: false,
          message: 'Bu randevu için ödeme yapılamaz'
        });
      }

      // Ödeme bilgilerini güncelle
      appointment.paymentStatus = 'pending';
      appointment.status = 'ODEME_BEKLIYOR';

      await appointment.save();

      // Ustaya bildirim gönder
      const notification = {
        type: 'payment_pending',
        title: 'Ödeme Bekleniyor',
        message: `${(appointment.userId as any).name} ${(appointment.userId as any).surname} ödeme yapmaya hazırlanıyor`,
        data: {
          appointmentId: appointment._id,
          amount: appointment.price || 0,
          customerName: `${(appointment.userId as any).name} ${(appointment.userId as any).surname}`
        }
      };

      // sendNotificationToUser(appointment.mechanicId._id.toString(), notification);

      res.json({
        success: true,
        message: 'Ödeme oluşturuldu',
        data: {
          appointmentId: appointment._id,
          amount: appointment.price || 0,
          paymentMethod,
          status: 'payment_pending'
        }
      });

    } catch (error) {
      console.error('Ödeme oluşturma hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Ödeme oluşturulurken bir hata oluştu'
      });
    }
  }

  // Ödeme onaylama
  static async confirmPayment(req: Request, res: Response) {
    try {
      const { appointmentId } = req.params;
      const { transactionId, amount } = req.body;
      const userId = req.user?.userId;

      console.log(`🔍 confirmPayment çağrıldı - appointmentId: ${appointmentId}, amount: ${amount}, userId: ${userId}`);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Kullanıcı doğrulanamadı'
        });
      }

      // Randevuyu bul
      const appointment = await Appointment.findById(appointmentId)
        .populate('userId', 'name surname email')
        .populate('mechanicId', 'name surname email phone');

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Randevu bulunamadı'
        });
      }

      // Sadece randevu sahibi ödeme onaylayabilir
      if (appointment.userId._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bu randevu için ödeme onaylama yetkiniz yok'
        });
      }

      // Sadece payment_pending durumundaki randevular için ödeme onaylanabilir
      if (appointment.status !== 'ODEME_BEKLIYOR') {
        return res.status(400).json({
          success: false,
          message: 'Bu randevu için ödeme onaylanamaz'
        });
      }

      // Ödeme bilgilerini güncelle
      appointment.paymentStatus = 'completed';
      appointment.status = 'PLANLANDI'; // Ödeme tamamlandıktan sonra planlandı durumuna geç
      appointment.paymentDate = new Date();
      appointment.transactionId = transactionId;
      
      // Eğer price değeri yoksa, quotedPrice'dan al
      if (!appointment.price && appointment.quotedPrice) {
        appointment.price = appointment.quotedPrice;
      }
      
      // Eğer hala price yoksa, frontend'den gelen amount'u kullan
      if (!appointment.price) {
        const { amount } = req.body;
        console.log(`🔍 Frontend'den gelen amount: ${amount}`);
        if (amount) {
          appointment.price = amount;
          console.log(`🔍 Appointment.price set edildi: ${appointment.price}`);
        }
      }

      await appointment.save();

      // TefePuan kazanma işlemi
      try {
        const baseAmount = appointment.finalPrice || appointment.price || 0;
        
        console.log(`🔍 TefePuan hesaplama: baseAmount=${baseAmount}`);
        console.log(`🔍 Appointment detayları:`, {
          _id: appointment._id,
          price: appointment.price,
          finalPrice: appointment.finalPrice,
          quotedPrice: appointment.quotedPrice,
          serviceType: appointment.serviceType
        });
        
        // TefePuan kazandır
        const tefePointResult = await TefePointService.processPaymentTefePoints({
          userId,
          amount: baseAmount,
          paymentType: 'appointment',
          serviceCategory: appointment.serviceType || 'maintenance',
          description: `Randevu ödemesi - ${appointment.serviceType || 'genel-bakım'}`,
          serviceId: (appointment._id as any).toString(),
          appointmentId: (appointment._id as any).toString()
        });

        if (tefePointResult.success && tefePointResult.earnedPoints) {
          console.log(`✅ Randevu TefePuan eklendi: ${tefePointResult.earnedPoints} puan, Kullanıcı: ${userId}`);
        }
      } catch (tefeError) {
        console.error('❌ TefePuan ekleme hatası:', tefeError);
        // TefePuan hatası ödeme işlemini durdurmaz
      }

      // Wallet'a transaction ekle
      try {
        const walletAmount = appointment.finalPrice || appointment.price || 0;
        console.log(`🔍 Wallet transaction ekleniyor - amount: ${walletAmount}`);
        
        // Wallet'ı bul veya oluştur
        let wallet = await Wallet.findOne({ userId });
        
        if (!wallet) {
          wallet = new Wallet({
            userId,
            balance: 0,
            transactions: []
          });
        }
        
        // Yeni transaction ekle
        const walletTransaction = {
          type: 'debit' as const,
          amount: walletAmount,
          description: `Randevu ödemesi - ${appointment.serviceType || 'genel-bakım'}`,
          date: new Date(),
          status: 'completed' as const
        };
        
        wallet.transactions.push(walletTransaction);
        wallet.balance -= walletAmount; // Ödeme yapıldığı için balance azalır
        
        await wallet.save();
        
        console.log(`✅ Wallet transaction eklendi: ${walletAmount} TL, Kullanıcı: ${userId}`);
      } catch (walletError) {
        console.error('❌ Wallet transaction ekleme hatası:', walletError);
        // Wallet hatası ödeme işlemini durdurmaz
      }

      // Ustaya bildirim gönder
      const notification = {
        type: 'payment_completed',
        title: 'Ödeme Tamamlandı',
        message: `${(appointment.userId as any).name} ${(appointment.userId as any).surname} ödemeyi tamamladı. İşe başlayabilirsiniz.`,
        data: {
          appointmentId: appointment._id,
          amount: appointment.price || 0,
          customerName: `${(appointment.userId as any).name} ${(appointment.userId as any).surname}`,
          transactionId
        }
      };

      // sendNotificationToUser(appointment.mechanicId._id.toString(), notification);

      res.json({
        success: true,
        message: 'Ödeme başarıyla tamamlandı',
        data: {
          appointmentId: appointment._id,
          amount: appointment.price || 0,
          status: 'completed',
          transactionId
        }
      });

    } catch (error) {
      console.error('Ödeme onaylama hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Ödeme onaylanırken bir hata oluştu'
      });
    }
  }
}
