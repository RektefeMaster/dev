import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import MaintenanceAppointment from '../models/MaintenanceAppointment';

async function listAppointments() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı!');

    const appointments = await MaintenanceAppointment.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id status appointmentDate mechanicId userId createdAt');

    console.log('\n=== MEVCUT RANDEVULAR ===');
    appointments.forEach((appointment, index) => {
      console.log(`${index + 1}. ID: ${appointment._id}`);
      console.log(`   Durum: ${appointment.status}`);
      console.log(`   Tarih: ${appointment.appointmentDate}`);
      console.log(`   Usta ID: ${appointment.mechanicId}`);
      console.log(`   Kullanıcı ID: ${appointment.userId}`);
      console.log(`   Oluşturulma: ${appointment.createdAt}`);
      console.log('---');
    });

    console.log(`\nToplam ${appointments.length} randevu bulundu.`);
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB bağlantısı kapatıldı.');
  }
}

listAppointments();
