import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import { auth } from '../middleware/optimizedAuth';
import mongoose from 'mongoose';
import { ResponseHandler } from '../utils/response';
import { Notification } from '../models/Notification'; // Added missing import
import multer from 'multer';
import cloudinary, { isCloudinaryConfigured } from '../utils/cloudinary';
import { Readable } from 'stream';

// Multer konfigürasyonu - memory storage kullan
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, WEBP, GIF)'));
    }
  }
});

// Buffer'ı Cloudinary'ye yükleme fonksiyonu
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `rektefe/${folder}`,
        resource_type: 'image',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });
};

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
    console.log('🔍 Backend: /users/profile çağrıldı, userId:', userId);
    
    if (!userId) {
      console.log('❌ Backend: userId bulunamadı');
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('-password');
    console.log('🔍 Backend: User bulundu:', user ? 'Evet' : 'Hayır');
    
    if (!user) {
      console.log('❌ Backend: User bulunamadı');
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    console.log('🔍 Backend: User data:', {
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      phone: user.phone
    });

    return ResponseHandler.success(res, user, 'Profil başarıyla getirildi');
  } catch (error) {
    console.error('❌ Backend: Profile error:', error);
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
 *               userType:
 *                 type: string
 *                 enum: [user, mechanic, driver, admin]
 *                 description: Kullanıcı tipi
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

    const { name, surname, bio, phone, city, serviceCategories, userType } = req.body;
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (surname) updateData.surname = surname;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (serviceCategories !== undefined) updateData.serviceCategories = serviceCategories;
    if (userType && ['user', 'mechanic', 'driver', 'admin'].includes(userType)) updateData.userType = userType;

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
    return ResponseHandler.error(res, 'Profil güncellenirken hata oluştu');
  }
});

