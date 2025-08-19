import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAppointmentSchema } from '../validators/maintenance.validation';
import { MaintenanceAppointmentController } from '../controllers/maintenanceAppointment.controller';
import { autoSetDates } from '../middleware/autoDateSetter';

const router = Router();

/**
 * @swagger
 * /api/maintenance-appointments:
 *   post:
 *     summary: Yeni bakım randevusu oluştur
 *     description: Kullanıcı için yeni bir bakım randevusu oluşturur
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - appointmentDate
 *               - serviceType
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: Araç ID'si
 *                 example: "507f1f77bcf86cd799439011"
 *               mechanicId:
 *                 type: string
 *                 description: Mekanik ID'si (opsiyonel)
 *                 example: "507f1f77bcf86cd799439012"
 *               appointmentDate:
 *                 type: string
 *                 format: date-time
 *                 description: Randevu tarihi
 *                 example: "2024-01-15T10:00:00Z"
 *               serviceType:
 *                 type: string
 *                 description: Hizmet tipi
 *                 example: "Genel Bakım"
 *               description:
 *                 type: string
 *                 description: Randevu açıklaması
 *                 example: "Motor yağı değişimi ve filtre kontrolü"
 *               estimatedDuration:
 *                 type: number
 *                 description: Tahmini süre (dakika)
 *                 example: 120
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Öncelik seviyesi
 *                 example: "medium"
 *     responses:
 *       201:
 *         description: Randevu başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri veya mekanik müsait değil
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Araç veya mekanik bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/', auth, validate(createAppointmentSchema), MaintenanceAppointmentController.createAppointment);

/**
 * @swagger
 * /api/maintenance-appointments:
 *   get:
 *     summary: Kullanıcının randevularını getir
 *     description: Giriş yapan kullanıcının tüm bakım randevularını listeler
 *     tags:
 *       - Maintenance Appointments
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
router.get('/', auth, MaintenanceAppointmentController.getUserAppointments);

/**
 * @swagger
 * /api/maintenance-appointments/mechanic:
 *   get:
 *     summary: Mekaniğin randevularını getir
 *     description: Giriş yapan mekaniğin tüm randevularını listeler
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mekanik randevuları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/mechanic', auth, MaintenanceAppointmentController.getMechanicAppointments);

/**
 * @swagger
 * /api/maintenance-appointments/search:
 *   get:
 *     summary: Randevu ara
 *     description: Araç markası, modeli, plakası veya mekanik dükkan adına göre arama yapar
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Arama terimi
 *         example: "BMW"
 *     responses:
 *       200:
 *         description: Arama sonuçları başarıyla getirildi
 *       400:
 *         description: Arama terimi eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/search', auth, MaintenanceAppointmentController.searchAppointments);

/**
 * @swagger
 * /api/maintenance-appointments/date-range:
 *   get:
 *     summary: Tarih aralığında randevuları getir
 *     description: Belirli tarih aralığındaki randevuları listeler
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi
 *         example: "2024-01-31"
 *     responses:
 *       200:
 *         description: Tarih aralığında randevular başarıyla getirildi
 *       400:
 *         description: Tarih parametreleri eksik veya geçersiz
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/date-range', auth, MaintenanceAppointmentController.getAppointmentsByDateRange);

/**
 * @swagger
 * /api/maintenance-appointments/stats:
 *   get:
 *     summary: Randevu istatistikleri
 *     description: Kullanıcının randevu istatistiklerini getirir
 *     tags:
 *       - Maintenance Appointments
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
router.get('/stats', auth, MaintenanceAppointmentController.getAppointmentStats);

/**
 * @swagger
 * /api/maintenance-appointments/all:
 *   get:
 *     summary: Tüm randevuları getir (Admin)
 *     description: Sistemdeki tüm randevuları listeler (sadece admin için)
 *     tags:
 *       - Maintenance Appointments
 *     responses:
 *       200:
 *         description: Tüm randevular başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/all', MaintenanceAppointmentController.getAllAppointments);

/**
 * @swagger
 * /api/maintenance-appointments/{id}:
 *   get:
 *     summary: Belirli bir randevuyu getir
 *     description: ID'ye göre belirli bir randevunun detaylarını getirir
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Randevu başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:id', auth, MaintenanceAppointmentController.getAppointmentById);

/**
 * @swagger
 * /api/maintenance-appointments/{id}/status:
 *   put:
 *     summary: Randevu durumunu güncelle (kullanıcı)
 *     description: Kullanıcı tarafından randevu durumu güncellenir
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *         example: "507f1f77bcf86cd799439011"
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
 *                 enum: [pending, confirmed, in-progress, completed, cancelled]
 *                 description: Yeni durum
 *                 example: "confirmed"
 *               notes:
 *                 type: string
 *                 description: Notlar
 *                 example: "Randevu onaylandı"
 *     responses:
 *       200:
 *         description: Randevu durumu başarıyla güncellendi
 *       400:
 *         description: Durum bilgisi eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:id/status', auth, MaintenanceAppointmentController.updateAppointmentStatus);

/**
 * @swagger
 * /api/maintenance-appointments/{id}/mechanic-status:
 *   put:
 *     summary: Randevu durumunu güncelle (mekanik)
 *     description: Mekanik tarafından randevu durumu güncellenir
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *         example: "507f1f77bcf86cd799439011"
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
 *                 enum: [pending, confirmed, in-progress, completed, cancelled]
 *                 description: Yeni durum
 *                 example: "in-progress"
 *               notes:
 *                 type: string
 *                 description: Mekanik notları
 *                 example: "İşlem başladı"
 *     responses:
 *       200:
 *         description: Randevu durumu başarıyla güncellendi
 *       400:
 *         description: Durum bilgisi eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:id/mechanic-status', auth, autoSetDates, MaintenanceAppointmentController.updateAppointmentByMechanic);

/**
 * @swagger
 * /api/maintenance-appointments/{id}/status-dummy:
 *   put:
 *     summary: Randevu durumunu güncelle (dummy mekanik)
 *     description: Test için randevu durumunu günceller
 *     tags:
 *       - Maintenance Appointments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *         example: "507f1f77bcf86cd799439011"
 *       - in: body
 *         name: body
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - status
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending, confirmed, in-progress, completed, cancelled, rejected]
 *                   description: Yeni durum
 *                   example: "confirmed"
 *                 notes:
 *                   type: string
 *                   description: Mekanik notları
 *                   example: "Randevu onaylandı"
 *                 rejectionReason:
 *                   type: string
 *                   enum: [doluyum, müsait değilim, iletişime geçin, başka bir usta öneriyorum, teknik sorun]
 *                   description: Red sebebi (sadece rejected durumunda)
 *                   example: "doluyum"
 *     responses:
 *       200:
 *         description: Randevu durumu başarıyla güncellendi
 *       400:
 *         description: Durum bilgisi eksik
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:id/status-dummy', MaintenanceAppointmentController.updateAppointmentStatusDummy);

/**
 * @swagger
 * /api/maintenance-appointments/{id}/cancel:
 *   post:
 *     summary: Randevuyu iptal et
 *     description: Belirli bir randevuyu iptal eder
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Randevu başarıyla iptal edildi
 *       400:
 *         description: Randevu iptal edilemez
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/:id/cancel', auth, MaintenanceAppointmentController.cancelAppointment);

/**
 * @swagger
 * /api/maintenance-appointments/today:
 *   get:
 *     summary: Bugünkü onaylanan randevuları getir
 *     description: Kullanıcının bugün için onaylanan randevularını listeler
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bugünkü randevular başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/today', auth, MaintenanceAppointmentController.getTodaysAppointments);

// Bildirim ayarları
router.put('/:id/notification-settings', auth, MaintenanceAppointmentController.updateNotificationSettings);
router.get('/:id/notification-settings', auth, MaintenanceAppointmentController.getNotificationSettings);

// Ödeme durumu güncelleme
router.put('/:id/payment-status', auth, MaintenanceAppointmentController.updatePaymentStatus);

/**
 * @swagger
 * /api/maintenance-appointments/mechanic-availability:
 *   get:
 *     summary: Mekaniğin müsaitlik durumunu getir
 *     description: Belirli bir tarihte mekaniğin müsait saatlerini getirir
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
 *         description: Tarih (YYYY-MM-DD formatında)
 *         example: "2024-01-15"
 *       - in: query
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mekanik ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Müsait saatler başarıyla getirildi
 *       400:
 *         description: Tarih veya mekanik ID eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/mechanic-availability', auth, MaintenanceAppointmentController.getMechanicAvailability);

/**
 * @swagger
 * /api/maintenance-appointments/{id}:
 *   delete:
 *     summary: Randevuyu sil
 *     description: Belirli bir randevuyu kalıcı olarak siler
 *     tags:
 *       - Maintenance Appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Randevu ID'si
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Randevu başarıyla silindi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Randevu bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:id', auth, MaintenanceAppointmentController.deleteAppointment);

export default router; 