const mongoose = require('mongoose');
const { User } = require('../dist/models/User');
const { Notification } = require('../dist/models/Notification');

// MongoDB bağlantısı
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function createDiverseNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlandı');

    // Usta kullanıcısını bul
    const mechanic = await User.findOne({ userType: 'mechanic' });
    
    if (!mechanic) {
      console.log('Usta kullanıcısı bulunamadı!');
      return;
    }

    console.log(`Çeşitli bildirimler oluşturulacak usta: ${mechanic.name} ${mechanic.surname}`);

    // Daha çeşitli bildirimler oluştur
    const diverseNotifications = [
      // Randevu bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_request',
        title: 'Yeni Randevu Talebi',
        message: 'Gökhan Öztürk sizden Ağır Bakım randevusu talep etti. Tarih: 20 Aralık 2024, Saat: 09:30',
        data: {
          appointmentId: 'apt_005',
          customerName: 'Gökhan Öztürk',
          serviceType: 'Ağır Bakım',
          appointmentDate: '2024-12-20',
          timeSlot: '09:30',
          vehicleInfo: '2018 Renault Megane'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 45 * 60 * 1000) // 45 dakika önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_cancelled',
        title: 'Randevu İptal Edildi',
        message: 'Elif Şahin randevusunu iptal etti. Tarih: 18 Aralık 2024, Saat: 11:00',
        data: {
          appointmentId: 'apt_006',
          customerName: 'Elif Şahin',
          serviceType: 'Klima Bakımı',
          appointmentDate: '2024-12-18',
          timeSlot: '11:00',
          cancellationReason: 'Müşteri talebi'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 saat önce
      },
      
      // Ödeme bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'payment_pending',
        title: 'Ödeme Bekleniyor',
        message: 'Deniz Yıldız\'dan 2.100 TL ödeme bekleniyor. İşlem: Motor Revizyonu',
        data: {
          amount: 2100,
          customerName: 'Deniz Yıldız',
          serviceType: 'Motor Revizyonu',
          dueDate: '2024-12-16',
          transactionId: 'TXN_003'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 saat önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Ödeme Uyarısı',
        message: 'Cem Korkmaz\'ın ödemesi gecikti. Tutar: 750 TL, İşlem: Fren Balata Değişimi',
        data: {
          amount: 750,
          customerName: 'Cem Korkmaz',
          serviceType: 'Fren Balata Değişimi',
          delayReason: 'Ödeme gecikmesi',
          transactionId: 'TXN_004'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 saat önce
      },
      
      // Değerlendirme bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'rating_received',
        title: 'Yeni Değerlendirme',
        message: 'Sibel Arslan size 5 yıldız verdi: "Mükemmel hizmet! Çok memnun kaldım."',
        data: {
          rating: 5,
          customerName: 'Sibel Arslan',
          comment: 'Mükemmel hizmet! Çok memnun kaldım.',
          serviceType: 'Genel Bakım'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 saat önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'rating_received',
        title: 'Yeni Değerlendirme',
        message: 'Oğuz Demir size 3 yıldız verdi: "İş tamamlandı ama fiyat biraz yüksekti."',
        data: {
          rating: 3,
          customerName: 'Oğuz Demir',
          comment: 'İş tamamlandı ama fiyat biraz yüksekti.',
          serviceType: 'Transmisyon Bakımı'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 saat önce
      },
      
      // Mesaj bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'new_message',
        title: 'Yeni Mesaj',
        message: 'Pınar Yılmaz: "Araçta motor sesi normal mi? Endişeliyim."',
        data: {
          conversationId: 'conv_002',
          senderName: 'Pınar Yılmaz',
          messagePreview: 'Araçta motor sesi normal mi? Endişeliyim.',
          unreadCount: 2
        },
        isRead: false,
        createdAt: new Date(Date.now() - 20 * 60 * 1000) // 20 dakika önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'new_message',
        title: 'Yeni Mesaj',
        message: 'Murat Özkan: "Teşekkürler, araç çok iyi çalışıyor artık!"',
        data: {
          conversationId: 'conv_003',
          senderName: 'Murat Özkan',
          messagePreview: 'Teşekkürler, araç çok iyi çalışıyor artık!',
          unreadCount: 1
        },
        isRead: true,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 saat önce
      },
      
      // Sistem bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Yeni Özellik',
        message: 'Rektefe\'ye yeni özellik eklendi: Müşteri geçmişi ve araç takibi. Hemen keşfedin!',
        data: {
          featureName: 'Müşteri Geçmişi ve Araç Takibi',
          version: '2.2.0',
          updateType: 'feature'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 saat önce
      },
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Bakım Hatırlatması',
        message: 'Araçlarınızın periyodik bakım zamanı yaklaşıyor. Randevu almayı unutmayın!',
        data: {
          reminderType: 'maintenance',
          nextMaintenanceDate: '2024-12-25'
        },
        isRead: true,
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000) // 18 saat önce
      },
      
      // Acil durum bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'appointment_request',
        title: 'Acil Randevu Talebi',
        message: 'Yakınınızda acil araç arızası bildirildi. Müdahale edebilir misiniz?',
        data: {
          location: 'Beşiktaş, İstanbul',
          distance: '2.5 km',
          urgency: 'high',
          customerName: 'Acil Müşteri'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 dakika önce
      },
      
      // Promosyon bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'promotion',
        title: 'Özel Kampanya',
        message: 'Bu hafta sonu %20 indirimli yedek parça fırsatı! Sınırlı süre için geçerli.',
        data: {
          discount: 20,
          validUntil: '2024-12-15',
          category: 'yedek_parca'
        },
        isRead: false,
        createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000) // 7 saat önce
      },
      
      // Eğitim bildirimleri
      {
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        type: 'system',
        title: 'Yeni Eğitim Modülü',
        message: 'Elektrikli araçlar hakkında yeni eğitim modülü yayınlandı. Hemen başlayın!',
        data: {
          courseName: 'Elektrikli Araçlar Eğitimi',
          duration: '2 saat',
          certificate: true
        },
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 gün önce
      }
    ];

    // Bildirimleri oluştur
    const createdNotifications = await Notification.insertMany(diverseNotifications);
    
    console.log(`\n${createdNotifications.length} çeşitli bildirim oluşturuldu:\n`);
    
    createdNotifications.forEach((notification, index) => {
      const timeAgo = getTimeAgo(notification.createdAt);
      const status = notification.isRead ? 'Okundu' : 'Okunmadı';
      console.log(`${index + 1}. ${notification.title} - ${notification.type} - ${status} (${timeAgo})`);
    });

    console.log('\nÇeşitli bildirimler başarıyla oluşturuldu!');
    
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

createDiverseNotifications();
