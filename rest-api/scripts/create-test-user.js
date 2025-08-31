const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function createTestUser() {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB\'ye bağlandı');

    // Test kullanıcısını kontrol et
    let testUser = await User.findOne({ email: 'test@example.com' });
    
    if (testUser) {
      console.log('⚠️ Test kullanıcısı zaten mevcut:', testUser.email);
      return testUser;
    }

    // Yeni test kullanıcısı oluştur
    testUser = new User({
      name: 'Test',
      surname: 'Kullanıcı',
      email: 'test@example.com',
      password: 'test123456',
      phone: '+905551234567',
      userType: 'driver',
      isVerified: true,
      isActive: true
    });

    await testUser.save();
    console.log('✅ Test kullanıcısı oluşturuldu:', testUser.email);
    console.log('🆔 User ID:', testUser._id);
    
    return testUser;

  } catch (error) {
    console.error('❌ Test kullanıcısı oluşturma hatası:', error);
  } finally {
    // MongoDB bağlantısını kapat
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
createTestUser();
