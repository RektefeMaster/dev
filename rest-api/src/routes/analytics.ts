import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { Appointment } from '../models/Appointment';
import { Types } from 'mongoose';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import Logger from '../utils/logger';

const router = Router();

router.post('/events', auth, async (req: Request, res: Response) => {
  try {
    const { event, properties, timestamp } = req.body as {
      event?: string;
      properties?: Record<string, any>;
      timestamp?: string;
    };

    if (!event || typeof event !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir event alanı gereklidir.',
      });
    }

    const tenantId = (req.headers['x-tenant-id'] as string) || req.tenantId || 'default';
    const createdAt = new Date();
    const eventTimestamp = timestamp ? new Date(timestamp) : createdAt;

    if (Number.isNaN(eventTimestamp.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'timestamp geçerli bir tarih olmalıdır.',
      });
    }

    let userId: Types.ObjectId | undefined;
    if (req.user?.userId && Types.ObjectId.isValid(req.user.userId)) {
      userId = new Types.ObjectId(req.user.userId);
    }

    await AnalyticsEvent.create({
      tenantId,
      userId,
      userType: req.user?.userType,
      event,
      properties,
      timestamp: eventTimestamp,
      createdAt,
      requestId: req.headers['x-request-id'] as string,
      platform: properties?.platform || (req.headers['x-client-platform'] as string),
      appVersion: properties?.appVersion || (req.headers['x-app-version'] as string),
      userAgent: req.headers['user-agent'],
    });

    Logger.info('Analytics event kaydedildi', {
      tenantId,
      userId: userId?.toHexString(),
      event,
    });

    return res.status(201).json({
      success: true,
      message: 'Analytics event kaydedildi.',
    });
  } catch (error: any) {
    Logger.error('Analytics event kaydedilirken hata', { error });
    return res.status(500).json({
      success: false,
      message: 'Analytics event kaydedilemedi.',
    });
  }
});

/**
 * @swagger
 * /api/analytics/monthly-trend:
 *   get:
 *     summary: Aylık kazanç trendi
 *     description: Ustanın aylık kazanç trendini getirir
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 3
 *           maximum: 12
 *         description: Kaç aylık trend getirilecek
 *     responses:
 *       200:
 *         description: Aylık trend başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/monthly-trend', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const months = parseInt(req.query.months as string) || 6;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    const now = new Date();
    const monthlyTrend = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthData = await Appointment.aggregate([
        {
          $match: {
            mechanicId: new Types.ObjectId(mechanicId),
            status: 'TAMAMLANDI',
            appointmentDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            earnings: { $sum: '$price' },
            jobs: { $sum: 1 }
          }
        }
      ]);

      const monthName = startDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
      
      monthlyTrend.push({
        month: monthName,
        earnings: monthData[0]?.earnings || 0,
        jobs: monthData[0]?.jobs || 0
      });
    }

    res.json({
      success: true,
      data: monthlyTrend,
      message: 'Aylık trend başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Aylık trend getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/analytics/service-breakdown:
 *   get:
 *     summary: Hizmet kategorisi dağılımı
 *     description: Ustanın hizmet kategorilerine göre kazanç dağılımını getirir
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Analiz periyodu
 *     responses:
 *       200:
 *         description: Hizmet dağılımı başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/service-breakdown', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const period = req.query.period as string || 'month';
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    let startDate: Date;
    let endDate: Date;

    const now = new Date();
    if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
      endDate = new Date();
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const serviceBreakdown = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          earnings: { $sum: '$price' }
        }
      },
      {
        $sort: { earnings: -1 }
      }
    ]);

    const totalEarnings = serviceBreakdown.reduce((sum, item) => sum + item.earnings, 0);

    const breakdown = serviceBreakdown.map(item => ({
      service: item._id || 'Diğer',
      count: item.count,
      earnings: item.earnings,
      percentage: totalEarnings > 0 ? Math.round((item.earnings / totalEarnings) * 100) : 0
    }));

    res.json({
      success: true,
      data: breakdown,
      message: 'Hizmet dağılımı başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Hizmet dağılımı getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/analytics/peak-hours:
 *   get:
 *     summary: Yoğun saatler analizi
 *     description: Ustanın en yoğun çalışma saatlerini getirir
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Analiz periyodu
 *     responses:
 *       200:
 *         description: Yoğun saatler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/peak-hours', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const period = req.query.period as string || 'month';
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    let startDate: Date;
    let endDate: Date;

    const now = new Date();
    if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
      endDate = new Date();
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const hourlyDistribution = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$appointmentDate' },
          count: { $sum: 1 },
          earnings: { $sum: '$price' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const peakHours = hourlyDistribution.map(item => {
      const hour = item._id;
      const nextHour = (hour + 1) % 24;
      return `${hour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`;
    });

    res.json({
      success: true,
      data: peakHours,
      message: 'Yoğun saatler başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Yoğun saatler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/analytics/customer-stats:
 *   get:
 *     summary: Müşteri istatistikleri
 *     description: Ustanın müşteri memnuniyeti ve tekrar eden müşteri sayısını getirir
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Analiz periyodu
 *     responses:
 *       200:
 *         description: Müşteri istatistikleri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/customer-stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const period = req.query.period as string || 'month';
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    let startDate: Date;
    let endDate: Date;

    const now = new Date();
    if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
      endDate = new Date();
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Müşteri memnuniyeti (rating ortalaması)
    const ratingStats = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startDate, $lte: endDate },
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // Tekrar eden müşteriler
    const repeatCustomers = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $count: 'repeatCustomers'
      }
    ]);

    // Ortalama iş süresi
    const jobDurationStats = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startDate, $lte: endDate },
          completedAt: { $exists: true }
        }
      },
      {
        $addFields: {
          duration: {
            $divide: [
              { $subtract: ['$completedAt', '$appointmentDate'] },
              1000 * 60 * 60 // Saat cinsinden
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: '$duration' }
        }
      }
    ]);

    const stats = {
      customerSatisfaction: ratingStats[0]?.averageRating || 0,
      totalRatings: ratingStats[0]?.totalRatings || 0,
      repeatCustomers: repeatCustomers[0]?.repeatCustomers || 0,
      averageJobDuration: jobDurationStats[0]?.averageDuration || 0
    };

    res.json({
      success: true,
      data: stats,
      message: 'Müşteri istatistikleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Müşteri istatistikleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
