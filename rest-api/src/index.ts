import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler, notFound } from './middleware/errorHandler';

// Route'ları import et
import authRoutes from './routes/auth';
import maintenanceRoutes from './routes/maintenance';
import insuranceRoutes from './routes/insurance';
import vehicleStatusRoutes from './routes/vehicleStatus';
import tireStatusRoutes from './routes/tireStatus';
// import rekaiRoutes from './routes/rekai';
import userRoutes from './routes/user';
import vehiclesRoutes from './routes/vehicles';
import serviceCategoryRoutes from './routes/serviceCategory';
import mechanicServiceRoutes from './routes/mechanicService';
import uploadRoutes from './routes/upload';
import mechanicRoutes from './routes/mechanic';
import mechanicJobsRoutes from './routes/mechanicJobs';
import mechanicEarningsRoutes from './routes/mechanicEarnings';
import appointmentRoutes from './routes/appointments';
import notificationRoutes from './routes/notifications';
import appointmentRatingRoutes from './routes/appointmentRating';
import messageRoutes from './routes/message';
import walletRoutes from './routes/wallet';
import activityRoutes from './routes/activity';



// .env dosyasını yükle
dotenv.config();

// API anahtarlarını kontrol et
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Mevcut' : 'Eksik');
console.log('REKAI_API_KEY:', process.env.REKAI_API_KEY ? 'Mevcut' : 'Eksik');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Sadece önemli istekleri logla (development modunda)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // Sadece POST, PUT, DELETE isteklerini ve hataları logla
    if (['POST', 'PUT', 'DELETE'].includes(req.method) || req.url.includes('/error')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });
}

const PORT = Number(process.env.PORT) || 3000;

// MongoDB bağlantısı
import { MONGODB_URI } from './config';

// Mongoose modellerini import et (register için)
import './models/User';
import './models/Mechanic';
import './models/Appointment';
import './models/Vehicle';
import './models/Message';
import './models/Conversation';
import './models/Notification';
import './models/AppointmentRating';
import './models/ServiceCategory';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı!'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));

// HTTP sunucusu oluştur
const httpServer = createServer(app);

// Socket.io sunucusu oluştur - TÜM ORIGIN'LER İÇİN AÇIK
export const io = new Server(httpServer, {
  cors: {
    origin: true, // TÜM ORIGIN'LERİ KABUL ET
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  transports: ['polling'], // SADECE POLLING - KARARLI BAĞLANTI
  allowEIO3: true,
  // allowEIO4: true, // Bu özellik mevcut değil
  pingTimeout: 120000, // 2 dakika
  pingInterval: 60000, // 1 dakika
  connectTimeout: 60000, // 1 dakika
  maxHttpBufferSize: 1e6,
  upgradeTimeout: 30000,
  allowRequest: (req, callback) => {
    // TÜM İSTEKLERİ KABUL ET
    callback(null, true);
  }
});

// Socket.IO hata yönetimi (sadece gerçek hatalarda)
io.engine.on('connection_error', (err) => {
  console.error('Socket.IO Engine bağlantı hatası:', err);
});

// Kullanıcı bağlantısı ve oda mantığı
io.on('connection', (socket: Socket) => {
  // Bağlantı hatası
  socket.on('error', (error: any) => {
    console.error('Socket.IO: Bağlantı hatası:', error);
  });
  
  // Kullanıcı odaya katılma
  socket.on('join', (userId: string) => {
    try {
      socket.join(userId);
    } catch (error) {
      console.error('Socket.IO: Odaya katılma hatası:', error);
    }
  });
  
  // Bağlantı kesildi
  socket.on('disconnect', (reason: string) => {
    // Sessiz disconnect
    const rooms = Array.from(socket.rooms);
    if (rooms.length > 1) { // 1'den fazla çünkü socket.id de bir oda
      console.log(`🏠 Socket.IO: Kullanıcı şu odalardan çıkarıldı:`, rooms.slice(1));
    }
  });
  
  // Ping/Pong kontrolü
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Bildirim gönderme fonksiyonu
export function sendNotificationToUser(userId: string, notification: any) {
  console.log('🔔 Backend: sendNotificationToUser çağrıldı');
  console.log('🔔 Backend: userId:', userId);
  console.log('🔔 Backend: notification:', notification);
  
  const room = io.sockets.adapter.rooms.get(userId);
  console.log('🔔 Backend: Oda mevcut mu?', !!room);
  console.log('🔔 Backend: Odadaki socket sayısı:', room ? room.size : 0);
  
  io.to(userId).emit('notification', notification);
  console.log('🔔 Backend: Bildirim gönderildi!');
}

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Rektefe API Documentation'
}));

// Basit test route'u
app.get('/', (req, res) => {
  res.send('API Çalışıyor!');
});

// Ana API route'u
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Rektefe API çalışıyor!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      appointments: '/api/appointments',
      vehicles: '/api/vehicles',
      messages: '/api/message'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/vehicle-status', vehicleStatusRoutes);
app.use('/api/tire-status', tireStatusRoutes);
// app.use('/api', rekaiRoutes); // Geçici olarak devre dışı
app.use('/api', uploadRoutes);

app.use('/api/appointment-ratings', appointmentRatingRoutes);
app.use('/api/ratings', appointmentRatingRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', vehiclesRoutes); // Frontend uyumluluğu için
app.use('/api/service-categories', serviceCategoryRoutes);
app.use('/api/mechanic-services', mechanicServiceRoutes);
app.use('/api/mechanic', mechanicRoutes);
app.use('/api/mechanic-jobs', mechanicJobsRoutes);
app.use('/api/mechanic-earnings', mechanicEarningsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/message', messageRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/activity', activityRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware (en sonda olmalı)
app.use(notFound);
app.use(errorHandler);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
