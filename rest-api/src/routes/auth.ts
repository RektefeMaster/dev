import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth.validation';
import { AuthController } from '../controllers/auth.controller';
import { Request, Response } from 'express';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - surname
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           description: Kullanıcının adı
 *           example: "Ahmet"
 *         surname:
 *           type: string
 *           description: Kullanıcının soyadı
 *           example: "Yılmaz"
 *         email:
 *           type: string
 *           format: email
 *           description: Kullanıcının e-posta adresi
 *           example: "ahmet@example.com"
 *         password:
 *           type: string
 *           description: Kullanıcının şifresi
 *           example: "Test123!"
 *         userType:
 *           type: string
 *           enum: [driver, mechanic]
 *           description: Kullanıcı tipi
 *           example: "mechanic"
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Kullanıcının e-posta adresi
 *           example: "ahmet@example.com"
 *         password:
 *           type: string
 *           description: Kullanıcının şifresi
 *           example: "Test123!"
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT token
 *         user:
 *           $ref: '#/components/schemas/User'
 *         message:
 *           type: string
 *           description: İşlem mesajı
 */

const router = Router();

// Test endpoint'i
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth endpoints çalışıyor!',
    availableEndpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
      'POST /api/auth/change-password'
    ]
  });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     description: Yeni bir kullanıcı hesabı oluşturur
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Kayıt başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Kayıt başarılı!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: Kullanıcı ID'si
 *                     userType:
 *                       type: string
 *                       enum: [driver, mechanic]
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Geçersiz veri veya e-posta zaten kayıtlı
 *       500:
 *         description: Sunucu hatası
 */
router.post('/register', validate(registerSchema), AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     description: Kullanıcı e-posta ve şifre ile giriş yapar
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "ahmet@example.com"
 *             password: "Test123!"
 *             userType: "mechanic"
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Giriş başarılı!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       description: Kullanıcı ID'si
 *                     userType:
 *                       type: string
 *                       enum: [driver, mechanic]
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Geçersiz kimlik bilgileri
 *       500:
 *         description: Sunucu hatası
 */
router.post('/login', validate(loginSchema), AuthController.login);

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *   summary: Token geçerliliğini kontrol et
 *   description: JWT token'ın geçerli olup olmadığını kontrol eder
 *   tags:
 *     - Auth
 *   security:
 *     - bearerAuth: []
 *   responses:
 *     200:
 *       description: Token geçerli
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: "Token geçerli"
 *     401:
 *       description: Token geçersiz
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Token geçersiz"
 */
router.get('/validate', auth, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Token geçerli'
  });
});

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Token yenileme
 *     description: Refresh token ile yeni access token alır
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: Token yenilendi
 *       401:
 *         description: Geçersiz refresh token
 */
router.post('/refresh-token', AuthController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Kullanıcı çıkışı
 *     description: Kullanıcı çıkış yapar
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Çıkış başarılı
 *       401:
 *         description: Yetkilendirme hatası
 */
router.post('/logout', auth, AuthController.logout);

/**
 * @swagger
 * /api/auth/google-login:
 *   post:
 *     summary: Google ile giriş yap
 *     description: Google access token ile kullanıcı girişi yapar
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Google'dan alınan access token
 *                 example: "google_access_token_here"
 *     responses:
 *       200:
 *         description: Google girişi başarılı
 *       400:
 *         description: Geçersiz Google token
 *       500:
 *         description: Sunucu hatası
 */
router.post('/google-login', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Google access token gerekli'
      });
    }
    
    // Google OAuth servisini kullan
    const { GoogleAuthService } = await import('../services/googleAuth.service');
    const result = await GoogleAuthService.googleLogin(accessToken);
    
    res.json({
      success: true,
      message: 'Google girişi başarılı',
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Google girişi yapılırken hata oluştu'
    });
  }
});

/**
 * @swagger
 * /api/auth/google-register:
 *   post:
 *     summary: Google ile kayıt ol
 *     description: Google access token ile yeni kullanıcı kaydı yapar
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *               - userType
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Google'dan alınan access token
 *                 example: "google_access_token_here"
 *               userType:
 *                 type: string
 *                 enum: [driver, mechanic]
 *                 description: Kullanıcı tipi
 *                 example: "driver"
 *     responses:
 *       200:
 *         description: Google kayıt başarılı
 *       400:
 *         description: Geçersiz Google token
 *       500:
 *         description: Sunucu hatası
 */
