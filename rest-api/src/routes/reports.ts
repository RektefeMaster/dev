import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/reports/end-of-day:
 *   get:
 *     summary: Günün sonu raporu oluştur
 *     description: Belirli bir tarih için günün sonu raporu oluşturur
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Rapor tarihi (YYYY-MM-DD formatında, varsayılan bugün)
 *     responses:
 *       200:
 *         description: Günün sonu raporu başarıyla oluşturuldu
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/end-of-day', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const dateParam = req.query.date as string;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Tarih belirleme
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz tarih formatı. YYYY-MM-DD formatında olmalıdır.'
        });
      }
    } else {
      targetDate = new Date();
    }

    // Günün başı ve sonu
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // O günkü işleri getir
    const dailyJobs = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $addFields: {
          effectivePrice: { $ifNull: ['$finalPrice', '$price'] }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEarnings: { $sum: '$effectivePrice' }
        }
      }
    ]);

    // Tamamlanan işlerin detaylarını getir
    const completedJobs = await Appointment.find({
      mechanicId: new Types.ObjectId(mechanicId),
      status: 'TAMAMLANDI',
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('userId', 'name surname')
    .sort({ appointmentDate: -1 });

    // Toplam kazanç hesapla (finalPrice öncelikli, yoksa price)
    const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.finalPrice || job.price || 0), 0);

    // Yeni müşteri sayısı
    const newCustomers = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          appointmentDate: { $gte: startOfDay, $lte: endOfDay },
          status: 'TAMAMLANDI'
        }
      },
      {
        $group: {
          _id: '$userId',
          firstVisit: { $min: '$appointmentDate' }
        }
      },
      {
        $match: {
          firstVisit: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $count: 'newCustomers'
      }
    ]);

    const reportData = {
      date: targetDate.toISOString().split('T')[0],
      totalEarnings,
      completedJobs: completedJobs.length,
      newCustomers: newCustomers[0]?.newCustomers || 0,
      appointments: completedJobs.map(job => ({
        id: job._id,
        serviceType: job.serviceType,
        price: job.price,
        customer: job.userId,
        appointmentDate: job.appointmentDate
      }))
    };

    res.json({
      success: true,
      data: reportData,
      message: 'Günün sonu raporu başarıyla oluşturuldu'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Rapor oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/weekly-earnings:
 *   get:
 *     summary: Haftalık kazanç raporu
 *     description: Son 7 günlük kazanç raporunu getirir
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Haftalık kazanç raporu başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/weekly-earnings', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Son 7 gün
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const weeklyEarnings = await Appointment.aggregate([
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
          totalEarnings: { $sum: '$price' },
          totalJobs: { $sum: 1 }
        }
      }
    ]);

    const earnings = weeklyEarnings[0] || { totalEarnings: 0, totalJobs: 0 };

    res.json({
      success: true,
      data: earnings,
      message: 'Haftalık kazanç raporu başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Haftalık kazanç raporu getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/monthly-earnings:
 *   get:
 *     summary: Aylık kazanç raporu
 *     description: Bu ayın kazanç raporunu getirir
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aylık kazanç raporu başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/monthly-earnings', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Bu ay
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyEarnings = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$price' },
          totalJobs: { $sum: 1 }
        }
      }
    ]);

    const earnings = monthlyEarnings[0] || { totalEarnings: 0, totalJobs: 0 };

    res.json({
      success: true,
      data: earnings,
      message: 'Aylık kazanç raporu başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Aylık kazanç raporu getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/yearly-earnings:
 *   get:
 *     summary: Yıllık kazanç raporu
 *     description: Bu yılın kazanç raporunu getirir
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Yıllık kazanç raporu başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/yearly-earnings', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Bu yıl
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    const endOfYear = new Date();
    endOfYear.setMonth(11, 31);
    endOfYear.setHours(23, 59, 59, 999);

    const yearlyEarnings = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$price' },
          totalJobs: { $sum: 1 }
        }
      }
    ]);

    const earnings = yearlyEarnings[0] || { totalEarnings: 0, totalJobs: 0 };

    res.json({
      success: true,
      data: earnings,
      message: 'Yıllık kazanç raporu başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Yıllık kazanç raporu getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reports/mechanic-stats:
 *   get:
 *     summary: Usta istatistikleri
 *     description: Ustanın genel istatistiklerini getirir
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usta istatistikleri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/mechanic-stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Genel istatistikler
    const stats = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId)
        }
      },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'TAMAMLANDI'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'TAMAMLANDI'] }, '$price', 0] }
          },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    const result = stats[0] || {
      totalAppointments: 0,
      completedAppointments: 0,
      totalEarnings: 0,
      averageRating: 0
    };

    res.json({
      success: true,
      data: result,
      message: 'Usta istatistikleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Usta istatistikleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
