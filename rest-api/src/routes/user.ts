import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import mongoose from 'mongoose';
import { ResponseHandler } from '../utils/response';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Kullanıcı ID'si
 *         name:
 *           type: string
 *           description: Kullanıcı adı
 *           example: "Ahmet"
 *         surname:
 *           type: string
 *           description: Kullanıcı soyadı
 *           example: "Yılmaz"
 *         email:
 *           type: string
 *           format: email
 *           description: E-posta adresi
 *           example: "ahmet@example.com"
 *         userType:
 *           type: string
 *           enum: [driver, mechanic]
 *           description: Kullanıcı tipi
 *         avatar:
 *           type: string
 *           description: Profil fotoğrafı URL'i
 *         favoriteVehicle:
 *           type: string
 *           nullable: true
 *           description: Favori araç ID'si
 */

const router = Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Kullanıcı profilini getir
 *     description: Giriş yapan kullanıcının profil bilgilerini getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/profile', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user, 'Profil başarıyla getirildi');
  } catch (error) {
    console.error('Profil getirme hatası:', error);
    return ResponseHandler.error(res, 'Profil getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Kullanıcı profilini güncelle
 *     description: Giriş yapan kullanıcının profil bilgilerini günceller
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Kullanıcı adı
 *               surname:
 *                 type: string
 *                 description: Kullanıcı soyadı
 *               bio:
 *                 type: string
 *                 description: Kullanıcı hakkında bilgi
 *               phone:
 *                 type: string
 *                 description: Telefon numarası
 *               city:
 *                 type: string
 *                 description: Şehir
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/profile', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { name, surname, bio, phone, city } = req.body;
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (surname) updateData.surname = surname;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.updated(res, updatedUser, 'Profil başarıyla güncellendi');
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    return ResponseHandler.error(res, 'Profil güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/profile-photo:
 *   post:
 *     summary: Profil fotoğrafını güncelle
 *     description: Kullanıcının profil fotoğrafını günceller
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - photoUrl
 *             properties:
 *               photoUrl:
 *                 type: string
 *                 description: Fotoğraf URL'i
 *     responses:
 *       200:
 *         description: Profil fotoğrafı başarıyla güncellendi
 *       400:
 *         description: Fotoğraf URL'i eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/profile-photo', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { photoUrl } = req.body;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }
    
    if (!photoUrl) {
      return ResponseHandler.badRequest(res, 'Fotoğraf URL\'si eksik.');
    }
    
    const updated = await User.findByIdAndUpdate(
      userId, 
      { avatar: photoUrl }, 
      { new: true }
    );
    
    if (!updated) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }
    
    return ResponseHandler.updated(res, { avatar: updated.avatar }, 'Profil fotoğrafı güncellendi.');
  } catch (error: any) {
    return ResponseHandler.error(res, error.message);
  }
});

