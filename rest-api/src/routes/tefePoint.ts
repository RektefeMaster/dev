import { Router } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { TefePointController } from '../controllers/tefePoint.controller';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

// Validation schemas
const earnPointsSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Harcama tutarı pozitif olmalıdır',
    'any.required': 'Harcama tutarı gereklidir'
  }),
  serviceCategory: Joi.string().valid(
    'towing', 'tire_service', 'wash_service', 'maintenance', 
    'engine_repair', 'transmission_repair', 'electrical_repair', 'body_repair'
  ).required().messages({
    'any.only': 'Geçerli bir hizmet kategorisi seçiniz',
    'any.required': 'Hizmet kategorisi gereklidir'
  }),
  serviceId: Joi.string().optional(),
  appointmentId: Joi.string().optional(),
  description: Joi.string().max(200).optional().messages({
    'string.max': 'Açıklama 200 karakterden fazla olamaz'
  })
});

const usePointsSchema = Joi.object({
  points: Joi.number().positive().integer().required().messages({
    'number.positive': 'Puan miktarı pozitif olmalıdır',
    'number.integer': 'Puan miktarı tam sayı olmalıdır',
    'any.required': 'Puan miktarı gereklidir'
  }),
  description: Joi.string().max(200).optional().messages({
    'string.max': 'Açıklama 200 karakterden fazla olamaz'
  }),
  serviceId: Joi.string().optional()
});

const getHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid('service_purchase', 'bonus', 'referral', 'promotion', 'refund').optional()
});

const getStatsSchema = Joi.object({
  period: Joi.string().valid('week', 'month', 'year').default('month')
});

// ===== TEFE POINT ENDPOINTS =====

/**
 * @swagger
 * /api/tefe-points/balance:
 *   get:
 *     summary: Kullanıcının TefePuan bakiyesini getir
 *     tags: [TefePoints]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TefePuan bakiyesi başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPoints:
 *                       type: number
 *                       description: Toplam TefePuan
 *                     availablePoints:
 *                       type: number
 *                       description: Kullanılabilir TefePuan
 *                     usedPoints:
 *                       type: number
 *                       description: Kullanılan TefePuan
 *                     expiredPoints:
 *                       type: number
 *                       description: Süresi dolan TefePuan
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/balance', auth, TefePointController.getBalance);

/**
 * @swagger
 * /api/tefe-points/history:
 *   get:
 *     summary: TefePuan geçmişini getir
 *     tags: [TefePoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Sayfa başına kayıt sayısı
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [service_purchase, bonus, referral, promotion, refund]
 *         description: İşlem türü filtresi
 *     responses:
 *       200:
 *         description: TefePuan geçmişi başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/history', auth, validate(getHistorySchema), TefePointController.getHistory);

/**
 * @swagger
 * /api/tefe-points/earn:
 *   post:
 *     summary: Hizmet satın alımından TefePuan kazan
 *     tags: [TefePoints]
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
 *               - serviceCategory
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Harcama tutarı (TL)
 *                 example: 1000
 *               serviceCategory:
 *                 type: string
 *                 enum: [towing, tire_service, wash_service, maintenance, engine_repair, transmission_repair, electrical_repair, body_repair]
 *                 description: Hizmet kategorisi
 *                 example: engine_repair
 *               serviceId:
 *                 type: string
 *                 description: Hizmet ID'si
 *               appointmentId:
 *                 type: string
 *                 description: Randevu ID'si
 *               description:
 *                 type: string
 *                 maxLength: 200
 *                 description: İşlem açıklaması
 *                 example: Motor rektefiyesi hizmeti
 *     responses:
 *       200:
 *         description: TefePuan başarıyla kazanıldı
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/earn', auth, validate(earnPointsSchema), TefePointController.earnPoints);

/**
 * @swagger
 * /api/tefe-points/use:
 *   post:
 *     summary: TefePuan kullan
 *     tags: [TefePoints]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *             properties:
 *               points:
 *                 type: integer
 *                 description: Kullanılacak puan miktarı
 *                 example: 50
 *               description:
 *                 type: string
 *                 maxLength: 200
 *                 description: Kullanım açıklaması
 *                 example: Lastik değişimi için indirim
 *               serviceId:
 *                 type: string
 *                 description: Hizmet ID'si
 *     responses:
 *       200:
 *         description: TefePuan başarıyla kullanıldı
 *       400:
 *         description: Geçersiz istek veya yetersiz bakiye
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: TefePuan kaydı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/use', auth, validate(usePointsSchema), TefePointController.usePoints);

/**
 * @swagger
 * /api/tefe-points/categories:
 *   get:
 *     summary: Hizmet kategorilerini ve kazanım oranlarını getir
 *     tags: [TefePoints]
 *     responses:
 *       200:
 *         description: Hizmet kategorileri başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           multiplier:
 *                             type: number
 *                           description:
 *                             type: string
 */
router.get('/categories', TefePointController.getServiceCategories);

/**
 * @swagger
 * /api/tefe-points/stats:
 *   get:
 *     summary: TefePuan istatistiklerini getir
 *     tags: [TefePoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *       - name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *         description: İstatistik dönemi
 *     responses:
 *       200:
 *         description: TefePuan istatistikleri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/stats', auth, validate(getStatsSchema), TefePointController.getStats);

export default router;
