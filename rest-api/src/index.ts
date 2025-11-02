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
import { DatabaseOptimizationService } from './services/databaseOptimization.service';
import { securityHeaders, requestId } from './middleware/optimizedAuth';
import Logger from './utils/logger';
import { apiLimiter } from './middleware/rateLimiter';
import { requestTimeout } from './middleware/requestTimeout';
import { 
  initializeMonitoring, 
  requestLogger, 
  monitoringMiddleware,
  healthCheckHandler,
  metricsHandler 
} from './utils/monitoring';
import schedule from 'node-schedule';
import { PartsService } from './services/parts.service';

// Config import (dependency olabilecek route'lardan önce)
import { MONGODB_URI, MONGODB_OPTIONS, PORT as CONFIG_PORT, CORS_ORIGIN, JWT_SECRET } from './config';

// Route'ları import et
import authRoutes from './routes/auth';
import networkRoutes from './routes/network';
import maintenanceRoutes from './routes/maintenance';
import insuranceRoutes from './routes/insurance';
import vehicleStatusRoutes from './routes/vehicleStatus';
import tireStatusRoutes from './routes/tireStatus';
// import rekaiRoutes from './routes/rekai';
import userRoutes from './routes/user';
import vehiclesRoutes from './routes/vehicles';
import serviceCategoryRoutes from './routes/serviceCategory';
import mechanicServiceRoutes from './routes/mechanicService';
import supportRoutes from './routes/support';
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
import tireStorageRoutes from './routes/tireStorage';
import tireServiceRoutes from './routes/tireService';
import bodyworkRoutes from './routes/bodywork';
import carWashRoutes from './routes/carWash';
import washRoutes from './routes/wash';
import partsRoutes from './routes/parts';
import customersRoutes from './routes/customers';
import suppliersRoutes from './routes/suppliers';
import statusNotificationsRoutes from './routes/statusNotifications';
import endOfDayRoutes from './routes/endOfDay';
import reportsRoutes from './routes/reports';
import loyalCustomersRoutes from './routes/loyalCustomers';
import vehicleHistoryRoutes from './routes/vehicleHistory';
import jobReferralsRoutes from './routes/jobReferrals';
import mechanicReportsRoutes from './routes/mechanicReports';

// .env dosyasını yükle
dotenv.config();

const app = express();

// Security & performance middleware
app.use(helmet());
app.use(compression());

// Custom middleware'ler
app.use(requestId);
app.use(securityHeaders);
app.use(requestTimeout(30000)); // 🚀 STABILITY: 30 saniye request timeout
app.use(monitoringMiddleware);
app.use(requestLogger);

// Rate limiting (tüm API route'ları için)
app.use('/api/', apiLimiter);

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
// Production'da requestLogger kullanılıyor (monitoring.ts'den)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // Mesaj polling isteklerini loglamadan geç
    const isMessagePolling = req.path.includes('/messages/after/') || 
                            req.path.includes('/poll-messages');
    
    if (!isMessagePolling) {
      Logger.devOnly(`${req.method} ${req.path} - ${new Date().toISOString()}`);
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
import './models/VerificationToken';
import './models/TireStorage';
import './models/TireHealthRecord';
import './models/DepotLayout';
import './models/SeasonalReminder';
import './models/BodyworkJob';
import './models/BodyworkTemplate';
import './models/CarWashPackage';
import './models/CarWashJob';
import './models/CarWashLoyaltyProgram';
import './models/WithdrawalRequest';
import './models/Wallet';
import './models/PartsInventory';
import './models/PartsReservation';

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

// Socket.IO hata yönetimi
io.engine.on('connection_error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    Logger.warn('Socket.IO connection error:', err.message);
  }
});

