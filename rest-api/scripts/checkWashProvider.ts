import mongoose from 'mongoose';
import { WashProvider } from '../src/models/WashProvider';
import { User } from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config();

async function checkWashProvider() {
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
      console.log('✅ Provider bulundu:\n');
      console.log('ID:', provider._id);
      console.log('Business Name:', provider.businessName);
      console.log('Type:', provider.type);
      console.log('City:', provider.location.city);
      console.log('District:', provider.location.district);
      console.log('Coordinates:', provider.location.coordinates);
      console.log('isActive:', provider.isActive);
      console.log('isVerified:', provider.isVerified);
      console.log('isPremium:', provider.isPremium);
      console.log('\nShop:', provider.shop);
      console.log('\nMobile:', provider.mobile);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

checkWashProvider();

