import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Mechanic } from '../models/Mechanic';
import { AppointmentRating } from '../models/AppointmentRating';

async function checkMechanicRating() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const mechanicId = '68a1d1a6897c4b2d176c8965'; // Test usta ID'si

    // Usta bilgilerini getir
    const mechanic = await Mechanic.findById(mechanicId);
    if (!mechanic) {
      console.log('❌ Usta bulunamadı');
      return;
    }

    console.log('\n=== USTA BİLGİLERİ ===');
    console.log(`Ad: ${mechanic.name} ${mechanic.surname}`);
    console.log(`Email: ${mechanic.email}`);
    console.log(`Dükkan: ${mechanic.shopName}`);
    console.log(`Mevcut Rating: ${mechanic.rating}`);
    console.log(`Rating Sayısı: ${mechanic.ratingCount}`);

    // Puanlamaları getir
    const ratings = await AppointmentRating.find({ mechanicId });
    console.log(`\n=== PUANLAMALAR (${ratings.length} adet) ===`);
    
    ratings.forEach((rating: any, index) => {
      console.log(`${index + 1}. Puan: ${rating.rating}/5`);
      console.log(`   Yorum: ${rating.comment || 'Yorum yok'}`);
      console.log(`   Tarih: ${rating.createdAt}`);
      console.log('---');
    });

    // Ortalama puanı hesapla
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = totalRating / ratings.length;
      console.log(`\n=== HESAPLANAN RATING ===`);
      console.log(`Toplam Puan: ${totalRating}`);
      console.log(`Puan Sayısı: ${ratings.length}`);
      console.log(`Ortalama: ${averageRating.toFixed(2)}/5`);
      console.log(`Güncellenmiş Ortalama: ${Math.round(averageRating * 10) / 10}/5`);
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

checkMechanicRating();
