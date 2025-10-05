import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { ResponseHandler } from '../utils/response';
import { CustomError } from '../middleware/errorHandler';
import { JWT_SECRET } from '../config';

export class AuthService {
  // Kullanıcı kaydı
  static async register(userData: {
    name: string;
    surname: string;
    email: string;
    password: string;
    userType?: 'driver' | 'mechanic';
    phone?: string;
    username?: string;
    experience?: number;
    specialties?: string[];
    serviceCategories?: string[];
    selectedServices?: string[];
    location?: {
      address?: string;
      city?: string;
      district?: string;
      neighborhood?: string;
      street?: string;
      building?: string;
      floor?: string;
      apartment?: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  }) {
    const { name, surname, email, password, userType, phone, username, experience, specialties, serviceCategories, selectedServices, location } = userData;
    
    // Email'i normalize et
    const normalizedEmail = email.trim().toLowerCase();
    
    // Kullanıcı var mı kontrol et
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new CustomError('Bu e-posta zaten kayıtlı.', 400);
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Kullanıcı tipini belirle (default: driver)
    const finalUserType = userType || 'driver';

    // User oluştur
    const user = new User({ 
      name, 
      surname, 
      email: normalizedEmail, 
      password: hashedPassword, 
      userType: finalUserType,
      phone: phone || '',
      username: finalUserType === 'mechanic' ? (username || `${normalizedEmail.split('@')[0]}_${Date.now()}`) : undefined,
      selectedServices: selectedServices || []
    });

    await user.save();

    // Mechanic için ek bilgileri User modelinde sakla
    if (finalUserType === 'mechanic') {
      // Mechanic özelliklerini User modelinde güncelle
      user.username = username || `${normalizedEmail.split('@')[0]}_${Date.now()}`;
      user.serviceCategories = serviceCategories || specialties || ['Genel Bakım'];
      user.experience = experience || 0;
      user.rating = 0;
      user.ratingCount = 0;
      user.totalServices = 0;
      user.isAvailable = true;
      
      // currentLocation: Sadece mechanic (usta) için kullanılır
      // Driver (şöför) için bu alan kullanılmaz
      
      user.documents = { insurance: 'Sigorta bilgisi eklenecek' };
      user.shopName = '';
      user.location = {
        city: location?.city || '',
        district: location?.district || '',
        neighborhood: location?.neighborhood || '',
        street: location?.street || '',
        building: location?.building || '',
        floor: location?.floor || '',
        apartment: location?.apartment || '',
        coordinates: location?.coordinates ? {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude
        } : undefined
      };
      user.workingHours = '';
      user.carBrands = ['Genel'];
      user.engineTypes = [];
      user.transmissionTypes = [];
      user.customBrands = [];
      
      await user.save();
    }
    
    // Driver için currentLocation'ı hiç set etme (GeoJSON hatası önlemek için)
    if (finalUserType === 'driver') {
      // Driver için sadece temel bilgileri set et
      user.isAvailable = true;
      await user.save();
    }

    // Token'ları oluştur - Optimized durations
    const token = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET,
      { expiresIn: '1h' } // Optimized: 15m -> 1h (daha az yenileme)
    );
    
    const refreshToken = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: finalUserType },
      JWT_SECRET,
      { expiresIn: '30d' } // Optimized: 60d -> 30d (güvenlik)
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

    // UserType kontrolü - ZORUNLU
    if (!userType) {
      throw new CustomError('userType parametresi zorunludur.', 400);
    }
    
    if (user.userType !== userType) {
      throw new CustomError(`Bu endpoint sadece ${userType} kullanıcılar için. Mevcut kullanıcı tipi: ${user.userType}`, 400);
    }

    // Mechanic ise Mechanic model'inden ek bilgileri de çek
    let fullUserData = user.toObject();
    if (user.userType === 'mechanic') {
      try {
        const mechanic = await Mechanic.findById(user._id);
        if (mechanic) {
          fullUserData = { ...fullUserData, ...(mechanic.toObject() as any) };
        }
      } catch (error) {
        }
    }

    // Token'ları oluştur - Optimized durations
    const token = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: user.userType },
      JWT_SECRET,
      { expiresIn: '1h' } // Optimized: 15m -> 1h (daha az yenileme)
    );
    
    const refreshToken = jwt.sign(
      { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: user.userType },
      JWT_SECRET,
      { expiresIn: '30d' } // Optimized: 60d -> 30d (güvenlik)
    );

    return {
      userId: user._id,
      userType: user.userType,
      token,
      refreshToken,
      user: fullUserData
    };
  }

  // Token yenileme
  static async refreshToken(refreshToken: string) {
    try {
      console.log('🔍 AuthService.refreshToken Debug:');
      console.log('refreshToken preview:', refreshToken.substring(0, 20) + '...');
      
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      console.log('✅ Refresh token geçerli, decoded:', decoded);
      
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        console.log('❌ Refresh token geçerli ama kullanıcı bulunamadı:', decoded.userId);
        throw new CustomError('Kullanıcı bulunamadı.', 401);
      }

      console.log('✅ Kullanıcı bulundu:', user.email);

      // Yeni token oluştur - Optimized duration
      const newToken = jwt.sign(
        { userId: (user._id as mongoose.Types.ObjectId).toString(), userType: user.userType },
        JWT_SECRET,
        { expiresIn: '1h' } // Optimized: 1h duration
      );

      console.log('✅ Yeni token oluşturuldu, preview:', newToken.substring(0, 20) + '...');

      return {
        token: newToken,
        user
      };
    } catch (error) {
      console.log('❌ Refresh token hatası:', error);
      throw new CustomError('Geçersiz refresh token.', 401);
    }
  }

  // Çıkış yapma
  static async logout(userId: string, token?: string) {
    try {
      // Token'ı blacklist'e ekle
      if (token) {
        const { TokenBlacklistService } = await import('./tokenBlacklist.service');
        await TokenBlacklistService.addToBlacklist(token, userId, 3600); // 1 saat blacklist
      }
      
      return { message: 'Başarıyla çıkış yapıldı.' };
    } catch (error) {
      return { message: 'Çıkış yapıldı.' };
    }
  }
}
