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

// Tüm ustaların konumlarını düzelt
const fixAllMechanicsLocations = async () => {
  try {
    console.log('🔍 Tüm ustaların konumları düzeltiliyor...');
    
    // Malatya'da farklı konumlar
    const malatyaLocations = [
      {
        name: 'Nurullah',
        surname: 'Aydın',
        location: {
          city: 'Malatya',
          district: 'Battalgazi',
          neighborhood: 'Battalgazi Mahallesi',
          street: 'Atatürk Caddesi',
          building: 'Battalgazi Plaza',
          floor: '1',
          apartment: 'A',
          coordinates: { latitude: 38.3552, longitude: 38.3095 }
        },
        currentLocation: { type: 'Point', coordinates: [38.3095, 38.3552] }
      },
      {
        name: 'Ahmet',
        surname: 'Usta',
        location: {
          city: 'Malatya',
          district: 'Battalgazi',
          neighborhood: 'Ahmet Usta Mahallesi',
          street: 'Ahmet Usta Caddesi',
          building: 'Ahmet Usta İş Merkezi',
          floor: '1',
          apartment: 'A',
          coordinates: { latitude: 38.3600, longitude: 38.3200 }
        },
        currentLocation: { type: 'Point', coordinates: [38.3200, 38.3600] }
      },
      {
        name: 'Test',
        surname: 'User',
        location: {
          city: 'Malatya',
          district: 'Yeşilyurt',
          neighborhood: 'Yeşilyurt Mahallesi',
          street: 'Cumhuriyet Caddesi',
          building: 'Yeşilyurt Plaza',
          floor: '2',
          apartment: 'B',
          coordinates: { latitude: 38.3500, longitude: 38.3000 }
        },
        currentLocation: { type: 'Point', coordinates: [38.3000, 38.3500] }
      },
      {
        name: 'Test',
        surname: 'Usta',
        location: {
          city: 'Malatya',
          district: 'Yeşilyurt',
          neighborhood: 'Merkez Mahallesi',
          street: 'İnönü Caddesi',
          building: 'Merkez İş Merkezi',
          floor: '3',
          apartment: 'C',
          coordinates: { latitude: 38.3450, longitude: 38.2950 }
        },
        currentLocation: { type: 'Point', coordinates: [38.2950, 38.3450] }
      },
      {
        name: 'Test',
        surname: 'Usta',
        location: {
          city: 'Malatya',
          district: 'Battalgazi',
          neighborhood: 'Gazi Mahallesi',
          street: 'Gazi Caddesi',
          building: 'Gazi İş Merkezi',
          floor: '1',
          apartment: 'D',
          coordinates: { latitude: 38.3650, longitude: 38.3150 }
        },
        currentLocation: { type: 'Point', coordinates: [38.3150, 38.3650] }
      },
      {
        name: 'Test',
        surname: 'Usta',
        location: {
          city: 'Malatya',
          district: 'Battalgazi',
          neighborhood: 'Fırat Mahallesi',
          street: 'Fırat Caddesi',
          building: 'Fırat İş Merkezi',
          floor: '2',
          apartment: 'E',
          coordinates: { latitude: 38.3400, longitude: 38.3100 }
        },
        currentLocation: { type: 'Point', coordinates: [38.3100, 38.3400] }
      }
    ];

    let updatedCount = 0;

    for (const mechanicData of malatyaLocations) {
      const result = await User.updateOne(
        { name: mechanicData.name, surname: mechanicData.surname, userType: 'mechanic' },
        { 
          $set: { 
            location: mechanicData.location,
            currentLocation: mechanicData.currentLocation
          }
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`✅ ${mechanicData.name} ${mechanicData.surname} konumu güncellendi: ${mechanicData.location.coordinates.latitude}, ${mechanicData.location.coordinates.longitude}`);
      }
    }

    console.log(`\n✅ Toplam ${updatedCount} usta konumu güncellendi`);

  } catch (error) {
    console.error('❌ Usta konumları güncellenirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await fixAllMechanicsLocations();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