// Usta yeteneklerini güncelle
router.put('/capabilities', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { capabilities } = req.body;
    
    if (!capabilities || !Array.isArray(capabilities)) {
      return ResponseHandler.badRequest(res, 'Yetenekler listesi gerekli.');
    }

    // Geçerli yetenek türlerini kontrol et
    const validCapabilities = ['towing', 'repair', 'wash', 'tire', 'tamir', 'bakim', 'yikama', 'lastik', 'Genel Bakım'];
    const invalidCapabilities = capabilities.filter(cap => !validCapabilities.includes(cap));
    
    if (invalidCapabilities.length > 0) {
      return ResponseHandler.badRequest(res, `Geçersiz yetenek türleri: ${invalidCapabilities.join(', ')}`);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { serviceCategories: capabilities },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.updated(res, updatedUser, 'Yetenekler başarıyla güncellendi');
  } catch (error) {
    return ResponseHandler.error(res, 'Yetenekler güncellenirken hata oluştu');
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Profil fotoğrafı
 *     responses:
 *       200:
 *         description: Profil fotoğrafı güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/profile-photo', auth, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }
    
    if (!req.file) {
      return ResponseHandler.badRequest(res, 'Fotoğraf yüklenmedi.');
    }
    
    // Cloudinary konfigürasyon kontrolü
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary credentials eksik - profil fotoğrafı yüklenemedi');
      return ResponseHandler.error(res, 'Fotoğraf yükleme servisi yapılandırılmamış. Lütfen yöneticinizle iletişime geçin.');
    }
    
    // Cloudinary'ye yükle
    console.log('📸 Profil fotoğrafı yükleniyor...');
    const result = await uploadToCloudinary(req.file.buffer, 'profile_photos');
    console.log('✅ Cloudinary upload başarılı:', result.secure_url);
    
    // Kullanıcıyı güncelle
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }
    
    return ResponseHandler.success(res, {
      avatar: result.secure_url,
      user
    }, 'Profil fotoğrafı başarıyla güncellendi');
    
  } catch (error: any) {
    console.error('❌ Profil fotoğrafı yükleme hatası:', error);
    console.error('Hata detayı:', error.message);
    return ResponseHandler.error(res, error.message || 'Profil fotoğrafı güncellenirken hata oluştu');
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Kapak fotoğrafı
 *     responses:
 *       200:
 *         description: Kapak fotoğrafı güncellendi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/cover-photo', auth, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }
    
    if (!req.file) {
      return ResponseHandler.badRequest(res, 'Fotoğraf yüklenmedi.');
    }
    
    // Cloudinary konfigürasyon kontrolü
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary credentials eksik - kapak fotoğrafı yüklenemedi');
      return ResponseHandler.error(res, 'Fotoğraf yükleme servisi yapılandırılmamış. Lütfen yöneticinizle iletişime geçin.');
    }
    
    // Cloudinary'ye yükle (cover için daha geniş boyut)
    console.log('📸 Kapak fotoğrafı yükleniyor...');
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'rektefe/cover_photos',
          resource_type: 'image',
          transformation: [
            { width: 1500, height: 500, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      const readable = Readable.from(req.file!.buffer);
      readable.pipe(uploadStream);
    });
    console.log('✅ Cloudinary upload başarılı:', (result as any).secure_url);
    
    // Kullanıcıyı güncelle
    const user = await User.findByIdAndUpdate(
      userId,
      { cover: (result as any).secure_url },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }
    
    return ResponseHandler.success(res, {
      cover: (result as any).secure_url,
      user
    }, 'Kapak fotoğrafı başarıyla güncellendi');
    
  } catch (error: any) {
    console.error('❌ Kapak fotoğrafı yükleme hatası:', error);
    console.error('Hata detayı:', error.message);
    return ResponseHandler.error(res, error.message || 'Kapak fotoğrafı güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/notifications:
 *   get:
 *     summary: Kullanıcı bildirimlerini getir
 *     description: Giriş yapan kullanıcının tüm bildirimlerini listeler
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Sayfa numarası
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Sayfa başına bildirim sayısı
 *         example: 10
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *         description: Sadece okunmamış bildirimleri getir
 *         example: false
 *     responses:
 *       200:
 *         description: Bildirimler başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/notifications', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    let filter: any = { userId };
    if (unreadOnly === 'true') {
      filter.read = false;
    }
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Notification.countDocuments(filter);
    
    return ResponseHandler.success(res, {
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }, 'Bildirimler başarıyla getirildi');
    
  } catch (error) {
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
    return ResponseHandler.error(res, 'Bildirimler güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Giriş yapan kullanıcının detaylı bilgilerini getir
 *     description: JWT token ile giriş yapan kullanıcının tüm bilgilerini getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/me', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId)
      .select('-password')
      .populate('favoriteVehicle', 'brand modelName year plateNumber')
      .populate('followers', 'name surname avatar')
      .populate('following', 'name surname avatar')

    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user, 'Kullanıcı bilgileri başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Kullanıcı bilgileri getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Kullanıcı arama
 *     description: İsim, soyisim veya e-posta ile kullanıcı arama
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Arama terimi (isim, soyisim, e-posta)
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [driver, mechanic]
 *         description: Kullanıcı tipi filtresi
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maksimum sonuç sayısı
 *     responses:
 *       200:
 *         description: Arama sonuçları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/search', auth, async (req: Request, res: Response) => {
  try {
    const { q, userType, limit = 10 } = req.query;
    const requestingUserId = req.user?.userId;
    
    if (!requestingUserId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    if (!q || typeof q !== 'string') {
      return ResponseHandler.badRequest(res, 'Arama terimi gerekli.');
    }

    const searchQuery: any = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { surname: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: requestingUserId } // Kendini arama sonuçlarından çıkar
    };

    if (userType) {
      searchQuery.userType = userType;
    }

    const users = await User.find(searchQuery)
      .select('name surname email userType avatar city')
      .limit(Number(limit));

    return ResponseHandler.success(res, users, 'Arama sonuçları başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Kullanıcı arama yapılırken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/follow/:userId:
 *   post:
 *     summary: Kullanıcıyı takip et
 *     description: Belirtilen kullanıcıyı takip listesine ekler
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
 *         description: Takip edilecek kullanıcı ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı başarıyla takip edildi
 *       400:
 *         description: Kendini takip etme hatası
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Takip edilecek kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */

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

    return ResponseHandler.success(res, { 
      message: 'Push token başarıyla kaydedildi',
      user: {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        userType: user.userType,
        pushToken: user.pushToken,
        platform: user.platform,
        lastTokenUpdate: user.lastTokenUpdate
      }
    }, 'Push token kaydedildi');
    
  } catch (error) {
    return ResponseHandler.error(res, 'Push token kaydedilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/become-customer/:mechanicId:
 *   post:
 *     summary: Usta müşterisi ol
 *     description: Şöförün bir ustaya müşteri olmasını sağlar
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Usta ID'si
 *     responses:
 *       200:
 *         description: Başarıyla müşteri olundu
 *       400:
 *         description: Geçersiz istek
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Takip edilecek kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/become-customer/:mechanicId', auth, async (req: Request, res: Response) => {
  try {
    const { mechanicId } = req.params;
    const customerId = req.user?.userId;
    
    if (!customerId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    // Müşteri olmak isteyen kişi şöför olmalı
    const customer = await User.findById(customerId);
    if (!customer) {
      return ResponseHandler.notFound(res, 'Müşteri bulunamadı.');
    }

    if (customer.userType !== 'driver') {
      return ResponseHandler.badRequest(res, 'Sadece şöförler usta müşterisi olabilir.');
    }

    // Usta bulunmalı
    const mechanic = await User.findById(mechanicId);
    if (!mechanic) {
      return ResponseHandler.notFound(res, 'Usta bulunamadı.');
    }

    if (mechanic.userType !== 'mechanic') {
      return ResponseHandler.badRequest(res, 'Sadece ustalar müşteri kabul edebilir.');
    }

    // Zaten müşteri mi kontrol et
    if (customer.following.some(id => id.toString() === mechanicId)) {
      return ResponseHandler.badRequest(res, 'Zaten bu ustanın müşterisisiniz.');
    }

    // Müşteri ol
    customer.following.push(new mongoose.Types.ObjectId(mechanicId));
    mechanic.followers.push(new mongoose.Types.ObjectId(customerId));

    await Promise.all([customer.save(), mechanic.save()]);

    return ResponseHandler.success(res, { 
      message: 'Başarıyla müşteri olundu',
      mechanicName: `${mechanic.name} ${mechanic.surname}`,
      customerCount: mechanic.followers.length
    }, 'Müşteri olundu');
    
  } catch (error) {
    return ResponseHandler.error(res, 'Müşteri olurken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/remove-customer/:mechanicId:
 *   delete:
 *     summary: Müşteriliği bırak
 *     description: Belirtilen ustadan müşteriliği bırakır
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mechanicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Müşteriliği bırakılacak usta ID'si
 *     responses:
 *       200:
 *         description: Müşterilik başarıyla bırakıldı
 *       400:
 *         description: Geçersiz işlem
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete('/remove-customer/:mechanicId', auth, async (req: Request, res: Response) => {
  try {
    const { mechanicId } = req.params;
    const customerId = req.user?.userId;
    
    if (!customerId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return ResponseHandler.notFound(res, 'Müşteri bulunamadı.');
    }

    // Müşteri mi kontrol et
    if (!customer.following.some(id => id.toString() === mechanicId)) {
      return ResponseHandler.badRequest(res, 'Zaten bu ustanın müşterisi değilsiniz.');
    }

    // Müşteriliği bırak
    customer.following = customer.following.filter(id => id.toString() !== mechanicId);
    
    const mechanic = await User.findById(mechanicId);
    if (mechanic) {
      mechanic.followers = mechanic.followers.filter(id => id.toString() !== customerId);
      await mechanic.save();
    }

    await customer.save();

    return ResponseHandler.success(res, { 
      message: 'Müşterilik başarıyla bırakıldı',
      mechanicName: mechanic ? `${mechanic.name} ${mechanic.surname}` : 'Bilinmeyen Usta'
    }, 'Müşterilik bırakıldı');
    
  } catch (error) {
    return ResponseHandler.error(res, 'Müşterilik bırakılırken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/my-mechanics:
 *   get:
 *     summary: Müşterisi olunan ustaları getir
 *     description: Şöförün müşterisi olduğu ustaları listeler
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Müşterisi olunan ustalar başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/my-mechanics', auth, async (req: Request, res: Response) => {
  try {
    const customerId = req.user?.userId;
    
    if (!customerId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return ResponseHandler.notFound(res, 'Müşteri bulunamadı.');
    }

    if (customer.userType !== 'driver') {
      return ResponseHandler.badRequest(res, 'Bu endpoint sadece şöförler için.');
    }

    // Müşterisi olunan ustaları getir
    const mechanics = await User.find({
      _id: { $in: customer.following },
      userType: 'mechanic'
    }).select('name surname email avatar city bio experience rating ratingCount shopName');

    return ResponseHandler.success(res, mechanics, 'Müşterisi olunan ustalar başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Müşteri ustaları getirilirken hata oluştu');
  }
});

// ===== SETTINGS ENDPOINTS =====

/**
 * @swagger
 * /api/users/privacy-settings:
 *   get:
 *     summary: Gizlilik ayarlarını al
 *     description: Kullanıcının gizlilik ayarlarını getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gizlilik ayarları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/privacy-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('privacySettings');
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user.privacySettings || {
      locationSharing: false,
      profileVisibility: true,
      emailHidden: false,
      phoneHidden: false
    }, 'Gizlilik ayarları başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Gizlilik ayarları getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/privacy-settings:
 *   put:
 *     summary: Gizlilik ayarlarını güncelle
 *     description: Kullanıcının gizlilik ayarlarını günceller
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
 *               locationSharing:
 *                 type: boolean
 *               profileVisibility:
 *                 type: boolean
 *               emailHidden:
 *                 type: boolean
 *               phoneHidden:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Gizlilik ayarları başarıyla güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/privacy-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { locationSharing, profileVisibility, emailHidden, phoneHidden } = req.body;
    const updateData: any = {};
    
    if (locationSharing !== undefined) updateData['privacySettings.locationSharing'] = locationSharing;
    if (profileVisibility !== undefined) updateData['privacySettings.profileVisibility'] = profileVisibility;
    if (emailHidden !== undefined) updateData['privacySettings.emailHidden'] = emailHidden;
    if (phoneHidden !== undefined) updateData['privacySettings.phoneHidden'] = phoneHidden;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('privacySettings');

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.updated(res, updatedUser.privacySettings, 'Gizlilik ayarları başarıyla güncellendi');
  } catch (error) {
    return ResponseHandler.error(res, 'Gizlilik ayarları güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/job-settings:
 *   get:
 *     summary: İş ayarlarını al
 *     description: Kullanıcının iş ayarlarını getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İş ayarları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/job-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('jobSettings');
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user.jobSettings || {
      autoAcceptJobs: false,
      isAvailable: true,
      workingHours: ''
    }, 'İş ayarları başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'İş ayarları getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/job-settings:
 *   put:
 *     summary: İş ayarlarını güncelle
 *     description: Kullanıcının iş ayarlarını günceller
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
 *               autoAcceptJobs:
 *                 type: boolean
 *               isAvailable:
 *                 type: boolean
 *               workingHours:
 *                 type: string
 *     responses:
 *       200:
 *         description: İş ayarları başarıyla güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/job-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { autoAcceptJobs, isAvailable, workingHours } = req.body;
    const updateData: any = {};
    
    if (autoAcceptJobs !== undefined) updateData['jobSettings.autoAcceptJobs'] = autoAcceptJobs;
    if (isAvailable !== undefined) updateData['jobSettings.isAvailable'] = isAvailable;
    if (workingHours !== undefined) updateData['jobSettings.workingHours'] = workingHours;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('jobSettings');

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.updated(res, updatedUser.jobSettings, 'İş ayarları başarıyla güncellendi');
  } catch (error) {
    return ResponseHandler.error(res, 'İş ayarları güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/app-settings:
 *   get:
 *     summary: Uygulama ayarlarını al
 *     description: Kullanıcının uygulama ayarlarını getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Uygulama ayarları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/app-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('appSettings');
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user.appSettings || {
      darkMode: false,
      language: 'tr',
      theme: 'light'
    }, 'Uygulama ayarları başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Uygulama ayarları getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/app-settings:
 *   put:
 *     summary: Uygulama ayarlarını güncelle
 *     description: Kullanıcının uygulama ayarlarını günceller
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
 *               darkMode:
 *                 type: boolean
 *               language:
 *                 type: string
 *               theme:
 *                 type: string
 *     responses:
 *       200:
 *         description: Uygulama ayarları başarıyla güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/app-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { darkMode, language, theme } = req.body;
    const updateData: any = {};
    
    if (darkMode !== undefined) updateData['appSettings.darkMode'] = darkMode;
    if (language !== undefined) updateData['appSettings.language'] = language;
    if (theme !== undefined) updateData['appSettings.theme'] = theme;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('appSettings');

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.updated(res, updatedUser.appSettings, 'Uygulama ayarları başarıyla güncellendi');
  } catch (error) {
    return ResponseHandler.error(res, 'Uygulama ayarları güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/security-settings:
 *   get:
 *     summary: Güvenlik ayarlarını al
 *     description: Kullanıcının güvenlik ayarlarını getirir
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Güvenlik ayarları başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/security-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('securitySettings userType');
    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user.securitySettings || {
      twoFactorEnabled: false,
      biometricEnabled: false,
      sessionTimeout: 30
    }, 'Güvenlik ayarları başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Güvenlik ayarları getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/security-settings:
 *   put:
 *     summary: Güvenlik ayarlarını güncelle
 *     description: Kullanıcının güvenlik ayarlarını günceller
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
 *               twoFactorEnabled:
 *                 type: boolean
 *               biometricEnabled:
 *                 type: boolean
 *               sessionTimeout:
 *                 type: number
 *     responses:
 *       200:
 *         description: Güvenlik ayarları başarıyla güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/security-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { twoFactorEnabled, biometricEnabled, sessionTimeout } = req.body;
    const updateData: any = {};
    
    if (twoFactorEnabled !== undefined) updateData['securitySettings.twoFactorEnabled'] = twoFactorEnabled;
    if (biometricEnabled !== undefined) updateData['securitySettings.biometricEnabled'] = biometricEnabled;
    if (sessionTimeout !== undefined) updateData['securitySettings.sessionTimeout'] = sessionTimeout;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('securitySettings');

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.updated(res, updatedUser.securitySettings, 'Güvenlik ayarları başarıyla güncellendi');
  } catch (error) {
    return ResponseHandler.error(res, 'Güvenlik ayarları güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/service-categories:
 *   put:
 *     summary: Hizmet kategorilerini güncelle
 *     description: Kullanıcının hizmet kategorilerini günceller
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
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Hizmet kategorileri başarıyla güncellendi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.put('/service-categories', auth, async (req: Request, res: Response) => {
  try {
    console.log('🔧 Backend: service-categories endpoint called');
    console.log('🔧 Request body:', req.body);
    console.log('🔧 Request headers:', req.headers);
    
    const userId = req.user?.userId;
    console.log('🔧 User ID:', userId);
    
    if (!userId) {
      console.log('❌ No user ID found');
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { categories } = req.body;
    console.log('🔧 Categories received:', categories);
    
    if (!Array.isArray(categories)) {
      console.log('❌ Categories is not an array:', typeof categories);
      return ResponseHandler.badRequest(res, 'Kategoriler listesi gerekli.');
    }

    console.log('🔧 Updating user with categories:', categories);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { serviceCategories: categories },
      { new: true, runValidators: true }
    ).select('serviceCategories');

    if (!updatedUser) {
      console.log('❌ User not found');
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    console.log('✅ User updated successfully:', updatedUser.serviceCategories);
    return ResponseHandler.updated(res, updatedUser.serviceCategories, 'Hizmet kategorileri başarıyla güncellendi');
  } catch (error) {
    console.error('❌ Backend error:', error);
    return ResponseHandler.error(res, 'Hizmet kategorileri güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/change-email:
 *   post:
 *     summary: E-posta değiştir
 *     description: Yeni e-posta adresine onay linki gönderir
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
 *               - newEmail
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *                 example: newemail@example.com
 *     responses:
 *       200:
 *         description: Onay linki gönderildi
 *       400:
 *         description: Geçersiz e-posta
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/change-email', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { newEmail } = req.body;

    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    if (!newEmail) {
      return ResponseHandler.badRequest(res, 'Yeni e-posta adresi gerekli');
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.initiateEmailChange(userId, newEmail);

    if (result.success) {
      return ResponseHandler.success(res, {}, result.message);
    } else {
      return ResponseHandler.badRequest(res, result.message);
    }
  } catch (error) {
    return ResponseHandler.error(res, 'E-posta değiştirme başlatılamadı');
  }
});

/**
 * @swagger
 * /api/users/confirm-email-change:
 *   post:
 *     summary: E-posta değişikliğini onayla
 *     description: Token ile e-posta değişikliğini onaylar
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123def456...
 *     responses:
 *       200:
 *         description: E-posta başarıyla değiştirildi
 *       400:
 *         description: Geçersiz token
 *       500:
 *         description: Sunucu hatası
 */
router.post('/confirm-email-change', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return ResponseHandler.badRequest(res, 'Token gerekli');
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.confirmEmailChange(token);

    if (result.success) {
      return ResponseHandler.success(res, {}, result.message);
    } else {
      return ResponseHandler.badRequest(res, result.message);
    }
  } catch (error) {
    return ResponseHandler.error(res, 'E-posta değişikliği onaylanamadı');
  }
});

/**
 * @swagger
 * /api/users/send-phone-verification:
 *   post:
 *     summary: Telefon doğrulama kodu gönder
 *     description: Telefon numarasına SMS ile doğrulama kodu gönderir
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "05061234567"
 *               userId:
 *                 type: string
 *                 description: "Kullanıcı ID'si (opsiyonel)"
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Doğrulama kodu gönderildi
 *       400:
 *         description: Geçersiz telefon numarası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/send-phone-verification', async (req: Request, res: Response) => {
  try {
    const { phone, userId } = req.body;

    if (!phone) {
      return ResponseHandler.badRequest(res, 'Telefon numarası gerekli');
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.sendPhoneVerification(userId, phone);

    if (result.success) {
      return ResponseHandler.success(res, { code: result.code }, result.message); // Geçici: SMS olmadığı için kod döndür
    } else {
      return ResponseHandler.badRequest(res, result.message);
    }
  } catch (error) {
    return ResponseHandler.error(res, 'Telefon doğrulama kodu gönderilemedi');
  }
});

/**
 * @swagger
 * /api/users/verify-phone:
 *   post:
 *     summary: Telefon doğrulama kodunu kontrol et
 *     description: Kullanıcının girdiği doğrulama kodunu kontrol eder
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
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Telefon başarıyla doğrulandı
 *       400:
 *         description: Geçersiz kod
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/verify-phone', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body;

    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    if (!code) {
      return ResponseHandler.badRequest(res, 'Doğrulama kodu gerekli');
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.verifyPhoneCode(userId, code);

    if (result.success) {
      return ResponseHandler.success(res, {}, result.message);
    } else {
      return ResponseHandler.badRequest(res, result.message);
    }
  } catch (error) {
    return ResponseHandler.error(res, 'Telefon doğrulanamadı');
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Kullanıcı bilgilerini ID ile getir
 *     description: Belirli bir kullanıcının bilgilerini ID ile getirir
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
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri başarıyla getirildi
 *       400:
 *         description: Geçersiz kullanıcı ID
 *       401:
 *         description: Yetkilendirme hatası
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// Bu route notification-settings'den sonra taşındı - route çakışmasını önlemek için

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Kullanıcı profilini güncelle
 *     description: Kullanıcının profil bilgilerini günceller
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
 *               userType:
 *                 type: string
 *                 enum: [user, mechanic, driver, admin]
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               phone:
 *                 type: string
 *               city:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi
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

    const updateData = req.body;
    
    // Güvenli alanları güncelle
    const allowedFields = ['userType', 'name', 'surname', 'phone', 'city', 'bio'];
    const filteredData: any = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      filteredData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, user, 'Profil başarıyla güncellendi');
  } catch (error) {
    return ResponseHandler.error(res, 'Profil güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/notification-settings:
 *   get:
 *     summary: Bildirim ayarlarını al
 *     description: Kullanıcının bildirim ayarlarını getirir
 *     tags:
 *       - Users
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
router.get('/notification-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    console.log('🔍 User.ts notification-settings Debug:');
    console.log('req.user:', req.user);
    console.log('userId:', userId);
    console.log('Authorization header:', req.header('Authorization'));
    
    if (!userId) {
      console.log('❌ User.ts: userId bulunamadı');
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const user = await User.findById(userId).select('notificationSettings');
    if (!user) {
      console.log('❌ User.ts: Kullanıcı bulunamadı, userId:', userId);
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    console.log('✅ User.ts: Kullanıcı bulundu, notificationSettings:', user.notificationSettings);

    return ResponseHandler.success(res, user.notificationSettings || {
      pushNotifications: true,
      appointmentNotifications: true,
      paymentNotifications: true,
      messageNotifications: true,
      systemNotifications: true,
      marketingNotifications: false,
      soundEnabled: true,
      vibrationEnabled: true
    }, 'Bildirim ayarları başarıyla getirildi');
  } catch (error) {
    console.log('❌ User.ts notification-settings error:', error);
    return ResponseHandler.error(res, 'Bildirim ayarları getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/notification-settings:
 *   put:
 *     summary: Bildirim ayarlarını güncelle
 *     description: Kullanıcının bildirim ayarlarını günceller
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
router.put('/notification-settings', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { notificationSettings: req.body },
      { new: true, runValidators: true }
    ).select('notificationSettings');

    if (!updatedUser) {
      return ResponseHandler.notFound(res, 'Kullanıcı bulunamadı.');
    }

    return ResponseHandler.success(res, updatedUser.notificationSettings, 'Bildirim ayarları başarıyla güncellendi');
  } catch (error) {
    return ResponseHandler.error(res, 'Bildirim ayarları güncellenirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Kullanıcı bilgilerini ID ile getir
 *     description: Belirli bir kullanıcının bilgilerini ID ile getirir
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
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri başarıyla getirildi
 *       400:
 *         description: Geçersiz kullanıcı ID
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
    return ResponseHandler.error(res, 'Kullanıcı bilgileri getirilirken hata oluştu');
  }
});

export default router; 