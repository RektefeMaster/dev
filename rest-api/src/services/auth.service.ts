import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { ResponseHandler } from '../utils/response';
import { CustomError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  // Kullanıcı kaydı
  static async register(userData: {
    name: string;
    surname: string;
    email: string;
    password: string;
    userType: 'driver' | 'mechanic';
  }) {
    const { name, surname, email, password, userType } = userData;
    
    // Email'i normalize et
    const normalizedEmail = email.trim().toLowerCase();
    
    // Kullanıcı var mı kontrol et
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new CustomError('Bu e-posta zaten kayıtlı.', 400);
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Kullanıcı tipini belirle
    const finalUserType = userType === 'mechanic' ? 'mechanic' : 'driver';

    // User oluştur
    const user = new User({ 
      name, 
      surname, 
      email: normalizedEmail, 
      password: hashedPassword, 
      userType: finalUserType
    });

    await user.save();

    // Mechanic ise Mechanic model'ine de ekle
    if (finalUserType === 'mechanic') {
      try {
        const username = `${normalizedEmail.split('@')[0]}_${Date.now()}`;
        const mechanic = new Mechanic({
          _id: user._id,
          name,
          surname,
          email: normalizedEmail,
          password: hashedPassword,
          userType: 'mechanic',
          username,
          shopName: '',
          phone: '',
          location: {},
          bio: '',
          serviceCategories: ['Genel Bakım'],
          vehicleBrands: ['Genel'],
          workingHours: {},
          documents: { insurance: 'Sigorta bilgisi eklenecek' },
          experience: 0,
          rating: 0,
          totalServices: 0,
          isAvailable: true,
          currentLocation: {
            type: 'Point',
            coordinates: [0, 0]
          }
        });
        
        await mechanic.save();
      } catch (err) {
        // Mechanic kaydı başarısız olursa User'ı da sil
        await User.findByIdAndDelete(user._id);
        throw new CustomError('Mechanic kaydı sırasında hata oluştu', 500);
      }
    }

    // Token'ları oluştur
    const token = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET
    );
    
    const refreshToken = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    return {
      userId: user._id,
      userType: finalUserType,
      token,
      refreshToken,
      user
    };
  }

  // Kullanıcı girişi
  static async login(email: string, password: string, userType?: 'driver' | 'mechanic') {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new CustomError('Kullanıcı bulunamadı.', 400);
    }

    // Şifreyi kontrol et
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Geçersiz şifre.', 400);
    }

    // UserType kontrolü
    if (userType && user.userType !== userType) {
      throw new CustomError(`Bu endpoint sadece ${userType} kullanıcılar için.`, 400);
    }

    // Token'ları oluştur
    const token = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: user.userType },
      JWT_SECRET
    );
    
    const refreshToken = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: user.userType },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    return {
      userId: user._id,
      userType: user.userType,
      token,
      refreshToken,
      user
    };
  }

  // Token yenileme
  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı.', 401);
      }

      // Yeni token oluştur
      const newToken = jwt.sign(
        { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: user.userType },
        JWT_SECRET
      );

      return {
        token: newToken,
        user
      };
    } catch (error) {
      throw new CustomError('Geçersiz refresh token.', 401);
    }
  }

  // Çıkış yapma
  static async logout(userId: string) {
    // Burada token blacklist'e eklenebilir (Redis kullanarak)
    // Şimdilik basit bir response dönüyoruz
    return { message: 'Başarıyla çıkış yapıldı.' };
  }
}
