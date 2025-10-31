/**
 * Test Kullanıcıları Oluşturma Script'i
 * E2E testleri için gerekli test kullanıcılarını oluşturur
 */

import mongoose from 'mongoose';
import { User } from '../src/models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

const testUsers = [
  {
    name: 'Test',
    surname: 'Sürücü',
    email: 'testdv@gmail.com',
    phone: '5551234567',
    password: 'test123',
    userType: 'driver', // FIXED: role yerine userType
    isVerified: true,
    isActive: true
  },
  {
    name: 'Test',
    surname: 'Usta',
    email: 'testus@gmail.com',
    username: 'test_usta', // Mechanic için zorunlu
    phone: '5559876543',
    password: 'test123',
    userType: 'mechanic', // FIXED: role yerine userType
    isVerified: true,
    isActive: true
  }
];

async function createTestUsers() {
  try {
    console.log('🔌 MongoDB\'ye bağlanılıyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Bağlantı başarılı');

    for (const userData of testUsers) {
      // Kullanıcı zaten var mı?
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⚠️  ${userData.email} zaten mevcut, atlanıyor...`);
        continue;
      }

      // Şifreyi hashle
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Kullanıcı oluştur
      const newUser = await User.create({
        ...userData,
        password: hashedPassword
      });

      console.log(`✅ ${userData.userType?.toUpperCase()} kullanıcısı oluşturuldu: ${userData.email}`);
      console.log(`   ID: ${newUser._id}`);
      console.log(`   Şifre: ${userData.password}`);
    }

    console.log('\n🎉 Tüm test kullanıcıları hazır!');
    console.log('\n📋 Test Kullanıcıları:');
    console.log('   Şöför: testdv@gmail.com / test123');
    console.log('   Usta:  testus@gmail.com / test123');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createTestUsers();