/**
 * @swagger
 * /api/users/cover-photo:
 *   post:
 *     summary: Kapak fotoğrafını güncelle
 *     description: Kullanıcının kapak fotoğrafını günceller
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - photoUrl
 *             properties:
 *               photoUrl:
 *                 type: string
 *                 description: Fotoğraf URL'i
 *     responses:
 *       200:
 *         description: Kapak fotoğrafı başarıyla güncellendi
 *       400:
 *         description: Fotoğraf URL'i eksik
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/cover-photo', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { photoUrl } = req.body;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }
    
    if (!photoUrl) {
      return ResponseHandler.badRequest(res, 'Fotoğraf URL\'si eksik.');
    }
    
    const updated = await User.findByIdAndUpdate(
      userId, 
      { cover: photoUrl }, 
      { new: true }
    );
    
    if (!updated) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }
    
    return ResponseHandler.updated(res, { cover: updated.cover }, 'Kapak fotoğrafı güncellendi.');
  } catch (error: any) {
    return ResponseHandler.error(res, error.message);
  }
});

/**
 * @swagger
 * /api/users/notifications:
 *   get:
 *     summary: Kullanıcı bildirimlerini getir
 *     description: Giriş yapan kullanıcının bildirimlerini getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bildirimler başarıyla getirildi
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       message:
 *                         type: string
 *                       type:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       isRead:
 *                         type: boolean
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/notifications', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('notifications');
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    // Boş notifications array döndür (şimdilik)
    return ResponseHandler.success(res, user.notifications || [], 'Bildirimler başarıyla getirildi');
  } catch (error) {
    console.error('Bildirim getirme hatası:', error);
    return ResponseHandler.error(res, 'Bildirimler getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/notifications/read:
 *   put:
 *     summary: Bildirimi okundu olarak işaretle
 *     description: Belirtilen bildirimi okundu olarak işaretler
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationId:
 *                 type: string
 *                 description: Okundu olarak işaretlenecek bildirim ID'si
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
router.put('/notifications/read', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { notificationId } = req.body;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    if (!notificationId) {
      return ResponseHandler.badRequest(res, 'Bildirim ID\'si gerekli.');
    }

    // Kullanıcının notifications array'inde bu bildirimi bul ve read: true yap
    const user = await User.findById(userId);
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    // Eğer notifications array yoksa oluştur
    if (!user.notifications) {
      user.notifications = [];
    }

    // Bildirimi bul ve read: true yap
    const notification = user.notifications.find(n => n._id === notificationId);
    if (notification) {
      notification.read = true;
      await user.save();
      return ResponseHandler.success(res, { message: 'Bildirim okundu olarak işaretlendi' }, 'Bildirim başarıyla güncellendi');
    } else {
      return ResponseHandler.notFound(res, 'Bildirim bulunamadı.');
    }
  } catch (error) {
    console.error('Bildirim okundu işaretleme hatası:', error);
    return ResponseHandler.error(res, 'Bildirim güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/notifications/read-all:
 *   put:
 *     summary: Tüm bildirimleri okundu olarak işaretle
 *     description: Kullanıcının tüm bildirimlerini okundu olarak işaretler
 *     tags:
 *       - Users
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
router.put('/notifications/read-all', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId);
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    // Eğer notifications array yoksa oluştur
    if (!user.notifications) {
      user.notifications = [];
    }

    // Tüm bildirimleri read: true yap
    user.notifications.forEach(notification => {
      notification.read = true;
    });

    await user.save();
    return ResponseHandler.success(res, { message: 'Tüm bildirimler okundu olarak işaretlendi' }, 'Bildirimler başarıyla güncellendi');
  } catch (error) {
    console.error('Tüm bildirimleri okundu işaretleme hatası:', error);
    return ResponseHandler.error(res, 'Bildirimler güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Kullanıcı bilgilerini ID ile getir
 *     description: Belirtilen ID'ye sahip kullanıcının bilgilerini getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcı ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/:userId', auth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.userId;
    
    if (!requestingUserId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    // Sadece kendi profilini veya admin kullanıcılar görebilir
    if (requestingUserId !== userId) {
      return ResponseHandler.forbidden(res, 'Bu kullanıcının bilgilerini görme yetkiniz yok.');
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user, 'Kullanıcı bilgileri başarıyla getirildi');
  } catch (error) {
    console.error('Kullanıcı bilgileri getirme hatası:', error);
    return ResponseHandler.error(res, 'Kullanıcı bilgileri getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/push-token:
 *   post:
 *     summary: Push notification token'ı kaydet
 *     description: Kullanıcının push notification token'ını kaydeder
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - pushToken
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Kullanıcı ID'si
 *               pushToken:
 *                 type: string
 *                 description: Expo push token
 *               platform:
 *                 type: string
 *                 enum: [ios, android, web]
 *                 description: Platform bilgisi
 *     responses:
 *       200:
 *         description: Push token başarıyla kaydedildi
 *       400:
 *         description: Geçersiz veri
 *       500:
 *         description: Sunucu hatası
 */
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const { userId, pushToken, platform } = req.body;
    
    if (!userId || !pushToken) {
      return ResponseHandler.badRequest(res, 'Kullanıcı ID ve push token gerekli.');
    }
    
    // Kullanıcıyı bul ve push token'ı kaydet
    const user = await User.findById(userId);
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }
    
    // Push token bilgilerini kaydet
    user.pushToken = pushToken;
    user.platform = platform || 'ios';
    user.lastTokenUpdate = new Date();
    
    await user.save();
    
    console.log(`✅ Push token kaydedildi: ${userId} - ${platform}`);
    
    return ResponseHandler.success(res, { 
      message: 'Push token başarıyla kaydedildi',
      userId,
      platform 
    }, 'Push token kaydedildi');
    
  } catch (error) {
    console.error('Push token kaydetme hatası:', error);
    return ResponseHandler.error(res, 'Push token kaydedilirken hata oluştu');
  }
});

export default router; 