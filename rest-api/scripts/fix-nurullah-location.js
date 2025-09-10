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

// User modeli
const userSchema = new mongoose.Schema({
  name: String,
  surname: String,
  email: String,
  password: String,
  userType: String,
  username: String,
  serviceCategories: [String],
  experience: Number,
  rating: Number,
  ratingCount: Number,
  totalServices: Number,
  isAvailable: Boolean,
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  documents: {
    insurance: String
  },
  workingHours: String,
  pushToken: String,
  shopName: String,
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
  phone: String,
  emailHidden: Boolean,
  phoneHidden: Boolean,
  cityHidden: Boolean,
  carBrands: [String],
  engineTypes: [String],
  transmissionTypes: [String],
  customBrands: [String],
  avatar: String,
  bio: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Nurullah Aydın'ın konumunu düzelt
const fixNurullahLocation = async () => {
  try {
    console.log('🔍 Nurullah Aydın konumu düzeltiliyor...');
    
    // Doğru Malatya Battalgazi koordinatları
    const correctLocation = {
      city: 'Malatya',
      district: 'Battalgazi',
      neighborhood: 'Battalgazi Mahallesi',
      street: 'Atatürk Caddesi',
      building: 'Battalgazi Plaza',
      floor: '1',
      apartment: 'A',
      coordinates: {
        latitude: 38.3552,  // Doğru Malatya merkez koordinatı
        longitude: 38.3095  // Doğru Malatya merkez koordinatı
      }
    };

    // CurrentLocation (geospatial index için) - [longitude, latitude] format
    const currentLocation = {
      type: 'Point',
      coordinates: [38.3095, 38.3552] // [longitude, latitude]
    };

    // Nurullah Aydın'ı bul ve güncelle
    const result = await User.updateOne(
      { name: 'Nurullah', surname: 'Aydın', userType: 'mechanic' },
      { 
        $set: { 
          location: correctLocation,
          currentLocation: currentLocation
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Nurullah Aydın konumu başarıyla güncellendi:');
      console.log(`   📍 Şehir: ${correctLocation.city}`);
      console.log(`   📍 İlçe: ${correctLocation.district}`);
      console.log(`   📍 Mahalle: ${correctLocation.neighborhood}`);
      console.log(`   📍 Sokak: ${correctLocation.street}`);
      console.log(`   📍 Bina: ${correctLocation.building}`);
      console.log(`   📍 Kat: ${correctLocation.floor}`);
      console.log(`   📍 Daire: ${correctLocation.apartment}`);
      console.log(`   📍 Koordinatlar: ${correctLocation.coordinates.latitude}, ${correctLocation.coordinates.longitude}`);
    } else {
      console.log('⚠️ Nurullah Aydın bulunamadı veya güncellenmedi');
    }

  } catch (error) {
    console.error('❌ Nurullah Aydın konumu güncellenirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await fixNurullahLocation();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
