import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateMechanicProfileSchema } from '../validators/maintenance.validation';
import { MechanicController } from '../controllers/mechanic.controller';

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

export default router; 