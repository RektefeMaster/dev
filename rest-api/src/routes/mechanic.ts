import express from 'express';
import { auth } from '../middleware/auth';
import * as mechanicController from '../controllers/mechanicController';

/**
 * @swagger
 * components:
 *   schemas:
 *     MechanicProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Usta ID'si
 *         name:
 *           type: string
 *           description: Usta adı
 *           example: "Ahmet"
 *         surname:
 *           type: string
 *           description: Usta soyadı
 *           example: "Yılmaz"
 *         shopName:
 *           type: string
 *           description: Dükkan adı
 *           example: "Ahmet Usta Oto Servis"
 *         phone:
 *           type: string
 *           description: Telefon numarası
 *           example: "+90 555 123 4567"
 *         bio:
 *           type: string
 *           description: Usta hakkında bilgi
 *           example: "20 yıllık deneyim ile kaliteli hizmet"
 *         serviceCategories:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Genel Bakım", "Motor", "Fren Sistemi"]
 *         vehicleBrands:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Toyota", "Honda", "Ford", "Genel"]
 *         rating:
 *           type: number
 *           description: Ortalama puan
 *           example: 4.8
 *         totalServices:
 *           type: number
 *           description: Toplam servis sayısı
 *           example: 156
 *         isAvailable:
 *           type: boolean
 *           description: Müsaitlik durumu
 *           example: true
 *     WorkingHours:
 *       type: object
 *       properties:
 *         monday:
 *           type: object
 *           properties:
 *             start:
 *               type: string
 *               example: "08:00"
 *             end:
 *               type: string
 *               example: "18:00"
 *             isOpen:
 *               type: boolean
 *               example: true
 *         tuesday:
 *           type: object
 *           properties:
 *             start:
 *               type: string
 *               example: "08:00"
 *             end:
 *               type: string
 *               example: "18:00"
 *             isOpen:
 *               type: boolean
 *               example: true
 *     MechanicStatistics:
 *       type: object
 *       properties:
 *         totalAppointments:
 *           type: number
 *           description: Toplam randevu sayısı
 *           example: 45
 *         completedServices:
 *           type: number
 *           description: Tamamlanan servis sayısı
 *           example: 42
 *         averageRating:
 *           type: number
 *           description: Ortalama puan
 *           example: 4.8
 *         totalEarnings:
 *           type: number
 *           description: Toplam kazanç
 *           example: 12500
 */

const router = express.Router();

/**
 * @swagger
 * /api/mechanic/me:
 *   get:
 *     summary: Usta profilini getir
 *     description: Giriş yapan ustanın profil bilgilerini getirir
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MechanicProfile'
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// PROFİL
router.get('/me', auth, mechanicController.getProfile);

/**
 * @swagger
 * /api/mechanic/me:
 *   put:
 *     summary: Usta profilini güncelle
 *     description: Giriş yapan usta kendi profil bilgilerini günceller
 *     tags:
 *       - Mechanic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MechanicProfile'
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MechanicProfile'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/me', auth, mechanicController.updateProfile);

// HİZMETLER
router.get('/me/services', auth, mechanicController.getServices);
router.put('/me/services', auth, mechanicController.updateServices);

// RANDEVULAR
router.get('/me/appointments', auth, mechanicController.getAppointments);
router.put('/appointments/:id/confirm', auth, mechanicController.confirmAppointment);
router.put('/appointments/:id/complete', auth, mechanicController.completeAppointment);
router.put('/appointments/:id/reject', auth, mechanicController.rejectAppointment);

// İSTATİSTİK
router.get('/me/statistics', auth, mechanicController.getStatistics);

// BİLDİRİMLER
router.get('/me/notifications', auth, mechanicController.getNotifications);
router.post('/me/notifications/read', auth, mechanicController.readNotification);

// ÇALIŞMA SAATLERİ
router.get('/me/working-hours', auth, mechanicController.getWorkingHours);
router.post('/me/working-hours', auth, mechanicController.setWorkingHours);

// KONUM
router.post('/me/location', auth, mechanicController.updateLocation);

export default router; 