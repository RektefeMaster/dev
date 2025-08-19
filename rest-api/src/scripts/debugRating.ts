import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { AppointmentRating } from '../models/AppointmentRating';
import { Mechanic } from '../models/Mechanic';

async function debugRating() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const mechanicId = '68a1d1a6897c4b2d176c8965';

    // Tüm rating'leri getir
    console.log('\n=== TÜM RATING\'LER ===');
    const allRatings = await AppointmentRating.find({});
    console.log(`Toplam rating sayısı: ${allRatings.length}`);
    
    allRatings.forEach((rating: any, index) => {
      console.log(`${index + 1}. ID: ${rating._id}`);
      console.log(`   MechanicId: ${rating.mechanicId} (tip: ${typeof rating.mechanicId})`);
      console.log(`   UserId: ${rating.userId}`);
      console.log(`   Rating: ${rating.rating}`);
      console.log(`   Comment: ${rating.comment}`);
      console.log('---');
    });

    // String olarak arama yap
    console.log('\n=== STRING OLARAK ARAMA ===');
    const stringSearch = await AppointmentRating.find({ mechanicId: mechanicId.toString() });
    console.log(`String arama sonucu: ${stringSearch.length} rating`);

    // ObjectId olarak arama yap
    console.log('\n=== OBJECTID OLARAK ARAMA ===');
    const objectIdSearch = await AppointmentRating.find({ mechanicId: new mongoose.Types.ObjectId(mechanicId) });
    console.log(`ObjectId arama sonucu: ${objectIdSearch.length} rating`);

    // Aggregate'i test et
    console.log('\n=== AGGREGATE TEST ===');
    const aggregateResult = await AppointmentRating.aggregate([
      { $match: { mechanicId: mechanicId.toString() } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);
    console.log('String match aggregate:', aggregateResult);

    const aggregateResult2 = await AppointmentRating.aggregate([
      { $match: { mechanicId: new mongoose.Types.ObjectId(mechanicId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);
    console.log('ObjectId match aggregate:', aggregateResult2);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

debugRating();
