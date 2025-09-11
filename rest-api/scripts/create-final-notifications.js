const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Notification } = require('../dist/models/Notification');

// MongoDB bağlantısı
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function createFinalNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlandı');

    // Usta kullanıcısını bul
    const mechanic = await User.findOne({ userType: 'mechanic' });
    
    if (!mechanic) {
      console.log('Usta kullanıcısı bulunamadı!');
      return;
    }

    console.log(`Son bildirimler oluşturulacak usta: ${mechanic.name} ${mechanic.surname}`);

    // Son bildirimler - daha gerçekçi senaryolar
    const finalNotifications = [
      // Bugünkü bildirimler
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_request',
        title: 'Yeni Randevu Talebi',
        message: 'Serkan Yıldız sizden Motor Yağı Değişimi randevusu talep etti. Tarih: Bugün, Saat: 15:30',
        data: {
          appointmentId: 'apt_007',
          customerName: 'Serkan Yıldız',
          serviceType: 'Motor Yağı Değişimi',
          appointmentDate: '2024-12-13',
          timeSlot: '15:30',
          vehicleInfo: '2019 Toyota Corolla'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 dakika önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'payment_received',
        title: 'Ödeme Alındı',
        message: 'Ece Özkan\'dan 1.800 TL ödeme alındı. İşlem: Fren Sistemi Revizyonu',
        data: {
          amount: 1800,
          customerName: 'Ece Özkan',
          serviceType: 'Fren Sistemi Revizyonu',
          paymentMethod: 'Banka Kartı',
          transactionId: 'TXN_005'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 dakika önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'new_message',
        title: 'Yeni Mesaj',
        message: 'Berkay Kaya: "Araçta hala ses var, tekrar bakabilir misiniz?"',
        data: {
          conversationId: 'conv_004',
          senderName: 'Berkay Kaya',
          messagePreview: 'Araçta hala ses var, tekrar bakabilir misiniz?',
          unreadCount: 1
        },
        isRead: false,
        createdAt: new Date(Date.now() - 8 * 60 * 1000) // 8 dakika önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'rating_received',
        title: 'Yeni Değerlendirme',
        message: 'Gizem Arslan size 5 yıldız verdi: "Harika hizmet! Kesinlikle tavsiye ederim."',
        data: {
          rating: 5,
          customerName: 'Gizem Arslan',
          comment: 'Harika hizmet! Kesinlikle tavsiye ederim.',
          serviceType: 'Genel Bakım'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 25 * 60 * 1000) // 25 dakika önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'reminder',
        title: 'Randevu Hatırlatması',
        message: 'Yarın saat 11:00\'da Mert Özkan ile randevunuz var. Servis: Klima Gazı Dolumu',
        data: {
          appointmentId: 'apt_008',
          customerName: 'Mert Özkan',
          serviceType: 'Klima Gazı Dolumu',
          appointmentDate: '2024-12-14',
          timeSlot: '11:00'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 35 * 60 * 1000) // 35 dakika önce
      },
      
      // Dünkü bildirimler
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_confirmed',
        title: 'Randevu Onaylandı',
        message: 'Dün saat 14:00\'da Özlem Yılmaz ile randevunuz onaylandı. Servis: Lastik Değişimi',
        data: {
          appointmentId: 'apt_009',
          customerName: 'Özlem Yılmaz',
          serviceType: 'Lastik Değişimi',
          appointmentDate: '2024-12-12',
          timeSlot: '14:00'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 gün önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'payment_received',
        title: 'Ödeme Alındı',
        message: 'Dün Emre Demir\'den 950 TL ödeme alındı. İşlem: Alternatör Değişimi',
        data: {
          amount: 950,
          customerName: 'Emre Demir',
          serviceType: 'Alternatör Değişimi',
          paymentMethod: 'Nakit',
          transactionId: 'TXN_006'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000) // 26 saat önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'rating_received',
        title: 'Yeni Değerlendirme',
        message: 'Dün Selin Korkmaz size 4 yıldız verdi: "İyi iş çıkardı, teşekkürler."',
        data: {
          rating: 4,
          customerName: 'Selin Korkmaz',
          comment: 'İyi iş çıkardı, teşekkürler.',
          serviceType: 'Fren Balata Değişimi'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000) // 28 saat önce
      },
      
      // Geçen hafta bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Haftalık Rapor',
        message: 'Bu hafta 12 randevu tamamladınız ve 8.500 TL kazandınız. Harika iş!',
        data: {
          reportType: 'weekly',
          completedAppointments: 12,
          totalEarnings: 8500,
          period: '2024-12-06 - 2024-12-12'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 gün önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'promotion',
        title: 'Özel Fırsat',
        message: 'Bu ay sonuna kadar %15 indirimli yedek parça fırsatı! Kaçırmayın.',
        data: {
          discount: 15,
          validUntil: '2024-12-31',
          category: 'yedek_parca',
          code: 'YEDEK15'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 gün önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'wallet',
        title: 'Cüzdan Güncellemesi',
        message: 'Cüzdanınıza 2.300 TL eklendi. Toplam bakiye: 15.750 TL',
        data: {
          addedAmount: 2300,
          totalBalance: 15750,
          transactionType: 'credit',
          source: 'appointment_completion'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 gün önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Sistem Bakımı',
        message: 'Rektefe sistemi 2 saat bakımda olacak. Bu süre zarfında randevu alamayacaksınız.',
        data: {
          maintenanceType: 'scheduled',
          duration: '2 saat',
          startTime: '2024-12-10 02:00',
          endTime: '2024-12-10 04:00'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 gün önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'general',
        title: 'Yeni Müşteri',
        message: 'Bölgenizde yeni kayıtlı müşteri: Aslı Yıldız. Yakınlarda araç arızası yaşarsa size yönlendirilecek.',
        data: {
          customerName: 'Aslı Yıldız',
          location: 'Kadıköy, İstanbul',
          registrationDate: '2024-12-07',
          potentialServices: ['Genel Bakım', 'Fren Sistemi', 'Motor Yağı']
        },
        isRead: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 gün önce
      }
    ];

    // Bildirimleri oluştur
    const createdNotifications = await Notification.insertMany(finalNotifications);
    
    console.log(`\n${createdNotifications.length} son bildirim oluşturuldu:\n`);
    
    createdNotifications.forEach((notification, index) => {
      const timeAgo = getTimeAgo(notification.createdAt);
      const status = notification.isRead ? 'Okundu' : 'Okunmadı';
      console.log(`${index + 1}. ${notification.title} - ${notification.type} - ${status} (${timeAgo})`);
    });

    console.log('\nSon bildirimler başarıyla oluşturuldu!');
    console.log('\nToplam bildirim sayısı artık çok daha gerçekçi!');
    
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

createFinalNotifications();
