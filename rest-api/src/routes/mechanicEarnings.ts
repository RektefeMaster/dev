import { Router } from 'express';
import { auth } from '../middleware/auth';
import { MechanicEarningsController } from '../controllers/mechanicEarnings.controller';

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
router.get('/', auth, MechanicEarningsController.getEarnings);

/**
 * @swagger
 * /api/mechanic-earnings/summary:
 *   get:
 *     summary: Kazanç özeti
 *     description: Ustanın kazanç özetini getirir
 *     tags:
 *       - Mechanic Earnings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kazanç özeti başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/summary', auth, MechanicEarningsController.getEarningsSummary);

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
router.get('/breakdown', auth, MechanicEarningsController.getEarningsBreakdown);

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
router.get('/transactions', auth, MechanicEarningsController.getTransactions);

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
router.post('/withdraw', auth, MechanicEarningsController.requestWithdrawal);

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
router.get('/withdrawals', auth, MechanicEarningsController.getWithdrawals);

export default router;
