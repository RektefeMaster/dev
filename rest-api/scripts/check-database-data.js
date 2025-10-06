const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function checkDatabaseData() {
  try {
    console.log('🔌 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Model'leri tanımla (basit schema)
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const Mechanic = mongoose.model('Mechanic', new mongoose.Schema({}, { strict: false, collection: 'mechanics' }));
    const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false, collection: 'appointments' }));
    const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false, collection: 'messages' }));
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false, collection: 'notifications' }));
    const FaultReport = mongoose.model('FaultReport', new mongoose.Schema({}, { strict: false, collection: 'faultreports' }));
    const AppointmentRating = mongoose.model('AppointmentRating', new mongoose.Schema({}, { strict: false, collection: 'appointmentratings' }));

    console.log('========================================');
    console.log('📊 VERİTABANI GENEL DURUM');
    console.log('========================================\n');

    // Genel sayılar
    const userCount = await User.countDocuments();
    const mechanicCount = await Mechanic.countDocuments();
    const appointmentCount = await Appointment.countDocuments();
    const messageCount = await Message.countDocuments();
    const notificationCount = await Notification.countDocuments();
    const faultReportCount = await FaultReport.countDocuments();
    const ratingCount = await AppointmentRating.countDocuments();

    console.log(`👥 Toplam User: ${userCount}`);
    console.log(`🔧 Toplam Mechanic: ${mechanicCount}`);
    console.log(`📅 Toplam Appointment: ${appointmentCount}`);
    console.log(`💬 Toplam Message: ${messageCount}`);
    console.log(`🔔 Toplam Notification: ${notificationCount}`);
    console.log(`⚠️ Toplam Fault Report: ${faultReportCount}`);
    console.log(`⭐ Toplam Rating: ${ratingCount}\n`);

    // testus@gmail.com kullanıcısını kontrol et
    console.log('========================================');
    console.log('🔍 TESTUS@GMAIL.COM KULLANICISI');
    console.log('========================================\n');

    const testUser = await User.findOne({ email: 'testus@gmail.com' });
    
    if (!testUser) {
      console.log('❌ testus@gmail.com kullanıcısı bulunamadı!\n');
    } else {
      const userId = testUser._id.toString();
      console.log(`✅ User bulundu: ${userId}`);
      console.log(`   İsim: ${testUser.name} ${testUser.surname}`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   UserType: ${testUser.userType}`);
      console.log(`   Phone: ${testUser.phone}\n`);

      // Bu user için verileri kontrol et
      const userAppointments = await Appointment.countDocuments({ userId: testUser._id });
      const mechanicAppointments = await Appointment.countDocuments({ mechanicId: testUser._id });
      const userMessages = await Message.countDocuments({ 
        $or: [{ senderId: testUser._id }, { receiverId: testUser._id }]
      });
      const userNotifications = await Notification.countDocuments({ recipientId: testUser._id });
      const userFaultReports = await FaultReport.countDocuments({ userId: testUser._id });

      console.log('📊 Bu kullanıcının verileri:');
      console.log(`   Appointments (userId): ${userAppointments}`);
      console.log(`   Appointments (mechanicId): ${mechanicAppointments} ⭐`);
      console.log(`   Messages: ${userMessages}`);
      console.log(`   Notifications: ${userNotifications}`);
      console.log(`   Fault Reports: ${userFaultReports}\n`);

      // Mechanic profili var mı?
      const mechanicProfile = await Mechanic.findOne({ email: testUser.email });
      if (mechanicProfile) {
        console.log('🔧 Mechanic profili bulundu:');
        console.log(`   Mechanic ID: ${mechanicProfile._id}`);
        console.log(`   Shop Name: ${mechanicProfile.shopName}`);
        console.log(`   Rating: ${mechanicProfile.rating}`);
        
        const mechanicRatings = await AppointmentRating.countDocuments({ mechanicId: mechanicProfile._id });
        console.log(`   Ratings: ${mechanicRatings}\n`);
      } else {
        console.log('⚠️ Mechanic profili yok (Mechanic collection\'da)\n');
      }

      // Örnek veriler
      if (mechanicAppointments > 0) {
        console.log('📝 Örnek Appointment:');
        const sampleApt = await Appointment.findOne({ mechanicId: testUser._id });
        console.log(`   ID: ${sampleApt._id}`);
        console.log(`   Status: ${sampleApt.status}`);
        console.log(`   ServiceType: ${sampleApt.serviceType}`);
        console.log(`   UserId: ${sampleApt.userId}`);
        console.log(`   MechanicId: ${sampleApt.mechanicId}\n`);
      }
    }

    // Tüm user'ları listele
    console.log('========================================');
    console.log('👥 TÜM KULLANICILAR');
    console.log('========================================\n');

    const allUsers = await User.find().select('_id email name surname userType').limit(10);
    for (const user of allUsers) {
      const aptCount = await Appointment.countDocuments({ 
        $or: [{ userId: user._id }, { mechanicId: user._id }]
      });
      console.log(`${user.email} (${user.userType})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Appointments: ${aptCount}`);
      console.log('');
    }

    // En çok veriye sahip user'ı bul
    console.log('========================================');
    console.log('🏆 EN ÇOK VERİYE SAHİP KULLANICI');
    console.log('========================================\n');

    const allUsersIds = await User.find().select('_id email');
    let maxData = { userId: null, email: '', count: 0 };

    for (const user of allUsersIds) {
      const count = await Appointment.countDocuments({ 
        $or: [{ userId: user._id }, { mechanicId: user._id }]
      });
      if (count > maxData.count) {
        maxData = { userId: user._id, email: user.email, count };
      }
    }

    if (maxData.count > 0) {
      console.log(`Email: ${maxData.email}`);
      console.log(`User ID: ${maxData.userId}`);
      console.log(`Appointment Sayısı: ${maxData.count}\n`);
    } else {
      console.log('❌ Hiçbir kullanıcıda appointment bulunamadı!\n');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

checkDatabaseData();

