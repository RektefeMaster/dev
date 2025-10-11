/**
 * testus@gmail.com kullanıcısının serviceCategories'ini güncelle
 */

import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';

// Model'leri import et
import '../models/User';

async function updateTestUser() {
  try {
    console.log('🔧 testus@gmail.com kullanıcısı güncelleniyor...');
    
    // MongoDB bağlantısını kontrol et
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ MongoDB bağlantısı yok, bağlanılıyor...');
      await mongoose.connect(MONGODB_URI);
    }
    
    const User = mongoose.model('User');
    
    // testus@gmail.com kullanıcısını bul
    const testUser = await User.findOne({ email: 'testus@gmail.com' });
    
    if (!testUser) {
      console.log('❌ testus@gmail.com kullanıcısı bulunamadı');
      return;
    }
    
    console.log('👤 Mevcut kullanıcı bulundu:', testUser.email);
    console.log('📋 Mevcut serviceCategories:', testUser.serviceCategories);
    
    // Sadece 'repair' kategorisi ile güncelle
    testUser.serviceCategories = ['repair'];
    await testUser.save();
    
    console.log('✅ Kullanıcı güncellendi!');
    console.log('📋 Yeni serviceCategories:', testUser.serviceCategories);
    
    // Güncellenmiş kullanıcıyı tekrar getir ve doğrula
    const updatedUser = await User.findOne({ email: 'testus@gmail.com' });
    console.log('🔍 Doğrulama - Güncellenmiş serviceCategories:', updatedUser?.serviceCategories);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

// Script'i çalıştır
updateTestUser();
