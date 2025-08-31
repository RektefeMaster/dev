import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-for-development';

// Google OAuth client ID'leri
const GOOGLE_CLIENT_IDS = [
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
      console.error('Google token doğrulama hatası:', error);
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
        JWT_SECRET
      );
      
      const refreshToken = jwt.sign(
        { userId: (user._id as any).toString(), userType: user.userType },
        JWT_SECRET,
        { expiresIn: '60d' }
      );
      
      return {
        userId: user._id,
        userType: user.userType,
        token,
        refreshToken,
        user: user.toObject()
      };
    } catch (error) {
      console.error('Google login hatası:', error);
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
        JWT_SECRET
      );
      
      const refreshToken = jwt.sign(
        { userId: (user._id as any).toString(), userType: user.userType },
        JWT_SECRET,
        { expiresIn: '60d' }
      );
      
      return {
        userId: user._id,
        userType: user.userType,
        token,
        refreshToken,
        user: user.toObject()
      };
    } catch (error) {
      console.error('Google register hatası:', error);
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
      
      // Mechanic ise Mechanic model'ine de ekle
      if (userType === 'mechanic') {
        try {
          const username = `${googleUser.email.split('@')[0]}_${Date.now()}`;
          
          const mechanicData = {
            _id: user._id,
            name: googleUser.name,
            surname: googleUser.surname,
            email: googleUser.email,
            password: hashedPassword,
            userType: 'mechanic',
            username,
            shopName: '',
            phone: '',
            location: {
              city: '',
              district: '',
              neighborhood: '',
              street: '',
              building: '',
              floor: '',
              apartment: ''
            },
            bio: '',
            serviceCategories: ['Genel Bakım'],
            vehicleBrands: ['Genel'],
            workingHours: '',
            documents: { 
              insurance: 'Sigorta bilgisi eklenecek' 
            },
            experience: 0,
            rating: 0,
            totalServices: 0,
            isAvailable: true,
            currentLocation: {
              type: 'Point',
              coordinates: [0, 0]
            },
            googleId: googleUser.googleId,
            profileImage: googleUser.picture
          };
          
          const mechanic = new Mechanic(mechanicData);
          await mechanic.save();
        } catch (err) {
          console.error('Mechanic kayıt hatası:', err);
          // Mechanic kaydı başarısız olursa User'ı da sil
          await User.findByIdAndDelete(user._id);
          throw err;
        }
      }
      
      return user;
    } catch (error) {
      console.error('Google user oluşturma hatası:', error);
      throw error;
    }
  }
}
