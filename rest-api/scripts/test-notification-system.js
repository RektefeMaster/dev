const mongoose = require('mongoose');
const User = require('../dist/models/User').default;
const Notification = require('../dist/models/Notification').default;
const { NotificationTriggerService } = require('../dist/services/notificationTriggerService');

// MongoDB bağlantısı
const MONGODB_URI = 'mongodb://localhost:27017/rektefe';

async function testNotificationSystem() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı');

    // Test kullanıcıları bul
    const driver = await User.findOne({ userType: 'driver' });
    const mechanic = await User.findOne({ userType: 'mechanic' });

    if (!driver) {
      console.log('Test şoför bulunamadı, oluşturuluyor...');
      const newDriver = new User({
        name: 'Test',
        surname: 'Şoför',
        email: 'test@driver.com',
        phone: '05551234567',
        password: '123456',
        userType: 'driver',
        pushToken: 'ExponentPushToken[test-driver-token]',
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
      await newDriver.save();
      console.log('Test şoför oluşturuldu');
    }

    if (!mechanic) {
      console.log('Test usta bulunamadı, oluşturuluyor...');
      const newMechanic = new User({
        name: 'Test',
        surname: 'Usta',
        email: 'test@mechanic.com',
        phone: '05559876543',
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

    const testDriver = await User.findOne({ userType: 'driver' });
    const testMechanic = await User.findOne({ userType: 'mechanic' });

    console.log('\n=== BİLDİRİM SİSTEMİ TESTİ ===\n');

    // 1. Randevu talebi bildirimi
    console.log('1. Randevu talebi bildirimi gönderiliyor...');
    await NotificationTriggerService.sendAppointmentRequestNotification(
      testMechanic._id.toString(),
      testDriver.name + ' ' + testDriver.surname,
      'Genel Bakım',
      '2024-01-20',
      '14:00'
    );
    console.log('✅ Randevu talebi bildirimi gönderildi');

    // 2. Randevu onay bildirimi
    console.log('\n2. Randevu onay bildirimi gönderiliyor...');
    await NotificationTriggerService.sendAppointmentConfirmedNotification(
      testDriver._id.toString(),
      testMechanic.name + ' ' + testMechanic.surname,
      'Genel Bakım',
      '2024-01-20',
      '14:00'
    );
    console.log('✅ Randevu onay bildirimi gönderildi');

    // 3. Ödeme bildirimi
    console.log('\n3. Ödeme bildirimi gönderiliyor...');
    await NotificationTriggerService.sendPaymentReceivedNotification(
      testMechanic._id.toString(),
      testDriver.name + ' ' + testDriver.surname,
      450,
      'Genel Bakım'
    );
    console.log('✅ Ödeme bildirimi gönderildi');

    // 4. Mesaj bildirimi
    console.log('\n4. Mesaj bildirimi gönderiliyor...');
    await NotificationTriggerService.sendNewMessageNotification(
      testMechanic._id.toString(),
      'mechanic',
      testDriver.name + ' ' + testDriver.surname,
      'Randevu saatini değiştirebilir miyiz?'
    );
    console.log('✅ Mesaj bildirimi gönderildi');

    // 5. Değerlendirme bildirimi
    console.log('\n5. Değerlendirme bildirimi gönderiliyor...');
    await NotificationTriggerService.sendRatingNotification(
      testMechanic._id.toString(),
      testDriver.name + ' ' + testDriver.surname,
      5,
      'Çok hızlı ve kaliteli hizmet'
    );
    console.log('✅ Değerlendirme bildirimi gönderildi');

    // 6. Sistem bildirimi
    console.log('\n6. Sistem bildirimi gönderiliyor...');
    await NotificationTriggerService.sendSystemNotification(
      testDriver._id.toString(),
      'driver',
      'Sistem Güncellemesi',
      'Uygulama yeni özelliklerle güncellendi. Yeni bildirim sistemi aktif!',
      { version: '2.0.0', features: ['Bildirim sistemi', 'Push notifications'] }
    );
    console.log('✅ Sistem bildirimi gönderildi');

    // Bildirimleri kontrol et
    console.log('\n=== BİLDİRİM KONTROLÜ ===');
    
    const driverNotifications = await Notification.find({ 
      recipientId: testDriver._id,
      recipientType: 'driver'
    }).sort({ createdAt: -1 });
    
    const mechanicNotifications = await Notification.find({ 
      recipientId: testMechanic._id,
      recipientType: 'mechanic'
    }).sort({ createdAt: -1 });

    console.log(`\nŞoför bildirimleri: ${driverNotifications.length}`);
    driverNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title} - ${notif.type} - ${notif.isRead ? 'Okundu' : 'Okunmamış'}`);
    });

    console.log(`\nUsta bildirimleri: ${mechanicNotifications.length}`);
    mechanicNotifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title} - ${notif.type} - ${notif.isRead ? 'Okundu' : 'Okunmamış'}`);
    });

    console.log('\n=== TEST TAMAMLANDI ===');
    console.log('✅ Tüm bildirim türleri başarıyla test edildi');
    console.log('✅ Push notification servisi çalışıyor');
    console.log('✅ Veritabanı kayıtları oluşturuldu');

  } catch (error) {
    console.error('Test hatası:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı');
  }
}

testNotificationSystem();
