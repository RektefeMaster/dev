import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { VerificationToken, IVerificationToken } from '../models/VerificationToken';
import { User } from '../models/User';
import { EmailService } from './emailService';

export class VerificationService {
  /**
   * 6 haneli doğrulama kodu oluştur
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Güvenli token oluştur
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * E-posta doğrulama kodu gönder
   */
  static async sendEmailVerification(userId: string, email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Önceki kullanılmamış kodları sil
      await VerificationToken.deleteMany({
        userId,
        type: 'email_verification',
        used: false
      });

      // Yeni kod oluştur
      const code = this.generateVerificationCode();
      const token = this.generateSecureToken();

      // Token'ı kaydet
      const verificationToken = new VerificationToken({
        userId,
        type: 'email_verification',
        token,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 dakika
        used: false
      });

      await verificationToken.save();

      // E-posta gönder
      const emailSent = await EmailService.sendVerificationEmail(email, code);

      if (!emailSent) {
        throw new Error('E-posta gönderilemedi');
      }

      return {
        success: true,
        message: 'Doğrulama kodu e-posta adresinize gönderildi'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Doğrulama kodu gönderilemedi'
      };
    }
  }

  /**
   * E-posta doğrulama kodunu kontrol et
   */
  static async verifyEmailCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const verificationToken = await VerificationToken.findOne({
        userId,
        type: 'email_verification',
        code,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Geçersiz veya süresi dolmuş doğrulama kodu'
        };
      }

      // Token'ı kullanılmış olarak işaretle
      verificationToken.used = true;
      verificationToken.usedAt = new Date();
      await verificationToken.save();

      // Kullanıcının e-posta doğrulamasını işaretle
      await User.findByIdAndUpdate(userId, {
        emailVerified: true
      });

      return {
        success: true,
        message: 'E-posta başarıyla doğrulandı'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Doğrulama kodu kontrol edilemedi'
      };
    }
  }

  /**
   * Şifre sıfırlama e-postası gönder
   */
  static async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      // Kullanıcıyı bul
      const user = await User.findOne({ email });
      if (!user) {
        // Güvenlik için kullanıcı bulunamasa bile başarılı mesaj dön
        return {
          success: true,
          message: 'Eğer bu e-posta kayıtlıysa, şifre sıfırlama linki gönderildi'
        };
      }

      // Önceki kullanılmamış token'ları sil
      await VerificationToken.deleteMany({
        userId: user._id,
        type: 'password_reset',
        used: false
      });

      // Yeni token oluştur
      const token = this.generateSecureToken();

      // Token'ı kaydet
      const verificationToken = new VerificationToken({
        userId: user._id,
        type: 'password_reset',
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 saat
        used: false
      });

      await verificationToken.save();

      // E-posta gönder
      const emailSent = await EmailService.sendPasswordResetEmail(email, token);

      if (!emailSent) {
        throw new Error('E-posta gönderilemedi');
      }

      return {
        success: true,
        message: 'Şifre sıfırlama linki e-posta adresinize gönderildi',
        token // Test için (production'da kaldırılmalı)
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Şifre sıfırlama e-postası gönderilemedi'
      };
    }
  }

  /**
   * Şifre sıfırlama token'ını doğrula ve şifreyi değiştir
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const verificationToken = await VerificationToken.findOne({
        token,
        type: 'password_reset',
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Geçersiz veya süresi dolmuş şifre sıfırlama linki'
        };
      }

      // Token'ı kullanılmış olarak işaretle
      verificationToken.used = true;
      verificationToken.usedAt = new Date();
      await verificationToken.save();

      // Kullanıcının şifresini güncelle
      const user = await User.findById(verificationToken.userId);
      if (!user) {
        return {
          success: false,
          message: 'Kullanıcı bulunamadı'
        };
      }

      // Şifreyi hashle ve kaydet
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      return {
        success: true,
        message: 'Şifreniz başarıyla değiştirildi'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Şifre sıfırlanamadı'
      };
    }
  }

  /**
   * E-posta değişikliği başlat
   */
  static async initiateEmailChange(userId: string, newEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      // Yeni e-posta zaten kullanımda mı kontrol et
      const existingUser = await User.findOne({ email: newEmail });
      if (existingUser && existingUser._id.toString() !== userId) {
        return {
          success: false,
          message: 'Bu e-posta adresi zaten kullanımda'
        };
      }

      // Önceki kullanılmamış token'ları sil
      await VerificationToken.deleteMany({
        userId,
        type: 'email_change',
        used: false
      });

      // Yeni token oluştur
      const token = this.generateSecureToken();

      // Token'ı kaydet
      const verificationToken = new VerificationToken({
        userId,
        type: 'email_change',
        token,
        email: newEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
        used: false
      });

      await verificationToken.save();

      // Yeni e-postaya onay maili gönder
      const emailSent = await EmailService.sendEmailChangeConfirmation(newEmail, token);

      if (!emailSent) {
        throw new Error('E-posta gönderilemedi');
      }

      return {
        success: true,
        message: 'Yeni e-posta adresinize onay linki gönderildi'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'E-posta değişikliği başlatılamadı'
      };
    }
  }

  /**
   * E-posta değişikliğini onayla
   */
  static async confirmEmailChange(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const verificationToken = await VerificationToken.findOne({
        token,
        type: 'email_change',
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Geçersiz veya süresi dolmuş onay linki'
        };
      }

      if (!verificationToken.email) {
        return {
          success: false,
          message: 'Geçersiz token'
        };
      }

      // Token'ı kullanılmış olarak işaretle
      verificationToken.used = true;
      verificationToken.usedAt = new Date();
      await verificationToken.save();

      // Kullanıcının e-postasını güncelle
      await User.findByIdAndUpdate(verificationToken.userId, {
        email: verificationToken.email,
        emailVerified: true
      });

      return {
        success: true,
        message: 'E-posta adresiniz başarıyla değiştirildi'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'E-posta değişikliği onaylanamadı'
      };
    }
  }

  /**
   * Telefon doğrulama kodu gönder
   */
  static async sendPhoneVerification(userId: string, phone: string): Promise<{ success: boolean; message: string; code?: string }> {
    try {
      // Önceki kullanılmamış kodları sil
      await VerificationToken.deleteMany({
        userId,
        type: 'phone_verification',
        used: false
      });

      // Yeni kod oluştur
      const code = this.generateVerificationCode();
      const token = this.generateSecureToken();

      // Token'ı kaydet
      const verificationToken = new VerificationToken({
        userId,
        type: 'phone_verification',
        token,
        code,
        phone,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 dakika
        used: false
      });

      await verificationToken.save();

      // TODO: SMS servisi entegrasyonu
      // await SmsService.sendVerificationSms(phone, code);

      return {
        success: true,
        message: 'Doğrulama kodu telefon numaranıza gönderildi',
        code // Geçici: SMS servisi olmadığı için kodu döndür
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Doğrulama kodu gönderilemedi'
      };
    }
  }

  /**
   * Telefon doğrulama kodunu kontrol et
   */
  static async verifyPhoneCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const verificationToken = await VerificationToken.findOne({
        userId,
        type: 'phone_verification',
        code,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verificationToken) {
        return {
          success: false,
          message: 'Geçersiz veya süresi dolmuş doğrulama kodu'
        };
      }

      if (!verificationToken.phone) {
        return {
          success: false,
          message: 'Geçersiz token'
        };
      }

      // Token'ı kullanılmış olarak işaretle
      verificationToken.used = true;
      verificationToken.usedAt = new Date();
      await verificationToken.save();

      // Kullanıcının telefonunu güncelle ve doğrula
      await User.findByIdAndUpdate(userId, {
        phone: verificationToken.phone,
        phoneVerified: true
      });

      return {
        success: true,
        message: 'Telefon numaranız başarıyla doğrulandı'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Telefon doğrulama kodu kontrol edilemedi'
      };
    }
  }

  /**
   * Kullanılmamış token'ları temizle (cleanup job)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await VerificationToken.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { used: true, usedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // 7 gün önce kullanılmış
        ]
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error('Token cleanup error:', error);
      return 0;
    }
  }
}
