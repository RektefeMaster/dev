import mongoose from 'mongoose';
import { WashPackage } from '../src/models/WashPackage';
import { WashProvider } from '../src/models/WashProvider';
import { User } from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function fixProviderPackages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const mechanic = await User.findOne({ email: 'testus@gmail.com' });
    if (!mechanic) {
      console.log('❌ testus@gmail.com bulunamadı');
      process.exit(1);
    }

    const provider = await WashProvider.findOne({ userId: mechanic._id });
    if (!provider) {
      console.log('❌ Provider bulunamadı');
      process.exit(1);
    }

    console.log('🔧 Provider ID:', provider._id);
    console.log('👤 User ID:', provider.userId);
    
    // Paketlerin providerId'sini düzelt
    const result = await WashPackage.updateMany(
      { providerId: provider.userId }, // Eski providerId (userId)
      { providerId: provider._id }      // Yeni providerId (provider._id)
    );
    
    console.log(`✅ ${result.modifiedCount} paket güncellendi`);
    
    // Kontrol et
    const packages = await WashPackage.find({ providerId: provider._id });
    console.log(`📦 Güncel paket sayısı: ${packages.length}`);
    
    packages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.name} - ${pkg.basePrice} TL (ProviderId: ${pkg.providerId})`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

fixProviderPackages();
