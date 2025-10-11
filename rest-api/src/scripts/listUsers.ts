/**
 * Tüm kullanıcıları listele
 */

import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';

// Model'leri import et
import '../models/User';

async function listUsers() {
  try {
    console.log('👥 Kullanıcılar listeleniyor...');
    
    // MongoDB bağlantısını kontrol et
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ MongoDB bağlantısı yok, bağlanılıyor...');
      await mongoose.connect(MONGODB_URI);
    }
    
    const User = mongoose.model('User');
    
    // Tüm kullanıcıları getir
    const users = await User.find({}, 'email name surname userType serviceCategories').limit(10);
    
    console.log(`📊 Toplam ${users.length} kullanıcı bulundu:`);
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   İsim: ${user.name} ${user.surname}`);
      console.log(`   Tip: ${user.userType}`);
      console.log(`   ServiceCategories: ${JSON.stringify(user.serviceCategories)}`);
      console.log('-'.repeat(40));
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

// Script'i çalıştır
listUsers();
