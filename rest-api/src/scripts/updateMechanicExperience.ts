import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Mechanic } from '../models/Mechanic';

async function updateMechanicExperience() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    // testus@gmail.com kullanıcısını bul
    const mechanic = await Mechanic.findOne({ email: 'testus@gmail.com' });
    
    if (mechanic) {
      console.log('✅ Mekanik bulundu:');
      console.log(`   Ad: ${mechanic.name} ${mechanic.surname}`);
      console.log(`   Email: ${mechanic.email}`);
      console.log(`   Mevcut Deneyim: ${mechanic.experience} yıl`);
      
      // Deneyim yılı güncelle (örnek: 5 yıl)
      await Mechanic.updateOne(
        { email: 'testus@gmail.com' },
        { $set: { experience: 5 } }
      );
      
      console.log('✅ Deneyim yılı 5 olarak güncellendi');
      
      // Güncellenmiş veriyi kontrol et
      const updatedMechanic = await Mechanic.findOne({ email: 'testus@gmail.com' });
      console.log(`   Güncellenmiş Deneyim: ${updatedMechanic?.experience} yıl`);
      
    } else {
      console.log('❌ testus@gmail.com ile mekanik bulunamadı');
      
      // Tüm mekanikleri listele
      console.log('\n=== TÜM MEKANİKLER ===');
      const allMechanics = await Mechanic.find({});
      allMechanics.forEach((mech, index) => {
        console.log(`${index + 1}. ${mech.email} - ${mech.name} ${mech.surname} - Deneyim: ${mech.experience} yıl`);
      });
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

updateMechanicExperience();
