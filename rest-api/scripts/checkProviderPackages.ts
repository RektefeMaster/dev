import mongoose from 'mongoose';
import { WashProvider } from '../src/models/WashProvider';
import { WashPackage } from '../src/models/WashPackage';
import { User } from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function checkProviderPackages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    
    const mechanic = await User.findOne({ email: 'testus@gmail.com' });
    if (!mechanic) {
      console.log('❌ testus@gmail.com bulunamadı');
      process.exit(1);
    }

    const provider = await WashProvider.findOne({ userId: mechanic._id });
    
    if (!provider) {
      console.log('❌ Provider profili bulunamadı!');
    } else {
      console.log('✅ Provider bulundu:', provider.businessName);
      console.log('🆔 Provider ID:', provider._id);
      console.log('👤 User ID:', provider.userId);
      
      // Bu provider'ın paketlerini kontrol et
      const packages = await WashPackage.find({ 
        providerId: provider.userId,
        isActive: true 
      });
      
      console.log(`\n📦 Paket sayısı: ${packages.length}`);
      
      if (packages.length === 0) {
        console.log('❌ Hiç paket yok! Paketler oluşturulmalı.');
      } else {
        packages.forEach((pkg, index) => {
          console.log(`${index + 1}. ${pkg.name} - ${pkg.basePrice} TL`);
        });
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

checkProviderPackages();
