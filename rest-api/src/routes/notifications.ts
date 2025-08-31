import { Router } from 'express';
import { auth } from '../middleware/auth';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

/**
 * @swagger
 * /api/notifications/driver:
 *   get:
 *     summary: Şoförün bildirimlerini getir
 *     description: Giriş yapan şoförün tüm bildirimlerini listeler
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bildirimler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/driver', auth, NotificationController.getDriverNotifications);

/**
 * @swagger
 * /api/notifications/driver/unread-count:
 *   get:
 *     summary: Şoförün okunmamış bildirim sayısını getir
 *     description: Giriş yapan şoförün okunmamış bildirim sayısını döner
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Okunmamış bildirim sayısı başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/driver/unread-count', auth, NotificationController.getDriverUnreadCount);

/**
 * @swagger
 * /api/notifications/mechanic:
 *   get:
 *     summary: Ustanın bildirimlerini getir
 *     description: Giriş yapan ustanın tüm bildirimlerini listeler
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bildirimler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/mechanic', auth, NotificationController.getMechanicNotifications);

/**
 * @swagger
 * /api/notifications/mechanic/unread-count:
 *   get:
 *     summary: Ustanın okunmamış bildirim sayısını getir
 *     description: Giriş yapan ustanın okunmamış bildirim sayısını döner
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Okunmamış bildirim sayısı başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/mechanic/unread-count', auth, NotificationController.getMechanicUnreadCount);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Bildirimi okundu olarak işaretle
 *     description: Belirtilen bildirimi okundu olarak işaretler
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bildirim ID'si
 *     responses:
 *       200:
 *         description: Bildirim başarıyla okundu olarak işaretlendi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Bildirim bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.put('/:notificationId/read', auth, NotificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Bildirimi sil
 *     description: Belirtilen bildirimi siler
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bildirim ID'si
 *     responses:
 *       200:
 *         description: Bildirim başarıyla silindi
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Bildirim bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/:notificationId', auth, NotificationController.deleteNotification);

/**
 * @swagger
 * /api/notifications/mechanic/mark-all-read:
 *   put:
 *     summary: Tüm bildirimleri okundu olarak işaretle
 *     description: Ustanın tüm okunmamış bildirimlerini okundu olarak işaretler
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tüm bildirimler başarıyla okundu olarak işaretlendi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/mechanic/mark-all-read', auth, NotificationController.markAllAsRead);

export default router;
