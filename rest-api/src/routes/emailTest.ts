import express, { Request, Response } from 'express';
import { EmailService } from '../services/emailService';
import { auth } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/email-test/send-test:
 *   post:
 *     summary: Test e-postası gönder
 *     description: E-posta servisini test etmek için test e-postası gönderir
 *     tags:
 *       - Email Test
 *     security:
 *       - bearerAuth: []
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
 *                 example: nuronuro458@gmail.com
 *     responses:
 *       200:
 *         description: E-posta başarıyla gönderildi
 *       400:
 *         description: Geçersiz e-posta adresi
 *       500:
 *         description: E-posta gönderilemedi
 */
router.post('/send-test', auth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli'
      });
    }

    const result = await EmailService.sendTestEmail(email);

    if (result) {
      return res.json({
        success: true,
        message: 'Test e-postası başarıyla gönderildi',
        data: { email }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'E-posta gönderilemedi'
      });
    }
  } catch (error: any) {
    console.error('Email test error:', error);
    return res.status(500).json({
      success: false,
      message: 'E-posta gönderilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/email-test/send-verification:
 *   post:
 *     summary: Doğrulama e-postası gönder
 *     description: E-posta doğrulama kodu gönderir
 *     tags:
 *       - Email Test
 *     security:
 *       - bearerAuth: []
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
 *                 example: nuronuro458@gmail.com
 *     responses:
 *       200:
 *         description: Doğrulama e-postası başarıyla gönderildi
 *       400:
 *         description: Geçersiz e-posta adresi
 *       500:
 *         description: E-posta gönderilemedi
 */
router.post('/send-verification', auth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli'
      });
    }

    // Test kodu oluştur
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await EmailService.sendVerificationEmail(email, code);

    if (result) {
      return res.json({
        success: true,
        message: 'Doğrulama e-postası başarıyla gönderildi',
        data: { email, code } // Test için kodu da döndür
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'E-posta gönderilemedi'
      });
    }
  } catch (error: any) {
    console.error('Verification email test error:', error);
    return res.status(500).json({
      success: false,
      message: 'E-posta gönderilirken hata oluştu',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/email-test/send-password-reset:
 *   post:
 *     summary: Şifre sıfırlama e-postası gönder
 *     description: Şifre sıfırlama e-postası gönderir
 *     tags:
 *       - Email Test
 *     security:
 *       - bearerAuth: []
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
 *                 example: nuronuro458@gmail.com
 *     responses:
 *       200:
 *         description: Şifre sıfırlama e-postası başarıyla gönderildi
 *       400:
 *         description: Geçersiz e-posta adresi
 *       500:
 *         description: E-posta gönderilemedi
 */
router.post('/send-password-reset', auth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli'
      });
    }

    // Test token oluştur
    const resetToken = 'test_' + Math.random().toString(36).substring(2, 15);

    const result = await EmailService.sendPasswordResetEmail(email, resetToken);

    if (result) {
      return res.json({
        success: true,
        message: 'Şifre sıfırlama e-postası başarıyla gönderildi',
        data: { email, resetToken } // Test için token'ı da döndür
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'E-posta gönderilemedi'
      });
    }
  } catch (error: any) {
    console.error('Password reset email test error:', error);
    return res.status(500).json({
      success: false,
      message: 'E-posta gönderilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
