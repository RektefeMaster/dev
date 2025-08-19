import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = 'mongodb://127.0.0.1:27017/rektefe';

async function resetDatabase() {
  try {
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    // Database'i temizle
    console.log('Database temizleniyor...');
    const db = mongoose.connection.db;
    if (db) {
      await db.dropDatabase();
      console.log('Database temizlendi!');

      // Tüm collection'ları kaldır
      const collections = await db.listCollections().toArray();
      for (const collection of collections) {
        await db.dropCollection(collection.name);
        console.log(`Collection ${collection.name} kaldırıldı`);
      }
    }

    console.log('Database tamamen temizlendi!');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

resetDatabase();
