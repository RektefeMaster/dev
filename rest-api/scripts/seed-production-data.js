const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe';

async function seedProductionData() {
  try {
    console.log('🔌 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Model'leri tanımla
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const Mechanic = mongoose.model('Mechanic', new mongoose.Schema({}, { strict: false, collection: 'mechanics' }));
    const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false, collection: 'appointments' }));
    const Message = mongoose.model('Message', new mongoose.Schema({}, { strict: false, collection: 'messages' }));
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false, collection: 'notifications' }));
    const FaultReport = mongoose.model('FaultReport', new mongoose.Schema({}, { strict: false, collection: 'faultreports' }));
    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false, collection: 'vehicles' }));

    console.log('========================================');
    console.log('1️⃣ TESTUS@GMAIL.COM KULLANICISI OLUŞTURULUYOR');
    console.log('========================================\n');

    // testus@gmail.com kullanıcısını kontrol et
    let testusUser = await User.findOne({ email: 'testus@gmail.com' });
    
    if (!testusUser) {
      const hashedPassword = await bcrypt.hash('123', 10);
      
      testusUser = new User({
        name: 'Mete',
        surname: 'Aydın',
        email: 'testus@gmail.com',
        phone: '05060550239',
        password: hashedPassword,
        userType: 'mechanic',
        isActive: true,
        experience: 2,
        rating: 4.5,
        ratingCount: 0,
        totalServices: 0,
        serviceCategories: ['Genel Bakım', 'repair'],
        isAvailable: true,
        shopName: 'HAN CAR',
        bio: 'Doğmadım daha',
        location: {
          city: 'Battalgazi',
          district: 'Selçuklu',
          neighborhood: 'Yeşilçam Cd.',
          street: 'Ass',
          building: 'Koss',
          floor: '1',
          apartment: '5',
          description: 'Testtest',
          coordinates: {
            latitude: 38.3552,
            longitude: 38.3095
          }
        },
        vehicleBrands: ['Genel'],
        carBrands: ['Genel'],
        workingHours: JSON.stringify({
          monday: { isOpen: true, start: '09:00', end: '18:00' },
          tuesday: { isOpen: true, start: '09:00', end: '18:00' },
          wednesday: { isOpen: true, start: '09:00', end: '18:00' },
          thursday: { isOpen: true, start: '09:00', end: '18:00' },
          friday: { isOpen: true, start: '09:00', end: '18:00' },
          saturday: { isOpen: true, start: '10:00', end: '16:00' },
          sunday: { isOpen: false, start: '10:00', end: '16:00' }
        }),
        createdAt: new Date('2025-09-29T22:11:27.047Z')
      });
      
      await testusUser.save();
      console.log('✅ testus@gmail.com kullanıcısı oluşturuldu\n');
    } else {
      console.log('✅ testus@gmail.com kullanıcısı zaten mevcut\n');
    }

    console.log('========================================');
    console.log('2️⃣ TEST ŞOFÖR OLUŞTURULUYOR');
    console.log('========================================\n');

    // Test driver oluştur
    let testDriver = await User.findOne({ email: 'test@driver.com' });
    
    if (!testDriver) {
      const hashedPassword = await bcrypt.hash('123', 10);
      
      testDriver = new User({
        name: 'Ahmet',
        surname: 'Yılmaz',
        email: 'test@driver.com',
        phone: '05551234567',
        password: hashedPassword,
        userType: 'driver',
        isActive: true,
        createdAt: new Date()
      });
      
      await testDriver.save();
      console.log('✅ Test şoför oluşturuldu\n');
    } else {
      console.log('✅ Test şoför zaten mevcut\n');
    }

    console.log('========================================');
    console.log('3️⃣ TEST ARAÇ OLUŞTURULUYOR');
    console.log('========================================\n');

    // Test vehicle oluştur
    let testVehicle = await Vehicle.findOne({ plateNumber: '34ABC123' });
    
    if (!testVehicle) {
      testVehicle = new Vehicle({
        userId: testDriver._id,
        brand: 'Toyota',
        modelName: 'Corolla',
        model: 'Corolla',
        year: 2020,
        plateNumber: '34ABC123',
        fuelType: 'Benzin',
        transmission: 'Otomatik',
        color: 'Beyaz',
        isActive: true,
        createdAt: new Date()
      });
      
      await testVehicle.save();
      console.log('✅ Test araç oluşturuldu\n');
    } else {
      console.log('✅ Test araç zaten mevcut\n');
    }

    console.log('========================================');
    console.log('4️⃣ TEST RANDEVULAR OLUŞTURULUYOR');
    console.log('========================================\n');

    // Test appointments oluştur
    const appointmentStatuses = ['pending', 'confirmed', 'in-progress', 'payment-pending', 'completed'];
    const serviceTypes = ['Periyodik Bakım', 'Fren Tamiri', 'Motor Bakımı', 'Elektrik Arızası', 'Lastik Değişimi'];
    
    for (let i = 0; i < 10; i++) {
      const status = appointmentStatuses[i % appointmentStatuses.length];
      const serviceType = serviceTypes[i % serviceTypes.length];
      
      const appointment = new Appointment({
        userId: testDriver._id,
        mechanicId: testusUser._id,
        vehicleId: testVehicle._id,
        serviceType: serviceType,
        status: status,
        appointmentDate: new Date(Date.now() + (i - 5) * 24 * 60 * 60 * 1000), // -5 to +5 days
        timeSlot: `${9 + (i % 8)}:00`,
        description: `Test randevu ${i + 1} - ${serviceType}`,
        mechanicNotes: `Usta notu ${i + 1}`,
        price: 100 + (i * 50),
        finalPrice: 120 + (i * 50),
        paymentStatus: status === 'completed' ? 'paid' : status === 'payment-pending' ? 'pending' : 'not-required',
        createdAt: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000)
      });
      
      await appointment.save();
    }
    
    console.log('✅ 10 test randevu oluşturuldu\n');

    console.log('========================================');
    console.log('5️⃣ TEST MESAJLAR OLUŞTURULUYOR');
    console.log('========================================\n');

    // Test messages oluştur
    const conversationId = `${testusUser._id}_${testDriver._id}`;
    
    for (let i = 0; i < 5; i++) {
      const message = new Message({
        senderId: i % 2 === 0 ? testusUser._id : testDriver._id,
        receiverId: i % 2 === 0 ? testDriver._id : testusUser._id,
        conversationId: conversationId,
        content: `Test mesaj ${i + 1}`,
        messageType: 'text',
        read: i < 2,
        createdAt: new Date(Date.now() - (5 - i) * 60 * 60 * 1000)
      });
      
      await message.save();
    }
    
    console.log('✅ 5 test mesaj oluşturuldu\n');

    console.log('========================================');
    console.log('6️⃣ TEST BİLDİRİMLER OLUŞTURULUYOR');
    console.log('========================================\n');

    // Test notifications oluştur
    const notificationTypes = ['appointment', 'message', 'payment', 'rating', 'system'];
    
    for (let i = 0; i < 8; i++) {
      const notification = new Notification({
        recipientId: testusUser._id,
        recipientType: 'mechanic',
        type: notificationTypes[i % notificationTypes.length],
        title: `Test bildirim ${i + 1}`,
        message: `Bu bir test bildirimidir - ${i + 1}`,
        isRead: i < 3,
        priority: i % 3 === 0 ? 'high' : 'normal',
        createdAt: new Date(Date.now() - (8 - i) * 2 * 60 * 60 * 1000)
      });
      
      await notification.save();
    }
    
    console.log('✅ 8 test bildirim oluşturuldu\n');

    console.log('========================================');
    console.log('7️⃣ TEST ARIZA BİLDİRİMLERİ OLUŞTURULUYOR');
    console.log('========================================\n');

    // Test fault reports oluştur
    for (let i = 0; i < 5; i++) {
      const faultReport = new FaultReport({
        userId: testDriver._id,
        vehicleId: testVehicle._id,
        title: `Arıza ${i + 1}`,
        description: `Test arıza bildirimi ${i + 1}`,
        category: 'motor',
        status: i === 0 ? 'pending' : i === 1 ? 'quoted' : 'accepted',
        photos: [],
        location: {
          latitude: 38.3552,
          longitude: 38.3095
        },
        createdAt: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000)
      });
      
      await faultReport.save();
    }
    
    console.log('✅ 5 test arıza bildirimi oluşturuldu\n');

    console.log('========================================');
    console.log('✅ TÜM TEST VERİLERİ OLUŞTURULDU!');
    console.log('========================================\n');

    console.log('📊 Özet:');
    console.log(`   ✅ testus@gmail.com (mechanic) - ${testusUser._id}`);
    console.log(`   ✅ test@driver.com (driver) - ${testDriver._id}`);
    console.log(`   ✅ 10 Appointment (mechanicId: ${testusUser._id})`);
    console.log(`   ✅ 5 Message`);
    console.log(`   ✅ 8 Notification`);
    console.log(`   ✅ 5 Fault Report`);
    console.log(`   ✅ 1 Vehicle\n`);

    console.log('🎉 Artık uygulamayı test edebilirsiniz!');
    console.log('📱 Login: testus@gmail.com / 123\n');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
  }
}

seedProductionData();

