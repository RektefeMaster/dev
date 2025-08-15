import express from 'express';
import { auth } from '../middleware/auth';
import {
  createAppointment,
  getMechanicAppointments,
  confirmAppointmentByMechanic,
  completeAppointmentByMechanic,
  rejectAppointmentByMechanic,
  getMechanicAvailability,
} from '../controllers/maintenanceAppointmentController';

/**
 * @swagger
 * components:
 *   schemas:
 *     MaintenanceAppointment:
 *       type: object
 *       required:
 *         - vehicleId
 *         - serviceType
 *         - preferredDate
 *         - description
 *       properties:
 *         vehicleId:
 *           type: string
 *           description: Araç ID'si
 *           example: "507f1f77bcf86cd799439011"
 *         serviceType:
 *           type: string
 *           description: Servis tipi
 *           example: "Genel Bakım"
 *         preferredDate:
 *           type: string
 *           format: date
 *           description: Tercih edilen tarih
 *           example: "2024-02-15"
 *         preferredTime:
 *           type: string
 *           description: Tercih edilen saat
 *           example: "14:00"
 *         description:
 *           type: string
 *           description: Servis açıklaması
 *           example: "Motor sesi yapıyor, yağ değişimi gerekli"
 *         urgency:
 *           type: string
 *           enum: [low, medium, high, emergency]
 *           description: Aciliyet seviyesi
 *           example: "medium"
 *         status:
 *           type: string
 *           enum: [pending, confirmed, in_progress, completed, rejected, cancelled]
 *           description: Randevu durumu
 *           example: "pending"
 *         estimatedDuration:
 *           type: number
 *           description: Tahmini süre (dakika)
 *           example: 120
 *         estimatedCost:
 *           type: number
 *           description: Tahmini maliyet (TL)
 *           example: 500
 *     AppointmentResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: İşlem mesajı
 *         appointment:
 *           $ref: '#/components/schemas/MaintenanceAppointment'
 *         mechanic:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             shopName:
 *               type: string
 *             phone:
 *               type: string
 */

const router = express.Router();

/**
 * @swagger
 * /api/maintenance-appointments:
 *   post:
 *     summary: Bakım randevusu oluştur
 *     description: Müşteri yeni bir bakım randevusu oluşturur
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MaintenanceAppointment'
 *     responses:
 *       201:
 *         description: Randevu başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// ===== MÜŞTERİ İÇİN ENDPOINT =====
// Randevu oluşturma
router.post('/', auth, createAppointment);

/**
 * @swagger
 * /api/maintenance-appointments/mechanic:
 *   get:
 *     summary: Ustanın randevularını getir
 *     description: Giriş yapan ustanın tüm randevularını listeler
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, in_progress, completed, rejected, cancelled]
 *         description: Randevu durumuna göre filtreleme
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Belirli tarihteki randevular
 *     responses:
 *       200:
 *         description: Randevular başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MaintenanceAppointment'
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// ===== USTA İÇİN ENDPOINT'LER =====

// Ustanın randevularını getirme
router.get('/mechanic', auth, getMechanicAppointments);

/**
 * @swagger
 * /api/maintenance-appointments/{appointmentId}/mechanic/confirm:
 *   put:
 *     summary: Randevuyu onayla
 *     description: Usta randevuyu onaylar ve detayları günceller
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estimatedDuration:
 *                 type: number
 *                 description: Tahmini süre (dakika)
 *                 example: 120
 *               estimatedCost:
 *                 type: number
 *                 description: Tahmini maliyet (TL)
 *                 example: 500
 *               notes:
 *                 type: string
 *                 description: Usta notları
 *                 example: "Yağ filtresi değişecek"
 *     responses:
 *       200:
 *         description: Randevu başarıyla onaylandı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Usta için randevu onaylama
router.put('/:appointmentId/mechanic/confirm', auth, confirmAppointmentByMechanic);

/**
 * @swagger
 * /api/maintenance-appointments/{appointmentId}/mechanic/complete:
 *   put:
 *     summary: Randevuyu tamamla
 *     description: Usta randevuyu tamamlar ve sonuç bilgilerini ekler
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actualDuration:
 *                 type: number
 *                 description: Gerçek süre (dakika)
 *                 example: 90
 *               actualCost:
 *                 type: number
 *                 description: Gerçek maliyet (TL)
 *                 example: 450
 *               workDone:
 *                 type: string
 *                 description: Yapılan işler
 *                 example: "Yağ değişimi, filtre değişimi, genel kontrol"
 *               recommendations:
 *                 type: string
 *                 description: Öneriler
 *                 example: "Bir sonraki bakım 10.000 km sonra"
 *     responses:
 *       200:
 *         description: Randevu başarıyla tamamlandı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Usta için randevu tamamlama
router.put('/:appointmentId/mechanic/complete', auth, completeAppointmentByMechanic);

/**
 * @swagger
 * /api/maintenance-appointments/{appointmentId}/mechanic/reject:
 *   put:
 *     summary: Randevuyu reddet
 *     description: Usta randevuyu reddeder ve nedenini belirtir
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: Red nedeni
 *                 example: "Bu tip araçlarda çalışmıyorum"
 *               alternativeDate:
 *                 type: string
 *                 format: date
 *                 description: Alternatif tarih önerisi
 *                 example: "2024-02-20"
 *     responses:
 *       200:
 *         description: Randevu başarıyla reddedildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Usta için randevu reddetme
router.put('/:appointmentId/mechanic/reject', auth, rejectAppointmentByMechanic);

/**
 * @swagger
 * /api/maintenance-appointments/mechanic-availability:
 *   get:
 *     summary: Usta müsaitlik durumu
 *     description: Ustanın belirli bir gündeki müsaitlik durumunu getirir
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Kontrol edilecek tarih
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *         description: Servis tipi (opsiyonel)
 *     responses:
 *       200:
 *         description: Müsaitlik durumu başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 availableSlots:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["09:00", "11:00", "14:00", "16:00"]
 *                 workingHours:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       example: "08:00"
 *                     end:
 *                       type: string
 *                       example: "18:00"
 *                 isAvailable:
 *                   type: boolean
 *                   description: O gün çalışıyor mu
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
// Ustanın belirli bir gündeki müsaitlik durumunu getirme
router.get('/mechanic-availability', auth, getMechanicAvailability);

export default router; 