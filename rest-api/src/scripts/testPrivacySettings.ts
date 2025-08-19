import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Mechanic } from '../models/Mechanic';

async function testPrivacySettings() {
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
      
      // Gizlilik ayarlarını kontrol et
      console.log('\n🔒 Mevcut Gizlilik Ayarları:');
      console.log(`   Ad Gizli: ${mechanic.nameHidden || false}`);
      console.log(`   Soyad Gizli: ${mechanic.surnameHidden || false}`);
      console.log(`   Telefon Gizli: ${mechanic.phoneHidden || false}`);
      console.log(`   E-posta Gizli: ${mechanic.emailHidden || false}`);
      console.log(`   Şehir Gizli: ${mechanic.cityHidden || false}`);
      
      // Test gizlilik ayarları ekle
      const privacyData = {
        nameHidden: true,
        surnameHidden: false,
        phoneHidden: true,
        emailHidden: false,
        cityHidden: true
      };
      
      console.log('\n📝 Gizlilik ayarları güncelleniyor...');
      console.log('Gizlilik verileri:', JSON.stringify(privacyData, null, 2));
      
      // Gizlilik ayarlarını güncelle
      await Mechanic.findByIdAndUpdate(
        mechanic._id,
        { $set: privacyData },
        { new: true }
      );
      
      console.log('✅ Gizlilik ayarları güncellendi!');
      
      // Güncellenmiş veriyi kontrol et
      const updatedMechanic = await Mechanic.findById(mechanic._id);
      console.log('\n📋 Güncellenmiş gizlilik ayarları:');
      console.log(`   Ad Gizli: ${updatedMechanic?.nameHidden}`);
      console.log(`   Soyad Gizli: ${updatedMechanic?.surnameHidden}`);
      console.log(`   Telefon Gizli: ${updatedMechanic?.phoneHidden}`);
      console.log(`   E-posta Gizli: ${updatedMechanic?.emailHidden}`);
      console.log(`   Şehir Gizli: ${updatedMechanic?.cityHidden}`);
      
      // Gizli bilgileri nasıl görüneceğini göster
      console.log('\n👁️ Gizli Bilgiler Nasıl Görünür:');
      console.log(`   Ad: ${updatedMechanic?.nameHidden ? '***' : updatedMechanic?.name}`);
      console.log(`   Soyad: ${updatedMechanic?.surnameHidden ? '***' : updatedMechanic?.surname}`);
      console.log(`   Telefon: ${updatedMechanic?.phoneHidden ? '*** *** ** **' : updatedMechanic?.phone}`);
      console.log(`   E-posta: ${updatedMechanic?.emailHidden ? '***@***.***' : updatedMechanic?.email}`);
      console.log(`   Şehir: ${updatedMechanic?.cityHidden ? '***' : updatedMechanic?.city}`);
      
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

testPrivacySettings();
