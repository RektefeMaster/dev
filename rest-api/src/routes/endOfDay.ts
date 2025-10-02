import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/end-of-day/report:
 *   get:
 *     summary: Günün sonu raporu oluştur
 *     description: Belirli bir tarih için günün sonu raporu oluşturur
 *     tags:
 *       - End of Day Report
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
router.get('/report', auth, async (req: Request, res: Response) => {
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
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEarnings: { $sum: '$price' }
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

    // Toplam kazanç hesapla
    const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.price || 0), 0);

    // Yeni müşteri sayısı
    const newCustomers = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: '$userId'
        }
      },
      {
        $lookup: {
          from: 'appointments',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$customerId'] },
                    { $eq: ['$mechanicId', new Types.ObjectId(mechanicId)] },
                    { $lt: ['$appointmentDate', startOfDay] }
                  ]
                }
              }
            }
          ],
          as: 'previousJobs'
        }
      },
      {
        $match: {
          'previousJobs.0': { $exists: false }
        }
      },
      {
        $count: 'newCustomers'
      }
    ]);

    // Değerlendirme sayısı
    const ratings = await Appointment.find({
      mechanicId: new Types.ObjectId(mechanicId),
      status: 'TAMAMLANDI',
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      rating: { $exists: true, $ne: null }
    });

    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, job) => sum + (job.rating || 0), 0) / ratings.length 
      : 0;

    // Rapor objesi oluştur
    const report = {
      date: targetDate.toISOString().split('T')[0],
      summary: {
        totalJobs: dailyJobs.reduce((sum, job) => sum + job.count, 0),
        completedJobs: completedJobs.length,
        totalEarnings,
        averageEarningsPerJob: completedJobs.length > 0 ? totalEarnings / completedJobs.length : 0,
        newCustomers: newCustomers[0]?.newCustomers || 0,
        totalRatings: ratings.length,
        averageRating: Math.round(averageRating * 10) / 10
      },
      jobsByStatus: dailyJobs.reduce((acc, job) => {
        acc[job._id] = {
          count: job.count,
          earnings: job.totalEarnings || 0
        };
        return acc;
      }, {} as any),
      completedJobs: completedJobs.map(job => ({
        id: job._id,
        customerName: `${job.userId?.name} ${job.userId?.surname}`,
        serviceType: job.serviceType,
        price: job.price,
        appointmentDate: job.appointmentDate,
        rating: job.rating
      })),
      achievements: []
    };

    // Başarı rozetleri ekle
    if (completedJobs.length >= 5) {
      report.achievements.push({
        type: 'high_volume',
        title: 'Yoğun Gün',
        description: `${completedJobs.length} iş tamamladınız!`
      });
    }

    if (totalEarnings >= 5000) {
      report.achievements.push({
        type: 'high_earnings',
        title: 'Yüksek Kazanç',
        description: `₺${totalEarnings.toLocaleString()} kazandınız!`
      });
    }

    if (averageRating >= 4.5) {
      report.achievements.push({
        type: 'excellent_service',
        title: 'Mükemmel Hizmet',
        description: `${averageRating} ortalama puan aldınız!`
      });
    }

    if (newCustomers[0]?.newCustomers > 0) {
      report.achievements.push({
        type: 'new_customers',
        title: 'Yeni Müşteriler',
        description: `${newCustomers[0].newCustomers} yeni müşteri kazandınız!`
      });
    }

    res.json({
      success: true,
      data: report,
      message: 'Günün sonu raporu başarıyla oluşturuldu'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Günün sonu raporu oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/end-of-day/send-automatic:
 *   post:
 *     summary: Otomatik günün sonu raporu gönder
 *     description: Tüm ustalara otomatik günün sonu raporu gönderir (cron job için)
 *     tags:
 *       - End of Day Report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Otomatik raporlar başarıyla gönderildi
 *       500:
 *         description: Sunucu hatası
 */
router.post('/send-automatic', auth, async (req: Request, res: Response) => {
  try {
    // Bu endpoint sadece admin veya sistem tarafından çağrılabilir
    const userType = (req as any).user?.userType;
    if (userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için admin yetkisi gerekli'
      });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    // Tüm ustaları getir
    const mechanics = await User.find({ userType: 'mechanic' });

    let reportsSent = 0;

    for (const mechanic of mechanics) {
      try {
        // Her usta için günün sonu raporu oluştur
        const dailyJobs = await Appointment.aggregate([
          {
            $match: {
              mechanicId: mechanic._id,
              appointmentDate: { $gte: startOfDay, $lte: endOfDay }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalEarnings: { $sum: '$price' }
            }
          }
        ]);

        const completedJobs = await Appointment.find({
          mechanicId: mechanic._id,
          status: 'TAMAMLANDI',
          appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        });

        const totalEarnings = completedJobs.reduce((sum, job) => sum + (job.price || 0), 0);

        // Ustaya bildirim gönder
        await User.findByIdAndUpdate(
          mechanic._id,
          {
            $push: {
              notifications: {
                type: 'appointment_status_update',
                title: 'Günün Sonu Raporu',
                message: `Ustam eline sağlık! Bugün ${completedJobs.length} iş tamamladınız ve ₺${totalEarnings.toLocaleString()} kazandınız. Detayları görmek için tıklayın.`,
                data: {
                  type: 'end_of_day_report',
                  date: yesterday.toISOString().split('T')[0],
                  completedJobs: completedJobs.length,
                  totalEarnings
                },
                read: false,
                createdAt: new Date()
              }
            }
          }
        );

        reportsSent++;
      } catch (error) {
        console.error(`Usta ${mechanic._id} için rapor gönderilemedi:`, error);
      }
    }

    res.json({
      success: true,
      data: {
        reportsSent,
        totalMechanics: mechanics.length,
        date: yesterday.toISOString().split('T')[0]
      },
      message: `${reportsSent} ustaya günün sonu raporu gönderildi`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Otomatik raporlar gönderilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
