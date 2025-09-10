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
    };
  }) {
    const { name, surname, email, password, userType, phone, experience, specialties, serviceCategories, selectedServices, location } = userData;
    
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
      selectedServices: selectedServices || []
    });

    await user.save();

    // Mechanic için ek bilgileri User modelinde sakla
    if (finalUserType === 'mechanic') {
      // Mechanic özelliklerini User modelinde güncelle
      user.username = `${normalizedEmail.split('@')[0]}_${Date.now()}`;
      user.serviceCategories = serviceCategories || specialties || ['Genel Bakım'];
      user.experience = experience || 0;
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
        city: location?.city || '',
        district: location?.district || '',
        neighborhood: location?.neighborhood || '',
        street: location?.street || '',
        building: location?.building || '',
        floor: location?.floor || '',
        apartment: location?.apartment || ''
      };
      user.workingHours = '';
      user.carBrands = ['Genel'];
      user.engineTypes = [];
      user.transmissionTypes = [];
      user.customBrands = [];
      
      await user.save();
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
        console.error('⚠️ AuthService: Mechanic data çekilemedi:', error);
      }
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
      user: fullUserData
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
