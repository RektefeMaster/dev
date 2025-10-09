import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateMechanicProfileSchema } from '../validators/maintenance.validation';
import { MechanicController } from '../controllers/mechanic.controller';
import { Appointment } from '../models/Appointment';
import { Wallet } from '../models/Wallet';
import { Mechanic } from '../models/Mechanic'; // Added missing import
import { AppointmentRating } from '../models/AppointmentRating'; // Added missing import
import { User } from '../models/User'; // Added User import for wash packages
import { Message } from '../models/Message'; // Added Message import for debug
import { Notification } from '../models/Notification'; // Added Notification import for debug
import { AppointmentStatus, PaymentStatus } from '../../../shared/types/enums';
import { ResponseHandler } from '../utils/response';
import { Types } from 'mongoose';

const router = Router();

/**
 * @swagger
 * /api/mechanic/me:
 *   get:
 *     summary: Mekanik profilini getir
 *     description: Giriş yapan mekaniğin profil bilgilerini getirir
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Mekanik profili bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/me', auth, MechanicController.getProfile);

/**
 * @swagger
 * /api/mechanic/list:
 *   get:
 *     summary: Tüm mekanikleri listele
 *     description: Sistemdeki tüm mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     responses:
 *       200:
 *         description: Mekanikler başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/list', MechanicController.getAllMechanics);

/**
 * @swagger
 * /api/mechanic/appointments/counts:
 *   get:
 *     summary: Randevu sayılarını getir
 *     description: Mekanik için her durumdaki randevu sayılarını getirir
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Randevu sayıları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/appointments/counts', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme hatası' });
    }

    const counts = await Appointment.aggregate([
      { $match: { mechanicId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      pending: 0,
      confirmed: 0,
      'in-progress': 0,
      'payment-pending': 0,
      completed: 0,
      cancelled: 0,
      'no-show': 0
    };

    counts.forEach((item: any) => {
      result[item._id as keyof typeof result] = item.count;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

/**
 * @swagger
 * /api/mechanic/wallet:
 *   get:
 *     summary: Mekanik cüzdan bilgilerini getir
 *     description: Giriş yapan mekaniğin cüzdan bilgilerini getirir
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cüzdan bilgileri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Cüzdan bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/wallet', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      console.error('❌ [Backend] User ID bulunamadı');
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }

    console.log('🔍 [Backend] Wallet endpoint çağrıldı - UserId:', userId);
    
    // Wallet modelini al veya oluştur
    let wallet = await Wallet.findOne({ userId });
    console.log('💰 [Backend] Wallet bulundu:', wallet ? 'Evet' : 'Hayır');
    
    if (!wallet) {
      console.log('🆕 [Backend] Yeni wallet oluşturuluyor...');
      wallet = new Wallet({ userId, balance: 0 });
      await wallet.save();
      console.log('✅ [Backend] Yeni wallet oluşturuldu:', wallet._id);
    }

    // Tarih aralıklarını belirle
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    console.log('📅 [Backend] Tarih aralıkları:');
    console.log('📅 [Backend] Şu an:', now.toISOString());
    console.log('📅 [Backend] Bu ay başı:', firstDayOfMonth.toISOString());
    console.log('📅 [Backend] Geçen ay başı:', firstDayOfLastMonth.toISOString());
    console.log('📅 [Backend] Geçen ay sonu:', lastDayOfLastMonth.toISOString());
    
    // Önce tüm appointment'ları getir ve debug et
    const allAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId)
    });
    
    console.log('📊 [Backend] Tüm appointment sayısı:', allAppointments.length);
    console.log('📊 [Backend] Tüm appointment detayları:', allAppointments.length, 'adet');
    
    // Bu ayın tamamlanmış appointment'ları (createdAt kullanarak test)
    const thisMonthAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI',
      createdAt: { $gte: firstDayOfMonth }
    });
    
    // Geçen ayın tamamlanmış appointment'ları
    const lastMonthAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI',
      createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
    });
    
    // Bekleyen appointment'lar
    const pendingAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: { $in: ['ONAYLANDI', 'BEKLEMEDE'] }
    });
    
    // Tüm zamanların tamamlanmış appointment'ları
    const allTimeAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI'
    });
    
    // Gerçek hesaplamalar
    const thisMonthEarnings = thisMonthAppointments.reduce((sum, apt) => 
      sum + (apt.finalPrice || apt.price || 0), 0);
    
    const lastMonthEarnings = lastMonthAppointments.reduce((sum, apt) => 
      sum + (apt.finalPrice || apt.price || 0), 0);
    
    const pendingAmount = pendingAppointments.reduce((sum, apt) => 
      sum + (apt.finalPrice || apt.price || 0), 0);
    
    const totalEarnings = allTimeAppointments.reduce((sum, apt) => 
      sum + (apt.finalPrice || apt.price || 0), 0);
    
    const realBalance = totalEarnings; // Toplam kazanç = balance

    console.log('📊 [Backend] Bu ay appointment sayısı:', thisMonthAppointments.length);
    console.log('📊 [Backend] Bu ay appointment detayları:', thisMonthAppointments.map(apt => ({
      id: apt._id,
      status: apt.status,
      price: apt.price,
      finalPrice: apt.finalPrice,
      appointmentDate: apt.appointmentDate,
      completionDate: apt.completionDate,
      createdAt: apt.createdAt
    })));
    
    console.log('📊 [Backend] Bekleyen appointment sayısı:', pendingAppointments.length);
    console.log('📊 [Backend] Bekleyen appointment detayları:', pendingAppointments.map(apt => ({
      id: apt._id,
      status: apt.status,
      price: apt.price,
      finalPrice: apt.finalPrice
    })));
    
    console.log('📊 [Backend] Tüm zamanlar appointment sayısı:', allTimeAppointments.length);
    
    console.log('💰 [Backend] Wallet modelindeki balance:', wallet.balance);
    console.log('💰 [Backend] Hesaplanan balance:', realBalance);
    console.log('📊 [Backend] Bu ay kazanç:', thisMonthEarnings);
    console.log('📊 [Backend] Geçen ay kazanç:', lastMonthEarnings);
    console.log('📊 [Backend] Bekleyen tutar:', pendingAmount);
    console.log('📊 [Backend] Toplam kazanç:', totalEarnings);
    console.log('📊 [Backend] Wallet transaction sayısı:', wallet.transactions.length);
    
    // Gerçek verilerle response döndür
    const responseData = {
      _id: wallet._id,
      userId: wallet.userId,
      balance: realBalance, // Gerçek balance
      thisMonthEarnings,
      lastMonthEarnings,
      pendingAmount,
      totalEarnings,
      transactions: wallet.transactions,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      __v: wallet.__v
    };
    
    console.log('📦 [Backend] Response gönderiliyor:', { 
      success: true, 
      data: { 
        balance: realBalance,
        thisMonthEarnings,
        lastMonthEarnings,
        pendingAmount,
        totalEarnings,
        transactionCount: wallet.transactions.length 
      } 
    });
    
    res.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error('❌ [Backend] Wallet endpoint hatası:', error);
    console.error('❌ [Backend] Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Cüzdan bilgileri alınamadı' });
  }
});

/**
 * @swagger
 * /api/mechanic/wallet/transactions:
 *   get:
 *     summary: Mekanik cüzdan işlemlerini getir
 *     description: Giriş yapan mekaniğin cüzdan işlemlerini listeler
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İşlemler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Cüzdan bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/wallet/transactions', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    
    // Gerçek randevu verilerinden işlemleri getir
    const appointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI'
    })
    .populate('userId', 'name surname')
    .populate('vehicleId', 'brand modelName plateNumber')
    .sort({ completionDate: -1 })
    .limit(limit);
    
    // Transaction formatına dönüştür
    const transactions = appointments.map((apt: any) => ({
      _id: apt._id.toString(),
      type: 'credit',
      amount: apt.price || 0,
      date: apt.completionDate || apt.appointmentDate,
      description: apt.serviceType || 'Hizmet',
      serviceType: apt.serviceType || 'Hizmet',
      customerName: apt.userId ? `${apt.userId.name || ''} ${apt.userId.surname || ''}`.trim() : 'Müşteri',
      vehicleInfo: apt.vehicleId 
        ? `${apt.vehicleId.brand || ''} ${apt.vehicleId.modelName || ''} (${apt.vehicleId.plateNumber || ''})`.trim()
        : 'Araç bilgisi yok',
      status: 'completed',
      appointmentId: apt._id.toString()
    }));
    
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('❌ Transactions error:', error);
    res.status(500).json({ success: false, message: 'İşlemler alınamadı' });
  }
});

/**
 * @swagger
 * /api/mechanic/earnings-summary:
 *   get:
 *     summary: Mekanik kazanç özetini getir
 *     description: Giriş yapan mekaniğin dönem bazlı kazanç özetini getirir
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [thisMonth, lastMonth, allTime]
 *         description: Kazanç dönemi
 *     responses:
 *       200:
 *         description: Kazanç özeti başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/earnings-summary', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const period = req.query.period as string || 'thisMonth';
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    // Tarih aralıklarını belirle
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    
    if (period === 'thisMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else { // allTime
      startDate = new Date(2020, 0, 1);
    }
    
    // Tamamlanan randevuları getir
    const completedAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI',
      appointmentDate: { $gte: startDate, $lte: endDate }
    });
    
    // Bekleyen randevuları getir
    const pendingAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: { $in: ['ONAYLANDI', 'BEKLEMEDE'] }
    });
    
    // Tüm zamanlar için toplam kazanç
    const allTimeAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI'
    });
    
    // Hesaplamalar
    const totalEarnings = completedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const totalJobs = completedAppointments.length;
    const averageEarnings = totalJobs > 0 ? Math.round(totalEarnings / totalJobs) : 0;
    const pendingPayments = pendingAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const allTimeTotal = allTimeAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    
    res.json({
      success: true,
      data: {
        totalEarnings,
        totalJobs,
        averageEarnings,
        pendingPayments,
        allTimeTotal,
        period
      },
      message: 'Kazanç özeti başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('❌ Earnings summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Kazanç özeti alınamadı',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/me:
 *   put:
 *     summary: Mekanik profilini güncelle
 *     description: Giriş yapan mekaniğin profil bilgilerini günceller
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shopName:
 *                 type: string
 *                 description: Dükkan adı
 *               city:
 *                 type: string
 *                 description: Şehir
 *               experience:
 *                 type: number
 *                 description: Deneyim yılı
 *               vehicleBrands:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Uzman olduğu araç markaları
 *               serviceCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Uzmanlık alanları
 *               isAvailable:
 *                 type: boolean
 *                 description: Müsaitlik durumu
 *               phone:
 *                 type: string
 *                 description: Telefon numarası
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/me', auth, validate(updateMechanicProfileSchema), MechanicController.createOrUpdateProfile);

/**
 * @swagger
 * /api/mechanic/services/packages:
 *   get:
 *     summary: Mekanik servis paketlerini getir
 *     description: Mekaniklerin sunduğu servis paketlerini listeler
 *     tags:
 *       - Mechanic
 *     responses:
 *       200:
 *         description: Servis paketleri başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/services/packages', async (req: Request, res: Response) => {
  try {
    // Gerçek veritabanından servis paketlerini çek
    // Bu endpoint henüz implement edilmedi, boş array döndür
    const packages: any[] = [];

    res.json({
      success: true,
      data: packages,
      message: 'Servis paketleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Servis paketleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/availability:
 *   put:
 *     summary: Müsaitlik durumunu güncelle
 *     description: Mekaniğin müsaitlik durumunu günceller
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 description: Müsaitlik durumu
 *     responses:
 *       200:
 *         description: Müsaitlik durumu güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/availability', auth, MechanicController.updateAvailability);

/**
 * @swagger
 * /api/mechanic/rating:
 *   put:
 *     summary: Puan güncelle
 *     description: Mekaniğin puanını günceller
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Yeni puan (1-5)
 *     responses:
 *       200:
 *         description: Puan güncellendi
 *       400:
 *         description: Geçersiz puan
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/rating', auth, MechanicController.updateRating);

/**
 * @swagger
 * /api/mechanic/all:
 *   get:
 *     summary: Tüm mekanikleri getir
 *     description: Sistemdeki tüm mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     responses:
 *       200:
 *         description: Tüm mekanikler başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/all', MechanicController.getAllMechanics);

/**
 * @swagger
 * /api/mechanic/search:
 *   get:
 *     summary: Mekanik ara
 *     description: Mekanik adı, uzmanlık alanı veya şehre göre arama yapar
 *     tags:
 *       - Mechanic
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Arama terimi
 *         example: "BMW"
 *       - in: query
 *         name: city
 *         required: false
 *         schema:
 *           type: string
 *         description: Şehir filtresi
 *         example: "İstanbul"
 *     responses:
 *       200:
 *         description: Arama sonuçları başarıyla getirildi
 *       400:
 *         description: Arama terimi eksik
 *       500:
 *         description: Sunucu hatası
 */
