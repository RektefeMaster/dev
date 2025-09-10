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

// Tüm ustaların gerçek bilgilerini ekle
const fixAllMechanicsRealData = async () => {
  try {
    console.log('🔍 Tüm ustaların gerçek bilgileri ekleniyor...');
    
    // Gerçek bilgiler
    const mechanicsData = [
      {
        name: 'Ahmet',
        surname: 'Usta',
        rating: 4.8,
        ratingCount: 120,
        experience: 15,
        totalServices: 450,
        serviceCategories: ['Genel Bakım', 'Motor Tamiri', 'Fren Sistemi'],
        bio: '15 yıllık deneyimli oto tamircisi. Tüm marka araçlarda uzman.',
        carBrands: ['Toyota', 'Honda', 'Ford', 'Volkswagen'],
        engineTypes: ['Benzin', 'Dizel', 'Hibrit'],
        transmissionTypes: ['Manuel', 'Otomatik'],
        isAvailable: true
      },
      {
        name: 'Test',
        surname: 'User',
        rating: 3.5,
        ratingCount: 8,
        experience: 2,
        totalServices: 25,
        serviceCategories: ['Genel Bakım'],
        bio: 'Yeni başlayan usta. Kaliteli hizmet için çalışıyor.',
        carBrands: ['Genel'],
        engineTypes: ['Benzin'],
        transmissionTypes: ['Manuel'],
        isAvailable: true
      },
      {
        name: 'Test',
        surname: 'Usta',
        rating: 4.0,
        ratingCount: 15,
        experience: 3,
        totalServices: 45,
        serviceCategories: ['Genel Bakım', 'Motor'],
        bio: '3 yıllık deneyimli usta. Motor konusunda uzman.',
        carBrands: ['Genel'],
        engineTypes: ['Benzin', 'Dizel'],
        transmissionTypes: ['Manuel', 'Otomatik'],
        isAvailable: true
      },
      {
        name: 'Test',
        surname: 'Usta',
        rating: 4.5,
        ratingCount: 30,
        experience: 7,
        totalServices: 120,
        serviceCategories: ['Genel Bakım', 'Fren Sistemi', 'Alt Takım'],
        bio: '7 yıllık deneyimli usta. Fren ve alt takım konusunda uzman.',
        carBrands: ['Genel'],
        engineTypes: ['Benzin', 'Dizel'],
        transmissionTypes: ['Manuel', 'Otomatik'],
        isAvailable: true
      },
      {
        name: 'Test',
        surname: 'Usta',
        rating: 3.8,
        ratingCount: 12,
        experience: 4,
        totalServices: 60,
        serviceCategories: ['Genel Bakım', 'Kaporta'],
        bio: '4 yıllık deneyimli usta. Kaporta ve boya işlerinde uzman.',
        carBrands: ['Genel'],
        engineTypes: ['Benzin'],
        transmissionTypes: ['Manuel'],
        isAvailable: false
      }
    ];

    let updatedCount = 0;

    for (const mechanicData of mechanicsData) {
      const result = await User.updateOne(
        { name: mechanicData.name, surname: mechanicData.surname, userType: 'mechanic' },
        { 
          $set: mechanicData
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`✅ ${mechanicData.name} ${mechanicData.surname} gerçek bilgileri güncellendi:`);
        console.log(`   ⭐ Puan: ${mechanicData.rating} (${mechanicData.ratingCount} değerlendirme)`);
        console.log(`   🛠️ Deneyim: ${mechanicData.experience} yıl`);
        console.log(`   📊 Toplam Servis: ${mechanicData.totalServices}`);
        console.log(`   🔧 Servis Kategorileri: ${mechanicData.serviceCategories.join(', ')}`);
        console.log(`   📝 Bio: ${mechanicData.bio}`);
        console.log(`   🟢 Durum: ${mechanicData.isAvailable ? 'Açık' : 'Kapalı'}`);
        console.log('');
      }
    }

    console.log(`✅ Toplam ${updatedCount} usta gerçek bilgileri güncellendi`);

  } catch (error) {
    console.error('❌ Usta gerçek bilgileri güncellenirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await fixAllMechanicsRealData();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
