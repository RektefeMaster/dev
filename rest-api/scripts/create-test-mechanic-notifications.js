const mongoose = require('mongoose');
const Notification = require('../dist/models/Notification').default;

// MongoDB bağlantısı
const MONGODB_URI = 'mongodb://localhost:27017/rektefe';

async function createTestMechanicNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı');

    // Test usta ID'si (mevcut bir usta ID'si kullanın)
    const testMechanicId = '507f1f77bcf86cd799439011'; // Bu ID'yi gerçek bir usta ID'si ile değiştirin

    const testNotifications = [
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'appointment_request',
        title: 'Yeni Randevu Talebi',
        message: 'Ahmet Yılmaz sizden randevu talep etti. Genel Bakım hizmeti için yarın saat 14:00\'da randevu istiyor.',
        read: false,
        isRead: false,
        data: {
          appointmentId: '507f1f77bcf86cd799439012',
          customerName: 'Ahmet Yılmaz',
          serviceType: 'Genel Bakım',
          requestedDate: '2024-01-15',
          requestedTime: '14:00'
        },
        createdAt: new Date()
      },
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'payment_received',
        title: 'Ödeme Alındı',
        message: 'Mehmet Demir\'den 450 TL ödeme alındı. Lastik değişimi hizmeti için ödeme tamamlandı.',
        read: false,
        isRead: false,
        data: {
          appointmentId: '507f1f77bcf86cd799439013',
          customerName: 'Mehmet Demir',
          amount: 450,
          serviceType: 'Lastik Değişimi',
          paymentMethod: 'Kredi Kartı'
        },
        createdAt: new Date(Date.now() - 3600000) // 1 saat önce
      },
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'rating_received',
        title: 'Yeni Değerlendirme',
        message: 'Ali Kaya sizi 5 yıldız ile değerlendirdi. "Çok hızlı ve kaliteli hizmet" yorumu bıraktı.',
        read: true,
        isRead: true,
        data: {
          appointmentId: '507f1f77bcf86cd799439014',
          customerName: 'Ali Kaya',
          rating: 5,
          comment: 'Çok hızlı ve kaliteli hizmet',
          serviceType: 'Motor Bakımı'
        },
        createdAt: new Date(Date.now() - 7200000) // 2 saat önce
      },
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'new_message',
        title: 'Yeni Mesaj',
        message: 'Fatma Özkan size mesaj gönderdi: "Randevu saatini değiştirebilir miyiz?"',
        read: false,
        isRead: false,
        data: {
          conversationId: '507f1f77bcf86cd799439015',
          customerName: 'Fatma Özkan',
          messagePreview: 'Randevu saatini değiştirebilir miyiz?'
        },
        createdAt: new Date(Date.now() - 1800000) // 30 dakika önce
      },
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'job_assigned',
        title: 'Yeni İş Atandı',
        message: 'Sistem tarafından size yeni bir arıza bildirimi atandı. Acil müdahale gerekiyor.',
        read: false,
        isRead: false,
        data: {
          faultReportId: '507f1f77bcf86cd799439016',
          customerName: 'Veli Şahin',
          vehicleInfo: 'Toyota Corolla 2018',
          faultType: 'Motor Arızası',
          priority: 'high',
          location: 'Kadıköy, İstanbul'
        },
        createdAt: new Date(Date.now() - 900000) // 15 dakika önce
      },
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'appointment_confirmed',
        title: 'Randevu Onaylandı',
        message: 'Yarın saat 10:00\'daki randevunuz onaylandı. Müşteri: Zeynep Ak',
        read: true,
        isRead: true,
        data: {
          appointmentId: '507f1f77bcf86cd799439017',
          customerName: 'Zeynep Ak',
          serviceType: 'Fren Balata Değişimi',
          appointmentDate: '2024-01-16',
          appointmentTime: '10:00'
        },
        createdAt: new Date(Date.now() - 14400000) // 4 saat önce
      },
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'reminder',
        title: 'Hatırlatma',
        message: 'Yarın saat 09:00\'da başlayacak randevunuz için hazırlık yapmayı unutmayın.',
        read: false,
        isRead: false,
        data: {
          appointmentId: '507f1f77bcf86cd799439018',
          customerName: 'Can Yılmaz',
          serviceType: 'Ağır Bakım',
          appointmentDate: '2024-01-16',
          appointmentTime: '09:00'
        },
        createdAt: new Date(Date.now() - 600000) // 10 dakika önce
      },
      {
        recipientId: testMechanicId,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Sistem Güncellemesi',
        message: 'Uygulama yeni özelliklerle güncellendi. Yeni özellikleri keşfetmek için profilinizi kontrol edin.',
        read: true,
        isRead: true,
        data: {
          version: '2.1.0',
          newFeatures: ['Gelişmiş raporlama', 'Yeni bildirim türleri', 'İyileştirilmiş arayüz']
        },
        createdAt: new Date(Date.now() - 86400000) // 1 gün önce
      }
    ];

    // Bildirimleri veritabanına ekle
    const createdNotifications = await Notification.insertMany(testNotifications);
    console.log(`${createdNotifications.length} test usta bildirimi oluşturuldu`);

    // Oluşturulan bildirimleri listele
    console.log('\nOluşturulan bildirimler:');
    createdNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title} - ${notification.type} - ${notification.read ? 'Okundu' : 'Okunmamış'}`);
    });

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

createTestMechanicNotifications();
