import mongoose from 'mongoose';
import MaintenanceAppointment from '../models/MaintenanceAppointment';
import AppointmentRating from '../models/AppointmentRating';
import Notification from '../models/Notification';
import { MONGODB_URI } from '../config';

async function clearAllData() {
  try {
    console.log('🔌 MongoDB\'ye bağlanılıyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB\'ye bağlandı');

    console.log('🧹 Tüm veriler temizleniyor...\n');

    // Randevuları temizle
    const appointmentsCount = await MaintenanceAppointment.countDocuments();
    if (appointmentsCount > 0) {
      await MaintenanceAppointment.deleteMany({});
      console.log(`✅ ${appointmentsCount} randevu silindi`);
    } else {
      console.log('ℹ️ Silinecek randevu bulunamadı');
    }

    // Değerlendirmeleri temizle
    const ratingsCount = await AppointmentRating.countDocuments();
    if (ratingsCount > 0) {
      await AppointmentRating.deleteMany({});
      console.log(`✅ ${ratingsCount} değerlendirme silindi`);
    } else {
      console.log('ℹ️ Silinecek değerlendirme bulunamadı');
    }

    // Bildirimleri temizle
    const notificationsCount = await Notification.countDocuments();
    if (notificationsCount > 0) {
      await Notification.deleteMany({});
      console.log(`✅ ${notificationsCount} bildirim silindi`);
    } else {
      console.log('ℹ️ Silinecek bildirim bulunamadı');
    }

    console.log('\n📊 Son Durum:');
    console.log(`- Randevular: ${await MaintenanceAppointment.countDocuments()}`);
    console.log(`- Değerlendirmeler: ${await AppointmentRating.countDocuments()}`);
    console.log(`- Bildirimler: ${await Notification.countDocuments()}`);

    console.log('\n🎉 Tüm veriler başarıyla temizlendi!');

  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

clearAllData();
