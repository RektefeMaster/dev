const mongoose = require('mongoose');
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

const createMechanic = async () => {
  try {
    await connectDB();
    
    const userSchema = new mongoose.Schema({}, { strict: false });
    const mechanicSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);
    const Mechanic = mongoose.model('Mechanic', mechanicSchema);
    
    // Necmi kullanıcısını bul
    const user = await User.findOne({ email: 'necmi@gmail.com' });
    if (!user) {
      console.log('❌ Kullanıcı bulunamadı');
      return;
    }
    
    console.log('👤 Kullanıcı bulundu:', user.email);
    
    // Mechanic profili oluştur
    const mechanicData = {
      userId: user._id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      phone: user.phone || '05551234567',
      city: 'İstanbul',
      serviceCategories: ['tamir', 'bakim'],
      supportedBrands: ['Toyota', 'Honda', 'Ford'],
      experience: 5,
      rating: 0,
      ratingCount: 0,
      totalServices: 0,
      isAvailable: true,
      shopName: 'Necmi Usta Servisi',
      workingHours: '09:00-18:00',
      carBrands: ['Toyota', 'Honda', 'Ford'],
      engineTypes: ['Benzin', 'Dizel'],
      transmissionTypes: ['Manuel', 'Otomatik'],
      customBrands: [],
      username: 'necmi_usta',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const mechanic = new Mechanic(mechanicData);
    await mechanic.save();
    
    console.log('✅ Mechanic profili oluşturuldu:', mechanic._id);
    console.log('📧 Email:', mechanic.email);
    console.log('👤 İsim:', mechanic.name, mechanic.surname);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createMechanic();
