const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Notification } = require('../dist/models/Notification');

// MongoDB bağlantısı
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function createRealisticMechanicNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlandı');

    // Usta kullanıcısını bul
    const mechanic = await User.findOne({ userType: 'mechanic' });
    
    if (!mechanic) {
      console.log('Usta kullanıcısı bulunamadı, oluşturuluyor...');
      const newMechanic = new User({
        name: 'Ahmet',
        surname: 'Yılmaz',
        email: 'ahmet.yilmaz@rektefe.com',
        phone: '05551234567',
        password: '123456',
        userType: 'mechanic',
        pushToken: 'ExponentPushToken[test-mechanic-token]',
        notificationSettings: {
          pushNotifications: true,
          appointmentNotifications: true,
          paymentNotifications: true,
          messageNotifications: true,
          systemNotifications: true,
          marketingNotifications: false,
          soundEnabled: true,
          vibrationEnabled: true
        }
      });
      await newMechanic.save();
      console.log('Test usta oluşturuldu');
    }

    const testMechanic = await User.findOne({ userType: 'mechanic' });
    console.log(`Test bildirimleri oluşturulacak usta: ${testMechanic.name} ${testMechanic.surname}`);

    // Eski test bildirimlerini temizle
    await Notification.deleteMany({ 
      recipientId: testMechanic._id,
      title: { $regex: /Test|Yeni|Ödeme|Değerlendirme|Mesaj|İş|Randevu|Hatırlatma|Sistem/ }
    });
    console.log('Eski test bildirimleri temizlendi');

    // Gerçekçi bildirimler oluştur
    const notifications = [
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_request',
        title: 'Yeni Randevu Talebi',
        message: 'Mehmet Demir sizden Genel Bakım randevusu talep etti. Tarih: 15 Aralık 2024, Saat: 14:00',
        data: {
          appointmentId: 'apt_001',
          customerName: 'Mehmet Demir',
          serviceType: 'Genel Bakım',
          appointmentDate: '2024-12-15',
          timeSlot: '14:00',
          vehicleInfo: '2020 Ford Focus'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 saat önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'payment_received',
        title: 'Ödeme Alındı',
        message: 'Ali Kaya\'dan 1.250 TL ödeme alındı. İşlem: Fren Balata Değişimi',
        data: {
          amount: 1250,
          customerName: 'Ali Kaya',
          serviceType: 'Fren Balata Değişimi',
          paymentMethod: 'Kredi Kartı',
          transactionId: 'TXN_001'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 saat önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'rating_received',
        title: 'Yeni Değerlendirme',
        message: 'Fatma Özkan size 5 yıldız verdi: "Çok profesyonel ve hızlı hizmet. Teşekkürler!"',
        data: {
          rating: 5,
          customerName: 'Fatma Özkan',
          comment: 'Çok profesyonel ve hızlı hizmet. Teşekkürler!',
          serviceType: 'Motor Yağı Değişimi'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 saat önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'new_message',
        title: 'Yeni Mesaj',
        message: 'Can Yıldız: "Araçta garip bir ses var, ne zaman bakabilirsiniz?"',
        data: {
          conversationId: 'conv_001',
          senderName: 'Can Yıldız',
          messagePreview: 'Araçta garip bir ses var, ne zaman bakabilirsiniz?',
          unreadCount: 1
        },
        isRead: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 saat önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_confirmed',
        title: 'Randevu Onaylandı',
        message: 'Yarın saat 10:00\'da Ayşe Korkmaz ile randevunuz onaylandı. Servis: Klima Bakımı',
        data: {
          appointmentId: 'apt_002',
          customerName: 'Ayşe Korkmaz',
          serviceType: 'Klima Bakımı',
          appointmentDate: '2024-12-14',
          timeSlot: '10:00'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 dakika önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'reminder',
        title: 'Randevu Hatırlatması',
        message: 'Bugün saat 16:00\'da Zeynep Arslan ile randevunuz var. Servis: Lastik Değişimi',
        data: {
          appointmentId: 'apt_003',
          customerName: 'Zeynep Arslan',
          serviceType: 'Lastik Değişimi',
          appointmentDate: '2024-12-13',
          timeSlot: '16:00'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 dakika önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Sistem Güncellemesi',
        message: 'Rektefe uygulaması güncellendi. Yeni özellikler: Gelişmiş raporlama ve müşteri takibi.',
        data: {
          version: '2.1.0',
          updateType: 'feature',
          features: ['Gelişmiş raporlama', 'Müşteri takibi']
        },
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 gün önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_request',
        title: 'Acil Randevu Talebi',
        message: 'Emre Çelik acil fren arızası bildirdi. Mümkün olan en kısa sürede müdahale edebilir misiniz?',
        data: {
          appointmentId: 'apt_004',
          customerName: 'Emre Çelik',
          serviceType: 'Fren Arızası',
          priority: 'urgent',
          location: 'Kadıköy, İstanbul'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 dakika önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'payment_received',
        title: 'Ödeme Alındı',
        message: 'Selin Yılmaz\'dan 850 TL ödeme alındı. İşlem: Motor Yağı ve Filtre Değişimi',
        data: {
          amount: 850,
          customerName: 'Selin Yılmaz',
          serviceType: 'Motor Yağı ve Filtre Değişimi',
          paymentMethod: 'Nakit',
          transactionId: 'TXN_002'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 saat önce
      },
      {
        recipientId: testMechanic._id,
        recipientType: 'mechanic',
        type: 'rating_received',
        title: 'Yeni Değerlendirme',
        message: 'Burak Kaya size 4 yıldız verdi: "İyi iş çıkardı ama biraz geç bitti."',
        data: {
          rating: 4,
          customerName: 'Burak Kaya',
          comment: 'İyi iş çıkardı ama biraz geç bitti.',
          serviceType: 'Transmisyon Bakımı'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) // 8 saat önce
      }
    ];

    // Bildirimleri oluştur
    const createdNotifications = await Notification.insertMany(notifications);
    
    console.log(`\n${createdNotifications.length} gerçekçi usta bildirimi oluşturuldu:\n`);
    
    createdNotifications.forEach((notification, index) => {
      const timeAgo = getTimeAgo(notification.createdAt);
      console.log(`${index + 1}. ${notification.title} - ${notification.type} - ${notification.isRead ? 'Okundu' : 'Okunmadı'} (${timeAgo})`);
    });

    console.log('\nGerçekçi usta bildirimleri başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} dakika önce`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} saat önce`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} gün önce`;
  }
}

createRealisticMechanicNotifications();