router.post('/google-register', async (req: Request, res: Response) => {
  try {
    const { accessToken, userType = 'driver' } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Google access token gerekli'
      });
    }
    
    if (!['driver', 'mechanic'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz userType. driver veya mechanic olmalı.'
      });
    }
    
    // Google OAuth servisini kullan
    const { GoogleAuthService } = await import('../services/googleAuth.service');
    const result = await GoogleAuthService.googleRegister(accessToken, userType);
    
    res.json({
      success: true,
      message: 'Google kayıt başarılı',
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Google kayıt yapılırken hata oluştu'
    });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   get:
 *     summary: Şifre unutma
 *     description: Kullanıcının şifresini sıfırlaması için email gönderir
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcının email adresi
 *         example: "user@example.com"
 *     responses:
 *       200:
 *         description: Şifre sıfırlama email'i gönderildi
 *       400:
 *         description: Email parametresi eksik
 *       404:
 *         description: Kullanıcı bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parametresi gerekli'
      });
    }
    
    // Email'e şifre sıfırlama linki gönder (şimdilik basit response)
    res.json({
      success: true,
      message: 'Şifre sıfırlama email\'i gönderildi',
      data: {
        email: email,
        resetLink: `https://example.com/reset-password?token=reset_token_here`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Şifre sıfırlama email\'i gönderilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Şifre sıfırlama
 *     description: Şifre sıfırlama token'ı ile yeni şifre belirler
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Şifre sıfırlama token'ı
 *                 example: "reset_token_here"
 *               newPassword:
 *                 type: string
 *                 description: Yeni şifre
 *                 example: "newPassword123!"
 *     responses:
 *       200:
 *         description: Şifre başarıyla sıfırlandı
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Geçersiz token
 *       500:
 *         description: Sunucu hatası
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token ve yeni şifre gerekli'
      });
    }
    
    // Token'ı doğrula ve şifreyi güncelle (şimdilik basit response)
    res.json({
      success: true,
      message: 'Şifre başarıyla sıfırlandı'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Şifre sıfırlanırken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Şifre değiştirme
 *     description: Giriş yapan kullanıcının şifresini değiştirir
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Mevcut şifre
 *                 example: "currentPassword123!"
 *               newPassword:
 *                 type: string
 *                 description: Yeni şifre
 *                 example: "newPassword123!"
 *     responses:
 *       200:
 *         description: Şifre başarıyla değiştirildi
 *       400:
 *         description: Geçersiz veri
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/change-password', auth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre ve yeni şifre gerekli'
      });
    }

    // Kullanıcıyı bul
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Mevcut şifreyi kontrol et
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre yanlış'
      });
    }

    // Yeni şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Şifre sıfırlama e-postası gönder
 *     description: Kullanıcının e-posta adresine şifre sıfırlama linki gönderir
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Şifre sıfırlama e-postası gönderildi
 *       400:
 *         description: Geçersiz e-posta
 *       500:
 *         description: Sunucu hatası
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli'
      });
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.sendPasswordResetEmail(email);

    // Güvenlik için her zaman başarılı mesaj dön
    return res.json({
      success: true,
      message: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama linki gönderildi'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Şifre sıfırlama e-postası gönderilemedi',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Şifreyi sıfırla
 *     description: Token ile şifreyi sıfırlar
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: abc123def456...
 *               newPassword:
 *                 type: string
 *                 example: newPassword123!
 *     responses:
 *       200:
 *         description: Şifre başarıyla sıfırlandı
 *       400:
 *         description: Geçersiz token veya şifre
 *       500:
 *         description: Sunucu hatası
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token ve yeni şifre gerekli'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.resetPassword(token, newPassword);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Şifre sıfırlanamadı',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/send-email-verification:
 *   post:
 *     summary: E-posta doğrulama kodu gönder
 *     description: Kullanıcının e-posta adresine doğrulama kodu gönderir
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doğrulama kodu gönderildi
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/send-email-verification', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.sendEmailVerification(userId, user.email);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Doğrulama kodu gönderilemedi',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: E-posta doğrulama kodunu kontrol et
 *     description: Kullanıcının girdiği doğrulama kodunu kontrol eder
 *     tags:
 *       - Auth
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
 *         description: E-posta başarıyla doğrulandı
 *       400:
 *         description: Geçersiz kod
 *       401:
 *         description: Yetkilendirme hatası
 *       500:
 *         description: Sunucu hatası
 */
router.post('/verify-email', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Doğrulama kodu gerekli'
      });
    }

    const VerificationService = require('../services/verificationService').VerificationService;
    const result = await VerificationService.verifyEmailCode(userId, code);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'E-posta doğrulanamadı',
      error: error.message
    });
  }
});

export default router; 