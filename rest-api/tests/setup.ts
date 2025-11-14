// Test setup dosyası - MongoDB bağlantısını test ortamında yönetir
// Bu dosya Jest tarafından otomatik olarak çalıştırılır (jest.config.js'de setupFilesAfterEnv)

// Test ortamını ayarla (app import edilmeden önce)
process.env.NODE_ENV = 'test';
process.env.JEST_WORKER_ID = '1';

// JWT_SECRET yoksa test için geçici bir değer ayarla
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
}

import mongoose from 'mongoose';
import { MONGODB_URI, MONGODB_OPTIONS } from '../src/config';

// Test ortamında MongoDB bağlantısını yönet
beforeAll(async () => {
  // Test database URI - Railway'de TEST_MONGODB_URI kullan, yoksa normal URI'yi kullan
  const testDbUri = process.env.TEST_MONGODB_URI || MONGODB_URI;
  
  // Eğer zaten bağlı değilse bağlan
  if (mongoose.connection.readyState === 0) {
    try {
      // Test ortamında daha kısa timeout'lar kullan
      await mongoose.connect(testDbUri, {
        ...MONGODB_OPTIONS,
        serverSelectionTimeoutMS: 30000, // 30 saniye
        connectTimeoutMS: 30000,
        maxPoolSize: 5,
        minPoolSize: 1,
      });
      console.log('✅ Test MongoDB bağlantısı başarılı');
    } catch (error: any) {
      console.error('❌ Test MongoDB bağlantısı başarısız:', error.message);
      throw error; // Test başlamadan önce bağlantı hatası varsa testleri durdur
    }
  } else {
    console.log('✅ MongoDB zaten bağlı');
  }
}, 60000); // 60 saniye timeout

afterAll(async () => {
  // Test sonunda bağlantıyı kapat
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('✅ Test MongoDB bağlantısı kapatıldı');
  }
});

