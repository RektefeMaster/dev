require('dotenv').config();
const mongoose = require('mongoose');

// Model'leri tanımla (basit schema)
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
const Mechanic = mongoose.model('Mechanic', new mongoose.Schema({}, { strict: false, collection: 'mechanics' }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function createMechanicProfile() {
  try {
    console.log('🔌 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Testus kullanıcısını bul
    const user = await User.findOne({ email: 'testus@gmail.com' });
    if (!user) {
      console.log('❌ testus@gmail.com kullanıcısı bulunamadı');
      return;
    }

    console.log('✅ User bulundu:', user._id);

    // Mechanic profili var mı kontrol et
    let mechanic = await Mechanic.findOne({ email: 'testus@gmail.com' });
    
    if (mechanic) {
      console.log('✅ Mechanic profili zaten var:', mechanic._id);
    } else {
      // Mechanic profili oluştur
      mechanic = new Mechanic({
        _id: user._id, // User ile aynı ID
        email: 'testus@gmail.com',
        name: 'Mete',
        surname: 'Aydın',
        phone: '05060550239',
        shopName: 'HAN CAR',
        bio: 'Doğmadım daha',
        experience: 2,
        isAvailable: true,
        location: {
          city: 'Battalgazi',
          district: 'Selçuklu',
          neighborhood: 'Yeşilçam Cd.',
          street: 'Ass',
          building: 'Koss',
          apartment: '5',
          floor: '1',
          description: 'Testtest',
          coordinates: [38.4242, 38.4242]
        },
        serviceCategories: ['Genel Bakım', 'repair'],
        vehicleBrands: ['Genel'],
        rating: 4.5,
        ratingCount: 12,
        totalServices: 10,
        workingHours: {
          monday: { isOpen: true, start: '09:00', end: '18:00' },
          tuesday: { isOpen: true, start: '09:00', end: '18:00' },
          wednesday: { isOpen: true, start: '09:00', end: '18:00' },
          thursday: { isOpen: true, start: '09:00', end: '18:00' },
          friday: { isOpen: true, start: '09:00', end: '18:00' },
          saturday: { isOpen: true, start: '10:00', end: '16:00' },
          sunday: { isOpen: false, start: '10:00', end: '16:00' }
        }
      });

      await mechanic.save();
      console.log('✅ Mechanic profili oluşturuldu:', mechanic._id);
    }

    console.log('📊 Mechanic bilgileri:');
    console.log('   Shop Name:', mechanic.shopName);
    console.log('   Rating:', mechanic.rating);
    console.log('   Rating Count:', mechanic.ratingCount);
    console.log('   Total Services:', mechanic.totalServices);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

createMechanicProfile();