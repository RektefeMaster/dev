const mongoose = require('mongoose');

// MongoDB bağlantı string'i
const uri = 'mongodb+srv://rektefekadnur09:rektefekadnur09@cluster0.agf6m9t.mongodb.net/rektefe?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔍 MongoDB Bağlantı Testi Başlıyor...');
console.log('URI:', uri);
console.log('');

// Bağlantı ayarları
const options = {
  serverSelectionTimeoutMS: 10000, // 10 saniye timeout
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,
  maxPoolSize: 10,
  bufferCommands: false
};

async function testMongoDB() {
  try {
    console.log('📡 MongoDB\'ye bağlanıyor...');
    
    // Bağlantıyı test et
    await mongoose.connect(uri, options);
    console.log('✅ MongoDB bağlantısı başarılı!');
    
    // Database bilgilerini al
    const db = mongoose.connection.db;
    console.log('📊 Database:', db.databaseName);
    
    // Collections listesini al
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    // Users collection'ını kontrol et
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log('👥 Users count:', userCount);
    
    // İlk kullanıcıyı al
    const firstUser = await usersCollection.findOne();
    if (firstUser) {
      console.log('👤 İlk kullanıcı:', {
        email: firstUser.email,
        name: firstUser.name,
        userType: firstUser.userType
      });
    }
    
    // Test query yap
    console.log('🔍 Test query yapılıyor...');
    const testUser = await usersCollection.findOne({ email: 'test1@gmail.com' });
    if (testUser) {
      console.log('✅ Test query başarılı! Kullanıcı bulundu:', testUser.email);
    } else {
      console.log('⚠️ Test kullanıcısı bulunamadı');
    }
    
    console.log('');
    console.log('🎉 Tüm testler başarılı! MongoDB bağlantısı çalışıyor.');
    
  } catch (error) {
    console.log('❌ MongoDB bağlantı hatası:');
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Error name:', error.name);
    
    if (error.message.includes('IP')) {
      console.log('🔧 Çözüm: MongoDB Atlas\'ta IP whitelist\'i kontrol edin');
    }
    if (error.message.includes('authentication')) {
      console.log('🔧 Çözüm: Kullanıcı adı/şifre kontrol edin');
    }
    if (error.message.includes('timeout')) {
      console.log('🔧 Çözüm: Network bağlantısını kontrol edin');
    }
  } finally {
    // Bağlantıyı kapat
    await mongoose.disconnect();
    console.log('🔌 Bağlantı kapatıldı');
    process.exit(0);
  }
}

// Test'i çalıştır
testMongoDB();
