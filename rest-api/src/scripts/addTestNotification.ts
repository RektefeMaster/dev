import mongoose from 'mongoose';
import { User } from '../models/User';

const addTestNotification = async () => {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect('mongodb://127.0.0.1:27017/rektefe');
    console.log('MongoDB bağlandı');

    // Test kullanıcısını bul
    const user = await User.findById('68a1c08b4baccde02b4f5c43');
    if (!user) {
      console.log('Kullanıcı bulunamadı');
      return;
    }

    // Test bildirimi oluştur
    const testNotification = {
      _id: new mongoose.Types.ObjectId(),
      type: 'maintenance' as const,
      title: '🚗 Bakım Hatırlatıcısı',
      message: 'Aracınızın bakım zamanı yaklaşıyor! En kısa sürede servise götürmenizi öneririz.',
      read: false,
      createdAt: new Date()
    };

    // İkinci test bildirimi
    const testNotification2 = {
      _id: new mongoose.Types.ObjectId(),
      type: 'appointment_status_update' as const,
      title: '✅ Randevu Onayı',
      message: 'Yarın saat 14:00\'deki bakım randevunuz onaylandı! Servisimize hoş geldiniz.',
      read: false,
      createdAt: new Date(Date.now() - 3600000) // 1 saat önce
    };

    // Üçüncü test bildirimi
    const testNotification3 = {
      _id: new mongoose.Types.ObjectId(),
      type: 'campaign' as const,
      title: '🏷️ Yeni Kampanya',
      message: 'Bu hafta lastik değişiminde %20 indirim fırsatını kaçırmayın!',
      read: true,
      createdAt: new Date(Date.now() - 7200000) // 2 saat önce
    };

    // Bildirimleri ekle
    if (!user.notifications) {
      user.notifications = [];
    }
    
    user.notifications.unshift(testNotification);
    user.notifications.unshift(testNotification2);
    user.notifications.unshift(testNotification3);
    await user.save();

    console.log('Test bildirimleri eklendi!');
    console.log('Toplam bildirim sayısı:', user.notifications.length);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
};

addTestNotification();
