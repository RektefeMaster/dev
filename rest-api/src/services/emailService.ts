import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  /**
   * E-posta gönder
   */
  static async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Rektefe <destek@rektefe.com>',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      });

      if (error) {
        console.error('Email send error:', error);
        return false;
      }

      console.log('Email sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * E-posta doğrulama kodu gönder
   */
  static async sendVerificationEmail(email: string, code: string): Promise<boolean> {
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
            .code-box { background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #667eea; }
            .code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 E-posta Doğrulama</h1>
            </div>
            <div class="content">
              <h2>Merhaba!</h2>
              <p>Rektefe hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <p><strong>Bu kod 10 dakika geçerlidir.</strong></p>
              <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
              
              <div class="footer">
                <p>© 2025 Rektefe. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Rektefe - E-posta Doğrulama Kodu',
      html
    });
  }

  /**
   * Şifre sıfırlama e-postası gönder
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const resetLink = `${process.env.FRONTEND_URL || 'https://rektefe.com'}/reset-password?token=${resetToken}`;
    
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
            .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .token { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Şifre Sıfırlama</h1>
            </div>
            <div class="content">
              <h2>Merhaba!</h2>
              <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
              
              <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
              <a href="${resetLink}" class="button">Şifreyi Sıfırla</a>
              
              <p>Veya aşağıdaki token'ı kullanabilirsiniz:</p>
              <div class="token">${resetToken}</div>
              
              <p><strong>Bu link 1 saat geçerlidir.</strong></p>
              <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz ve şifreniz değiştirilmeyecektir.</p>
              
              <div class="footer">
                <p>© 2025 Rektefe. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Rektefe - Şifre Sıfırlama',
      html
    });
  }

  /**
   * E-posta değişiklik onayı gönder
   */
  static async sendEmailChangeConfirmation(newEmail: string, confirmToken: string): Promise<boolean> {
    const confirmLink = `${process.env.FRONTEND_URL || 'https://rektefe.com'}/confirm-email-change?token=${confirmToken}`;
    
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
            .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 E-posta Değişikliği</h1>
            </div>
            <div class="content">
              <h2>Merhaba!</h2>
              <p>Rektefe hesabınızın e-posta adresini değiştirmek için talepte bulundunuz.</p>
              
              <p>Yeni e-posta adresinizi onaylamak için aşağıdaki butona tıklayın:</p>
              <a href="${confirmLink}" class="button">E-postayı Onayla</a>
              
              <p><strong>Bu link 24 saat geçerlidir.</strong></p>
              <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
              
              <div class="footer">
                <p>© 2025 Rektefe. Tüm hakları saklıdır.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: newEmail,
      subject: 'Rektefe - E-posta Değişikliği Onayı',
      html
    });
  }
}
