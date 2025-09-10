const mongoose = require('mongoose');
const { Notification } = require('../dist/models/Notification');
const { User } = require('../dist/models/User');

// MongoDB bağlantısı
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe');
    console.log('MongoDB bağlandı');
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    process.exit(1);
  }
};

// Test bildirimleri oluştur
const createTestNotifications = async () => {
  try {
    // Şoför kullanıcılarını bul
    const drivers = await User.find({ role: 'driver' }).limit(1);
    
    if (drivers.length === 0) {
      console.log('Hiç şoför kullanıcısı bulunamadı. Önce bir şoför kullanıcısı oluşturun.');
      return;
    }

    const driverId = drivers[0]._id;
    console.log(`Test bildirimleri oluşturulacak şoför: ${drivers[0].email}`);

    // Önce mevcut test bildirimlerini temizle
    await Notification.deleteMany({ 
      recipientId: driverId,
      title: { $regex: /Test|test/ }
    });
    console.log('Eski test bildirimleri temizlendi');

    // Test bildirimleri oluştur
    const testNotifications = [
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 1',
        message: 'Bu bir test bildirimidir. Randevu talebiniz onaylandı.',
        type: 'appointment_confirmed',
        isRead: false,
        data: { test: true }
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 2',
        message: 'Yeni bir hizmet talebi oluşturuldu. Detayları görüntülemek için tıklayın.',
        type: 'appointment_request',
        isRead: false,
        data: { test: true }
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 3',
        message: 'Sistem bakımı nedeniyle 2 saat boyunca hizmet veremeyeceğiz.',
        type: 'system',
        isRead: true,
        data: { test: true }
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 4',
        message: 'Randevunuz için hatırlatma: Yarın saat 14:00\'da servis randevunuz var.',
        type: 'reminder',
        isRead: false,
        data: { test: true }
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 5',
        message: 'Ödeme işleminiz başarıyla tamamlandı. Teşekkür ederiz.',
        type: 'system',
        isRead: false,
        data: { test: true }
      }
    ];

    // Bildirimleri oluştur
    const createdNotifications = await Notification.insertMany(testNotifications);
    console.log(`${createdNotifications.length} test bildirimi oluşturuldu`);

    // Oluşturulan bildirimleri listele
    console.log('\nOluşturulan test bildirimleri:');
    createdNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title} - ${notification.isRead ? 'Okundu' : 'Okunmadı'}`);
    });

  } catch (error) {
    console.error('Test bildirimleri oluşturulurken hata:', error);
  }
};

// Ana fonksiyon
const main = async () => {
  await connectDB();
  await createTestNotifications();
  await mongoose.connection.close();
  console.log('\nTest bildirimleri başarıyla oluşturuldu!');
};

main().catch(console.error);
