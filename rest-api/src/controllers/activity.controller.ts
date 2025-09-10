import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/auth.d';

export class ActivityController {
  static getRecentActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    try {
      // Gerçek aktiviteleri veritabanından çek
      const activities = await ActivityController.fetchRealActivities(userId);
      
      res.json({
        success: true,
        message: 'Son aktiviteler getirildi',
        data: { activities }
      });
    } catch (error) {
      console.error('Aktivite çekme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Aktiviteler getirilirken hata oluştu'
      });
    }
  });

  private static async fetchRealActivities(mechanicId: string) {
    const { Appointment } = require('../models/Appointment');
    const { AppointmentRating } = require('../models/AppointmentRating');
    
    const activities: any[] = [];

    try {
      // Son tamamlanan işler
      const completedJobs = await Appointment.find({
        mechanicId,
        status: 'TAMAMLANDI'
      })
      .populate('userId', 'name surname')
      .populate('vehicleId', 'brand modelName')
      .sort({ updatedAt: -1 })
      .limit(3);

      completedJobs.forEach((job: any) => {
        const timeDiff = Date.now() - new Date(job.updatedAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const timeText = hoursAgo < 1 ? 'Az önce' : 
                        hoursAgo < 24 ? `${hoursAgo} saat önce` : 
                        `${Math.floor(hoursAgo / 24)} gün önce`;

        activities.push({
          id: `job_${job._id}`,
          title: `${job.serviceType} Tamamlandı`,
          subtitle: `${job.userId?.name} ${job.userId?.surname} - ${job.vehicleId?.brand} ${job.vehicleId?.modelName}`,
          time: timeText,
          icon: 'checkmark-circle',
          color: '#10B981',
          type: 'job_completed',
          data: job
        });
      });

      // Son alınan değerlendirmeler
      const recentRatings = await AppointmentRating.find({
        mechanicId
      })
      .populate('userId', 'name surname')
      .populate('appointmentId', 'serviceType')
      .sort({ createdAt: -1 })
      .limit(3);

      recentRatings.forEach((rating: any) => {
        const timeDiff = Date.now() - new Date(rating.createdAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const timeText = hoursAgo < 1 ? 'Az önce' : 
                        hoursAgo < 24 ? `${hoursAgo} saat önce` : 
                        `${Math.floor(hoursAgo / 24)} gün önce`;

        activities.push({
          id: `rating_${rating._id}`,
          title: `${rating.rating} Yıldız Değerlendirme`,
          subtitle: `${rating.userId?.name} ${rating.userId?.surname} - ${rating.appointmentId?.serviceType}`,
          time: timeText,
          icon: 'star',
          color: '#F59E0B',
          type: 'rating_received',
          data: rating
        });
      });

      // Son onaylanan randevular
      const approvedAppointments = await Appointment.find({
        mechanicId,
        status: 'PLANLANDI'
      })
      .populate('userId', 'name surname')
      .populate('vehicleId', 'brand modelName')
      .sort({ updatedAt: -1 })
      .limit(2);

      approvedAppointments.forEach((appointment: any) => {
        const timeDiff = Date.now() - new Date(appointment.updatedAt).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const timeText = hoursAgo < 1 ? 'Az önce' : 
                        hoursAgo < 24 ? `${hoursAgo} saat önce` : 
                        `${Math.floor(hoursAgo / 24)} gün önce`;

        activities.push({
          id: `appointment_${appointment._id}`,
          title: 'Randevu Onaylandı',
          subtitle: `${appointment.userId?.name} ${appointment.userId?.surname} - ${appointment.serviceType}`,
          time: timeText,
          icon: 'calendar',
          color: '#3B82F6',
          type: 'appointment_approved',
          data: appointment
        });
      });

      // Aktiviteleri zamana göre sırala ve en son 8 tanesini al
      return activities
        .sort((a, b) => {
          const timeA = new Date(a.data.updatedAt || a.data.createdAt).getTime();
          const timeB = new Date(b.data.updatedAt || b.data.createdAt).getTime();
          return timeB - timeA;
        })
        .slice(0, 8);

    } catch (error) {
      console.error('Aktivite verileri çekme hatası:', error);
      
      // Hata durumunda basit mock data döndür
      return [
        {
          id: 'fallback_1',
          title: 'Sistem Başlatıldı',
          subtitle: 'Aktiviteler yükleniyor...',
          time: 'Az önce',
          icon: 'information-circle',
          color: '#6B7280',
          type: 'system'
        }
      ];
    }
  }
}
