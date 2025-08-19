import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { AppointmentRating } from '../models/AppointmentRating';
import { Mechanic } from '../models/Mechanic';
import MaintenanceAppointment from '../models/MaintenanceAppointment';

async function addMoreTestRatings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const mechanicId = '68a36401cec7d1f96e4c17ea'; // Nurullah Aydın
    const userId = '68a1c08b4baccde02b4f5c43'; // Test kullanıcı

    // Önce mevcut rating'leri kontrol et
    console.log('\n=== MEVCUT RATING KONTROLÜ ===');
    const mechanic = await Mechanic.findById(mechanicId);
    if (mechanic) {
      console.log(`Usta: ${mechanic.name} ${mechanic.surname}`);
      console.log(`Mevcut Rating: ${mechanic.rating}`);
      console.log(`Rating Sayısı: ${mechanic.ratingCount}`);
    }

    // Ek test değerlendirmeleri
    const additionalRatings = [
      {
        serviceType: 'Test Servis - Fren Sistemi',
        rating: 4,
        comment: 'Fren sistemi tamirini iyi yaptı, ama biraz yavaştı. Genel olarak memnunum.'
      },
      {
        serviceType: 'Test Servis - Elektrik Sistemi',
        rating: 5,
        comment: 'Elektrik sorununu çok hızlı çözdü, profesyonel iş çıkardı!'
      },
      {
        serviceType: 'Test Servis - Klima Bakımı',
        rating: 3,
        comment: 'Klima bakımı yapıldı ama soğutma hala yeterli değil. Tekrar kontrol etmek gerekebilir.'
      },
      {
        serviceType: 'Test Servis - Yağ Değişimi',
        rating: 5,
        comment: 'Yağ değişimi mükemmel yapıldı, aracım çok daha iyi çalışıyor artık.'
      }
    ];

    console.log('\n=== EK TEST DEĞERLENDİRMELERİ EKLENİYOR ===');
    
    for (const ratingData of additionalRatings) {
      // Test randevusu oluştur
      const testAppointment = new MaintenanceAppointment({
        userId: new mongoose.Types.ObjectId(userId),
        vehicleId: new mongoose.Types.ObjectId('68a1c08b4baccde02b4f5c43'),
        mechanicId: new mongoose.Types.ObjectId(mechanicId),
        serviceType: ratingData.serviceType,
        appointmentDate: new Date(),
        status: 'completed',
        paymentStatus: 'paid',
        paymentDate: new Date(),
        completionDate: new Date()
      });

      await testAppointment.save();

      // Test değerlendirmesi ekle
      const testRating = new AppointmentRating({
        appointmentId: testAppointment._id,
        userId: new mongoose.Types.ObjectId(userId),
        mechanicId: new mongoose.Types.ObjectId(mechanicId),
        rating: ratingData.rating,
        comment: ratingData.comment,
        createdAt: new Date()
      });

      await testRating.save();
      console.log(`✅ ${ratingData.serviceType} - ${ratingData.rating}/5 puan eklendi`);
    }

    // Usta rating'ini güncelle
    console.log('\n=== USTA RATING GÜNCELLENİYOR ===');
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

    if (result && result.length > 0) {
      const { averageRating, totalRatings } = result[0];
      const newRating = Math.round(averageRating * 10) / 10;
      
      await Mechanic.updateOne({ _id: mechanicId }, {
        $set: { rating: newRating, ratingCount: totalRatings }
      });
      
      console.log(`✅ Usta rating güncellendi: ${newRating}/5 (${totalRatings} puan)`);
    }

    // Final kontrol
    console.log('\n=== FINAL KONTROL ===');
    const finalMechanic = await Mechanic.findById(mechanicId);
    if (finalMechanic) {
      console.log(`Final Rating: ${finalMechanic.rating}`);
      console.log(`Final Rating Sayısı: ${finalMechanic.ratingCount}`);
    }

    // Tüm rating'leri listele
    const allRatings = await AppointmentRating.find({ mechanicId: new mongoose.Types.ObjectId(mechanicId) });
    console.log(`\n=== TÜM RATING'LER (${allRatings.length} adet) ===`);
    allRatings.forEach((rating: any, index) => {
      console.log(`${index + 1}. Puan: ${rating.rating}/5`);
      console.log(`   Yorum: ${rating.comment}`);
      console.log(`   Tarih: ${rating.createdAt}`);
      console.log('---');
    });

    // Rating dağılımını göster
    console.log('\n=== RATING DAĞILIMI ===');
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach((rating: any) => {
      ratingDistribution[rating.rating as keyof typeof ratingDistribution]++;
    });
    
    Object.entries(ratingDistribution).forEach(([rating, count]) => {
      console.log(`${rating} yıldız: ${count} adet`);
    });

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

addMoreTestRatings();
