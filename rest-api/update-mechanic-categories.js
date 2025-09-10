const mongoose = require('mongoose');
const User = require('./dist/models/User');

async function updateMechanicCategory() {
  try {
    await mongoose.connect('mongodb://localhost:27017/rektefe');
    console.log('MongoDB bağlantısı başarılı');
    
    // testust@gmail.com kullanıcısını bul ve güncelle
    const user = await User.findOne({ email: 'testust@gmail.com' });
    if (user) {
      user.serviceCategories = ['repair'];
      await user.save();
      console.log('✅ Usta kullanıcısı güncellendi:', {
        email: user.email,
        serviceCategories: user.serviceCategories
      });
    } else {
      console.log('❌ Usta kullanıcısı bulunamadı');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

updateMechanicCategory();
