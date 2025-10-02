import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Ustanın müşterilerini getir
 *     description: Usta ile çalışmış tüm müşterileri listeler
 *     tags:
 *       - Customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Müşteri arama terimi
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
 *         description: Sayfa başına müşteri sayısı
 *     responses:
 *       200:
 *         description: Müşteriler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Usta ile çalışmış müşterileri getir
    const customers = await Appointment.aggregate([
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
        $project: {
          _id: 1,
          name: '$customerInfo.name',
          surname: '$customerInfo.surname',
          phone: '$customerInfo.phone',
          email: '$customerInfo.email',
          totalJobs: 1,
          totalSpent: 1,
          lastVisit: 1,
          firstVisit: 1,
          loyaltyScore: {
            $cond: {
              if: { $gte: ['$totalJobs', 3] },
              then: 'high',
              else: {
                $cond: {
                  if: { $gte: ['$totalJobs', 2] },
                  then: 'medium',
                  else: 'low'
                }
              }
            }
          }
        }
      },
      {
        $sort: { lastVisit: -1 }
      }
    ]);

    // Arama filtresi uygula
    let filteredCustomers = customers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCustomers = customers.filter(customer => 
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.surname?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(search) ||
        customer.email?.toLowerCase().includes(searchLower)
      );
    }

    // Sayfalama uygula
    const total = filteredCustomers.length;
    const paginatedCustomers = filteredCustomers.slice(skip, skip + limit);

    res.json({
      success: true,
      data: paginatedCustomers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: `${total} müşteri bulundu`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Müşteriler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/customers/{customerId}:
 *   get:
 *     summary: Müşteri detaylarını getir
 *     description: Belirli bir müşterinin detaylarını ve geçmiş işlerini getirir
 *     tags:
 *       - Customers
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
 *         description: Müşteri detayları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Müşteri bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:customerId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { customerId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Müşteri bilgilerini getir
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Müşteri bulunamadı'
      });
    }

    // Müşterinin bu usta ile yaptığı işleri getir
    const jobs = await Appointment.find({
      userId: new Types.ObjectId(customerId),
      mechanicId: new Types.ObjectId(mechanicId)
    })
    .sort({ appointmentDate: -1 })
    .limit(20);

    // İstatistikleri hesapla
    const stats = await Appointment.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(customerId),
          mechanicId: new Types.ObjectId(mechanicId)
        }
      },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          totalSpent: { $sum: '$price' },
          averageSpending: { $avg: '$price' },
          lastVisit: { $max: '$appointmentDate' },
          firstVisit: { $min: '$appointmentDate' }
        }
      }
    ]);

    // Ustanın bu müşteri için notlarını getir
    const mechanic = await User.findById(mechanicId);
    const customerNotes = mechanic?.customerNotes?.filter(note => 
      note.customerId === customerId
    ) || [];

    const customerData = {
      customer: {
        _id: customer._id,
        name: customer.name,
        surname: customer.surname,
        phone: customer.phone,
        email: customer.email,
        city: customer.city
      },
      stats: stats[0] || {
        totalJobs: 0,
        totalSpent: 0,
        averageSpending: 0,
        lastVisit: null,
        firstVisit: null
      },
      jobs: jobs,
      notes: customerNotes
    };

    res.json({
      success: true,
      data: customerData,
      message: 'Müşteri detayları başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Müşteri detayları getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/customers/{customerId}/notes:
 *   post:
 *     summary: Müşteri notu ekle
 *     description: Belirli bir müşteri için not ekler
 *     tags:
 *       - Customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Müşteri ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 description: Not içeriği
 *                 example: "Bu müşterinin aracında kronik sensör arızası var"
 *     responses:
 *       200:
 *         description: Not başarıyla eklendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/:customerId/notes', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { customerId } = req.params;
    const { note } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Not içeriği gerekli'
      });
    }

    // Ustanın profilini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      mechanicId,
      {
        $push: {
          customerNotes: {
            customerId,
            note: note.trim(),
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        customerId,
        note: note.trim(),
        createdAt: new Date()
      },
      message: 'Not başarıyla eklendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Not eklenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/customers/{customerId}/notes/{noteId}:
 *   put:
 *     summary: Müşteri notunu güncelle
 *     description: Belirli bir müşteri notunu günceller
 *     tags:
 *       - Customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Müşteri ID'si
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Not ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 description: Güncellenmiş not içeriği
 *     responses:
 *       200:
 *         description: Not başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Not bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:customerId/notes/:noteId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { customerId, noteId } = req.params;
    const { note } = req.body;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Not içeriği gerekli'
      });
    }

    // Ustanın profilini güncelle
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: mechanicId,
        'customerNotes._id': noteId,
        'customerNotes.customerId': customerId
      },
      {
        $set: {
          'customerNotes.$.note': note.trim(),
          'customerNotes.$.updatedAt': new Date()
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Not bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        noteId,
        note: note.trim(),
        updatedAt: new Date()
      },
      message: 'Not başarıyla güncellendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Not güncellenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/customers/{customerId}/notes/{noteId}:
 *   delete:
 *     summary: Müşteri notunu sil
 *     description: Belirli bir müşteri notunu siler
 *     tags:
 *       - Customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Müşteri ID'si
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Not ID'si
 *     responses:
 *       200:
 *         description: Not başarıyla silindi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Not bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:customerId/notes/:noteId', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { customerId, noteId } = req.params;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }

    // Ustanın profilini güncelle
    const updatedUser = await User.findByIdAndUpdate(
      mechanicId,
      {
        $pull: {
          customerNotes: {
            _id: noteId,
            customerId: customerId
          }
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Not bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Not başarıyla silindi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Not silinirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
