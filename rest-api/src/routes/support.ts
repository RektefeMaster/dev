import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types/auth.d';
import { ResponseHandler } from '../utils/responseHandler';

const router = express.Router();

// ===== HELP ARTICLES =====

/**
 * @swagger
 * /api/support/help-articles:
 *   get:
 *     summary: Yardım makalelerini al
 *     description: Kategorilere göre yardım makalelerini getirir
 *     tags:
 *       - Support
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Makale kategorisi (opsiyonel)
 *     responses:
 *       200:
 *         description: Yardım makaleleri başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/help-articles', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    // Mock data - gerçek uygulamada veritabanından gelecek
    const helpArticles = [
      {
        id: '1',
        title: 'Hesabımı nasıl oluştururum?',
        content: 'Uygulamayı indirdikten sonra "Kayıt Ol" butonuna tıklayın ve gerekli bilgileri doldurun.',
        category: 'account',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Şifremi nasıl değiştiririm?',
        content: 'Ayarlar > Güvenlik > Şifre Değiştir bölümünden şifrenizi güncelleyebilirsiniz.',
        category: 'account',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Hizmet alanlarımı nasıl düzenlerim?',
        content: 'Ayarlar > Hesap Yönetimi > Hizmet Alanlarım bölümünden uzmanlık alanlarınızı seçebilirsiniz.',
        category: 'services',
        createdAt: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Çalışma saatlerimi nasıl ayarlarım?',
        content: 'Ayarlar > Hesap Yönetimi > Çalışma Saatleri bölümünden müsaitlik durumunuzu ayarlayabilirsiniz.',
        category: 'services',
        createdAt: new Date().toISOString()
      },
      {
        id: '5',
        title: 'Ödeme nasıl alırım?',
        content: 'Tamamlanan işler için ödemeler otomatik olarak hesabınıza yatırılır.',
        category: 'payments',
        createdAt: new Date().toISOString()
      },
      {
        id: '6',
        title: 'Bildirimleri nasıl yönetirim?',
        content: 'Ayarlar > Bildirim Ayarları bölümünden bildirim tercihlerinizi düzenleyebilirsiniz.',
        category: 'technical',
        createdAt: new Date().toISOString()
      }
    ];

    let filteredArticles = helpArticles;
    if (category && category !== 'all') {
      filteredArticles = helpArticles.filter(article => article.category === category);
    }

    return ResponseHandler.success(res, filteredArticles, 'Yardım makaleleri başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Yardım makaleleri getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/support/help-categories:
 *   get:
 *     summary: Yardım kategorilerini al
 *     description: Mevcut yardım kategorilerini getirir
 *     tags:
 *       - Support
 *     responses:
 *       200:
 *         description: Yardım kategorileri başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/help-categories', async (req: Request, res: Response) => {
  try {
    const categories = [
      { id: 'all', name: 'Tümü', icon: 'list' },
      { id: 'account', name: 'Hesap', icon: 'person' },
      { id: 'services', name: 'Hizmetler', icon: 'construct' },
      { id: 'payments', name: 'Ödemeler', icon: 'card' },
      { id: 'technical', name: 'Teknik', icon: 'settings' }
    ];

    return ResponseHandler.success(res, categories, 'Yardım kategorileri başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Yardım kategorileri getirilirken hata oluştu');
  }
});

// ===== SUPPORT TICKETS =====

/**
 * @swagger
 * /api/support/tickets:
 *   get:
 *     summary: Destek taleplerini al
 *     description: Kullanıcının destek taleplerini getirir
 *     tags:
 *       - Support
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Destek talepleri başarıyla getirildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.get('/tickets', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    // Mock data - gerçek uygulamada veritabanından gelecek
    const tickets = [
      {
        id: '1',
        subject: 'Hesap sorunu',
        message: 'Hesabımda bir sorun var',
        priority: 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return ResponseHandler.success(res, tickets, 'Destek talepleri başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Destek talepleri getirilirken hata oluştu');
  }
});

/**
 * @swagger
 * /api/support/tickets:
 *   post:
 *     summary: Yeni destek talebi oluştur
 *     description: Kullanıcı için yeni destek talebi oluşturur
 *     tags:
 *       - Support
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Talep konusu
 *               message:
 *                 type: string
 *                 description: Talep mesajı
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Talep önceliği
 *     responses:
 *       201:
 *         description: Destek talebi başarıyla oluşturuldu
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/tickets', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseHandler.unauthorized(res, 'Kullanıcı doğrulanamadı.');
    }

    const { subject, message, priority = 'medium' } = req.body;

    if (!subject || !message) {
      return ResponseHandler.badRequest(res, 'Konu ve mesaj gerekli.');
    }

    // Mock data - gerçek uygulamada veritabanına kaydedilecek
    const newTicket = {
      id: Date.now().toString(),
      subject,
      message,
      priority,
      status: 'open',
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return ResponseHandler.created(res, newTicket, 'Destek talebi başarıyla oluşturuldu');
  } catch (error) {
    return ResponseHandler.error(res, 'Destek talebi oluşturulurken hata oluştu');
  }
});

// ===== APP INFO =====

/**
 * @swagger
 * /api/support/app-info:
 *   get:
 *     summary: Uygulama bilgilerini al
 *     description: Uygulama versiyonu ve bilgilerini getirir
 *     tags:
 *       - Support
 *     responses:
 *       200:
 *         description: Uygulama bilgileri başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
router.get('/app-info', async (req: Request, res: Response) => {
  try {
    const appInfo = {
      version: '1.0.0',
      buildNumber: '100',
      releaseDate: '2024-01-01',
      features: [
        'Randevu Yönetimi',
        'Çalışma Saatleri',
        'Hizmet Alanları',
        'Bildirimler',
        'Güvenlik Ayarları'
      ],
      changelog: [
        'İlk sürüm yayınlandı',
        'Temel özellikler eklendi',
        'UI/UX iyileştirmeleri'
      ],
      supportEmail: 'rektefly@gmail.com',
      supportPhone: '0506 055 02 39'
    };

    return ResponseHandler.success(res, appInfo, 'Uygulama bilgileri başarıyla getirildi');
  } catch (error) {
    return ResponseHandler.error(res, 'Uygulama bilgileri getirilirken hata oluştu');
  }
});

export default router;
