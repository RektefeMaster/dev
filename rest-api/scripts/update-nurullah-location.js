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

// Nurullah Aydın'ın konumunu güncelle
const updateNurullahLocation = async () => {
  try {
    console.log('🔍 Nurullah Aydın aranıyor...');
    
    // Nurullah Aydın'ı bul
    const nurullah = await User.findOne({
      name: 'Nurullah',
      surname: 'Aydın',
      userType: 'mechanic'
    });

    if (!nurullah) {
      console.log('❌ Nurullah Aydın bulunamadı');
      return;
    }

    console.log('✅ Nurullah Aydın bulundu:', nurullah._id);

    // Malatya Battalgazi konumunu güncelle
    const malatyaBattalgaziLocation = {
      city: 'Malatya',
      district: 'Battalgazi',
      neighborhood: 'Battalgazi Mahallesi',
      street: 'Atatürk Caddesi',
      building: 'Battalgazi Plaza',
      floor: '1',
      apartment: 'A',
      coordinates: {
        latitude: 38.4333,
        longitude: 38.7500
      }
    };

    // currentLocation'ı da güncelle (geospatial index için)
    const currentLocation = {
      type: 'Point',
      coordinates: [38.7500, 38.4333] // [longitude, latitude] format
    };

    // Konum bilgilerini güncelle
    await User.findByIdAndUpdate(nurullah._id, {
      $set: {
        location: malatyaBattalgaziLocation,
        currentLocation: currentLocation
      }
    });

    console.log('✅ Nurullah Aydın\'ın konumu güncellendi:');
    console.log('📍 Şehir:', malatyaBattalgaziLocation.city);
    console.log('📍 İlçe:', malatyaBattalgaziLocation.district);
    console.log('📍 Mahalle:', malatyaBattalgaziLocation.neighborhood);
    console.log('📍 Sokak:', malatyaBattalgaziLocation.street);
    console.log('📍 Koordinatlar:', malatyaBattalgaziLocation.coordinates);

    // Güncellenmiş veriyi kontrol et
    const updatedNurullah = await User.findById(nurullah._id);
    console.log('🔍 Güncellenmiş konum:', updatedNurullah.location);
    console.log('🔍 Güncellenmiş currentLocation:', updatedNurullah.currentLocation);

  } catch (error) {
    console.error('❌ Konum güncelleme hatası:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await updateNurullahLocation();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
