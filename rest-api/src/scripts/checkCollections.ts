import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';

async function checkCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const db = mongoose.connection.db;
    if (!db) {
      console.log('❌ Veritabanı bağlantısı bulunamadı');
      return;
    }

    const collections = await db.listCollections().toArray();

    console.log('\n=== VERITABANI COLLECTION LARI ===');
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name}`);
    });

    // Her collection'daki document sayısını kontrol et
    console.log('\n=== COLLECTION BAZINDA DOCUMENT SAYILARI ===');
    for (const collection of collections) {
      try {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`${collection.name}: ${count} document`);
      } catch (error: any) {
        console.log(`${collection.name}: Hata - ${error?.message || 'Bilinmeyen hata'}`);
      }
    }

    // Mechanic collection'ını detaylı kontrol et
    console.log('\n=== MECHANIC COLLECTION DETAYI ===');
    const mechanicCollection = db.collection('mechanics');
    const mechanicCount = await mechanicCollection.countDocuments();
    console.log(`Toplam Mechanic: ${mechanicCount}`);

    if (mechanicCount > 0) {
      const sampleMechanic = await mechanicCollection.findOne({});
      console.log('Örnek Mechanic:', JSON.stringify(sampleMechanic, null, 2));
    }

    // AppointmentRating collection'ını detaylı kontrol et
    console.log('\n=== APPOINTMENTRATING COLLECTION DETAYI ===');
    const ratingCollection = db.collection('appointmentratings');
    const ratingCount = await ratingCollection.countDocuments();
    console.log(`Toplam Rating: ${ratingCount}`);

    if (ratingCount > 0) {
      const sampleRating = await ratingCollection.findOne({});
      console.log('Örnek Rating:', JSON.stringify(sampleRating, null, 2));
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

checkCollections();