// Kullanıcı bağlantısı ve oda mantığı
io.on('connection', (socket: Socket) => {
  // Bağlantı hatası
  socket.on('error', (error: any) => {
    if (process.env.NODE_ENV === 'development') {
      Logger.warn('Socket error:', error.message || error);
    }
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

// IP test endpoint'i - Railway IP adresini öğrenmek için
app.get('/ip-test', async (req, res) => {
  try {
    // Client IP bilgilerini topla
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const forwardedIP = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    
    // Railway'in outbound IP'sini öğren
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    
    res.json({
      success: true,
      railwayOutboundIP: data.ip,
      clientIP: {
        ip: clientIP,
        forwardedIP: forwardedIP,
        realIP: realIP
      },
      timestamp: new Date().toISOString(),
      message: 'Bu IP adresini MongoDB Atlas Network Access\'e ekleyin',
      mongoDbFormat: `${data.ip}/32`
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message || 'Unknown error'
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
app.use('/api/network', networkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/vehicle-status', vehicleStatusRoutes);
app.use('/api/tire-status', tireStatusRoutes);
// app.use('/api', rekaiRoutes); // Geçici olarak devre dışı
app.use('/api/upload', uploadRoutes); // Upload routes /api/upload prefix'i ile mount edilmeli

app.use('/api/appointment-ratings', appointmentRatingRoutes);
app.use('/api/ratings', appointmentRatingRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', vehiclesRoutes); // Frontend uyumluluğu için
app.use('/api/service-categories', serviceCategoryRoutes);
app.use('/api/mechanic-services', mechanicServiceRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/mechanic/reports', mechanicReportsRoutes); // Spesifik route önce
app.use('/api/mechanic-jobs', mechanicJobsRoutes);
app.use('/api/mechanic-earnings', mechanicEarningsRoutes);
app.use('/api/mechanic', mechanicRoutes); // Genel route sonra
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push-notifications', pushNotificationRoutes);

app.use('/api/message', messageRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tefe-points', tefePointRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/fault-reports', faultReportRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/emergency', emergencyTowingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tire-storage', tireStorageRoutes);
app.use('/api/tire-service', tireServiceRoutes);
app.use('/api/bodywork', bodyworkRoutes);
app.use('/api/carwash', carWashRoutes);
app.use('/api/wash', washRoutes); // Yeni araç yıkama modülü
app.use('/api/parts', partsRoutes); // Yedek parça marketplace modülü
app.use('/api/customers', customersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/status-notifications', statusNotificationsRoutes);
app.use('/api/end-of-day', endOfDayRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/loyal-customers', loyalCustomersRoutes);
app.use('/api/vehicle-history', vehicleHistoryRoutes);
app.use('/api/job-referrals', jobReferralsRoutes);
// Admin routes removed - seed function will be handled via admin panel

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Monitoring endpoints
app.get('/health', healthCheckHandler);
app.get('/metrics', metricsHandler);

// Error handling middleware (en sonda olmalı)
app.use(notFound);
app.use(errorHandler);

// MongoDB bağlantısını başlat ve server'ı başlat
async function startServer() {
  try {
    Logger.info('MongoDB bağlantısı başlatılıyor...');
    
    // MongoDB URI kontrolü (şifreyi gösterme)
    const maskedUri = MONGODB_URI?.replace(/:([^:@]+)@/, ':*****@');
    Logger.info(`MongoDB URI: ${maskedUri}`);
    Logger.info(`MongoDB Options: ${JSON.stringify({
      serverSelectionTimeoutMS: MONGODB_OPTIONS.serverSelectionTimeoutMS,
      connectTimeoutMS: MONGODB_OPTIONS.connectTimeoutMS,
      maxPoolSize: MONGODB_OPTIONS.maxPoolSize,
      minPoolSize: MONGODB_OPTIONS.minPoolSize,
      tls: MONGODB_OPTIONS.tls
    })}`);
    
    await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
    Logger.info('✅ MongoDB bağlantısı başarılı');
    
    // Database optimization'ı başlat
    Logger.info('🚀 Database optimization başlatılıyor...');
    try {
      await DatabaseOptimizationService.createOptimizedIndexes();
      Logger.info('✅ Database optimization tamamlandı');
    } catch (optimizationError) {
      Logger.warn('⚠️ Database optimization hatası (devam ediliyor):', optimizationError);
    }
    
    // Default kullanıcıları seed et (admin panel üzerinden yapılacak)
    Logger.info('✅ MongoDB bağlantısı başarılı');
    
    // Monitoring sistemini başlat
    Logger.info('📊 Monitoring sistemi başlatılıyor...');
    try {
      initializeMonitoring();
      Logger.info('✅ Monitoring sistemi başlatıldı');
    } catch (monitoringError) {
      Logger.warn('⚠️ Monitoring sistemi hatası (devam ediliyor):', monitoringError);
    }
    
    // Cron job'ları başlat
    Logger.info('⏰ Cron job\'lar başlatılıyor...');
    try {
      // Her 5 dakikada süresi dolmuş rezervasyonları temizle
      schedule.scheduleJob('*/5 * * * *', async () => {
        try {
          const result = await PartsService.expireReservations();
          if (result.expired > 0) {
            Logger.info(`✅ [CRON] ${result.expired} rezervasyon süresi doldu`);
          }
        } catch (error: any) {
          Logger.error('❌ [CRON] Parts expiry job hatası:', error.message);
        }
      });
      Logger.info('✅ Cron job\'lar başlatıldı: Parts expiry (her 5 dakika)');
    } catch (cronError) {
      Logger.warn('⚠️ Cron job başlatma hatası (devam ediliyor):', cronError);
    }
    
    // MongoDB bağlantısı başarılı olduktan sonra server'ı başlat
    httpServer.listen(PORT, '0.0.0.0', () => {
      Logger.info(`🚀 Server ${PORT} portunda çalışıyor`);
      Logger.info('✅ MongoDB bağlantısı ve server hazır');
      Logger.info(`📚 API Documentation: http://localhost:${PORT}/docs`);
    });
  } catch (err: any) {
    Logger.error('❌ MongoDB bağlantı hatası:', err);
    
    // Detaylı hata analizi
    if (err?.message) {
      Logger.error(`Hata Mesajı: ${err.message}`);
    }
    
    if (err?.message?.includes('whitelist') || err?.message?.includes('IP')) {
      Logger.error('🔒 IP Whitelist Sorunu Tespit Edildi');
      Logger.error('📝 Çözüm: MongoDB Atlas Network Access ayarlarına Railway outbound IP adresini ekleyin');
      Logger.error('📝 Railway IP: https://api.ipify.org veya /ip-test endpoint\'ini kullanarak öğrenebilirsiniz');
    }
    
    if (err?.message?.includes('authentication')) {
      Logger.error('🔐 Authentication Sorunu Tespit Edildi');
      Logger.error('📝 Çözüm: MongoDB Atlas kullanıcı adı ve şifresini kontrol edin');
    }
    
    if (err?.message?.includes('TLS') || err?.message?.includes('SSL')) {
      Logger.error('🔒 TLS/SSL Sorunu Tespit Edildi');
      Logger.error('📝 Çözüm: MongoDB Atlas TLS ayarlarını kontrol edin');
    }
    
    if (err?.message?.includes('timeout')) {
      Logger.error('⏰ Timeout Sorunu Tespit Edildi');
      Logger.error('📝 Çözüm: Network bağlantısını ve MongoDB Atlas endpoint\'ini kontrol edin');
    }
    
    const maskedUri = MONGODB_URI?.replace(/:([^:@]+)@/, ':*****@');
    Logger.error(`MongoDB URI (masked): ${maskedUri}`);
    
    process.exit(1);
  }
}

// ===== GRACEFUL SHUTDOWN =====
// Production'da güvenli kapanma için signal handler'lar

const gracefulShutdown = async (signal: string) => {
  Logger.info(`\n${signal} sinyali alındı. Graceful shutdown başlıyor...`);
  
  try {
    // 1. Yeni HTTP request'leri kabul etmeyi durdur
    Logger.info('1️⃣ HTTP server kapatılıyor...');
    httpServer.close(() => {
      Logger.info('✅ HTTP server kapatıldı (yeni request kabul edilmiyor)');
    });
    
    // 2. Socket.IO bağlantılarını kapat
    Logger.info('2️⃣ Socket.IO bağlantıları kapatılıyor...');
    io.close(() => {
      Logger.info('✅ Socket.IO kapatıldı');
    });
    
    // 3. Aktif request'lerin bitmesi için kısa bir süre bekle
    Logger.info('3️⃣ Aktif request\'ler tamamlanıyor (max 10 saniye)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 4. MongoDB bağlantısını düzgün kapat
    Logger.info('4️⃣ MongoDB bağlantısı kapatılıyor...');
    await mongoose.connection.close(false);
    Logger.info('✅ MongoDB bağlantısı kapatıldı');
    
    Logger.info('✅ Graceful shutdown tamamlandı!\n');
    process.exit(0);
  } catch (error) {
    Logger.error('❌ Graceful shutdown hatası:', error);
    process.exit(1);
  }
};

// Signal handler'ları ekle
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  Logger.error('❌ Uncaught Exception:', error);
  Logger.error('Stack:', error.stack);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Unhandled rejection handler  
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  Logger.error('❌ Unhandled Rejection:', reason);
  Logger.error('Promise:', promise);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ===== DATABASE CONNECTION MONITORING =====
// MongoDB bağlantı durumunu izle ve otomatik yeniden bağlan

mongoose.connection.on('connected', () => {
  Logger.info('✅ MongoDB bağlantısı kuruldu');
  reconnectAttempts = 0; // Başarılı bağlantıda counter'ı resetle
});

mongoose.connection.on('error', (err: Error) => {
  Logger.error('❌ MongoDB bağlantı hatası:', err);
  // Railway için daha detaylı error logging
  if (err.message.includes('TLS')) {
    Logger.error('🔒 TLS bağlantı hatası - Railway MongoDB ayarlarını kontrol edin');
  }
  if (err.message.includes('timeout')) {
    Logger.error('⏰ Bağlantı timeout - Network ayarlarını kontrol edin');
  }
});

// Retry sayacı - sonsuz loop'u engeller
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

mongoose.connection.on('disconnected', () => {
  reconnectAttempts++;
  
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    Logger.error(`❌ Maksimum yeniden bağlanma denemesi (${MAX_RECONNECT_ATTEMPTS}) aşıldı. Railway'den manuel müdahale gerekli.`);
    Logger.error('🔧 MongoDB Atlas Network Access: Railway IP adresini whitelist\'e ekleyin');
    Logger.error('🔍 Railway IP adresini öğrenmek için: https://your-app.railway.app/ip-test');
    return;
  }
  
  Logger.warn(`⚠️ MongoDB bağlantısı kesildi (deneme ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  Logger.info('🔄 5 saniye sonra otomatik yeniden bağlanma deneniyor...');
  
  // Railway için daha uzun reconnect interval
  setTimeout(async () => {
    try {
      Logger.info('🔄 MongoDB yeniden bağlanıyor...');
      await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
      Logger.info('✅ MongoDB başarıyla yeniden bağlandı');
      reconnectAttempts = 0; // Başarılı olduğunda reset
    } catch (reconnectError: any) {
      Logger.error('❌ Yeniden bağlanma başarısız:', reconnectError.message);
      Logger.error(`🔢 Hata Kodu: ${reconnectError.code || 'Bilinmiyor'}`);
      Logger.error(`🔢 Hata Adı: ${reconnectError.name || 'Bilinmiyor'}`);
    }
  }, 5000);
});

mongoose.connection.on('reconnected', () => {
  Logger.info('✅ MongoDB yeniden bağlandı (reconnected event)');
});

// Server'ı başlat
export { app };

// Start server
startServer();
