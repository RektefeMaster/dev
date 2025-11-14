import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppointmentService } from '../services/appointment.service';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { TefePointService } from '../services/tefePoint.service';
import { Wallet } from '../models/Wallet';
import { AppointmentStatus, ServiceType, PaymentStatus } from '../../../shared/types/enums';
import { createSuccessResponse, createErrorResponse, ErrorCode } from '../../../shared/types/apiResponse';

import { sendAppointmentRequestNotification, sendAppointmentStatusNotification } from '../utils/notifications';
import { CustomError } from '../utils/response';
import pushNotificationService from '../services/pushNotification.service';
import { NotificationTriggerService } from '../services/notificationTriggerService';
import { OdometerService } from '../services/odometer.service';
const resolveTenantId = (req: Request) =>
  (req.tenantId as string) ||
  (req.headers['x-tenant-id'] as string) ||
  (req.headers['x-tenant'] as string) ||
  'default';

export class AppointmentController {
  /**
   * Yeni randevu talebi oluştur
   */
  static async createAppointment(req: Request, res: Response) {
    try {
      const { mechanicId, serviceType, appointmentDate, timeSlot, description, vehicleId, faultReportId, ...additionalFields } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        const errorResponse = createErrorResponse(
          ErrorCode.UNAUTHORIZED,
          'Kullanıcı bilgisi bulunamadı',
          null,
          req.headers['x-request-id'] as string
        );
        return res.status(401).json(errorResponse);
      }

      const appointment = await AppointmentService.createAppointment({
        userId,
        mechanicId,
        serviceType,
        appointmentDate: new Date(appointmentDate),
        timeSlot,
        description,
        vehicleId,
        faultReportId,
        ...additionalFields
      });

      // CRITICAL FIX: Bildirim gönderirken appointment'taki gerçek mechanicId'yi kullan
      const actualMechanicId = (appointment as any).mechanicId?.toString() || mechanicId;
      
      // Ustaya bildirim gönder
      try {
        await sendAppointmentRequestNotification(
          actualMechanicId,
          (appointment as any)._id,
          'Test Müşteri',
          serviceType,
          appointmentDate,
          timeSlot
        );
        // Push notification gönder
        await pushNotificationService.sendAppointmentNotification(
          actualMechanicId,
          'new',
          appointment
        );

        // Gerçek bildirim tetikleyicisi
        const driver = await User.findById(userId);
        // CRITICAL FIX: appointmentDate Date objesi veya string olabilir
        const appointmentDateString = typeof appointmentDate === 'string' 
          ? appointmentDate.split('T')[0] 
          : new Date(appointmentDate).toISOString().split('T')[0];
        await NotificationTriggerService.sendAppointmentRequestNotification(
          actualMechanicId,
          driver?.name || 'Müşteri',
          serviceType,
          appointmentDateString,
          timeSlot
        );
        
      } catch (notificationError) {
        // Bildirim hatası randevu oluşturmayı engellemesin
        console.error('❌ Bildirim gönderme hatası:', notificationError);
      }

      const successResponse = createSuccessResponse(
        { appointment },
        'Randevu talebi başarıyla oluşturuldu',
        req.headers['x-request-id'] as string
      );
      res.status(201).json(successResponse);
    } catch (error) {
      if (error instanceof CustomError) {
        const errorResponse = createErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          error.message,
          null,
          req.headers['x-request-id'] as string
        );
        return res.status(error.statusCode).json(errorResponse);
      }
      
