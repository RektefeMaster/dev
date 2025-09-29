const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe');
    console.log('✅ MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
    process.exit(1);
  }
};

// Rastgele veri üretici fonksiyonları
const getRandomCity = () => {
  const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Şanlıurfa', 'Kocaeli'];
  return cities[Math.floor(Math.random() * cities.length)];
};

const getRandomDistrict = (city) => {
  const districts = {
    'İstanbul': ['Kadıköy', 'Beşiktaş', 'Şişli', 'Beyoğlu', 'Fatih', 'Üsküdar', 'Bakırköy', 'Pendik'],
    'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Sincan', 'Etimesgut', 'Altındağ', 'Gölbaşı'],
    'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Çiğli', 'Gaziemir', 'Buca', 'Balçova', 'Narlıdere'],
    'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya', 'İznik', 'Karacabey'],
    'Antalya': ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Alanya', 'Manavgat', 'Serik', 'Aksu', 'Döşemealtı']
  };
  const cityDistricts = districts[city] || ['Merkez'];
  return cityDistricts[Math.floor(Math.random() * cityDistricts.length)];
};

const getRandomNeighborhood = () => {
  const neighborhoods = ['Merkez Mahallesi', 'Yeni Mahalle', 'Cumhuriyet Mahallesi', 'Atatürk Mahallesi', 'Fatih Mahallesi', 'Gazi Mahallesi', 'İstiklal Mahallesi', 'Özgürlük Mahallesi'];
  return neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
};

const getRandomName = () => {
  const names = ['Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hasan', 'Hüseyin', 'İbrahim', 'İsmail', 'Osman', 'Ömer', 'Yusuf', 'Murat', 'Emre', 'Burak', 'Can', 'Deniz', 'Eren', 'Furkan', 'Gökhan', 'Hakan'];
  return names[Math.floor(Math.random() * names.length)];
};

const getRandomSurname = () => {
  const surnames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek'];
  return surnames[Math.floor(Math.random() * surnames.length)];
};

