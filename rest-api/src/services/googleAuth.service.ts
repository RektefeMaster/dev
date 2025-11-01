import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../config';

// Google OAuth client ID'leri - Environment variable'dan al veya default kullan
const GOOGLE_CLIENT_IDS: string[] = process.env.GOOGLE_CLIENT_IDS 
  ? process.env.GOOGLE_CLIENT_IDS.split(',') 
  : [
      '310108124458.apps.googleusercontent.com',      // iOS
      '509841981751-ohittnea1ssau3e30gg5tltb1emh1g1c.apps.googleusercontent.com', // Android
      '509841981751-k21fnh03fhdfr6kc9va2u7ftr7cpne7g.apps.googleusercontent.com'  // Web
    ];

export class GoogleAuthService {
  // Google token'ını doğrula
  static async verifyGoogleToken(accessToken: string) {
    try {
      const client = new OAuth2Client();
      
      // Token'ı doğrula
      const ticket = await client.verifyIdToken({
        idToken: accessToken,
        audience: GOOGLE_CLIENT_IDS
      });
      
      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Google token payload bulunamadı');
      }
      
      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.given_name,
        surname: payload.family_name,
        picture: payload.picture,
        emailVerified: payload.email_verified
      };
    } catch (error) {
      throw new Error('Geçersiz Google token');
    }
  }

  // Google ile giriş yap
  static async googleLogin(accessToken: string) {
    try {
      // Google token'ını doğrula
      const googleUser = await this.verifyGoogleToken(accessToken);
      
      if (!googleUser.emailVerified) {
        throw new Error('Google email doğrulanmamış');
      }
      
      // Kullanıcıyı email ile bul
      let user = await User.findOne({ email: googleUser.email });
      
      if (!user) {
        // Kullanıcı yoksa otomatik kayıt yap
        user = await this.createGoogleUser(googleUser);
      }
      
      // Token'ları oluştur
      const token = jwt.sign(
        { userId: (user._id as any).toString(), userType: user.userType },
        JWT_SECRET,
        { expiresIn: '1h' } // Optimized: 15m -> 1h
      );
      
      const refreshToken = jwt.sign(
        { userId: (user._id as any).toString(), userType: user.userType },
        JWT_SECRET,
        { expiresIn: '30d' } // Optimized: 60d -> 30d
      );
      
      return {
        userId: user._id,
        userType: user.userType,
        token,
        refreshToken,
        user: user.toObject()
      };
    } catch (error) {
      throw error;
    }
  }

  // Google ile kayıt yap
  static async googleRegister(accessToken: string, userType: 'driver' | 'mechanic' = 'driver') {
    try {
      // Google token'ını doğrula
      const googleUser = await this.verifyGoogleToken(accessToken);
      
      if (!googleUser.emailVerified) {
        throw new Error('Google email doğrulanmamış');
      }
      
      // Kullanıcı zaten var mı kontrol et
      const existingUser = await User.findOne({ email: googleUser.email });
      if (existingUser) {
        throw new Error('Bu email zaten kayıtlı');
      }
      
      // Yeni kullanıcı oluştur
      const user = await this.createGoogleUser(googleUser, userType);
      
      // Token'ları oluştur
      const token = jwt.sign(
        { userId: (user._id as any).toString(), userType: user.userType },
        JWT_SECRET,
        { expiresIn: '1h' } // Optimized: 15m -> 1h
      );
      
      const refreshToken = jwt.sign(
        { userId: (user._id as any).toString(), userType: user.userType },
        JWT_SECRET,
        { expiresIn: '30d' } // Optimized: 60d -> 30d
      );
      
      return {
        userId: user._id,
        userType: user.userType,
        token,
        refreshToken,
        user: user.toObject()
      };
    } catch (error) {
      throw error;
    }
  }

  // Google kullanıcısı oluştur
  private static async createGoogleUser(googleUser: any, userType: 'driver' | 'mechanic' = 'driver') {
    try {
      // Rastgele şifre oluştur (Google kullanıcıları şifre kullanmaz)
      const randomPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      // User oluştur
      const user = new User({
        name: googleUser.name,
        surname: googleUser.surname,
        email: googleUser.email,
        password: hashedPassword,
        userType: userType,
        profileImage: googleUser.picture,
        // Google kullanıcısı olduğunu belirt
        googleId: googleUser.googleId,
        emailVerified: true
      });
      
      await user.save();
      
      // Mechanic için ek bilgileri User modelinde sakla
      if (userType === 'mechanic') {
        user.username = `${googleUser.email.split('@')[0]}_${Date.now()}`;
        user.serviceCategories = ['repair'];
        user.experience = 0;
        user.rating = 0;
        user.ratingCount = 0;
        user.totalServices = 0;
        user.isAvailable = true;
        user.currentLocation = {
          type: 'Point',
          coordinates: [0, 0]
        };
        user.documents = { insurance: 'Sigorta bilgisi eklenecek' };
        user.shopName = '';
        user.location = {
          city: '',
          district: '',
          neighborhood: '',
          street: '',
          building: '',
          floor: '',
          apartment: ''
        };
        user.workingHours = '';
        user.carBrands = ['Genel'];
        user.engineTypes = [];
        user.transmissionTypes = [];
        user.customBrands = [];
        
        await user.save();
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }
}
