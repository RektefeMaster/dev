import { Router } from 'express';
import { auth } from '../middleware/auth';
import { PushNotificationController } from '../controllers/pushNotification.controller';

const router = Router();

/**
 * @swagger
 * /api/users/push-token:
 *   post:
 *     summary: Push token güncelle
 *     description: Kullanıcının push notification token'ını günceller
 *     tags:
 *       - Push Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Expo push token
 *     responses:
 *       200:
 *         description: Push token başarıyla güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */
router.post('/push-token', auth, PushNotificationController.updatePushToken);

/**
 * @swagger
 * /api/users/notification-settings:
 *   get:
 *     summary: Bildirim ayarlarını al
 *     description: Kullanıcının bildirim ayarlarını getirir
 *     tags:
 *       - Push Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bildirim ayarları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/notification-settings', auth, PushNotificationController.getNotificationSettings);

/**
 * @swagger
 * /api/users/notification-settings:
 *   put:
 *     summary: Bildirim ayarlarını güncelle
 *     description: Kullanıcının bildirim ayarlarını günceller
 *     tags:
 *       - Push Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushNotifications:
 *                 type: boolean
 *               appointmentNotifications:
 *                 type: boolean
 *               paymentNotifications:
 *                 type: boolean
 *               messageNotifications:
 *                 type: boolean
 *               systemNotifications:
 *                 type: boolean
 *               marketingNotifications:
 *                 type: boolean
 *               soundEnabled:
 *                 type: boolean
 *               vibrationEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bildirim ayarları başarıyla güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/notification-settings', auth, PushNotificationController.updateNotificationSettings);

/**
 * @swagger
 * /api/users/test-notification:
 *   post:
 *     summary: Test bildirimi gönder
 *     description: Kullanıcıya test bildirimi gönderir
 *     tags:
 *       - Push Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test bildirimi başarıyla gönderildi
 *       401:
 *         description: Yetkilendirme hatası
 *       400:
 *         description: Push token bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/test-notification', auth, PushNotificationController.sendTestNotification);

export default router;
