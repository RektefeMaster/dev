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

// Nurullah Aydın'ın gerçek bilgilerini ekle
const fixNurullahRealData = async () => {
  try {
    console.log('🔍 Nurullah Aydın gerçek bilgileri ekleniyor...');
    
    // Gerçek bilgiler
    const realData = {
      rating: 4.2,
      ratingCount: 20,
      experience: 5,
      totalServices: 150,
      serviceCategories: [
        'Genel Bakım',
        'Elektrik-Elektronik',
        'Kaporta & Boya',
        'Üst Takım',
        'Alt Takım',
        'Ağır Bakım',
        'Genel Bakım',
        'Yedek Parça',
        'Lastik Servisi',
        'Ekspertiz',
        'Egzoz & Emisyon',
        'Sigorta & Kasko',
        'Araç Yıkama'
      ],
      bio: 'Deneyimli ve güvenilir usta. 5 yıldır otomotiv sektöründe hizmet veriyorum.',
      workingHours: JSON.stringify([
        {"day":"Pazartesi","isWorking":true,"startTime":"09:00","endTime":"18:00","isBreak":true,"breakStartTime":"12:00","breakEndTime":"13:00"},
        {"day":"Salı","isWorking":true,"startTime":"09:00","endTime":"18:00","isBreak":true,"breakStartTime":"12:00","breakEndTime":"13:00"},
        {"day":"Çarşamba","isWorking":true,"startTime":"09:00","endTime":"18:00","isBreak":true,"breakStartTime":"12:00","breakEndTime":"13:00"},
        {"day":"Perşembe","isWorking":true,"startTime":"09:00","endTime":"18:00","isBreak":true,"breakStartTime":"12:00","breakEndTime":"13:00"},
        {"day":"Cuma","isWorking":true,"startTime":"09:00","endTime":"18:00","isBreak":true,"breakStartTime":"12:00","breakEndTime":"13:00"},
        {"day":"Cumartesi","isWorking":false,"startTime":"09:00","endTime":"18:00","isBreak":false,"breakStartTime":"12:00","breakEndTime":"13:00"},
        {"day":"Pazar","isWorking":false,"startTime":"09:00","endTime":"18:00","isBreak":false,"breakStartTime":"12:00","breakEndTime":"13:00"}
      ]),
      carBrands: ['Genel'],
      engineTypes: ['Benzin', 'Dizel'],
      transmissionTypes: ['Manuel', 'Otomatik'],
      isAvailable: true
    };

    // Nurullah Aydın'ı bul ve güncelle
    const result = await User.updateOne(
      { name: 'Nurullah', surname: 'Aydın', userType: 'mechanic' },
      { 
        $set: realData
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Nurullah Aydın gerçek bilgileri başarıyla güncellendi:');
      console.log(`   ⭐ Puan: ${realData.rating} (${realData.ratingCount} değerlendirme)`);
      console.log(`   🛠️ Deneyim: ${realData.experience} yıl`);
      console.log(`   📊 Toplam Servis: ${realData.totalServices}`);
      console.log(`   🔧 Servis Kategorileri: ${realData.serviceCategories.length} adet`);
      console.log(`   📝 Bio: ${realData.bio}`);
      console.log(`   🚗 Araç Markaları: ${realData.carBrands.join(', ')}`);
      console.log(`   ⚙️ Motor Türleri: ${realData.engineTypes.join(', ')}`);
      console.log(`   🔄 Şanzıman Türleri: ${realData.transmissionTypes.join(', ')}`);
      console.log(`   🟢 Durum: ${realData.isAvailable ? 'Açık' : 'Kapalı'}`);
    } else {
      console.log('⚠️ Nurullah Aydın bulunamadı veya güncellenmedi');
    }

  } catch (error) {
    console.error('❌ Nurullah Aydın gerçek bilgileri güncellenirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await fixNurullahRealData();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
