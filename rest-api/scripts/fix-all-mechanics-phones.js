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

// Tüm ustaların telefon numaralarını düzelt
const fixAllMechanicsPhones = async () => {
  try {
    console.log('🔍 Tüm ustaların telefon numaraları düzeltiliyor...');
    
    // Gerçek telefon numaraları
    const mechanicsPhones = [
      {
        name: 'Nurullah',
        surname: 'Aydın',
        phone: '0505 055 02 39'
      },
      {
        name: 'Ahmet',
        surname: 'Usta',
        phone: '+90 555 123 4567'
      },
      {
        name: 'Test',
        surname: 'User',
        phone: '+90 555 111 1111'
      },
      {
        name: 'Test',
        surname: 'Usta',
        phone: '+90 555 222 2222'
      },
      {
        name: 'Test',
        surname: 'Usta',
        phone: '+90 555 333 3333'
      },
      {
        name: 'Test',
        surname: 'Usta',
        phone: '+90 555 444 4444'
      }
    ];

    let updatedCount = 0;

    for (const mechanicData of mechanicsPhones) {
      const result = await User.updateOne(
        { name: mechanicData.name, surname: mechanicData.surname, userType: 'mechanic' },
        { 
          $set: { 
            phone: mechanicData.phone
          }
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`✅ ${mechanicData.name} ${mechanicData.surname} telefon numarası güncellendi: ${mechanicData.phone}`);
      }
    }

    console.log(`\n✅ Toplam ${updatedCount} usta telefon numarası güncellendi`);

  } catch (error) {
    console.error('❌ Usta telefon numaraları güncellenirken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await fixAllMechanicsPhones();
  await mongoose.connection.close();
  console.log('✅ İşlem tamamlandı');
};

main();
