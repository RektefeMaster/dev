import express, { Request, Response } from 'express';
import { EmailService } from '../services/emailService';

const router = express.Router();

/**
 * @swagger
 * /api/email-test-public/send:
 *   post:
 *     summary: Public test endpoint - E-posta gönder
 *     description: Auth gerektirmeyen test endpoint'i (Sadece test için)
 *     tags:
 *       - Email Test Public
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - type
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nuronuro458@gmail.com
 *               type:
 *                 type: string
 *                 enum: [test, verification, password-reset]
 *                 example: test
 *     responses:
 *       200:
 *         description: E-posta başarıyla gönderildi
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: E-posta gönderilemedi
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { email, type = 'test' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli'
      });
    }

    let result = false;
    let testData: any = { email };

    switch (type) {
      case 'verification':
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        result = await EmailService.sendVerificationEmail(email, code);
        testData.code = code;
        testData.message = 'Doğrulama kodu: ' + code;
        break;

      case 'password-reset':
        const resetToken = 'test_' + Math.random().toString(36).substring(2, 15);
        result = await EmailService.sendPasswordResetEmail(email, resetToken);
        testData.resetToken = resetToken;
        testData.message = 'Reset token: ' + resetToken;
        break;

      case 'test':
      default:
        result = await EmailService.sendTestEmail(email);
        testData.message = 'Test e-postası gönderildi';
        break;
    }

    if (result) {
      return res.json({
        success: true,
        message: 'E-posta başarıyla gönderildi! Gelen kutunuzu kontrol edin.',
        data: testData
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'E-posta gönderilemedi. Lütfen konsolu kontrol edin.'
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
 * /api/email-test-public/info:
 *   get:
 *     summary: E-posta servisi bilgisi
 *     description: E-posta servisinin durumunu kontrol eder
 *     tags:
 *       - Email Test Public
 *     responses:
 *       200:
 *         description: Servis bilgileri
 */
router.get('/info', async (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: 'E-posta servisi hazır',
    data: {
      service: 'Resend',
      configured: !!process.env.RESEND_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      availableTypes: ['test', 'verification', 'password-reset'],
      usage: {
        endpoint: 'POST /api/email-test-public/send',
        body: {
          email: 'your-email@example.com',
          type: 'test | verification | password-reset'
        }
      }
    }
  });
});

export default router;
