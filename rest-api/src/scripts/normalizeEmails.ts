import mongoose from 'mongoose';
import { User } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function normalizeEmails() {
  try {
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe');
    console.log('MongoDB bağlantısı başarılı');

    // Tüm kullanıcıları getir
    const users = await User.find({});
    console.log(`Toplam ${users.length} kullanıcı bulundu`);

    // Her kullanıcı için e-posta adresini normalize et
    for (const user of users) {
      const normalizedEmail = user.email.toLowerCase();
      
      // Eğer e-posta adresi zaten küçük harfli değilse güncelle
      if (user.email !== normalizedEmail) {
        console.log(`E-posta adresi güncelleniyor: ${user.email} -> ${normalizedEmail}`);
        
        // Aynı e-posta adresine sahip başka bir kullanıcı var mı kontrol et
        const existingUser = await User.findOne({ 
          email: normalizedEmail,
          _id: { $ne: user._id } // Kendisi hariç
        });

        if (existingUser) {
          console.log(`UYARI: ${normalizedEmail} adresine sahip başka bir kullanıcı zaten var!`);
          console.log(`Kullanıcı ID: ${existingUser._id}`);
          console.log(`Mevcut kullanıcı ID: ${user._id}`);
          continue;
        }

        // E-posta adresini güncelle
        user.email = normalizedEmail;
        await user.save();
        console.log(`E-posta adresi güncellendi: ${user._id}`);
      }
    }

    console.log('E-posta normalizasyonu tamamlandı');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

normalizeEmails(); 