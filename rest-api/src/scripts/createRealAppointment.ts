import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { Driver } from '../models/Driver';
import jwt from 'jsonwebtoken';

// MongoDB bağlantısı
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch(err => console.error('❌ MongoDB bağlantısı hatası:', err));

const createRealAppointment = async () => {
  try {
    console.log('🚗 Gerçek randevu oluşturuluyor...');
    
    // Test driver'ı bul veya oluştur
    let driver = await Driver.findOne({ email: 'testdriver@test.com' });
    
    if (!driver) {
      console.log('👤 Test driver bulunamadı, oluşturuluyor...');
      
      // Driver oluştur (User'dan extend ediyor)
      driver = new Driver({
        email: 'testdriver@test.com',
        password: 'test123',
        name: 'Test',
        surname: 'Driver',
        userType: 'user',
        phone: '+90 555 987 65 43',
        city: 'İstanbul'
      });
      
      await driver.save();
      console.log('✅ Driver oluşturuldu:', driver._id);
    } else {
      console.log('👤 Test driver bulundu:', driver._id);
    }
    
    // Driver için JWT token oluştur
    const driverToken = jwt.sign(
      { 
        userId: (driver._id as mongoose.Types.ObjectId).toString(), 
        userType: 'user',
        name: driver.name,
        email: driver.email
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Driver token oluşturuldu');
    
    // Usta ID'si (Nurullah Aydın)
    const mechanicId = '68a36401cec7d1f96e4c17ea';
    
    // Randevu verisi
    const appointmentData = {
      mechanicId: mechanicId,
      serviceType: 'Genel Bakım',
      appointmentDate: new Date().toISOString().split('T')[0], // Bugünün tarihi
      timeSlot: '10:00',
      description: 'Araç genel bakımı yapılması gerekiyor. Motor sesi geliyor ve frenlerde problem var.',
      vehicleId: new mongoose.Types.ObjectId()
    };
    
    console.log('📅 Randevu verisi hazırlandı:');
    console.log('   Usta ID:', mechanicId);
    console.log('   Hizmet:', appointmentData.serviceType);
    console.log('   Tarih:', appointmentData.appointmentDate);
    console.log('   Saat:', appointmentData.timeSlot);
    console.log('   Açıklama:', appointmentData.description);
    
    // Randevu oluştur
    const response = await fetch('http://192.168.1.39:3000/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${driverToken}`
      },
      body: JSON.stringify(appointmentData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Randevu başarıyla oluşturuldu!');
      console.log('📝 Randevu ID:', result.data._id);
      console.log('🔔 Bildirim gönderildi mi?', result.data.notificationSent ? 'Evet' : 'Hayır');
    } else {
      const error = await response.text();
      console.error('❌ Randevu oluşturulamadı:', response.status, error);
    }
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
};

// Script'i çalıştır
createRealAppointment();
