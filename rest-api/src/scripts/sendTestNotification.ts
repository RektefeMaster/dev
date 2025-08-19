import mongoose from 'mongoose';
import { MONGODB_URI } from '../config';
import { io } from 'socket.io-client';

// MongoDB bağlantısı
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
  .catch(err => console.error('❌ MongoDB bağlantısı hatası:', err));

const sendTestNotification = async () => {
  try {
    console.log('🧪 Socket.io ile test bildirimi gönderiliyor...');
    
    // Test için kullanılacak usta ID'si
    const testMechanicId = '68a36401cec7d1f96e4c17ea'; // Nurullah Aydın - testus@gmail.com
    
    // Backend server'a bağlan
    const socket = io('http://192.168.1.39:3000', {
      transports: ['websocket']
    });
    
    socket.on('connect', () => {
      console.log('🔌 Socket.io bağlantısı açıldı:', socket.id);
      
      // Test bildirimi gönder
      const testNotification = {
        id: new mongoose.Types.ObjectId(),
        title: '🧪 Socket.io Test Bildirimi',
        message: 'Bu bildirim Socket.io ile gönderildi - ' + new Date().toLocaleString('tr-TR'),
        type: 'appointment_request',
        isRead: false,
        createdAt: new Date(),
        data: {
          priority: 'high',
          test: true
        }
      };
      
      // Usta odasına bildirim gönder
      socket.emit('notification', testNotification);
      console.log('📤 Test bildirimi gönderildi:', testNotification.title);
      
      // 2 saniye bekle ve bağlantıyı kapat
      setTimeout(() => {
        socket.disconnect();
        console.log('🔌 Socket.io bağlantısı kapatıldı');
        mongoose.connection.close();
        console.log('🔌 MongoDB bağlantısı kapatıldı');
        process.exit(0);
      }, 2000);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket.io bağlantı hatası:', error.message);
      mongoose.connection.close();
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Test sırasında hata:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Test'i çalıştır
sendTestNotification();
