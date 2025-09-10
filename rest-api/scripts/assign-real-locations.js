const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB bağlantısı
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
    process.exit(1);
  }
};

// User modeli (Mechanic için)
const userSchema = new mongoose.Schema({
  name: String,
  surname: String,
  email: String,
  userType: String,
  location: {
    city: String,
    district: String,
    neighborhood: String,
    street: String,
    building: String,
    floor: String,
    apartment: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  }
});

const User = mongoose.model('User', userSchema);

// Malatya'daki gerçek konumlar
const malatyaLocations = [
  {
    city: 'Malatya',
    district: 'Battalgazi',
    neighborhood: 'Battalgazi Mahallesi',
    street: 'Atatürk Caddesi',
    building: 'Battalgazi Plaza',
    floor: '1',
    apartment: 'A',
    coordinates: { latitude: 38.4333, longitude: 38.7500 }
  },
  {
    city: 'Malatya',
    district: 'Yeşilyurt',
    neighborhood: 'Yeşilyurt Mahallesi',
    street: 'Cumhuriyet Caddesi',
    building: 'Yeşilyurt İş Merkezi',
    floor: '2',
    apartment: 'B',
    coordinates: { latitude: 38.3000, longitude: 38.2500 }
  },
  {
    city: 'Malatya',
    district: 'Battalgazi',
    neighborhood: 'Fırat Mahallesi',
    street: 'Fırat Caddesi',
    building: 'Fırat Apartmanı',
    floor: '3',
    apartment: 'C',
    coordinates: { latitude: 38.4500, longitude: 38.8000 }
  },
  {
    city: 'Malatya',
    district: 'Yeşilyurt',
    neighborhood: 'Merkez Mahallesi',
    street: 'İnönü Caddesi',
    building: 'Merkez Plaza',
    floor: '1',
    apartment: 'D',
    coordinates: { latitude: 38.2800, longitude: 38.2000 }
  },
  {
    city: 'Malatya',
    district: 'Battalgazi',
    neighborhood: 'Gazi Mahallesi',
    street: 'Gazi Caddesi',
    building: 'Gazi İş Merkezi',
    floor: '2',
    apartment: 'E',
    coordinates: { latitude: 38.4200, longitude: 38.7200 }
  }
];

// Ustalara gerçek konum bilgileri ata
const assignRealLocations = async () => {
  try {
    console.log('🔍 Ustalar bulunuyor...');
    
    // Tüm ustaları bul
    const mechanics = await User.find({
      userType: 'mechanic'
    });

    console.log(`✅ ${mechanics.length} usta bulundu`);

    // Her ustaya farklı konum ata
    for (let i = 0; i < mechanics.length; i++) {
      const mechanic = mechanics[i];
      const locationIndex = i % malatyaLocations.length;
      const location = malatyaLocations[locationIndex];

      // Nurullah Aydın için özel konum (zaten var)
      if (mechanic.name === 'Nurullah' && mechanic.surname === 'Aydın') {
        console.log(`📍 ${mechanic.name} ${mechanic.surname} - Zaten konum bilgisi var, atlanıyor`);
        continue;
      }

      // Konum bilgilerini güncelle
      const currentLocation = {
        type: 'Point',
        coordinates: [location.coordinates.longitude, location.coordinates.latitude] // [longitude, latitude] format
      };

      await User.findByIdAndUpdate(mechanic._id, {
        $set: {
          location: location,
          currentLocation: currentLocation
        }
      });

      console.log(`✅ ${mechanic.name} ${mechanic.surname} - Konum güncellendi:`);
      console.log(`   📍 Şehir: ${location.city}`);
      console.log(`   📍 İlçe: ${location.district}`);
      console.log(`   📍 Mahalle: ${location.neighborhood}`);
      console.log(`   📍 Sokak: ${location.street}`);
      console.log(`   📍 Bina: ${location.building}`);
      console.log(`   📍 Kat: ${location.floor}`);
      console.log(`   📍 Daire: ${location.apartment}`);
      console.log(`   📍 Koordinatlar: ${location.coordinates.latitude}, ${location.coordinates.longitude}`);
    }

    console.log('\n🎉 Tüm ustalara gerçek konum bilgileri atandı!');

  } catch (error) {
    console.error('❌ Konum atama hatası:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await assignRealLocations();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
