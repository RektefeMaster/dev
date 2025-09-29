import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { setSocketIOInstance } from './utils/socketNotifications';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler, notFound } from './middleware/errorHandler';
import helmet from 'helmet';
import compression from 'compression';

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
import pushNotificationRoutes from './routes/pushNotifications';
import appointmentRatingRoutes from './routes/appointmentRating';
import messageRoutes from './routes/message';
import walletRoutes from './routes/wallet';
import tefePointRoutes from './routes/tefePoint';
import activityRoutes from './routes/activity';
import faultReportRoutes from './routes/faultReport';
import serviceRequestRoutes from './routes/serviceRequests';
import emergencyTowingRoutes from './routes/emergencyTowing';
import paymentRoutes from './routes/payment';

// .env dosyasını yükle
dotenv.config();

const app = express();

// Security & performance middleware
app.use(helmet());
app.use(compression());

// CORS configuration
import { MONGODB_URI, PORT as CONFIG_PORT, CORS_ORIGIN, JWT_SECRET } from './config';

// Secure CORS configuration - no wildcards
const allowedOrigins = CORS_ORIGIN.split(',').map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow all origins for React Native apps
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development mode: allow all origins
      return callback(null, true);
    }
  },
  credentials: true, // Always allow credentials for security
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
app.use(express.json());

// Sadece önemli istekleri logla (development modunda)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // Mesaj polling isteklerini loglamadan geç
    const isMessagePolling = req.path.includes('/messages/after/') || 
                            req.path.includes('/poll-messages');
    
    if (!isMessagePolling) {
      console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    }
    next();
  });
}

const PORT = CONFIG_PORT;

// MongoDB bağlantısı

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
import './models/FaultReport';
import './models/TefePoint';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30 saniye timeout
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
  bufferCommands: false,
  retryWrites: true,
  w: 'majority'
})
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    console.error('MongoDB URI:', MONGODB_URI);
  });

// HTTP sunucusu oluştur
const httpServer = createServer(app);

// Socket.io sunucusu oluştur - SECURE CORS
export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  transports: ['websocket', 'polling'],
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

// Socket.IO auth middleware - JWT doğrulama
io.use((socket, next) => {
  try {
    const authHeader = socket.handshake.headers['authorization'];
    const tokenFromHeader = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : undefined;
    const token = (socket.handshake.auth && socket.handshake.auth.token) || tokenFromHeader;

    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string; userType: 'driver' | 'mechanic' };
    (socket.data as any).userId = decoded.userId;
    (socket.data as any).userType = decoded.userType;
    return next();
  } catch (err) {
    return next(new Error('Unauthorized'));
  }
});

// Socket.IO hata yönetimi (sadece gerçek hatalarda)
io.engine.on('connection_error', (err) => {
  });

// Kullanıcı bağlantısı ve oda mantığı
io.on('connection', (socket: Socket) => {
  // Bağlantı hatası
  socket.on('error', (error: any) => {
    });
  
  // Bağlanırken kendi odasına otomatik katıl
  try {
    const authedUserId = (socket.data as any).userId;
    if (authedUserId) {
      socket.join(authedUserId);
    }
  } catch {}
  
  // Eski istemciler için 'join' desteği: sadece kendi odasına izin ver
  socket.on('join', (userId: string) => {
    try {
      const authedUserId = (socket.data as any).userId;
      if (userId && authedUserId && userId === authedUserId) {
        socket.join(userId);
      }
    } catch (error) {
      }
  });
  
  // Bağlantı kesildi
  socket.on('disconnect', (reason: string) => {
    // Sessiz disconnect
    const rooms = Array.from(socket.rooms);

  });
  
  // Ping/Pong kontrolü
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Socket.IO instance'ını set et
setSocketIOInstance(io);

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Rektefe API Documentation'
}));

// Basit test route'u
app.get('/', (req, res) => {
  res.send('API Çalışıyor!');
});

// IP test endpoint'i
app.get('/ip-test', async (req, res) => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    res.json({
      success: true,
      renderIP: data.ip,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
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
app.use('/api/users', pushNotificationRoutes);

app.use('/api/message', messageRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tefe-points', tefePointRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/fault-reports', faultReportRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/emergency', emergencyTowingRoutes);
app.use('/api/payment', paymentRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware (en sonda olmalı)
app.use(notFound);
app.use(errorHandler);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
