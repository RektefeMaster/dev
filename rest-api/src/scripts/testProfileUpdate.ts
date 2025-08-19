import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Mechanic } from '../models/Mechanic';

async function testProfileUpdate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    // testus@gmail.com kullanıcısını bul
    const mechanic = await Mechanic.findOne({ email: 'testus@gmail.com' });
    
    if (mechanic) {
      console.log('✅ Mekanik bulundu:');
      console.log(`   Ad: ${mechanic.name} ${mechanic.surname}`);
      console.log(`   Email: ${mechanic.email}`);
      console.log(`   Telefon: ${mechanic.phone || 'Girilmemiş'}`);
      console.log(`   Şehir: ${mechanic.city || 'Girilmemiş'}`);
      console.log(`   Deneyim: ${mechanic.experience} yıl`);
      console.log(`   Bio: ${mechanic.bio || 'Girilmemiş'}`);
      console.log(`   Adres: ${mechanic.location?.city || 'Girilmemiş'}`);
      
      // Test verileri ekle
      const testData = {
        phone: '0555 123 45 67',
        city: 'İstanbul',
        bio: 'Deneyimli ve güvenilir usta. 5 yıldır otomotiv sektöründe hizmet veriyorum.',
        location: {
          city: 'İstanbul',
          district: 'Kadıköy',
          neighborhood: 'Fenerbahçe',
          street: 'Bağdat Caddesi',
          building: 'No: 123',
          floor: '1',
          apartment: 'A'
        }
      };
      
      console.log('\n📝 Test verileri ekleniyor...');
      console.log('Test verileri:', JSON.stringify(testData, null, 2));
      
      // Profili güncelle
      await Mechanic.findByIdAndUpdate(
        mechanic._id,
        { $set: testData },
        { new: true }
      );
      
      console.log('✅ Profil güncellendi!');
      
      // Güncellenmiş veriyi kontrol et
      const updatedMechanic = await Mechanic.findById(mechanic._id);
      console.log('\n📋 Güncellenmiş profil:');
      console.log(`   Telefon: ${updatedMechanic?.phone}`);
      console.log(`   Şehir: ${updatedMechanic?.city}`);
      console.log(`   Bio: ${updatedMechanic?.bio}`);
      console.log(`   Konum: ${updatedMechanic?.location?.city}, ${updatedMechanic?.location?.district}`);
      
    } else {
      console.log('❌ testus@gmail.com ile mekanik bulunamadı');
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

testProfileUpdate();
