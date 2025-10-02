import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/loyal-customers/check/{customerId}:
 *   get:
 *     summary: Müşteri sadakat kontrolü
 *     description: Belirli bir müşterinin sadakat durumunu kontrol eder
 *     tags:
 *       - Loyal Customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Müşteri ID'si
 *     responses:
 *       200:
 *         description: Sadakat bilgileri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Müşteri bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/check/:customerId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { customerId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Müşterinin bu usta ile yaptığı işleri getir
    const customerJobs = await Appointment.find({
      userId: new Types.ObjectId(customerId),
      mechanicId: new Types.ObjectId(mechanicId),
      status: 'TAMAMLANDI'
    }).sort({ appointmentDate: -1 });

    // Sadakat bilgilerini hesapla
    const totalJobs = customerJobs.length;
    const totalSpent = customerJobs.reduce((sum, job) => sum + (job.price || 0), 0);
    const averageSpending = totalJobs > 0 ? totalSpent / totalJobs : 0;
    
    // İlk ve son ziyaret tarihleri
    const firstVisit = customerJobs.length > 0 ? customerJobs[customerJobs.length - 1].appointmentDate : null;
    const lastVisit = customerJobs.length > 0 ? customerJobs[0].appointmentDate : null;

    // Sadakat seviyesi belirleme
    let loyaltyLevel = 'low';
    let loyaltyScore = 0;

    if (totalJobs >= 5) {
      loyaltyLevel = 'high';
      loyaltyScore = 100;
    } else if (totalJobs >= 3) {
      loyaltyLevel = 'medium';
      loyaltyScore = 60;
    } else if (totalJobs >= 2) {
      loyaltyLevel = 'low';
      loyaltyScore = 30;
    }

    // Sadakat rozetleri
    const badges = [];
    if (totalJobs >= 10) badges.push({ name: 'VIP Müşteri', description: '10+ iş tamamlandı' });
    if (totalJobs >= 5) badges.push({ name: 'Sadık Müşteri', description: '5+ iş tamamlandı' });
    if (totalSpent >= 10000) badges.push({ name: 'Yüksek Harcama', description: '₺10,000+ harcama' });
    if (averageSpending >= 2000) badges.push({ name: 'Premium Müşteri', description: 'Yüksek ortalama harcama' });

    // Müşteri bilgilerini getir
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı'
      });
    }

    const loyaltyInfo = {
      customer: {
        _id: customer._id,
        name: customer.name,
        surname: customer.surname,
        phone: customer.phone,
        email: customer.email
      },
      loyalty: {
        level: loyaltyLevel,
        score: loyaltyScore,
        totalJobs,
        totalSpent,
        averageSpending: Math.round(averageSpending),
        firstVisit,
        lastVisit,
        badges
      },
      isLoyal: totalJobs >= 2,
      visitCount: totalJobs
    };

    res.json({
      success: true,
      data: loyaltyInfo,
      message: 'Sadakat bilgileri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Sadakat bilgileri getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/loyal-customers/list:
 *   get:
 *     summary: Sadık müşteri listesi
 *     description: Ustanın sadık müşterilerini listeler
 *     tags:
 *       - Loyal Customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: minJobs
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 2
 *         description: Minimum iş sayısı (varsayılan 2)
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [jobs, spending, lastVisit]
 *         description: Sıralama kriteri
 *     responses:
 *       200:
 *         description: Sadık müşteriler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/list', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const minJobs = parseInt(req.query.minJobs as string) || 2;
    const sortBy = req.query.sortBy as string || 'lastVisit';

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Sadık müşterileri bul
    const loyalCustomers = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI'
        }
      },
      {
        $group: {
          _id: '$userId',
          totalJobs: { $sum: 1 },
          totalSpent: { $sum: '$price' },
          lastVisit: { $max: '$appointmentDate' },
          firstVisit: { $min: '$appointmentDate' }
        }
      },
      {
        $match: {
          totalJobs: { $gte: minJobs }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $unwind: '$customerInfo'
      },
      {
        $addFields: {
          averageSpending: { $divide: ['$totalSpent', '$totalJobs'] },
          loyaltyLevel: {
            $cond: {
              if: { $gte: ['$totalJobs', 5] },
              then: 'high',
              else: {
                $cond: {
                  if: { $gte: ['$totalJobs', 3] },
                  then: 'medium',
                  else: 'low'
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          customer: {
            _id: '$customerInfo._id',
            name: '$customerInfo.name',
            surname: '$customerInfo.surname',
            phone: '$customerInfo.phone',
            email: '$customerInfo.email'
          },
          loyalty: {
            level: '$loyaltyLevel',
            totalJobs: 1,
            totalSpent: 1,
            averageSpending: { $round: ['$averageSpending', 0] },
            lastVisit: 1,
            firstVisit: 1
          }
        }
      }
    ]);

    // Sıralama uygula
    let sortedCustomers = loyalCustomers;
    switch (sortBy) {
      case 'jobs':
        sortedCustomers = loyalCustomers.sort((a, b) => b.loyalty.totalJobs - a.loyalty.totalJobs);
        break;
      case 'spending':
        sortedCustomers = loyalCustomers.sort((a, b) => b.loyalty.totalSpent - a.loyalty.totalSpent);
        break;
      case 'lastVisit':
      default:
        sortedCustomers = loyalCustomers.sort((a, b) => 
          new Date(b.loyalty.lastVisit).getTime() - new Date(a.loyalty.lastVisit).getTime()
        );
        break;
    }

    res.json({
      success: true,
      data: sortedCustomers,
      message: `${sortedCustomers.length} sadık müşteri bulundu`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Sadık müşteriler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/loyal-customers/stats:
 *   get:
 *     summary: Sadık müşteri istatistikleri
 *     description: Ustanın sadık müşteri istatistiklerini getirir
 *     tags:
 *       - Loyal Customers
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

    // Sadık müşteri istatistikleri
    const stats = await Appointment.aggregate([
      {
        $match: {
          mechanicId: new Types.ObjectId(mechanicId),
          status: 'TAMAMLANDI'
        }
      },
      {
        $group: {
          _id: '$userId',
          totalJobs: { $sum: 1 },
          totalSpent: { $sum: '$price' }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          loyalCustomers: {
            $sum: {
              $cond: [{ $gte: ['$totalJobs', 2] }, 1, 0]
            }
          },
          vipCustomers: {
            $sum: {
              $cond: [{ $gte: ['$totalJobs', 5] }, 1, 0]
            }
          },
          totalRevenue: { $sum: '$totalSpent' },
          loyalRevenue: {
            $sum: {
              $cond: [{ $gte: ['$totalJobs', 2] }, '$totalSpent', 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalCustomers: 0,
      loyalCustomers: 0,
      vipCustomers: 0,
      totalRevenue: 0,
      loyalRevenue: 0
    };

    // Yüzde hesaplamaları
    const loyaltyRate = result.totalCustomers > 0 
      ? Math.round((result.loyalCustomers / result.totalCustomers) * 100) 
      : 0;
    
    const revenueFromLoyal = result.totalRevenue > 0 
      ? Math.round((result.loyalRevenue / result.totalRevenue) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        ...result,
        loyaltyRate,
        revenueFromLoyal,
        averageRevenuePerCustomer: result.totalCustomers > 0 
          ? Math.round(result.totalRevenue / result.totalCustomers) 
          : 0
      },
      message: 'Sadık müşteri istatistikleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'İstatistikler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/loyal-customers/alert/{appointmentId}:
 *   post:
 *     summary: Sadık müşteri uyarısı oluştur
 *     description: Yeni randevu için sadık müşteri uyarısı oluşturur
 *     tags:
 *       - Loyal Customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     responses:
 *       200:
 *         description: Uyarı başarıyla oluşturuldu
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/alert/:appointmentId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { appointmentId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
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

    // Müşterinin sadakat durumunu kontrol et
    const customerJobs = await Appointment.countDocuments({
      userId: appointment.userId,
      mechanicId: new Types.ObjectId(mechanicId),
      status: 'TAMAMLANDI'
    });

    const isLoyal = customerJobs >= 2;
    const visitCount = customerJobs + 1; // Mevcut randevu dahil

    // Randevuyu güncelle
    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: {
        loyaltyInfo: {
          isLoyal,
          visitCount,
          loyaltyScore: isLoyal ? Math.min(visitCount * 20, 100) : 0
        }
      }
    });

    // Müşteri bilgilerini getir
    const customer = await User.findById(appointment.userId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı'
      });
    }

    // Ustaya bildirim gönder
    let notificationMessage = '';
    if (isLoyal) {
      notificationMessage = `Ustam dikkat! ${customer.name} ${customer.surname} ${visitCount}. kez size geliyor. Kendisi sadık bir müşteriniz.`;
    } else {
      notificationMessage = `Yeni müşteri: ${customer.name} ${customer.surname} randevu talebinde bulundu.`;
    }

    await User.findByIdAndUpdate(
      mechanicId,
      {
        $push: {
          notifications: {
            type: 'appointment_status_update',
            title: isLoyal ? 'Sadık Müşteri Uyarısı' : 'Yeni Müşteri',
            message: notificationMessage,
            data: {
              appointmentId,
              customerId: appointment.userId,
              isLoyal,
              visitCount
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
        customer: {
          name: customer.name,
          surname: customer.surname
        },
        loyalty: {
          isLoyal,
          visitCount,
          loyaltyScore: isLoyal ? Math.min(visitCount * 20, 100) : 0
        },
        message: notificationMessage
      },
      message: 'Sadık müşteri uyarısı başarıyla oluşturuldu'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Uyarı oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

export default router;
