import { Request, Response } from 'express';
import { ResponseHandler } from '../utils/response';
import { AppointmentService } from '../services/appointment.service';
import { Appointment } from '../models/Appointment';

export class MechanicJobsController {
  /**
   * Ustanın işlerini getir
   */
  static async getMechanicJobs(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.userId;
      if (!userId) {
        return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
      }

      const { status, q } = req.query as { status?: string; q?: string };

      // Randevuları çek (mevcut servis ile)
      const statusMap: Record<string, string | undefined> = {
        pending: 'pending',
        approved: 'confirmed',
        confirmed: 'confirmed',
        active: 'confirmed',
        inprogress: 'in-progress',
        'in-progress': 'in-progress',
        completed: 'completed',
      };

      const mappedStatus = status ? statusMap[status] ?? status : undefined;
      const appointments = await AppointmentService.getMechanicAppointments(userId, mappedStatus);

      // Basit arama filtresi (serviceType, description, customer name)
      const filtered = q
        ? appointments.filter((apt: any) => {
            const hay = `${apt.serviceType} ${apt.description || ''} ${apt.customer?.name || ''} ${apt.customer?.surname || ''}`.toLowerCase();
            return hay.includes(q.toLowerCase());
          })
        : appointments;

      // Özet metrikleri hazırla
      const summary = filtered.reduce(
        (acc: any, apt: any) => {
          acc.total += 1;
          acc.byStatus[apt.status] = (acc.byStatus[apt.status] || 0) + 1;
          if (apt.status === 'completed') acc.completedAmount += apt.price || 0;
          return acc;
        },
        { total: 0, completedAmount: 0, byStatus: {} as Record<string, number> }
      );

      return ResponseHandler.success(res, { jobs: filtered, summary }, 'İşler başarıyla getirildi');
    } catch (error) {
      return ResponseHandler.error(res, 'Sunucu hatası', 500);
    }
  }

  /**
   * İş detayını getir
   */
  static async getJobDetails(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const userId = (req.user as any)?.userId;
      if (!userId) {
        return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
      }

      const job = await AppointmentService.getAppointmentById(jobId, userId);
      return ResponseHandler.success(res, job, 'İş detayı başarıyla getirildi');
    } catch (error) {
      return ResponseHandler.error(res, 'Sunucu hatası', 500);
    }
  }

  /**
   * İş durumunu güncelle
   */
  static async updateJobStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const { status, rejectionReason, mechanicNotes } = req.body;

      const updated = await AppointmentService.updateAppointmentStatus(jobId, status, rejectionReason, mechanicNotes);
      return ResponseHandler.success(res, updated, 'İş durumu başarıyla güncellendi');
    } catch (error) {
      return ResponseHandler.error(res, 'Sunucu hatası', 500);
    }
  }

  /**
   * İş fiyatını güncelle
   */
  static async updateJobPrice(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const { price } = req.body;

      if (!price || typeof price !== 'number' || price <= 0) {
        return ResponseHandler.badRequest(res, 'Geçerli bir fiyat gerekli');
      }

      // Appointment'ı bul ve fiyatını güncelle
      const appointment = await Appointment.findByIdAndUpdate(
        jobId,
        { 
          price: price,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!appointment) {
        return ResponseHandler.notFound(res, 'Randevu bulunamadı');
      }

      return ResponseHandler.success(res, { appointment }, 'Fiyat başarıyla güncellendi');
    } catch (error) {
      return ResponseHandler.error(res, 'Sunucu hatası', 500);
    }
  }

  /**
   * İşi tamamla
   */
  static async completeJob(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const { finalPrice, mechanicNotes, estimatedDuration } = req.body;

      if (!finalPrice || typeof finalPrice !== 'number' || finalPrice <= 0) {
        return ResponseHandler.badRequest(res, 'Geçerli bir ücret gerekli');
      }

      const completed = await AppointmentService.completeAppointment(jobId, mechanicNotes || '', finalPrice, estimatedDuration);
      return ResponseHandler.success(res, completed, 'İş başarıyla tamamlandı');
    } catch (error) {
      return ResponseHandler.error(res, 'Sunucu hatası', 500);
    }
  }

  /**
   * İş istatistikleri
   */
  static async getJobStats(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.userId;
      if (!userId) {
        return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
      }

      const stats = await AppointmentService.getAppointmentStats(userId);
      return ResponseHandler.success(res, stats, 'İstatistikler başarıyla getirildi');
    } catch (error) {
      return ResponseHandler.error(res, 'Sunucu hatası', 500);
    }
  }

  /**
   * İş programı
   */
  static async getJobSchedule(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.userId;
      if (!userId) {
        return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
      }

      // Bugünün onaylı/işlemde randevuları program gibi göster
      const schedule = await AppointmentService.getTodaysAppointments(userId);
      return ResponseHandler.success(res, schedule, 'Program başarıyla getirildi');
    } catch (error) {
      return ResponseHandler.error(res, 'Sunucu hatası', 500);
    }
  }

  /**
   * Usta için detaylı "Servis Aç" (dükkana gelen müşteri/araç) oluştur
   * Body örneği:
   * {
   *   customer: { name, surname, phone, email? },
   *   vehicle: { brand, modelName, year, plateNumber, fuelType?, engineType?, transmission?, color?, mileage? },
   *   service: { serviceType, appointmentDate, timeSlot, description?, estimatedDuration?, price?, mechanicNotes?, startImmediately? }
   * }
   */
  // createShopService kaldırıldı (appointments üzerinden ilerleniyor)
}
