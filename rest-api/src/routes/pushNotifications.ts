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

// notification-settings endpoint'i user.ts'de tanımlı, burada çakışma olmaması için kaldırıldı

/**
 * @swagger
 * /api/push-notifications/test-notification:
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
