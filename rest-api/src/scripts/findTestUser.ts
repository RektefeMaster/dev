import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Mechanic } from '../models/Mechanic';

// MongoDB bağlantısı
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));

const findTestUser = async () => {
  try {
    console.log('🔍 Test kullanıcısı aranıyor...');
    
    // Tüm ustaları listele
    const mechanics = await Mechanic.find({}).limit(5);
    
    if (mechanics.length === 0) {
      console.log('❌ Hiç usta bulunamadı!');
      return;
    }
    
    console.log(`✅ ${mechanics.length} usta bulundu:`);
    mechanics.forEach((mechanic, index) => {
      console.log(`${index + 1}. ID: ${mechanic._id}`);
      console.log(`   İsim: ${mechanic.name} ${mechanic.surname}`);
      console.log(`   Email: ${mechanic.email}`);
      console.log(`   Telefon: ${mechanic.phone || 'Belirtilmemiş'}`);
      console.log(`   Şehir: ${mechanic.city || mechanic.location?.city || 'Belirtilmemiş'}`);
      console.log(`   Deneyim: ${mechanic.experience || 0} yıl`);
      console.log(`   Puan: ${mechanic.rating || 0}`);
      console.log('---');
    });
    
    // İlk usta ID'sini döndür
    const firstMechanic = mechanics[0];
    console.log('🎯 Test için kullanılacak usta ID:', firstMechanic._id);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı.');
  }
};

// Test'i çalıştır
findTestUser();
