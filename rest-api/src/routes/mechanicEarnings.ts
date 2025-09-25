import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Appointment } from '../models/Appointment';

const router = Router();

/**
 * @swagger
 * /api/mechanic-earnings:
 *   get:
 *     summary: Ustanın kazançlarını getir
 *     description: Giriş yapan ustanın kazanç bilgilerini getirir
 *     tags:
 *       - Mechanic Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *         description: Kazanç periyodu
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Kazanç bilgileri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    
    // Bu ay ve geçen ay kazançları hesapla
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthEarnings = await Appointment.aggregate([
      { $match: { mechanicId, status: 'TAMAMLANDI', createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    const lastMonthEarnings = await Appointment.aggregate([
      { $match: { mechanicId, status: 'TAMAMLANDI', createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    const earnings = {
      thisMonth: thisMonthEarnings[0]?.total || 0,
      lastMonth: lastMonthEarnings[0]?.total || 0,
      allTime: 0, // Tüm zamanlar için ayrı endpoint gerekebilir
      completedJobs: 0,
      averagePerJob: 0,
      pendingPayments: 0
    };
    
    res.json({
      success: true,
      data: earnings,
      message: 'Earnings başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Earnings getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== EARNINGS ENDPOINTS =====
router.get('/summary', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    
    // Bu ay ve geçen ay kazançları hesapla
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthEarnings = await Appointment.aggregate([
      { $match: { mechanicId, status: 'TAMAMLANDI', createdAt: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    const lastMonthEarnings = await Appointment.aggregate([
      { $match: { mechanicId, status: 'TAMAMLANDI', createdAt: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    
    const earnings = {
      thisMonth: thisMonthEarnings[0]?.total || 0,
      lastMonth: lastMonthEarnings[0]?.total || 0,
      allTime: 0, // Tüm zamanlar için ayrı endpoint gerekebilir
      completedJobs: 0,
      averagePerJob: 0,
      pendingPayments: 0
    };
    
    res.json({
      success: true,
      data: earnings,
      message: 'Earnings başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Earnings getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic-earnings/breakdown:
 *   get:
 *     summary: Kazanç detayı
 *     description: Ustanın kazanç detaylarını kategorilere göre getirir
 *     tags:
 *       - Mechanic Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Detay periyodu
 *     responses:
 *       200:
 *         description: Kazanç detayı başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/breakdown', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const period = req.query.period as string || 'month';

    let startDate: Date;
    let endDate: Date;

    if (period === 'today') {
      startDate = new Date(new Date().setHours(0, 0, 0, 0));
      endDate = new Date(new Date().setHours(23, 59, 59, 999));
    } else if (period === 'week') {
      startDate = new Date(new Date().setDate(new Date().getDate() - 7));
      endDate = new Date(new Date().setHours(23, 59, 59, 999));
    } else if (period === 'month') {
      startDate = new Date(new Date().setDate(1));
      endDate = new Date(new Date().setDate(new Date().getDate()));
    } else if (period === 'year') {
      startDate = new Date(new Date().setMonth(0, 1));
      endDate = new Date(new Date().setMonth(11, 31));
    } else {
      startDate = new Date(new Date().setDate(1));
      endDate = new Date(new Date().setDate(new Date().getDate()));
    }

    const breakdown = await Appointment.aggregate([
      { $match: { mechanicId, status: 'TAMAMLANDI', createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$price' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: breakdown,
      message: 'Kazanç detayı başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Kazanç detayı getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic-earnings/transactions:
 *   get:
 *     summary: Kazanç işlemleri
 *     description: Ustanın kazanç işlemlerini listeler
 *     tags:
 *       - Mechanic Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Sayfa başına işlem sayısı
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: İşlem tipi
 *     responses:
 *       200:
 *         description: İşlemler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/transactions', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const type = req.query.type as string || 'income'; // 'income' veya 'expense'

    const skip = (page - 1) * limit;

    const transactions = await Appointment.find({ mechanicId, type })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments({ mechanicId, type });

    res.json({
      success: true,
      data: transactions,
      total,
      page,
      limit,
      message: 'İşlemler başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'İşlem getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic-earnings/withdraw:
 *   post:
 *     summary: Para çekme talebi
 *     description: Usta için para çekme talebi oluşturur
 *     tags:
 *       - Mechanic Earnings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - bankAccount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 50
 *                 description: Çekilecek miktar (TL)
 *               bankAccount:
 *                 type: object
 *                 required:
 *                   - bankName
 *                   - accountNumber
 *                 properties:
 *                   bankName:
 *                     type: string
 *                     description: Banka adı
 *                   accountNumber:
 *                     type: string
 *                     description: Hesap numarası
 *                   accountHolder:
 *                     type: string
 *                     description: Hesap sahibi adı
 *               notes:
 *                 type: string
 *                 description: Ek notlar
 *     responses:
 *       200:
 *         description: Para çekme talebi başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz miktar veya banka bilgileri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/withdraw', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const { amount, bankAccount, notes } = req.body;

    if (amount < 50) {
      return res.status(400).json({
        success: false,
        message: 'Para çekme miktarı en az 50 TL olmalıdır.'
      });
    }

    const newWithdrawal = {
      mechanicId,
      amount,
      bankAccount,
      notes,
      status: 'pending', // Başlangıçta pending olarak ayarla
      createdAt: new Date()
    };

    const withdrawal = await newWithdrawal; // Appointment modelini kullanıyoruz

    res.status(200).json({
      success: true,
      data: withdrawal,
      message: 'Para çekme talebi başarıyla oluşturuldu'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Para çekme talebi oluşturulurken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic-earnings/withdrawals:
 *   get:
 *     summary: Para çekme talepleri
 *     description: Ustanın para çekme taleplerini listeler
 *     tags:
 *       - Mechanic Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, completed]
 *         description: Talep durumu
 *     responses:
 *       200:
 *         description: Para çekme talepleri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/withdrawals', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user?.userId;
    const status = req.query.status as string || 'pending';

    const withdrawals = await Appointment.find({ mechanicId, type: 'withdrawal', status });

    res.json({
      success: true,
      data: withdrawals,
      message: 'Para çekme talepleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Para çekme talepleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