router.get('/search', MechanicController.searchMechanics);

/**
 * @swagger
 * /api/mechanic/city/{city}:
 *   get:
 *     summary: Şehir bazında mekanikleri getir
 *     description: Belirli bir şehirdeki mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Şehir adı
 *         example: "İstanbul"
 *     responses:
 *       200:
 *         description: Şehir bazında mekanikler başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/city/:city', MechanicController.getMechanicsByCity);

/**
 * @swagger
 * /api/mechanic/specialization/{specialization}:
 *   get:
 *     summary: Uzmanlık alanına göre mekanikleri getir
 *     description: Belirli bir uzmanlık alanındaki mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     parameters:
 *       - in: path
 *         name: specialization
 *         required: true
 *         schema:
 *           type: string
 *         description: Uzmanlık alanı
 *         example: "Motor"
 *     responses:
 *       200:
 *         description: Uzmanlık alanına göre mekanikler başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/specialization/:specialization', MechanicController.getMechanicsBySpecialization);

/**
 * @swagger
 * /api/mechanic/details/{mechanicId}:
 *   get:
 *     summary: Mekanik detaylarını getir
 *     description: Mekaniğin detaylı bilgilerini, rating'lerini, yorumlarını ve iş sayısını getirir
 *     tags:
 *       - Mechanic
 *     parameters:
 *       - in: path
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mekanik ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Mekanik detayları başarıyla getirildi
 *       404:
 *         description: Mekanik bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/details/:mechanicId', MechanicController.getMechanicDetails);

// ===== DASHBOARD ENDPOINTS =====
router.get('/dashboard/stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme hatası'
      });
    }

    // Randevu istatistikleri
    const appointments = await Appointment.find({ mechanicId });
    const activeJobs = appointments.filter(a => ['PLANLANDI', 'SERVISTE'].includes(a.status)).length;
    const completedJobs = appointments.filter(a => a.status === 'TAMAMLANDI').length;
    
    // Bugünkü kazanç
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAppointments = appointments.filter(a => 
      a.status === AppointmentStatus.COMPLETED && 
      a.paymentStatus === PaymentStatus.COMPLETED &&
      new Date(a.updatedAt) >= today
    );
    const todayEarnings = todayAppointments.reduce((sum, a) => sum + (a.price || 0), 0);

    res.json({
      success: true,
      data: {
        activeJobs,
        completedJobs,
        todayEarnings,
        totalAppointments: appointments.length
      },
      message: 'Dashboard istatistikleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Dashboard istatistikleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/dashboard/today-schedule', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme hatası'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.find({
      mechanicId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      },
      status: { $in: ['confirmed', 'in-progress'] }
    }).populate('userId', 'name surname email phone')
      .populate('vehicleId', 'brand modelName plateNumber');

    res.json({
      success: true,
      data: {
        appointments: todayAppointments
      },
      message: 'Bugünkü program başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Bugünkü program getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Recent Activity endpoint
router.get('/dashboard/recent-activity', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme hatası'
      });
    }

    // Son 10 randevuyu getir
    const recentAppointments = await Appointment.find({
      mechanicId
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'name surname')
    .populate('vehicleId', 'brand modelName plateNumber');

    const activities = recentAppointments.map(appointment => ({
      id: appointment._id,
      type: 'appointment',
      title: `${(appointment.userId as any)?.name || ''} ${(appointment.userId as any)?.surname || ''}`,
      description: `${(appointment.vehicleId as any)?.brand || ''} ${(appointment.vehicleId as any)?.modelName || ''} - ${appointment.status}`,
      date: appointment.createdAt,
      status: appointment.status
    }));

    res.json({
      success: true,
      data: {
        activities
      },
      message: 'Son aktiviteler başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Son aktiviteler getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== RATING ENDPOINTS =====
router.get('/ratings/stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme hatası'
      });
    }

    // Rating istatistikleri - şimdilik basit veri
    res.json({
      success: true,
      data: {
        averageRating: 4.5,
        totalRatings: 12,
        ratingDistribution: {
          5: 8,
          4: 3,
          3: 1,
          2: 0,
          1: 0
        }
      },
      message: 'Rating istatistikleri başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Rating istatistikleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/ratings/recent', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme hatası'
      });
    }

    // User'ı al ve userType kontrolü yap
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Mechanic profili olup olmadığını kontrol et
    let mechanic = await Mechanic.findOne({ email: user.email });
    
    // Eğer Mechanic profili yoksa, boş array döndür
    if (!mechanic) {
      return res.json({
        success: true,
        data: {
          ratings: []
        },
        message: 'Henüz değerlendirme yok'
      });
    }

    // Gerçek değerlendirmeleri getir
    const ratings = await AppointmentRating.find({ mechanicId: mechanic._id })
      .populate('userId', 'name surname')
      .populate('appointmentId', 'serviceType appointmentDate')
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedRatings = ratings.map(rating => ({
      id: rating._id,
      rating: rating.rating,
      comment: rating.comment,
      customerName: `${(rating.userId as any)?.name || 'Bilinmeyen'} ${(rating.userId as any)?.surname || 'Müşteri'}`,
      date: rating.createdAt
    }));

    res.json({
      success: true,
      data: {
        ratings: formattedRatings
      },
      message: 'Son rating\'ler başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Son rating\'ler getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/serviced-vehicles', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user.userId;
    
    // Bu ustaya hizmet verilen araçları getir
    const vehicles = await Appointment.aggregate([
      { $match: { mechanicId } },
      { $group: { _id: '$vehicleId' } },
      { $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'vehicle' } },
      { $unwind: '$vehicle' },
      { $project: { 
        _id: '$vehicle._id', 
        brand: '$vehicle.brand', 
        model: '$vehicle.model',
        plateNumber: '$vehicle.plateNumber',
        year: '$vehicle.year'
      }}
    ]);
    
    res.json({
      success: true,
      data: vehicles,
      message: 'Servis verilen araçlar başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Servis verilen araçlar getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== SERVICE PACKAGES ENDPOINT =====

// ===== EKSİK ENDPOINT'LER =====

/**
 * @swagger
 * /api/mechanic/availability:
 *   put:
 *     summary: Müsaitlik durumunu güncelle
 *     description: Mekaniğin müsaitlik durumunu günceller
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 description: Müsaitlik durumu
 *                 example: true
 *               availableHours:
 *                 type: object
 *                 description: Müsait saatler
 *                 example: { "monday": ["09:00-17:00"], "tuesday": ["09:00-17:00"] }
 *               notes:
 *                 type: string
 *                 description: Müsaitlik notları
 *                 example: "Hafta sonu kapalıyım"
 *     responses:
 *       200:
 *         description: Müsaitlik durumu güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/availability', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { isAvailable, availableHours, notes } = req.body;
    
    const mechanic = await Mechanic.findByIdAndUpdate(
      mechanicId,
      { 
        isAvailable, 
        availableHours: availableHours || {},
        availabilityNotes: notes 
      },
      { new: true }
    );
    
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Mekanik bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: mechanic,
      message: 'Müsaitlik durumu güncellendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Müsaitlik durumu güncellenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/rating:
 *   put:
 *     summary: Puan güncelle
 *     description: Mekaniğin puanını günceller
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *                 description: Yeni puan (0-5 arası)
 *                 example: 4.5
 *     responses:
 *       200:
 *         description: Puan güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/rating', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { rating } = req.body;
    
    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Puan 0-5 arasında olmalıdır'
      });
    }
    
    const mechanic = await Mechanic.findByIdAndUpdate(
      mechanicId,
      { rating },
      { new: true }
    );
    
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Mekanik bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: mechanic,
      message: 'Puan güncellendi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Puan güncellenirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/stats:
 *   get:
 *     summary: Mekanik istatistikleri
 *     description: Mekaniğin detaylı istatistiklerini getirir
 *     tags:
 *       - Mechanic
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
    const mechanicId = req.user?.userId;
    
    // Randevu istatistikleri
    const appointmentStats = await Appointment.aggregate([
      { $match: { mechanicId } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    // Toplam kazanç
    const totalEarnings = await Appointment.aggregate([
      { $match: { mechanicId, status: 'TAMAMLANDI' } },
      { $group: {
        _id: null,
        total: { $sum: '$price' }
      }}
    ]);
    
    // Aylık istatistikler
    const monthlyStats = await Appointment.aggregate([
      { $match: { mechanicId } },
      { $group: {
        _id: { 
          year: { $year: '$appointmentDate' },
          month: { $month: '$appointmentDate' }
        },
        count: { $sum: 1 },
        earnings: { $sum: '$price' }
      }},
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    const stats = {
      appointmentStats,
      totalEarnings: totalEarnings[0]?.total || 0,
      monthlyStats,
      totalAppointments: appointmentStats.reduce((sum, stat) => sum + stat.count, 0)
    };
    
    res.json({
      success: true,
      data: stats,
      message: 'İstatistikler başarıyla getirildi'
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
 * /api/mechanic/all:
 *   get:
 *     summary: Tüm mekanikleri getir
 *     description: Sistemdeki tüm mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Sayfa numarası
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Sayfa başına mekanik sayısı
 *         example: 10
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Şehre göre filtrele
 *         example: "İstanbul"
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Uzmanlık alanına göre filtrele
 *         example: "Motor"
 *     responses:
 *       200:
 *         description: Tüm mekanikler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, city, specialization } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    let filter: any = {};
    if (city) filter['location.city'] = new RegExp(city as string, 'i');
    if (specialization) filter['serviceCategories'] = new RegExp(specialization as string, 'i');
    
    const mechanics = await Mechanic.find(filter)
      .select('-password')
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1, totalServices: -1 });
    
    const total = await Mechanic.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        mechanics,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      message: 'Tüm mekanikler başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Mekanikler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/search:
 *   get:
 *     summary: Mekanik ara
 *     description: Mekanik adı, uzmanlık alanı veya şehre göre arama yapar
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Arama terimi (isim, uzmanlık, şehir)
 *         example: "Motor"
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Mekanik adı
 *         example: "Ahmet"
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Uzmanlık alanı
 *         example: "Motor"
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Şehir
 *         example: "İstanbul"
 *     responses:
 *       200:
 *         description: Arama sonuçları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, name, specialization, city } = req.query;
    
    let filter: any = {};
    
    if (q) {
      filter.$or = [
        { name: new RegExp(q as string, 'i') },
        { 'location.city': new RegExp(q as string, 'i') },
        { serviceCategories: new RegExp(q as string, 'i') }
      ];
    }
    
    if (name) filter.name = new RegExp(name as string, 'i');
    if (specialization) filter.serviceCategories = new RegExp(specialization as string, 'i');
    if (city) filter['location.city'] = new RegExp(city as string, 'i');
    
    const mechanics = await Mechanic.find(filter)
      .select('-password')
      .sort({ rating: -1, totalServices: -1 })
      .limit(20);
    
    res.json({
      success: true,
      data: mechanics,
      message: 'Arama sonuçları başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Arama yapılırken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/city/{city}:
 *   get:
 *     summary: Şehir bazında mekanikleri getir
 *     description: Belirli bir şehirdeki mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Şehir adı
 *         example: "İstanbul"
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Sayfa numarası
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Sayfa başına mekanik sayısı
 *         example: 10
 *     responses:
 *       200:
 *         description: Şehirdeki mekanikler başarıyla getirildi
 *       400:
 *         description: Şehir parametresi eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/city/:city', async (req: Request, res: Response) => {
  try {
    const { city } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const mechanics = await Mechanic.find({
      'location.city': new RegExp(city, 'i')
    })
      .select('-password')
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1, totalServices: -1 });
    
    const total = await Mechanic.countDocuments({
      'location.city': new RegExp(city, 'i')
    });
    
    res.json({
      success: true,
      data: {
        mechanics,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      message: `${city} şehrindeki mekanikler başarıyla getirildi`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Şehirdeki mekanikler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/specialization/{specialization}:
 *   get:
 *     summary: Uzmanlık alanına göre mekanikleri getir
 *     description: Belirli bir uzmanlık alanındaki mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: specialization
 *         required: true
 *         schema:
 *           type: string
 *         description: Uzmanlık alanı
 *         example: "Motor"
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Sayfa numarası
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Sayfa başına mekanik sayısı
 *         example: 10
 *     responses:
 *       200:
 *         description: Uzmanlık alanındaki mekanikler başarıyla getirildi
 *       400:
 *         description: Uzmanlık parametresi eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/specialization/:specialization', async (req: Request, res: Response) => {
  try {
    const { specialization } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const mechanics = await Mechanic.find({
      serviceCategories: new RegExp(specialization, 'i')
    })
      .select('-password')
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1, totalServices: -1 });
    
    const total = await Mechanic.countDocuments({
      serviceCategories: new RegExp(specialization, 'i')
    });
    
    res.json({
      success: true,
      data: {
        mechanics,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      message: `${specialization} uzmanlık alanındaki mekanikler başarıyla getirildi`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Uzmanlık alanındaki mekanikler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/list:
 *   get:
 *     summary: Tüm mekanikleri listele
 *     description: Sistemdeki tüm mekanikleri listeler
 *     tags:
 *       - Mechanic
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Sayfa numarası
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Sayfa başına mekanik sayısı
 *         example: 10
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Şehre göre filtrele
 *         example: "İstanbul"
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Uzmanlık alanına göre filtrele
 *         example: "Motor"
 *     responses:
 *       200:
 *         description: Mekanikler başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, city, specialization } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    let filter: any = {};
    if (city) filter['location.city'] = new RegExp(city as string, 'i');
    if (specialization) filter['serviceCategories'] = new RegExp(specialization as string, 'i');
    
    const mechanics = await Mechanic.find(filter)
      .select('-password')
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1, totalServices: -1 });
    
    const total = await Mechanic.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        mechanics,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      },
      message: 'Mekanikler başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Mekanikler getirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/mechanic/nearby:
 *   get:
 *     summary: En yakın ustaları getir
 *     description: Verilen konuma en yakın ustaları mesafeye göre sıralı döndürür
 *     tags:
 *       - Mechanic
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         required: true
 *         description: Enlem (latitude)
 *         example: 41.0082
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         required: true
 *         description: Boylam (longitude)
 *         example: 28.9784
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Döndürülecek usta sayısı
 *         example: 20
 *     responses:
 *       200:
 *         description: En yakın ustalar başarıyla getirildi
 *       400:
 *         description: Geçersiz parametreler
 *       500:
 *         description: Sunucu hatası
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Geçersiz koordinatlar' });
    }

    const mechanics = await Mechanic.find({}).select(
      'name surname shopName avatar cover bio serviceCategories vehicleBrands rating ratingCount totalServices isAvailable location phone experience'
    ).lean();

    // Haversine ile mesafeye göre sırala
    const origin: [number, number] = [lng, lat];
    const withDistance = mechanics.map(m => {
      const coords = (m as any).location?.coordinates;
      let lon: number | null = null;
      let lat: number | null = null;
      if (coords) {
        if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          // [lng, lat]
          lon = coords[0];
          lat = coords[1];
        } else if (typeof coords.longitude === 'number' && typeof coords.latitude === 'number') {
          lon = coords.longitude;
          lat = coords.latitude;
        }
      }
      if (lat !== null && lon !== null && lat !== 0 && lon !== 0) {
        const dist = haversineDistance(origin, [lon, lat]);
        return { ...m, distance: dist };
      }
      return { ...m, distance: Number.POSITIVE_INFINITY };
    }).sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return res.json({ success: true, data: withDistance, message: 'En yakın ustalar getirildi' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371; // km
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLon = (b[0] - a[0]) * Math.PI / 180;
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * @swagger
 * /api/mechanic/details/{id}:
 *   get:
 *     summary: Mekanik detaylarını getir
 *     description: Belirli bir mekaniğin detaylı bilgilerini getirir
 *     tags:
 *       - Mechanic
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mekanik ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Mekanik detayları başarıyla getirildi
 *       404:
 *         description: Mekanik bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/details/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const mechanic = await Mechanic.findById(id)
      .select('-password')
      .populate('serviceCategories', 'name description');
    
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Mekanik bulunamadı'
      });
    }
    
    // Mekaniğin son randevularını getir
    const recentAppointments = await Appointment.find({ mechanicId: id })
      .sort({ appointmentDate: -1 })
      .limit(5)
      .populate('userId', 'name surname')
      .populate('vehicleId', 'brand modelName plateNumber');
    
    // Mekaniğin değerlendirmelerini getir
    const ratings = await AppointmentRating.find({ mechanicId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name surname');
    
    const mechanicDetails = {
      ...mechanic.toObject(),
      recentAppointments,
      ratings,
      averageRating: ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length || 0
    };
    
    res.json({
      success: true,
      data: mechanicDetails,
      message: 'Mekanik detayları başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Mekanik detayları getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Ustanın yıkama paketlerini getir
router.get('/:mechanicId/wash-packages', async (req: Request, res: Response) => {
  try {
    const { mechanicId } = req.params;
    
    // Ustayı bul ve yıkama paketlerini getir
    const mechanic = await User.findById(mechanicId)
      .select('washPackages washOptions shopName name surname')
      .lean();

    if (!mechanic) {
      return ResponseHandler.notFound(res, 'Usta bulunamadı.');
    }

    // Eğer ustanın yıkama paketleri yoksa boş döndür
    if (!mechanic.washPackages || mechanic.washPackages.length === 0) {
      return ResponseHandler.success(res, {
        packages: [],
        options: []
      }, 'Bu usta için yıkama paketi bulunamadı.');
    }

    const washData = {
      packages: mechanic.washPackages || [],
      options: mechanic.washOptions || []
    };

    return ResponseHandler.success(res, washData, 'Yıkama paketleri başarıyla getirildi.');
  } catch (error) {
    return ResponseHandler.error(res, 'Yıkama paketleri getirilirken bir hata oluştu.');
  }
});

/**
 * @swagger
 * /api/mechanic/wallet/debug:
 *   get:
 *     summary: Wallet debug bilgileri
 *     description: Wallet ve işlem bilgilerini debug için getirir
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Debug bilgileri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/wallet/debug', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }

    // Wallet bilgileri
    const wallet = await Wallet.findOne({ userId });
    
    // Appointment bilgileri (bu kullanıcının ustası olduğu)
    const appointments = await Appointment.find({ mechanicId: userId });
    
    // Tamamlanan appointment'lar
    const completedAppointments = await Appointment.find({ 
      mechanicId: userId, 
      status: 'TAMAMLANDI' 
    });

    res.json({
      success: true,
      data: {
        userId,
        wallet: wallet ? {
          balance: wallet.balance,
          transactionCount: wallet.transactions.length,
          transactions: wallet.transactions
        } : null,
        totalAppointments: appointments.length,
        completedAppointments: completedAppointments.length,
        appointments: appointments.map(apt => ({
          id: apt._id,
          status: apt.status,
          price: apt.price,
          finalPrice: apt.finalPrice,
          createdAt: apt.createdAt
        }))
      }
    });
  } catch (error: any) {
    console.error('❌ Wallet debug hatası:', error);
    res.status(500).json({ success: false, message: 'Debug bilgileri alınamadı' });
  }
});

/**
 * @swagger
 * /api/mechanic/customers:
 *   get:
 *     summary: Ustanın müşterilerini getir
 *     description: Ustanın hizmet verdiği müşterileri listeler
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Müşteri listesi başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/customers', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme hatası' });
    }

    // Bu ustaya randevu veren müşterileri bul (unique)
    const appointments = await Appointment.find({ mechanicId: userId })
      .populate('userId', 'name surname email phone avatar')
      .select('userId createdAt');

    // Unique müşterileri çıkar
    const uniqueCustomersMap = new Map();
    appointments.forEach(apt => {
      const customer = apt.userId as any;
      if (customer && customer._id && !uniqueCustomersMap.has(customer._id.toString())) {
        uniqueCustomersMap.set(customer._id.toString(), {
          _id: customer._id,
          name: customer.name,
          surname: customer.surname,
          email: customer.email,
          phone: customer.phone,
          avatar: customer.avatar,
          firstAppointmentDate: apt.createdAt
        });
      }
    });

    const customers = Array.from(uniqueCustomersMap.values());

    res.json({
      success: true,
      data: { customers },
      message: 'Müşteri listesi başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Get mechanic customers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Müşteri listesi getirilirken hata oluştu',
      error: error.message 
    });
  }
});

/**
 * Debug endpoint - Ustanın tüm verilerini kontrol et
 */
