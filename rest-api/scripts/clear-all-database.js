const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function clearAllDatabase() {
  try {
    console.log('🔌 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    console.log('⚠️  ⚠️  ⚠️  DİKKAT ⚠️  ⚠️  ⚠️');
    console.log('TÜM VERİTABANI SİLİNECEK!');
    console.log('5 saniye içinde işlem başlayacak...\n');
    
    // 5 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('========================================');
    console.log('🗑️  VERİTABANI TEMİZLENİYOR');
    console.log('========================================\n');

    // Tüm collection'ları al
    const collections = await mongoose.connection.db.collections();
    
    let deletedCounts = {};
    
    for (const collection of collections) {
      const collectionName = collection.collectionName;
      const count = await collection.countDocuments();
      
      if (count > 0) {
        console.log(`🗑️  ${collectionName}: ${count} kayıt siliniyor...`);
        const result = await collection.deleteMany({});
        deletedCounts[collectionName] = result.deletedCount;
        console.log(`✅ ${collectionName}: ${result.deletedCount} kayıt silindi`);
      } else {
        console.log(`⚪ ${collectionName}: Zaten boş`);
      }
    }

    console.log('\n========================================');
    console.log('✅ TÜM VERİTABANI TEMİZLENDİ');
    console.log('========================================\n');

    console.log('📊 Silinen kayıtlar:');
    for (const [collection, count] of Object.entries(deletedCounts)) {
      console.log(`   ${collection}: ${count} kayıt`);
    }
    
    const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);
    console.log(`\n🗑️  Toplam ${totalDeleted} kayıt silindi\n`);

    console.log('✅ Veritabanı artık tamamen temiz!');
    console.log('📱 Şimdi rektefe-dv ve rektefe-us uygulamalarında:');
    console.log('   1. AsyncStorage\'ı temizleyin');
    console.log('   2. Uygulamaları yeniden başlatın\n');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

clearAllDatabase();

