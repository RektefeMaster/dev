import { Request, Response } from 'express';
import { MaintenanceAppointmentService } from '../services/maintenanceAppointment.service';
import { ResponseHandler } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { sendNotificationToUser } from '../index';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: string;
  };
}

export class MaintenanceAppointmentController {
  /**
   * Yeni bakım randevusu oluştur
   */
  static createAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Test için geçici olarak sabit userId kullanıyorum
    const userId = '68a1c08b4baccde02b4f5c43';

    const appointment = await MaintenanceAppointmentService.createAppointment(req.body, userId);
    return ResponseHandler.created(res, appointment, 'Randevu başarıyla oluşturuldu');
  });

  /**
   * Kullanıcının randevularını getir
   */
  static getUserAppointments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const appointments = await MaintenanceAppointmentService.getUserAppointments(userId);
    return ResponseHandler.success(res, appointments, 'Randevular başarıyla getirildi');
  });

  /**
   * Mekaniğin randevularını getir
   */
  static getMechanicAppointments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const appointments = await MaintenanceAppointmentService.getMechanicAppointments(userId);
    return ResponseHandler.success(res, appointments, 'Mekanik randevuları başarıyla getirildi');
  });

  /**
   * Belirli bir randevuyu getir
   */
  static getAppointmentById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    const appointment = await MaintenanceAppointmentService.getAppointmentById(id, userId);
    return ResponseHandler.success(res, appointment, 'Randevu başarıyla getirildi');
  });

  /**
   * Randevu durumunu güncelle (kullanıcı tarafından)
   */
  static updateAppointmentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return ResponseHandler.badRequest(res, 'Durum bilgisi gerekli');
    }

    const appointment = await MaintenanceAppointmentService.updateAppointmentStatus(id, userId, status, notes);
    return ResponseHandler.updated(res, appointment, 'Randevu durumu güncellendi');
  });

  /**
   * Randevu durumunu güncelle (mekanik tarafından)
   */
  static updateAppointmentByMechanic = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    const { status, notes, rejectionReason } = req.body;

    if (!status) {
      return ResponseHandler.badRequest(res, 'Durum bilgisi gerekli');
    }

    const appointment = await MaintenanceAppointmentService.updateAppointmentByMechanic(id, userId, status, notes, rejectionReason);
    return ResponseHandler.updated(res, appointment, 'Randevu durumu güncellendi');
  });

  /**
   * Randevu durumunu güncelle (admin/dummy mekanik tarafından)
   */
  static updateAppointmentStatusDummy = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes, rejectionReason } = req.body;

    if (!status) {
      return ResponseHandler.badRequest(res, 'Durum bilgisi gerekli');
    }

    // Dummy mekanik ID'si (gerçek uygulamada auth middleware kullanılır)
    const dummyMechanicId = '68a1d1a6897c4b2d176c8965';
    
    const appointment = await MaintenanceAppointmentService.updateAppointmentByMechanic(id, dummyMechanicId, status, notes, rejectionReason);
    
    // Bildirim gönder
    try {
      console.log('🔔 Bildirim gönderiliyor...');
      console.log('User ID:', appointment.userId.toString());
      console.log('Status:', status);
      
      const statusText = status === 'confirmed' ? 'onaylandı' : status === 'rejected' ? 'reddedildi' : 'güncellendi';
      const message = `Randevunuz ${statusText}! ${notes ? `Not: ${notes}` : ''}`;
      
      console.log('Bildirim mesajı:', message);
      
      sendNotificationToUser(appointment.userId.toString(), {
        type: 'appointment_status_update',
        title: 'Randevu Durumu Güncellendi',
        message: message,
        appointmentId: appointment._id,
        status: status,
        timestamp: new Date(),
        read: false,
        _id: Date.now().toString() // Geçici ID
      });
      
      console.log('✅ Bildirim gönderildi!');
    } catch (error) {
      console.error('❌ Bildirim gönderme hatası:', error);
    }
    
    return ResponseHandler.updated(res, appointment, 'Randevu durumu güncellendi');
  });

  /**
   * Randevuyu iptal et
   */
  static cancelAppointment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { id } = req.params;
    await MaintenanceAppointmentService.cancelAppointment(id, userId);
    return ResponseHandler.success(res, null, 'Randevu başarıyla iptal edildi');
  });

  /**
   * Randevu arama
   */
  static searchAppointments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { q } = req.query;
    const userId = req.user?.userId;

    if (!q || typeof q !== 'string') {
      return ResponseHandler.badRequest(res, 'Arama terimi gerekli');
    }

    const appointments = await MaintenanceAppointmentService.searchAppointments(q, userId);
    return ResponseHandler.success(res, appointments, 'Arama sonuçları başarıyla getirildi');
  });

  /**
   * Tarih aralığında randevuları getir
   */
  static getAppointmentsByDateRange = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const userId = req.user?.userId;

    if (!startDate || !endDate) {
      return ResponseHandler.badRequest(res, 'Başlangıç ve bitiş tarihi gerekli');
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return ResponseHandler.badRequest(res, 'Geçerli tarih formatı gerekli');
    }

    const appointments = await MaintenanceAppointmentService.getAppointmentsByDateRange(start, end, userId);
    return ResponseHandler.success(res, appointments, 'Tarih aralığında randevular getirildi');
  });

  /**
   * Randevu istatistikleri
   */
  static getAppointmentStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const stats = await MaintenanceAppointmentService.getAppointmentStats(userId);
    return ResponseHandler.success(res, stats, 'İstatistikler başarıyla getirildi');
  });

  /**
   * Tüm randevuları getir (admin için)
   */
  static getAllAppointments = asyncHandler(async (req: Request, res: Response) => {
    // Bu endpoint için daha sonra admin kontrolü eklenebilir
    const appointments = await MaintenanceAppointmentService.getUserAppointments('all');
    return ResponseHandler.success(res, appointments, 'Tüm randevular başarıyla getirildi');
  });

  /**
   * Mekaniğin müsaitlik durumunu getir
   */
  static getMechanicAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { date, mechanicId } = req.query;

    if (!date || !mechanicId) {
      return ResponseHandler.badRequest(res, 'Tarih ve mekanik ID gerekli');
    }

    const availableSlots = await MaintenanceAppointmentService.getMechanicAvailability(date as string, mechanicId as string);
    return ResponseHandler.success(res, { availableSlots }, 'Müsait saatler başarıyla getirildi');
  });
}
