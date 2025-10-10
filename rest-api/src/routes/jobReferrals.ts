import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/job-referrals/refer:
 *   post:
 *     summary: İş yönlendirme
 *     description: Bir işi başka bir ustaya yönlendirir
 *     tags:
 *       - Job Referrals
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *               - toMechanicId
 *               - reason
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 description: Randevu ID'si
 *                 example: "507f1f77bcf86cd799439011"
 *               toMechanicId:
 *                 type: string
 *                 description: Yönlendirilecek usta ID'si
 *                 example: "507f1f77bcf86cd799439012"
 *               reason:
 *                 type: string
 *                 description: Yönlendirme sebebi
 *                 example: "Bu işte uzmanım, daha iyi hizmet verebilir"
 *     responses:
 *       200:
 *         description: İş başarıyla yönlendirildi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu veya usta bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/refer', auth, async (req: Request, res: Response) => {
  try {
    const fromMechanicId = (req as any).user?.userId;
    const { appointmentId, toMechanicId, reason } = req.body;

    if (!fromMechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!appointmentId || !toMechanicId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Randevu ID, hedef usta ID ve sebep gerekli'
      });
    }

    // Randevuyu bul
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Mevcut ustanın bu randevuya sahip olduğunu kontrol et
    if (appointment.mechanicId?.toString() !== fromMechanicId) {
      return res.status(403).json({
        success: false,
        message: 'Bu randevuya erişim yetkiniz yok'
      });
    }

    // Hedef ustayı bul
    const toMechanic = await User.findById(toMechanicId);
    if (!toMechanic || toMechanic.userType !== 'mechanic') {
      return res.status(404).json({
        success: false,
        message: 'Hedef usta bulunamadı'
      });
    }

    // Kendine yönlendirme kontrolü
    if (fromMechanicId === toMechanicId) {
      return res.status(400).json({
        success: false,
        message: 'Kendinize iş yönlendiremezsiniz'
      });
    }

    // Yönlendirme bilgilerini oluştur
    const referralInfo = {
      referredBy: fromMechanicId,
      referredTo: toMechanicId,
      reason: reason.trim(),
      timestamp: new Date()
    };

    // Randevuyu güncelle
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          mechanicId: new Types.ObjectId(toMechanicId),
          referralInfo
        }
      },
      { new: true }
    );

    // Müşteriye bildirim gönder
    const customer = await User.findById(appointment.userId);
    if (customer) {
      await User.findByIdAndUpdate(
        appointment.userId,
        {
          $push: {
            notifications: {
              type: 'appointment_status_update',
              title: 'İş Yönlendirildi',
              message: `Randevunuz ${toMechanic.name} ${toMechanic.surname} ustasına yönlendirildi. Sebep: ${reason}`,
              data: {
                appointmentId,
                fromMechanicId,
                toMechanicId,
                reason
              },
              read: false,
              createdAt: new Date()
            }
          }
        }
      );
    }

    // Hedef ustaya bildirim gönder
    await User.findByIdAndUpdate(
      toMechanicId,
      {
        $push: {
          notifications: {
            type: 'appointment_status_update',
            title: 'Yeni İş Yönlendirildi',
            message: `${customer?.name} ${customer?.surname} müşterisinin randevusu size yönlendirildi. Sebep: ${reason}`,
            data: {
              appointmentId,
              fromMechanicId,
              customerId: appointment.userId,
              reason
            },
            read: false,
            createdAt: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      data: {
        appointmentId,
        fromMechanic: {
          id: fromMechanicId,
          name: (await User.findById(fromMechanicId))?.name
        },
        toMechanic: {
          id: toMechanicId,
          name: toMechanic.name,
          surname: toMechanic.surname
        },
        reason,
        timestamp: new Date()
      },
      message: 'İş başarıyla yönlendirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'İş yönlendirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/job-referrals/history:
 *   get:
 *     summary: Yönlendirme geçmişi
 *     description: Ustanın yaptığı ve aldığı iş yönlendirmelerini getirir
 *     tags:
 *       - Job Referrals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [sent, received, all]
 *         description: Yönlendirme tipi (varsayılan all)
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Sayfa başına kayıt sayısı
 *     responses:
 *       200:
 *         description: Yönlendirme geçmişi başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/history', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const type = req.query.type as string || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    let query: any = {};

    // Tip filtresi uygula
    if (type === 'sent') {
      query['referralInfo.referredBy'] = mechanicId;
    } else if (type === 'received') {
      query['referralInfo.referredTo'] = mechanicId;
    } else {
      // all - hem gönderilen hem alınan
      query.$or = [
        { 'referralInfo.referredBy': mechanicId },
        { 'referralInfo.referredTo': mechanicId }
      ];
    }

    // Yönlendirme geçmişini getir
    const referrals = await Appointment.find(query)
      .populate('userId', 'name surname phone')
      .populate('mechanicId', 'shopName')
      .sort({ 'referralInfo.timestamp': -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // 🚀 OPTIMIZE: Memory optimization

    const total = await Appointment.countDocuments(query);

    // Yönlendirme istatistikleri
    const sentCount = await Appointment.countDocuments({
      'referralInfo.referredBy': mechanicId
    });

    const receivedCount = await Appointment.countDocuments({
      'referralInfo.referredTo': mechanicId
    });

    res.json({
      success: true,
      data: {
        referrals: referrals.map(ref => ({
          id: ref._id,
          customer: {
            name: (ref.userId as any)?.name || 'Bilinmeyen',
            surname: (ref.userId as any)?.surname || 'Müşteri',
            phone: (ref.userId as any)?.phone || 'N/A'
          },
          fromMechanic: ref.referralInfo?.referredBy ? {
            id: ref.referralInfo.referredBy,
            name: ref.referralInfo.referredBy === mechanicId ? 'Siz' : 'Diğer Usta'
          } : null,
          toMechanic: {
            id: ref.referralInfo?.referredTo,
            name: ref.referralInfo?.referredTo === mechanicId ? 'Siz' : 'Diğer Usta',
            shopName: (ref.mechanicId as any)?.shopName || 'N/A'
          },
          reason: ref.referralInfo?.reason,
          timestamp: ref.referralInfo?.timestamp,
          serviceType: ref.serviceType,
          price: ref.price,
          status: ref.status
        })),
        stats: {
          sent: sentCount,
          received: receivedCount,
          total: sentCount + receivedCount
        }
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: 'Yönlendirme geçmişi başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Yönlendirme geçmişi getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/job-referrals/trusted-mechanics:
 *   get:
 *     summary: Güvenilir ustalar listesi
 *     description: Ustanın güvendiği ve iş yönlendirebileceği ustaları getirir
 *     tags:
 *       - Job Referrals
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Usta arama terimi
 *       - in: query
 *         name: serviceCategory
 *         required: false
 *         schema:
 *           type: string
 *         description: Servis kategorisi filtresi
 *       - in: query
 *         name: city
 *         required: false
 *         schema:
 *           type: string
 *         description: Şehir filtresi
 *     responses:
 *       200:
 *         description: Güvenilir ustalar başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/trusted-mechanics', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const search = req.query.search as string;
    const serviceCategory = req.query.serviceCategory as string;
    const city = req.query.city as string;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Diğer ustaları getir (kendisi hariç)
    let query: any = {
      userType: 'mechanic',
      _id: { $ne: mechanicId },
      isAvailable: true
    };

    // Filtreleri uygula
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { surname: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } }
      ];
    }

    if (serviceCategory) {
      query.serviceCategories = { $in: [serviceCategory] };
    }

    if (city) {
      query['location.city'] = city;
    }

    const trustedMechanics = await User.find(query)
      .select('name surname shopName phone serviceCategories location rating ratingCount experience')
      .sort({ rating: -1, ratingCount: -1 })
      .limit(50);

    // Her usta için yönlendirme istatistikleri ekle
    const mechanicsWithStats = await Promise.all(
      trustedMechanics.map(async (mechanic) => {
        const sentToThisMechanic = await Appointment.countDocuments({
          'referralInfo.referredTo': mechanic._id,
          'referralInfo.referredBy': mechanicId
        });

        const receivedFromThisMechanic = await Appointment.countDocuments({
          'referralInfo.referredBy': mechanic._id,
          'referralInfo.referredTo': mechanicId
        });

        return {
          _id: mechanic._id,
          name: mechanic.name,
          surname: mechanic.surname,
          shopName: mechanic.shopName,
          phone: mechanic.phone,
          serviceCategories: mechanic.serviceCategories,
          location: mechanic.location,
          rating: mechanic.rating,
          ratingCount: mechanic.ratingCount,
          experience: mechanic.experience,
          referralStats: {
            sentTo: sentToThisMechanic,
            receivedFrom: receivedFromThisMechanic,
            totalInteractions: sentToThisMechanic + receivedFromThisMechanic
          }
        };
      })
    );

    // Etkileşim sayısına göre sırala
    mechanicsWithStats.sort((a, b) => 
      b.referralStats.totalInteractions - a.referralStats.totalInteractions
    );

    res.json({
      success: true,
      data: mechanicsWithStats,
      message: `${mechanicsWithStats.length} güvenilir usta bulundu`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Güvenilir ustalar getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/job-referrals/stats:
 *   get:
 *     summary: Yönlendirme istatistikleri
 *     description: Ustanın iş yönlendirme istatistiklerini getirir
 *     tags:
 *       - Job Referrals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Yönlendirme istatistikleri
    const stats = await Appointment.aggregate([
      {
        $match: {
          $or: [
            { 'referralInfo.referredBy': mechanicId },
            { 'referralInfo.referredTo': mechanicId }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalSent: {
            $sum: {
              $cond: [{ $eq: ['$referralInfo.referredBy', mechanicId] }, 1, 0]
            }
          },
          totalReceived: {
            $sum: {
              $cond: [{ $eq: ['$referralInfo.referredTo', mechanicId] }, 1, 0]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$referralInfo.referredTo', mechanicId] },
                '$price',
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalSent: 0,
      totalReceived: 0,
      totalRevenue: 0
    };

    // En çok yönlendirme yapılan ustalar
    const topReferralTargets = await Appointment.aggregate([
      {
        $match: {
          'referralInfo.referredBy': mechanicId
        }
      },
      {
        $group: {
          _id: '$referralInfo.referredTo',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'mechanicInfo'
        }
      },
      {
        $unwind: '$mechanicInfo'
      },
      {
        $project: {
          mechanicId: '$_id',
          mechanicName: {
            $concat: ['$mechanicInfo.name', ' ', '$mechanicInfo.surname']
          },
          shopName: '$mechanicInfo.shopName',
          referralCount: '$count'
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        ...result,
        topReferralTargets,
        averageRevenuePerReferral: result.totalReceived > 0 
          ? Math.round(result.totalRevenue / result.totalReceived) 
          : 0
      },
      message: 'Yönlendirme istatistikleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'İstatistikler getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
