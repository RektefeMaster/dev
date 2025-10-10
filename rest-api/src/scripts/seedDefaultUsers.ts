/**
 * Default kullanıcıları otomatik oluştur
 * Her deployment'ta çalışır ve veri kaybını önler
 */

import mongoose from 'mongoose';
const bcrypt = require('bcrypt');
import { MONGODB_URI } from '../config';

// Model'leri import et (schema registration için gerekli)
import '../models/User';
import '../models/Driver';
import '../models/Mechanic';

interface DefaultUser {
  email: string;
  password: string;
  name: string;
  surname: string;
  phone: string;
  userType: 'driver' | 'mechanic';
  isAdmin?: boolean;
}

const DEFAULT_USERS: DefaultUser[] = [
  {
    email: 'testdv@gmail.com',
    password: 'test123',
    name: 'Test',
    surname: 'Driver',
    phone: '5551234567',
    userType: 'driver'
  },
  {
    email: 'testus@gmail.com',
    password: 'test123',
    name: 'Test',
    surname: 'Mechanic',
    phone: '5551234568',
    userType: 'mechanic'
  },
  {
    email: 'admin@rektefe.com',
    password: 'admin123',
    name: 'Admin',
    surname: 'User',
    phone: '5550000000',
    userType: 'driver',
    isAdmin: true
  }
];

export async function seedDefaultUsers(): Promise<void> {
  try {
    console.log('🌱 Default kullanıcılar kontrol ediliyor...');
    
    // MongoDB bağlantısını kontrol et
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ MongoDB bağlantısı yok, seeding atlanıyor');
      return;
    }
    
    // User model'ini al (artık registered)
    const User = mongoose.model('User');
    
    for (const userData of DEFAULT_USERS) {
      // Kullanıcı var mı kontrol et
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        console.log(`👤 ${userData.email} kullanıcısı oluşturuluyor...`);
        
        // Şifreyi hash'le
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Kullanıcıyı oluştur
        const newUser = new User({
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          surname: userData.surname,
          phone: userData.phone,
          userType: userData.userType,
          role: userData.userType,
          isVerified: true,
          isAdmin: userData.isAdmin || false,
          emailVerified: true,
          phoneVerified: true,
          isActive: true,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newUser.save();
        console.log(`✅ ${userData.email} kullanıcısı oluşturuldu`);
        
        // Driver/Mechanic profili oluştur
        if (userData.userType === 'driver') {
          const Driver = mongoose.model('Driver');
          const existingDriver = await Driver.findOne({ email: userData.email });
          
          if (!existingDriver) {
            const newDriver = new Driver({
              userId: newUser._id,
              email: userData.email,
              name: userData.name,
              surname: userData.surname,
              phone: userData.phone,
              city: 'İstanbul',
              district: 'Kadıköy',
              isActive: true,
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            await newDriver.save();
            console.log(`🚗 ${userData.email} driver profili oluşturuldu`);
          }
        } else if (userData.userType === 'mechanic') {
          const Mechanic = mongoose.model('Mechanic');
          const existingMechanic = await Mechanic.findOne({ email: userData.email });
          
          if (!existingMechanic) {
            const newMechanic = new Mechanic({
              userId: newUser._id,
              email: userData.email,
              name: userData.name,
              surname: userData.surname,
              phone: userData.phone,
              city: 'İstanbul',
              district: 'Kadıköy',
              specialization: 'Genel Bakım',
              isActive: true,
              isAvailable: true,
              rating: 5.0,
              ratingCount: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            await newMechanic.save();
            console.log(`🔧 ${userData.email} mechanic profili oluşturuldu`);
          }
        }
      } else {
        console.log(`👤 ${userData.email} kullanıcısı zaten mevcut`);
      }
    }
    
    console.log('✅ Default kullanıcılar kontrolü tamamlandı');
  } catch (error) {
    console.error('❌ Default kullanıcı oluşturma hatası:', error);
    throw error;
  }
}

// Eğer bu dosya doğrudan çalıştırılıyorsa
if (require.main === module) {
  async function main() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ MongoDB bağlandı');
      
      await seedDefaultUsers();
      
      await mongoose.disconnect();
      console.log('✅ Bağlantı kapatıldı');
      process.exit(0);
    } catch (error) {
      console.error('❌ Hata:', error);
      process.exit(1);
    }
  }
  
  main();
}