const getRandomPhone = () => {
  const prefixes = ['0505', '0506', '0507', '0530', '0531', '0532', '0533', '0534', '0535', '0536', '0537', '0538', '0539', '0541', '0542', '0543', '0544', '0545', '0546', '0547'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}${number}`;
};

const getRandomServiceCategories = () => {
  const categories = [
    ['Genel Bakım', 'Motor Tamiri'],
    ['Fren Sistemi', 'Süspansiyon'],
    ['Elektrik', 'Klima'],
    ['Kaporta', 'Boyama'],
    ['Egzoz', 'Filtre Değişimi'],
    ['Lastik', 'Balans'],
    ['Akü', 'Alternatör']
  ];
  return categories[Math.floor(Math.random() * categories.length)];
};

const getRandomCarBrands = () => {
  const brands = [
    ['Toyota', 'Honda', 'Ford'],
    ['Volkswagen', 'BMW', 'Mercedes'],
    ['Renault', 'Peugeot', 'Fiat'],
    ['Hyundai', 'Kia', 'Nissan'],
    ['Audi', 'Skoda', 'Opel']
  ];
  return brands[Math.floor(Math.random() * brands.length)];
};

const createTestUser = async () => {
  try {
    await connectDB();
    
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);
    
    // Rastgele veriler
    const name = getRandomName();
    const surname = getRandomSurname();
    const city = getRandomCity();
    const district = getRandomDistrict(city);
    const neighborhood = getRandomNeighborhood();
    const phone = getRandomPhone();
    const serviceCategories = getRandomServiceCategories();
    const carBrands = getRandomCarBrands();
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('123', 10);
    
    // Konum bilgisi (İstanbul koordinatları örneği)
    const location = {
      city: city,
      district: district,
      neighborhood: neighborhood,
      street: `${Math.floor(Math.random() * 100) + 1}. Sokak`,
      building: `${Math.floor(Math.random() * 50) + 1}`,
      floor: Math.floor(Math.random() * 5) + 1,
      apartment: String.fromCharCode(65 + Math.floor(Math.random() * 4)), // A, B, C, D
      coordinates: {
        latitude: 41.0082 + (Math.random() - 0.5) * 0.1, // İstanbul civarı
        longitude: 28.9784 + (Math.random() - 0.5) * 0.1
      }
    };
    
    // CurrentLocation (geospatial index için)
    const currentLocation = {
      type: 'Point',
      coordinates: [location.coordinates.longitude, location.coordinates.latitude]
    };
    
    // Kullanıcı zaten var mı kontrol et
    const existingUser = await User.findOne({ email: 'testapple@gmail.com' });
    if (existingUser) {
      console.log('⚠️ Kullanıcı zaten mevcut, güncelleniyor...');
      
      // Mevcut kullanıcıyı driver olarak güncelle
      existingUser.userType = 'driver';
      existingUser.username = undefined; // Driver'ların username'i yok
      existingUser.serviceCategories = undefined; // Driver'ların serviceCategories'i yok
      existingUser.experience = undefined; // Driver'ların experience'i yok
      existingUser.rating = undefined; // Driver'ların rating'i yok
      existingUser.ratingCount = undefined; // Driver'ların ratingCount'u yok
      existingUser.totalServices = undefined; // Driver'ların totalServices'i yok
      existingUser.isAvailable = undefined; // Driver'ların isAvailable'i yok
      existingUser.currentLocation = currentLocation;
      existingUser.documents = undefined; // Driver'ların documents'i yok
      existingUser.shopName = undefined; // Driver'ların shopName'i yok
      existingUser.location = location;
      existingUser.workingHours = undefined; // Driver'ların workingHours'i yok
      existingUser.carBrands = undefined; // Driver'ların carBrands'i yok
      existingUser.engineTypes = undefined; // Driver'ların engineTypes'i yok
      existingUser.transmissionTypes = undefined; // Driver'ların transmissionTypes'i yok
      existingUser.customBrands = undefined; // Driver'ların customBrands'i yok
      existingUser.bio = `${Math.floor(Math.random() * 20) + 1} yıllık sürücü deneyimi. ${existingUser.city} bölgesinde aktif.`;
      
      await existingUser.save();
      
      console.log('✅ Mevcut kullanıcı DRIVER olarak güncellendi:');
      console.log(`   📧 Email: ${existingUser.email}`);
      console.log(`   🔑 Şifre: 123`);
      console.log(`   👤 İsim: ${existingUser.name} ${existingUser.surname}`);
      console.log(`   🚗 Kullanıcı Tipi: ${existingUser.userType}`);
      console.log(`   📱 Telefon: ${existingUser.phone}`);
      console.log(`   📍 Şehir: ${existingUser.city}`);
      console.log(`   📍 İlçe: ${existingUser.location.district}`);
      console.log(`   📍 Mahalle: ${existingUser.location.neighborhood}`);
      console.log(`   🏠 Adres: ${existingUser.location.street} No:${existingUser.location.building} Kat:${existingUser.location.floor} Daire:${existingUser.location.apartment}`);
      console.log(`   📍 Koordinatlar: ${existingUser.location.coordinates.latitude}, ${existingUser.location.coordinates.longitude}`);
      console.log(`   📝 Bio: ${existingUser.bio}`);
      console.log(`   📱 Push Token: ${existingUser.pushToken}`);
      console.log(`   🔔 Email Gizli: ${existingUser.emailHidden}`);
      console.log(`   📞 Telefon Gizli: ${existingUser.phoneHidden}`);
      
      await mongoose.disconnect();
      return;
    }
    
    // Test kullanıcısını oluştur (Driver olarak)
    const testUser = new User({
      name: name,
      surname: surname,
      email: 'testapple@gmail.com',
      password: hashedPassword,
      userType: 'driver', // Test için driver olarak ayarla
      phone: phone,
      city: city,
      
      // Driver özellikleri
      emailHidden: Math.random() > 0.5,
      phoneHidden: Math.random() > 0.5,
      pushToken: `test_push_token_${Date.now()}`,
      platform: 'ios',
      
      // Rastgele profil bilgileri
      bio: `${Math.floor(Math.random() * 20) + 1} yıllık sürücü deneyimi. ${city} bölgesinde aktif.`,
      profileImage: null,
      avatar: null,
      cover: null,
      
      // Bildirim ayarları
      notifications: [],
      
      // Tarih bilgileri
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Konum bilgileri
      location: location,
      currentLocation: currentLocation
    });
    
    await testUser.save();
    
    console.log('✅ Test kullanıcısı (DRIVER) başarıyla oluşturuldu:');
    console.log(`   📧 Email: ${testUser.email}`);
    console.log(`   🔑 Şifre: 123`);
    console.log(`   👤 İsim: ${testUser.name} ${testUser.surname}`);
    console.log(`   🚗 Kullanıcı Tipi: ${testUser.userType}`);
    console.log(`   📱 Telefon: ${testUser.phone}`);
    console.log(`   📍 Şehir: ${testUser.city}`);
    console.log(`   📍 İlçe: ${testUser.location.district}`);
    console.log(`   📍 Mahalle: ${testUser.location.neighborhood}`);
    console.log(`   🏠 Adres: ${testUser.location.street} No:${testUser.location.building} Kat:${testUser.location.floor} Daire:${testUser.location.apartment}`);
    console.log(`   📍 Koordinatlar: ${testUser.location.coordinates.latitude}, ${testUser.location.coordinates.longitude}`);
    console.log(`   📝 Bio: ${testUser.bio}`);
    console.log(`   📱 Push Token: ${testUser.pushToken}`);
    console.log(`   🔔 Email Gizli: ${testUser.emailHidden}`);
    console.log(`   📞 Telefon Gizli: ${testUser.phoneHidden}`);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createTestUser();
