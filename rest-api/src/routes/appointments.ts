import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAppointmentSchema, updateAppointmentSchema } from '../validators/appointment.validation';
import { AppointmentController } from '../controllers/appointment.controller';

const router = Router();

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Yeni randevu talebi oluştur
 *     description: Driver tarafından usta için randevu talebi oluşturur
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mechanicId
 *               - serviceType
 *               - appointmentDate
 *               - timeSlot
 *               - description
 *             properties:
 *               mechanicId:
 *                 type: string
 *                 description: Usta ID'si
 *               serviceType:
 *                 type: string
 *                 description: Hizmet tipi
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *                 description: Randevu tarihi
 *               timeSlot:
 *                 type: string
 *                 description: Randevu saati
 *               description:
 *                 type: string
 *                 description: Randevu açıklaması
 *               vehicleId:
 *                 type: string
 *                 description: Araç ID'si (opsiyonel)
 *     responses:
 *       201:
 *         description: Randevu talebi başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Usta bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/', auth, validate(createAppointmentSchema), AppointmentController.createAppointment);

/**
 * @swagger
 * /api/appointments/driver:
 *   get:
 *     summary: Driver'ın randevularını getir
 *     description: Giriş yapan driver'ın tüm randevularını listeler
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Randevular başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/driver', auth, AppointmentController.getDriverAppointments);

/**
 * @swagger
 * /api/appointments/mechanic:
 *   get:
 *     summary: Ustanın randevularını getir
 *     description: Giriş yapan ustanın tüm randevularını listeler
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Randevular başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/mechanic', auth, AppointmentController.getMechanicAppointments);

/**
 * @swagger
 * /api/appointments/:id:
 *   get:
 *     summary: Randevu detayını getir
 *     description: Belirli bir randevunun detaylarını getirir
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     responses:
 *       200:
 *         description: Randevu detayı başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:id', auth, AppointmentController.getAppointmentById);

/**
 * @swagger
 * /api/appointments/:id/status:
 *   put:
 *     summary: Randevu durumunu güncelle
 *     description: Usta tarafından randevu durumu güncellenir (onay/red)
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, rejected, in-progress, completed, cancelled]
 *                 description: Yeni randevu durumu
 *               rejectionReason:
 *                 type: string
 *                 description: Red gerekçesi (status rejected ise)
 *               mechanicNotes:
 *                 type: string
 *                 description: Usta notları
 *     responses:
 *       200:
 *         description: Randevu durumu başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:id/status', auth, validate(updateAppointmentSchema), AppointmentController.updateAppointmentStatus);

/**
 * @swagger
 * /api/appointments/:id/contact:
 *   get:
 *     summary: İletişim bilgilerini paylaş
 *     description: Randevu onaylandıktan sonra karşılıklı iletişim bilgileri paylaşılır
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *     responses:
 *       200:
 *         description: İletişim bilgileri başarıyla paylaşıldı
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:id/contact', auth, AppointmentController.shareContactInfo);

export default router;
