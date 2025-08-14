import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// .env dosyasını yükle
dotenv.config();

// API anahtarlarını kontrol et
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Mevcut' : 'Eksik');
console.log('REKAI_API_KEY:', process.env.REKAI_API_KEY ? 'Mevcut' : 'Eksik');

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Tüm gelen istekleri logla
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const PORT = Number(process.env.PORT) || 3000;

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('MongoDB bağlantısı başarılı!'))
  .catch(err => console.error('MongoDB bağlantı hatası:', err));

// HTTP sunucusu oluştur
const httpServer = createServer(app);
// Socket.io sunucusu oluştur
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Kullanıcı bağlantısı ve oda mantığı
io.on('connection', (socket: Socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);
  socket.on('join', (userId: string) => {
    socket.join(userId);
    console.log(`Kullanıcı ${userId} odasına katıldı.`);
  });
  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

// Bildirim gönderme fonksiyonu
export function sendNotificationToUser(userId: string, notification: any) {
  io.to(userId).emit('notification', notification);
}

// Basit test route'u
app.get('/', (req, res) => {
  res.send('API Çalışıyor!');
});

// Auth route'u ekle
import authRoutes from './routes/auth';
import postsRoutes from './routes/posts';
import commentsRoutes from './routes/comments';
import maintenanceRoutes from './routes/maintenance';
import insuranceRoutes from './routes/insurance';
import vehicleStatusRoutes from './routes/vehicleStatus';
import tireStatusRoutes from './routes/tireStatus';
import rekaiRoutes from './routes/rekai';
import userRoutes from './routes/user';
import maintenanceAppointmentRoutes from './routes/maintenanceAppointment';
import vehiclesRoutes from './routes/vehicles';
import serviceCategoryRoutes from './routes/serviceCategory';
import mechanicServiceRoutes from './routes/mechanicService';
import uploadRoutes from './routes/upload';
import mechanicRoutes from './routes/mechanic';

app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/vehicle-status', vehicleStatusRoutes);
app.use('/api/tire-status', tireStatusRoutes);
app.use('/api', rekaiRoutes);
app.use('/api', uploadRoutes);
app.use('/api/maintenance-appointments', maintenanceAppointmentRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/service-categories', serviceCategoryRoutes);
app.use('/api/mechanic-services', mechanicServiceRoutes);
app.use('/api/mechanic', mechanicRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