      const errorResponse = createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Randevu oluşturulurken bir hata oluştu',
        process.env.NODE_ENV === 'development' ? { stack: (error as Error).stack } : null,
        req.headers['x-request-id'] as string
      );
      res.status(500).json(errorResponse);
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

      const appointment = await AppointmentService.addExtraCharges(
        appointmentId,
        Number(additionalAmount),
        reason.trim()
      );

      res.json({
        success: true,
        message: 'Ek fiyat başarıyla eklendi',
        data: appointment
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Ek fiyat eklenirken bir hata oluştu'
      });
    }
  }

  /**
   * Müşteri ek ücret onayı/reddi
   */
  static async approveExtraCharges(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvalIndex, approve } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new CustomError('Kullanıcı bilgisi bulunamadı', 401);
      }

      if (approvalIndex === undefined || approve === undefined) {
        throw new CustomError('Onay bilgisi eksik', 400);
      }

      const appointment = await AppointmentService.approveExtraCharges(
        id,
        Number(approvalIndex),
        Boolean(approve)
      );

      res.json({
        success: true,
        message: approve ? 'Ek ücret onaylandı' : 'Ek ücret reddedildi',
        data: appointment
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Ek ücret onaylanırken bir hata oluştu'
      });
    }
  }

  /**
   * Randevu durumunu güncelle (onay/red)
   */
  static async updateAppointmentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, rejectionReason, mechanicNotes, odometer } = req.body;
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

      let odometerVerification = appointment.odometerVerification;

      if (appointment.status === 'TAMAMLANDI') {
        const verification = {
          status: 'missing' as 'verified' | 'missing' | 'failed',
          message: 'Servis kilometresi paylaşılmadı.',
          lastUpdated: new Date(),
          warnings: [] as string[],
        };

        if (!appointment.vehicleId) {
          verification.status = 'failed';
          verification.message = 'Randevuya bağlı araç bulunamadı.';
          verification.warnings.push('Araç referansı eksik');
        } else if (!odometer || typeof odometer.km !== 'number') {
          verification.status = 'missing';
          verification.message = 'Servis kilometresi gönderilmedi.';
        } else {
          try {
            const tenantId = resolveTenantId(req);
            const odometerResult = await OdometerService.recordEvent({
              tenantId,
              vehicleId: appointment.vehicleId.toString(),
              km: Number(odometer.km),
              unit: odometer.unit,
              timestampUtc: odometer.timestampUtc || new Date(),
              source: odometer.source || 'service',
              evidenceType: odometer.evidenceType || 'none',
              evidenceUrl: odometer.evidenceUrl,
              notes: odometer.notes,
              createdByUserId: req.user?.userId,
              odometerReset: odometer.odometerReset,
              clientRequestId: odometer.clientRequestId || `appointment:${appointment._id}:${Date.now()}`,
              metadata: {
                appointmentId: appointment._id.toString(),
                context: 'appointment_completion',
              },
              featureFlags: req.featureFlags,
            });

            verification.status = 'verified';
            verification.message = odometerResult.warnings?.length
              ? 'Kilometre doğrulandı. Uyarıları kontrol edin.'
              : 'Kilometre başarıyla doğrulandı.';
            verification.warnings = odometerResult.warnings ?? [];
            verification.lastUpdated = new Date();
          } catch (recordError: any) {
            const message =
              recordError?.error?.message ||
              recordError?.message ||
              'Kilometre kaydı oluşturulamadı.';
            verification.status = 'failed';
            verification.message = message;
            verification.warnings = [message];
            verification.lastUpdated = new Date();
          }
        }

        appointment.odometerVerification = verification;
        odometerVerification = verification;
        await appointment.save();
      }

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
        // Bildirim hatası ana işlemi engellemez
      }

      res.status(200).json({
        success: true,
        message: 'Randevu durumu başarıyla güncellendi',
        data: { appointment, odometerVerification }
      });
    } catch (error) {
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
      appointment.paymentStatus = PaymentStatus.PENDING;
      appointment.status = AppointmentStatus.PAYMENT_PENDING;

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

      // CRITICAL FIX: Tüm işlemleri MongoDB transaction içine al - atomicity garantisi
      const session = await mongoose.startSession();
      
      try {
        session.startTransaction();
        
        const walletAmount = appointment.finalPrice || appointment.price || 0;
        const mechanicId = appointment.mechanicId._id;

        // 1. Ödeme bilgilerini güncelle - BACKEND finalPrice'ı kullan, frontend'i ignore et
        appointment.paymentStatus = PaymentStatus.COMPLETED;
        appointment.status = AppointmentStatus.COMPLETED;
        appointment.paymentDate = new Date();
        appointment.transactionId = transactionId;
        
        // Eğer price değeri yoksa, quotedPrice'dan al
        if (!appointment.price && appointment.quotedPrice) {
          appointment.price = appointment.quotedPrice;
        }
        
        // Frontend'den gelen amount KESINLIKLE kullanılmamalı - güvenlik açığı!
        await appointment.save({ session });

        // 2. FaultReport durumunu güncelle (eğer arıza bildirimine bağlıysa)
        if (appointment.faultReportId) {
          const FaultReport = require('../models/FaultReport').FaultReport;
          const faultReport = await FaultReport.findById(appointment.faultReportId).session(session);
          
          if (faultReport) {
            faultReport.status = 'paid';
            
            if (faultReport.payment) {
              faultReport.payment.status = 'completed';
              faultReport.payment.transactionId = transactionId;
              faultReport.payment.paymentDate = new Date();
            }
            
            await faultReport.save({ session });
            console.log(`✅ FaultReport ${faultReport._id} durumu 'paid' olarak güncellendi`);
          }
        }

        // 3. Wallet transaction - Müşteriden para düş
        const customerTransaction = {
          type: 'debit' as const,
          amount: walletAmount,
          description: `Randevu ödemesi - ${appointment.serviceType || 'genel-bakım'}`,
          date: new Date(),
          status: 'completed' as const
        };
        
        const customerWallet = await Wallet.findOne({ userId }).session(session);
        
        if (!customerWallet) {
          await session.abortTransaction();
          throw new CustomError('Müşteri cüzdanı bulunamadı', 404);
        }
        
        if (customerWallet.balance < walletAmount) {
          await session.abortTransaction();
          throw new CustomError('Cüzdan bakiyeniz yetersiz', 400);
        }
        
        await Wallet.findOneAndUpdate(
          { userId },
          {
            $inc: { balance: -walletAmount },
            $push: { transactions: customerTransaction },
          },
          { new: true, session }
        );
        
        // 4. Wallet transaction - Ustaya para ekle
        const mechanicTransaction = {
          type: 'credit' as const,
          amount: walletAmount,
          description: `Randevu kazancı - ${appointment.serviceType || 'genel-bakım'} (${(appointment.userId as any).name})`,
          date: new Date(),
          status: 'completed' as const
        };
        
        await Wallet.findOneAndUpdate(
          { userId: mechanicId },
          {
            $inc: { balance: walletAmount },
            $push: { transactions: mechanicTransaction },
            $setOnInsert: { userId: mechanicId, createdAt: new Date() }
          },
          { new: true, upsert: true, session }
        );
        
        // 5. Transaction commit
        await session.commitTransaction();
        console.log('✅ Payment transaction başarıyla tamamlandı');
        
      } catch (transactionError) {
        await session.abortTransaction();
        console.error('❌ Payment transaction hatası:', transactionError);
        throw transactionError;
      } finally {
        session.endSession();
      }

      // 6. TefePuan kazandır (transaction dışında - başarısızlığı ödemeyi engellemez)
      try {
        const baseAmount = appointment.finalPrice || appointment.price || 0;
        
        const mechanicName = (appointment.mechanicId as any)?.name || 'Usta';
        const { translateServiceType } = require('../utils/serviceTypeTranslator');
        const serviceTypeName = translateServiceType(appointment.serviceType) || 'Hizmet';
        
        const customerTefePointResult = await TefePointService.processPaymentTefePoints({
          userId,
          amount: baseAmount,
          paymentType: 'appointment',
          serviceCategory: appointment.serviceType || 'repair',
          description: `${serviceTypeName} - ${mechanicName}`,
          serviceId: (appointment._id as any).toString(),
          appointmentId: (appointment._id as any).toString()
        });

        if (customerTefePointResult.success && customerTefePointResult.earnedPoints) {
          console.log(`✅ Müşteriye ${customerTefePointResult.earnedPoints} TefePuan kazandırıldı`);
        }

        const mechanicTefePointResult = await TefePointService.processPaymentTefePoints({
          userId: appointment.mechanicId._id.toString(),
          amount: baseAmount,
          paymentType: 'appointment',
          serviceCategory: appointment.serviceType || 'repair',
          description: `Randevu kazancı - ${serviceTypeName}`,
          serviceId: (appointment._id as any).toString(),
          appointmentId: (appointment._id as any).toString()
        });

        if (mechanicTefePointResult.success && mechanicTefePointResult.earnedPoints) {
          console.log(`✅ Ustaya ${mechanicTefePointResult.earnedPoints} TefePuan kazandırıldı`);
        }
      } catch (tefeError) {
        console.error('❌ TefePuan hatası (ödeme etkilenmez):', tefeError);
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
      res.status(500).json({
        success: false,
        message: 'Ödeme onaylanırken bir hata oluştu'
      });
    }
  }
}
