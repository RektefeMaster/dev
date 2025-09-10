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

// Nurullah Aydın'ın telefon numarasını düzelt
const fixNurullahPhone = async () => {
  try {
    console.log('🔍 Nurullah Aydın telefon numarası düzeltiliyor...');
    
    // Gerçek telefon numarası
    const realPhoneNumber = '0505 055 02 39';

    // Nurullah Aydın'ı bul ve güncelle
    const result = await User.updateOne(
      { name: 'Nurullah', surname: 'Aydın', userType: 'mechanic' },
      { 
        $set: { 
          phone: realPhoneNumber
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Nurullah Aydın telefon numarası başarıyla güncellendi:');
      console.log(`   📞 Telefon: ${realPhoneNumber}`);
    } else {
      console.log('⚠️ Nurullah Aydın bulunamadı veya güncellenmedi');
    }

  } catch (error) {
    console.error('❌ Nurullah Aydın telefon numarası güncellenirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await fixNurullahPhone();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
