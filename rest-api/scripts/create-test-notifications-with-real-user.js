const mongoose = require('mongoose');

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
    // Notification collection'ına direkt erişim
    const db = mongoose.connection.db;
    const notificationsCollection = db.collection('notifications');
    
    // Gerçek şoför ID'si
    const driverId = new mongoose.Types.ObjectId('68c09e59359e5b3a9b0291e7');
    console.log(`Test bildirimleri oluşturulacak şoför ID: ${driverId}`);
    
    // Önce mevcut test bildirimlerini temizle
    await notificationsCollection.deleteMany({ 
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
        data: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 2',
        message: 'Yeni bir hizmet talebi oluşturuldu. Detayları görüntülemek için tıklayın.',
        type: 'appointment_request',
        isRead: false,
        data: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 3',
        message: 'Sistem bakımı nedeniyle 2 saat boyunca hizmet veremeyeceğiz.',
        type: 'system',
        isRead: true,
        data: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 4',
        message: 'Randevunuz için hatırlatma: Yarın saat 14:00\'da servis randevunuz var.',
        type: 'reminder',
        isRead: false,
        data: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        recipientId: driverId,
        recipientType: 'driver',
        title: 'Test Bildirimi 5',
        message: 'Ödeme işleminiz başarıyla tamamlandı. Teşekkür ederiz.',
        type: 'system',
        isRead: false,
        data: { test: true },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Bildirimleri oluştur
    const result = await notificationsCollection.insertMany(testNotifications);
    console.log(`${result.insertedCount} test bildirimi oluşturuldu`);

    // Oluşturulan bildirimleri listele
    console.log('\nOluşturulan test bildirimleri:');
    testNotifications.forEach((notification, index) => {
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
