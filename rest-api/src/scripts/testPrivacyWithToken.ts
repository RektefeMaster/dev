import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Mechanic } from '../models/Mechanic';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function testPrivacyWithToken() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    // testus@gmail.com kullanıcısını bul
    const mechanic = await Mechanic.findOne({ email: 'testus@gmail.com' });
    
    if (mechanic) {
      console.log('✅ Mekanik bulundu:');
      console.log(`   Ad: ${mechanic.name} ${mechanic.surname}`);
      console.log(`   Email: ${mechanic.email}`);
      console.log(`   ID: ${mechanic._id}`);
      
      // Test token oluştur
      const token = jwt.sign(
        { 
          userId: mechanic._id?.toString() || '', 
          userType: 'mechanic',
          email: mechanic.email 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      console.log('\n🔑 Test token oluşturuldu:');
      console.log(`Token: ${token.substring(0, 50)}...`);
      
      // Mevcut gizlilik ayarlarını kontrol et
      console.log('\n🔒 Mevcut Gizlilik Ayarları:');
      console.log(`   Telefon Gizli: ${mechanic.phoneHidden || false}`);
      console.log(`   E-posta Gizli: ${mechanic.emailHidden || false}`);
      console.log(`   Şehir Gizli: ${mechanic.cityHidden || false}`);
      
      // Gizlilik ayarlarını değiştir (test için)
      const newPrivacySettings = {
        phoneHidden: !mechanic.phoneHidden, // Tersine çevir
        emailHidden: !mechanic.emailHidden, // Tersine çevir
        cityHidden: !mechanic.cityHidden   // Tersine çevir
      };
      
      console.log('\n📝 Gizlilik ayarları güncelleniyor...');
      console.log('Yeni gizlilik ayarları:', JSON.stringify(newPrivacySettings, null, 2));
      
      // Gizlilik ayarlarını güncelle
      await Mechanic.findByIdAndUpdate(
        mechanic._id,
        { $set: newPrivacySettings },
        { new: true }
      );
      
      console.log('✅ Gizlilik ayarları güncellendi!');
      
      // Güncellenmiş veriyi kontrol et
      const updatedMechanic = await Mechanic.findById(mechanic._id);
      console.log('\n📋 Güncellenmiş gizlilik ayarları:');
      console.log(`   Telefon Gizli: ${updatedMechanic?.phoneHidden}`);
      console.log(`   E-posta Gizli: ${updatedMechanic?.emailHidden}`);
      console.log(`   Şehir Gizli: ${updatedMechanic?.cityHidden}`);
      
      console.log('\n🚀 Test için kullanabileceğiniz curl komutu:');
      console.log(`curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d '{"phoneHidden": ${!updatedMechanic?.phoneHidden}}' http://192.168.1.39:3000/api/mechanic/me`);
      
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

testPrivacyWithToken();
