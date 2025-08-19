import mongoose from 'mongoose';
import { Mechanic } from '../models/Mechanic';
import { AppointmentRating } from '../models/AppointmentRating';

const MONGODB_URI = 'mongodb://localhost:27017/rektefe';

async function checkMechanics() {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB\'ye bağlandı');

    // Tüm mekanikleri getir
    const mechanics = await Mechanic.find({});
    console.log(`\n📊 Toplam mekanik sayısı: ${mechanics.length}`);

    if (mechanics.length === 0) {
      console.log('❌ Hiç mekanik bulunamadı');
      return;
    }

    // Her mekanik için detaylı bilgi
    for (const mechanic of mechanics) {
      console.log(`\n🔧 ${mechanic.name} ${mechanic.surname} (${mechanic._id})`);
      console.log(`   📍 Şehir: ${mechanic.city || 'Belirtilmemiş'}`);
      console.log(`   ⭐ Rating: ${mechanic.rating || 0}/5 (${mechanic.ratingCount || 0} değerlendirme)`);
      console.log(`   💼 Toplam iş: ${mechanic.totalServices || 0}`);
      
      // Rating dağılımını kontrol et
      const ratingDistribution = await AppointmentRating.aggregate([
        { $match: { mechanicId: mechanic._id } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]);

      if (ratingDistribution.length > 0) {
        console.log(`   📊 Rating dağılımı:`);
        ratingDistribution.forEach((item: any) => {
          console.log(`      ${item._id}⭐: ${item.count} adet`);
        });
      } else {
        console.log(`   📊 Rating dağılımı: Henüz değerlendirme yok`);
      }

      // Son yorumları kontrol et
      const recentReviews = await AppointmentRating.find({ mechanicId: mechanic._id })
        .sort({ createdAt: -1 })
        .limit(3);

      if (recentReviews.length > 0) {
        console.log(`   💬 Son yorumlar (${recentReviews.length} adet):`);
        recentReviews.forEach((review: any, index: number) => {
          console.log(`      ${index + 1}. ${review.rating}⭐ - "${review.comment || 'Yorum yok'}" (${review.createdAt.toLocaleDateString('tr-TR')})`);
        });
      } else {
        console.log(`   💬 Son yorumlar: Henüz yorum yok`);
      }
    }

    // Genel istatistikler
    const totalRatings = await AppointmentRating.countDocuments({});
    const totalMechanicsWithRatings = await AppointmentRating.distinct('mechanicId').countDocuments();
    
    console.log(`\n📈 Genel İstatistikler:`);
    console.log(`   Total değerlendirme: ${totalRatings}`);
    console.log(`   Değerlendirilen mekanik: ${totalMechanicsWithRatings}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB bağlantısı kapatıldı');
  }
}

checkMechanics();
