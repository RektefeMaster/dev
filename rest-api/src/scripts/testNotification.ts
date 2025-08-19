import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Notification } from '../models/Notification';

// MongoDB bağlantısı
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch(err => console.error('❌ MongoDB bağlantısı hatası:', err));

const testNotification = async () => {
  try {
    console.log('🧪 Bildirim sistemi test ediliyor...');
    
    // Test için kullanılacak usta ID'si
    const testMechanicId = '68a36401cec7d1f96e4c17ea'; // Nurullah Aydın - testus@gmail.com
    const testAppointmentId = new mongoose.Types.ObjectId();
    const testDriverName = 'Test Müşteri';
    const testServiceType = 'Genel Bakım';
    const testDate = new Date();
    const testTimeSlot = '14:00';
    
    console.log('📤 Test bildirimi oluşturuluyor...');
    console.log('👨‍🔧 Usta ID:', testMechanicId);
    console.log('📅 Tarih:', testDate.toLocaleDateString('tr-TR'));
    console.log('⏰ Saat:', testTimeSlot);
    
    // Bildirimi doğrudan veritabanına kaydet
    const notification = new Notification({
      recipientId: new mongoose.Types.ObjectId(testMechanicId),
      recipientType: 'mechanic',
      title: '🧪 Test Bildirimi',
      message: `${testDriverName} adlı müşteri ${testServiceType} hizmeti için ${testDate.toLocaleDateString('tr-TR')} tarihinde ${testTimeSlot} saatinde randevu talebinde bulundu.`,
      type: 'appointment_request',
      data: {
        appointmentId: testAppointmentId,
        driverName: testDriverName,
        serviceType: testServiceType,
        appointmentDate: testDate,
        timeSlot: testTimeSlot,
        priority: 'high'
      }
    });
    
    await notification.save();
    
    console.log('✅ Test bildirimi başarıyla oluşturuldu!');
    console.log('📝 Bildirim ID:', notification._id);
    console.log('📋 Başlık:', notification.title);
    console.log('💬 Mesaj:', notification.message);
    console.log('👤 Alıcı:', notification.recipientId);
    
  } catch (error) {
    console.error('❌ Test sırasında hata:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı.');
  }
};

// Test'i çalıştır
testNotification();
