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

/**
 * @swagger
 * /api/email-test-public/send-special:
 *   post:
 *     summary: Özel test e-postası
 *     description: Kadiye için özel mesajlı test e-postası (tek seferlik)
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: E-posta başarıyla gönderildi
 */
router.post('/send-special', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli'
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .special-message { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💌 Özel Mesaj</h1>
            </div>
            <div class="content">
              <h2>Merhaba Kadiye!</h2>
              <p>Bu sefer sana özel bir test e-postası gönderiyoruz.</p>
              
              <div class="special-message">
                Seni çok seviyorum götünü yiyeyim! 💕
              </div>
              
              <p>Bu tek seferlik özel bir mesajdır. 😊</p>
              
              <div class="footer">
                <p>© 2025 Rektefe. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await EmailService.sendEmail({
      to: email,
      subject: 'Rektefe - Özel Test Mesajı 💕',
      html
    });

    if (result) {
      return res.json({
        success: true,
        message: 'Özel e-posta başarıyla gönderildi! Kadiye\'ye selam olsun! 💕',
        data: { email }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'E-posta gönderilemedi'
      });
    }
  } catch (error: any) {
    console.error('Special email error:', error);
    return res.status(500).json({
      success: false,
      message: 'E-posta gönderilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
