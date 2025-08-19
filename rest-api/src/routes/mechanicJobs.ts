import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MechanicJobsController } from '../controllers/mechanicJobs.controller';

const router = Router();

/**
 * @swagger
 * /api/mechanic-jobs:
 *   get:
 *     summary: Ustanın işlerini getir
 *     description: Giriş yapan ustanın tüm işlerini listeler
 *     tags:
 *       - Mechanic Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed, cancelled]
 *         description: İş durumu filtresi
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
 *         description: Sayfa başına iş sayısı
 *     responses:
 *       200:
 *         description: İşler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/', auth, MechanicJobsController.getMechanicJobs);

/**
 * @swagger
 * /api/mechanic-jobs/{jobId}:
 *   get:
 *     summary: İş detayını getir
 *     description: Belirli bir işin detaylarını getirir
 *     tags:
 *       - Mechanic Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: İş ID'si
 *     responses:
 *       200:
 *         description: İş detayı başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: İş bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:jobId', auth, MechanicJobsController.getJobDetails);

/**
 * @swagger
 * /api/mechanic-jobs/{jobId}/status:
 *   put:
 *     summary: İş durumunu güncelle
 *     description: İşin durumunu günceller (başlat, devam et, tamamla)
 *     tags:
 *       - Mechanic Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: İş ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed, cancelled]
 *                 description: Yeni iş durumu
 *               notes:
 *                 type: string
 *                 description: İş notları
 *               estimatedCompletionTime:
 *                 type: string
 *                 format: date-time
 *                 description: Tahmini tamamlanma zamanı
 *     responses:
 *       200:
 *         description: İş durumu başarıyla güncellendi
 *       400:
 *         description: Geçersiz durum
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: İş bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:jobId/status', auth, MechanicJobsController.updateJobStatus);

/**
 * @swagger
 * /api/mechanic-jobs/{jobId}/price:
 *   put:
 *     summary: İş fiyatını güncelle
 *     description: İş için fiyat belirler veya günceller
 *     tags:
 *       - Mechanic Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: İş ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *             properties:
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: İş fiyatı (TL)
 *               breakdown:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item:
 *                       type: string
 *                       description: Hizmet/parça adı
 *                     cost:
 *                       type: number
 *                       description: Maliyet
 *               notes:
 *                 type: string
 *                 description: Fiyat notları
 *     responses:
 *       200:
 *         description: Fiyat başarıyla güncellendi
 *       400:
 *         description: Geçersiz fiyat
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: İş bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:jobId/price', auth, MechanicJobsController.updateJobPrice);

/**
 * @swagger
 * /api/mechanic-jobs/{jobId}/complete:
 *   post:
 *     summary: İşi tamamla
 *     description: İşi tamamlar ve gerekli bilgileri kaydeder
 *     tags:
 *       - Mechanic Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: İş ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - finalPrice
 *               - workDone
 *             properties:
 *               finalPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: Final iş fiyatı
 *               workDone:
 *                 type: string
 *                 description: Yapılan işlerin detayı
 *               partsUsed:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Parça adı
 *                     cost:
 *                       type: number
 *                       description: Parça maliyeti
 *               completionTime:
 *                 type: string
 *                 format: date-time
 *                 description: Tamamlanma zamanı
 *               customerNotes:
 *                 type: string
 *                 description: Müşteri notları
 *     responses:
 *       200:
 *         description: İş başarıyla tamamlandı
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: İş bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/:jobId/complete', auth, MechanicJobsController.completeJob);

/**
 * @swagger
 * /api/mechanic-jobs/stats:
 *   get:
 *     summary: İş istatistikleri
 *     description: Ustanın iş istatistiklerini getirir
 *     tags:
 *       - Mechanic Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *         description: İstatistik periyodu
 *     responses:
 *       200:
 *         description: İstatistikler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/stats', auth, MechanicJobsController.getJobStats);

/**
 * @swagger
 * /api/mechanic-jobs/schedule:
 *   get:
 *     summary: İş programı
 *     description: Ustanın günlük/haftalık iş programını getirir
 *     tags:
 *       - Mechanic Jobs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Tarih (YYYY-MM-DD formatında)
 *       - in: query
 *         name: view
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, week]
 *         description: Görünüm tipi
 *     responses:
 *       200:
 *         description: Program başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/schedule', auth, MechanicJobsController.getJobSchedule);

export default router;
