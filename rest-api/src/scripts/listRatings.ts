import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { AppointmentRating } from '../models/AppointmentRating';
import { Mechanic } from '../models/Mechanic';
import { User } from '../models/User';
import MaintenanceAppointment from '../models/MaintenanceAppointment';

async function listRatings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const ratings = await AppointmentRating.find({})
      .sort({ createdAt: -1 });

    console.log('\n=== MEVCUT PUANLAMALAR ===');
    ratings.forEach((rating: any, index) => {
      console.log(`${index + 1}. ID: ${rating._id}`);
      console.log(`   Puan: ${rating.rating}/5`);
      console.log(`   Yorum: ${rating.comment || 'Yorum yok'}`);
      console.log(`   Usta ID: ${rating.mechanicId}`);
      console.log(`   Kullanıcı ID: ${rating.userId}`);
      console.log(`   Randevu ID: ${rating.appointmentId}`);
      console.log(`   Tarih: ${rating.createdAt}`);
      console.log('---');
    });

    console.log(`\nToplam ${ratings.length} puanlama bulundu.`);

    // Usta bazında puanlama sayıları
    const mechanicStats = await AppointmentRating.aggregate([
      {
        $group: {
          _id: '$mechanicId',
          totalRatings: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    console.log('\n=== USTA BAZINDA PUANLAMA İSTATİSTİKLERİ ===');
    for (const stat of mechanicStats) {
      const mechanic = await mongoose.model('Mechanic').findById(stat._id).select('name surname shopName');
      console.log(`Usta: ${mechanic?.name || 'Bilinmiyor'} ${mechanic?.surname || ''} (${mechanic?.shopName || 'Dükkan yok'})`);
      console.log(`   Toplam Puanlama: ${stat.totalRatings}`);
      console.log(`   Ortalama Puan: ${stat.averageRating.toFixed(2)}/5`);
      console.log('---');
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

listRatings();
