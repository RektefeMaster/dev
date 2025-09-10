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

// Ahmet Usta'yı ekle
const addAhmetUsta = async () => {
  try {
    console.log('🔍 Ahmet Usta ekleniyor...');
    
    // Ahmet Usta'nın konum bilgisi
    const ahmetLocation = {
      city: 'Malatya',
      district: 'Battalgazi',
      neighborhood: 'Ahmet Usta Mahallesi',
      street: 'Ahmet Usta Caddesi',
      building: 'Ahmet Usta İş Merkezi',
      floor: '1',
      apartment: 'A',
      coordinates: {
        latitude: 38.4000,
        longitude: 38.7000
      }
    };

    // CurrentLocation (geospatial index için)
    const currentLocation = {
      type: 'Point',
      coordinates: [38.7000, 38.4000] // [longitude, latitude] format
    };

    // Ahmet Usta'yı oluştur
    const ahmetUsta = new User({
      name: 'Ahmet',
      surname: 'Usta',
      email: 'ahmet@usta.com',
      password: '$2b$10$example_hash', // Şifre hash'i
      userType: 'mechanic',
      username: 'ahmet_usta_' + Date.now(),
      serviceCategories: ['Genel Bakım', 'Motor Tamiri', 'Fren Sistemi'],
      experience: 15,
      rating: 4.8,
      ratingCount: 120,
      totalServices: 450,
      isAvailable: true,
      currentLocation: currentLocation,
      documents: {
        insurance: 'Sigorta bilgisi mevcut'
      },
      workingHours: 'Pazartesi-Cuma: 08:00-18:00, Cumartesi: 08:00-16:00',
      shopName: 'Ahmet Usta Oto Servis',
      location: ahmetLocation,
      phone: '+90 555 123 4567',
      emailHidden: false,
      phoneHidden: false,
      cityHidden: false,
      carBrands: ['Toyota', 'Honda', 'Ford', 'Volkswagen'],
      engineTypes: ['Benzin', 'Dizel', 'Hibrit'],
      transmissionTypes: ['Manuel', 'Otomatik'],
      customBrands: ['Tüm Markalar'],
      avatar: '',
      bio: '15 yıllık deneyimli oto tamircisi. Tüm marka araçlarda uzman.'
    });

    await ahmetUsta.save();

    console.log('✅ Ahmet Usta başarıyla eklendi:');
    console.log(`   📧 Email: ${ahmetUsta.email}`);
    console.log(`   📍 Şehir: ${ahmetUsta.location.city}`);
    console.log(`   📍 İlçe: ${ahmetUsta.location.district}`);
    console.log(`   📍 Mahalle: ${ahmetUsta.location.neighborhood}`);
    console.log(`   📍 Sokak: ${ahmetUsta.location.street}`);
    console.log(`   📍 Bina: ${ahmetUsta.location.building}`);
    console.log(`   📍 Kat: ${ahmetUsta.location.floor}`);
    console.log(`   📍 Daire: ${ahmetUsta.location.apartment}`);
    console.log(`   📍 Koordinatlar: ${ahmetUsta.location.coordinates.latitude}, ${ahmetUsta.location.coordinates.longitude}`);
    console.log(`   📍 Telefon: ${ahmetUsta.phone}`);
    console.log(`   📍 Deneyim: ${ahmetUsta.experience} yıl`);
    console.log(`   📍 Puan: ${ahmetUsta.rating} (${ahmetUsta.ratingCount} değerlendirme)`);

  } catch (error) {
    console.error('❌ Ahmet Usta eklenirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await addAhmetUsta();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
