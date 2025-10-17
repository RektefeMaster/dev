import mongoose from 'mongoose';
import { User } from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function checkTestUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';
    console.log('🔌 Bağlanılıyor:', mongoUri.includes('@') ? 'Remote DB' : 'Local DB');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Bağlantı başarılı\n');

    // Tüm kullanıcıları say
    const totalUsers = await User.countDocuments();
    console.log(`📊 Toplam kullanıcı sayısı: ${totalUsers}\n`);

    // Test kullanıcılarını ara
    const testDv = await User.findOne({ email: 'testdv@gmail.com' });
    const testUs = await User.findOne({ email: 'testus@gmail.com' });

    console.log('🔍 Test Kullanıcıları:');
    console.log('   testdv@gmail.com:', testDv ? `✅ (ID: ${testDv._id}, Role: ${(testDv as any).role})` : '❌ Bulunamadı');
    console.log('   testus@gmail.com:', testUs ? `✅ (ID: ${testUs._id}, Role: ${(testUs as any).role})` : '❌ Bulunamadı');

    if (!testDv || !testUs) {
      console.log('\n⚠️  Eksik kullanıcılar için:');
      console.log('   npm run create:test-users\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

checkTestUsers();

