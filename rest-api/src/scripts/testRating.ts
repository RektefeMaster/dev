import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { AppointmentRating } from '../models/AppointmentRating';
import { Mechanic } from '../models/Mechanic';

async function testRating() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const mechanicId = '68a1d1a6897c4b2d176c8965';
    const userId = '68a1c08b4baccde02b4f5c43';
    const appointmentId = '68a1d5cd35800c68846c6c66';

    // Önce mevcut rating'i kontrol et
    console.log('\n=== MEVCUT RATING KONTROLÜ ===');
    const mechanic = await Mechanic.findById(mechanicId);
    if (mechanic) {
      console.log(`Usta: ${mechanic.name} ${mechanic.surname}`);
      console.log(`Mevcut Rating: ${mechanic.rating}`);
      console.log(`Rating Sayısı: ${mechanic.ratingCount}`);
    }

    // Mevcut puanlamaları kontrol et
    const existingRatings = await AppointmentRating.find({ mechanicId });
    console.log(`\nMevcut Puanlama Sayısı: ${existingRatings.length}`);

    // Test rating ekle
    console.log('\n=== TEST RATING EKLENİYOR ===');
    const testRating = new AppointmentRating({
      appointmentId,
      userId,
      mechanicId,
      rating: 5,
      comment: 'Test puanlama - Çok iyi hizmet!',
      createdAt: new Date()
    });

    await testRating.save();
    console.log('✅ Test rating eklendi');

    // Rating sayısını tekrar kontrol et
    const newRatings = await AppointmentRating.find({ mechanicId });
    console.log(`\nYeni Puanlama Sayısı: ${newRatings.length}`);

    // Usta rating'ini manuel güncelle
    console.log('\n=== USTA RATING GÜNCELLENİYOR ===');
    const result = await AppointmentRating.aggregate([
      { $match: { mechanicId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    if (result.length > 0) {
      const { averageRating, totalRatings } = result[0];
      const updatedRating = Math.round(averageRating * 10) / 10;
      
      await Mechanic.updateOne({ _id: mechanicId }, {
        $set: { rating: updatedRating, ratingCount: totalRatings }
      });
      
      console.log(`✅ Usta rating güncellendi: ${updatedRating}/5 (${totalRatings} puan)`);
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

testRating();
