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

// Mevcut ustaları kontrol et
const checkMechanics = async () => {
  try {
    console.log('🔍 Mevcut ustalar kontrol ediliyor...');
    
    // Tüm ustaları bul
    const mechanics = await User.find({
      userType: 'mechanic'
    });

    console.log(`✅ Toplam ${mechanics.length} usta bulundu:`);
    
    mechanics.forEach((mechanic, index) => {
      console.log(`\n${index + 1}. ${mechanic.name} ${mechanic.surname}`);
      console.log(`   📧 Email: ${mechanic.email}`);
      console.log(`   📍 Şehir: ${mechanic.location?.city || 'Yok'}`);
      console.log(`   📍 İlçe: ${mechanic.location?.district || 'Yok'}`);
      console.log(`   📍 Mahalle: ${mechanic.location?.neighborhood || 'Yok'}`);
      console.log(`   📍 Sokak: ${mechanic.location?.street || 'Yok'}`);
      console.log(`   📍 Koordinatlar: ${mechanic.location?.coordinates?.latitude || 'Yok'}, ${mechanic.location?.coordinates?.longitude || 'Yok'}`);
      console.log(`   📍 CurrentLocation: ${mechanic.currentLocation?.coordinates || 'Yok'}`);
    });

  } catch (error) {
    console.error('❌ Ustalar kontrol edilirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await checkMechanics();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