router.get('/debug/data', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme hatası' });
    }

    const user = await User.findById(userId);
    const mechanic = await Mechanic.findOne({ email: user?.email });
    
    // Appointments
    const appointmentsAsMechanic = await Appointment.find({ mechanicId: userId }).limit(5);
    const appointmentsAsUser = await Appointment.find({ userId: userId }).limit(5);
    
    // Ratings
    let ratings = [];
    if (mechanic) {
      ratings = await AppointmentRating.find({ mechanicId: mechanic._id }).limit(5);
    }
    
    // Messages
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).limit(5);
    
    // Notifications
    const notifications = await Notification.find({ recipientId: userId }).limit(5);

    res.json({
      success: true,
      data: {
        userId: userId,
        user: user ? {
          email: user.email,
          name: user.name,
          userType: user.userType
        } : null,
        mechanic: mechanic ? {
          _id: mechanic._id,
          shopName: mechanic.shopName,
          rating: mechanic.rating
        } : null,
        counts: {
          appointmentsAsMechanic: await Appointment.countDocuments({ mechanicId: userId }),
          appointmentsAsUser: await Appointment.countDocuments({ userId: userId }),
          ratings: mechanic ? await AppointmentRating.countDocuments({ mechanicId: mechanic._id }) : 0,
          messages: await Message.countDocuments({ $or: [{ senderId: userId }, { receiverId: userId }] }),
          notifications: await Notification.countDocuments({ recipientId: userId })
        },
        sampleData: {
          appointmentsAsMechanic: appointmentsAsMechanic.map(a => ({
            _id: a._id,
            userId: a.userId,
            status: a.status,
            serviceType: a.serviceType,
            createdAt: a.createdAt
          })),
          appointmentsAsUser: appointmentsAsUser.map(a => ({
            _id: a._id,
            mechanicId: a.mechanicId,
            status: a.status,
            serviceType: a.serviceType,
            createdAt: a.createdAt
          })),
          ratings: ratings.map(r => ({
            _id: r._id,
            rating: r.rating,
            comment: r.comment
          })),
          messages: messages.map(m => ({
            _id: m._id,
            content: m.content?.substring(0, 50),
            createdAt: m.createdAt
          })),
          notifications: notifications.map(n => ({
            _id: n._id,
            title: n.title,
            type: n.type
          }))
        }
      }
    });
  } catch (error: any) {
    console.error('Debug data error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Debug data error',
      error: error.message 
    });
  }
});

export default router; 
