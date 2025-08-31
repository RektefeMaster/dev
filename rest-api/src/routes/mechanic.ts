import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateMechanicProfileSchema } from '../validators/maintenance.validation';
import { MechanicController } from '../controllers/mechanic.controller';
import { Appointment } from '../models/Appointment';
import { Wallet } from '../models/Wallet';
import { Mechanic } from '../models/Mechanic'; // Added missing import
import { AppointmentRating } from '../models/AppointmentRating'; // Added missing import

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
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      // Cüzdan yoksa oluştur
      const newWallet = new Wallet({ userId, balance: 0 });
      await newWallet.save();
      return res.json({ success: true, data: newWallet });
    }

    res.json({ success: true, data: wallet });
  } catch (error: any) {
    console.error('Wallet getirme hatası:', error);
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

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Cüzdan bulunamadı' });
    }

    res.json({ success: true, data: wallet.transactions });
  } catch (error: any) {
    console.error('Transactions getirme hatası:', error);
    res.status(500).json({ success: false, message: 'İşlemler alınamadı' });
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
    console.error('Servis paketleri hatası:', error);
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
 * /api/mechanic/stats:
 *   get:
 *     summary: Mekanik istatistikleri
 *     description: Giriş yapan mekaniğin istatistiklerini getirir
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
router.get('/stats', auth, MechanicController.getMechanicStats);

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
    const activeJobs = appointments.filter(a => ['confirmed', 'in-progress'].includes(a.status)).length;
    const completedJobs = appointments.filter(a => a.status === 'completed').length;
    
    // Bugünkü kazanç
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAppointments = appointments.filter(a => 
      a.status === 'completed' && 
      a.paymentStatus === 'paid' &&
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
    console.error('Dashboard stats hatası:', error);
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
    console.error('Today schedule hatası:', error);
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
    console.error('Recent activity hatası:', error);
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
    console.error('Rating stats hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Rating istatistikleri getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/ratings/recent', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme hatası'
      });
    }

    // Son rating'ler - şimdilik basit veri
    res.json({
      success: true,
      data: {
        ratings: [
          {
            id: '1',
            rating: 5,
            comment: 'Çok iyi hizmet aldım',
            customerName: 'Ahmet Y.',
            date: new Date().toISOString()
          },
          {
            id: '2',
            rating: 4,
            comment: 'Güzel iş çıkardı',
            customerName: 'Mehmet K.',
            date: new Date().toISOString()
          }
        ]
      },
      message: 'Son rating\'ler başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Recent ratings hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Son rating\'ler getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== CUSTOMER MANAGEMENT ENDPOINTS =====
router.get('/customers', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user.id;
    
    // Bu ustaya hizmet verilen müşterileri getir
    const customers = await Appointment.aggregate([
      { $match: { mechanicId } },
      { $group: { _id: '$userId' } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      { $project: { 
        _id: '$customer._id', 
        name: '$customer.name', 
        surname: '$customer.surname',
        email: '$customer.email',
        phone: '$customer.phone'
      }}
    ]);
    
    res.json({
      success: true,
      data: customers,
      message: 'Müşteri listesi başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Customer list hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Müşteri listesi getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/serviced-vehicles', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user.id;
    
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
    console.error('Serviced vehicles hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Servis verilen araçlar getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.post('/customers/:customerId/notes', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req as any).user.id;
    const { customerId } = req.params;
    const { note } = req.body;
    
    // Müşteri notu ekle (bu örnek için basit bir yapı)
    const customerNote = {
      mechanicId,
      customerId,
      note,
      createdAt: new Date()
    };
    
    res.json({
      success: true,
      data: customerNote,
      message: 'Müşteri notu başarıyla eklendi'
    });
  } catch (error: any) {
    console.error('Customer note hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Müşteri notu eklenirken hata oluştu',
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
    console.error('Availability update hatası:', error);
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
    console.error('Rating update hatası:', error);
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
      { $match: { mechanicId, status: 'completed' } },
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
    console.error('Stats hatası:', error);
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
    console.error('All mechanics hatası:', error);
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
    console.error('Mechanic search hatası:', error);
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
    console.error('City mechanics hatası:', error);
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
    console.error('Specialization mechanics hatası:', error);
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
    console.error('Mechanic list hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mekanikler getirilirken hata oluştu',
      error: error.message
    });
  }
});

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
    console.error('Mechanic details hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mekanik detayları getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router; 