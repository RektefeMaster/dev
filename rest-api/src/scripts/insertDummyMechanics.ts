import mongoose from 'mongoose';
import { Mechanic } from '../models/Mechanic';
import { MONGODB_URI } from '../config';

const dummyMechanics = [
  {
    email: 'ahmet@usta.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    name: 'Ahmet',
    surname: 'Yılmaz',
    shopName: 'Ahmet Usta Oto Servis',
    phone: '+90 555 123 4567',
    bio: '20 yıllık deneyim ile kaliteli hizmet. Özellikle Toyota ve Honda araçlarda uzmanım.',
    city: 'İstanbul',
    userType: 'mechanic',
    vehicleBrands: ['Toyota', 'Honda', 'Ford', 'Genel'],
    serviceCategories: ['Genel Bakım', 'Motor', 'Fren Sistemi', 'Alt Takım'],
    experience: 20,
    rating: 4.8,
    ratingCount: 156,
    totalServices: 1250,
    isAvailable: true,
    location: {
      city: 'İstanbul',
      district: 'Kadıköy',
      neighborhood: 'Fenerbahçe',
      street: 'Atatürk Caddesi',
      building: 'No:123',
      floor: 'Zemin',
      apartment: 'A Blok'
    },
    workingHours: {
      monday: { start: '08:00', end: '18:00', isOpen: true },
      tuesday: { start: '08:00', end: '18:00', isOpen: true },
      wednesday: { start: '08:00', end: '18:00', isOpen: true },
      thursday: { start: '08:00', end: '18:00', isOpen: true },
      friday: { start: '08:00', end: '18:00', isOpen: true },
      saturday: { start: '09:00', end: '16:00', isOpen: true },
      sunday: { start: '09:00', end: '14:00', isOpen: false }
    },
    documents: {
      insurance: 'Tam sigorta mevcut'
    }
  }
];

async function insertDummyMechanics() {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB\'ye bağlandı');

    // Mevcut mechanic'leri temizle
    await Mechanic.deleteMany({});
    console.log('Mevcut mechanic\'ler temizlendi');

    // Yeni mechanic'leri ekle
    const insertedMechanics = await Mechanic.insertMany(dummyMechanics);
    console.log(`${insertedMechanics.length} adet mechanic eklendi:`);

    insertedMechanics.forEach((mechanic, index) => {
      console.log(`${index + 1}. ${mechanic.name} ${mechanic.surname} - ${mechanic.shopName}`);
    });

    console.log('Dummy mechanic verileri başarıyla eklendi!');
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    // Bağlantıyı kapat
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

// Script'i çalıştır
insertDummyMechanics();
