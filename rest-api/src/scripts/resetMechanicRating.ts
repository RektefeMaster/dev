import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Mechanic } from '../models/Mechanic';
import { AppointmentRating } from '../models/AppointmentRating';

async function resetMechanicRating() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const mechanicId = '68a1d1a6897c4b2d176c8965';

    // Önce mevcut rating'i kontrol et
    console.log('\n=== MEVCUT RATING KONTROLÜ ===');
    const mechanic = await Mechanic.findById(mechanicId);
    if (mechanic) {
      console.log(`Usta: ${mechanic.name} ${mechanic.surname}`);
      console.log(`Mevcut Rating: ${mechanic.rating}`);
      console.log(`Rating Sayısı: ${mechanic.ratingCount}`);
    }

    // AppointmentRating'den gerçek rating'i hesapla
    console.log('\n=== GERÇEK RATING HESAPLANIYOR ===');
    const result = await AppointmentRating.aggregate([
      { $match: { mechanicId: new mongoose.Types.ObjectId(mechanicId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    console.log('Aggregate sonucu:', result);

    if (result && result.length > 0) {
      const { averageRating, totalRatings } = result[0];
      const newRating = Math.round(averageRating * 10) / 10;
      
      console.log(`Hesaplanan Rating: ${newRating}/5`);
      console.log(`Hesaplanan Rating Sayısı: ${totalRatings}`);

      // Mechanic rating'ini güncelle
      await Mechanic.updateOne({ _id: mechanicId }, {
        $set: { rating: newRating, ratingCount: totalRatings }
      });
      
      console.log(`✅ Usta rating güncellendi: ${newRating}/5 (${totalRatings} puan)`);
    } else {
      // Hiç rating yoksa sıfırla
      await Mechanic.updateOne({ _id: mechanicId }, {
        $set: { rating: 0, ratingCount: 0 }
      });
      console.log(`✅ Usta rating sıfırlandı`);
    }

    // Final kontrol
    console.log('\n=== FINAL KONTROL ===');
    const finalMechanic = await Mechanic.findById(mechanicId);
    if (finalMechanic) {
      console.log(`Final Rating: ${finalMechanic.rating}`);
      console.log(`Final Rating Sayısı: ${finalMechanic.ratingCount}`);
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

resetMechanicRating();
