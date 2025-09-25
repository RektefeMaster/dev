import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { EmergencyTowingRequest } from '../models/EmergencyTowingRequest';
import { Notification } from '../models/Notification';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: 'driver' | 'mechanic';
  isAuthenticated?: boolean;
}

export interface EmergencyTowingData {
  requestId: string;
  userId: string;
  vehicleInfo: {
    type: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
  };
  location: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
    accuracy: number;
  };
  userInfo: {
    name: string;
    surname: string;
    phone: string;
  };
  emergencyDetails: {
    reason: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
  };
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  acceptedBy?: string;
  createdAt: Date;
}

export interface MechanicResponse {
  requestId: string;
  mechanicId: string;
  response: 'accepted' | 'rejected';
  estimatedArrival?: number; // dakika cinsinden
  message?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private connectedMechanics: Map<string, AuthenticatedSocket> = new Map();
  private emergencyRequests: Map<string, EmergencyTowingData> = new Map();

  constructor(server: HTTPServer) {
    // WebSocket için güvenli CORS yapılandırması
    const corsOrigin = process.env.CORS_ORIGIN;
    const allowedOrigins = corsOrigin && corsOrigin !== '*' 
      ? corsOrigin.split(',').map(o => o.trim())
      : (process.env.NODE_ENV !== 'production' ? true : false);

    this.io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['polling', 'websocket'], // polling önce, simülatör için
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // JWT Secret güvenlik kontrolü
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
          return next(new Error('Server configuration error'));
        }

        const decoded = jwt.verify(token, jwtSecret) as any;
        const user = await User.findById(decoded.userId).select('name surname phone userType isAvailable');
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = (user._id as any).toString();
        socket.userType = user.userType as 'driver' | 'mechanic';
        socket.isAuthenticated = true;

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // User connected - log in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`User connected: ${socket.userId} (${socket.userType})`);
      }

      // Kullanıcıyı bağlı kullanıcılar listesine ekle
      if (socket.userType === 'driver') {
        this.connectedUsers.set(socket.userId!, socket);
      } else if (socket.userType === 'mechanic') {
        this.connectedMechanics.set(socket.userId!, socket);
      }

      // Acil çekici talebi
      socket.on('emergency_towing_request', async (data: EmergencyTowingData) => {
        await this.handleEmergencyTowingRequest(socket, data);
      });

      // Çekici yanıtı
      socket.on('mechanic_response', async (data: MechanicResponse) => {
        await this.handleMechanicResponse(socket, data);
      });

      // Konum güncellemesi
      socket.on('location_update', async (data: { latitude: number; longitude: number; accuracy: number }) => {
        await this.handleLocationUpdate(socket, data);
      });

      // Bağlantı kesildiğinde
      socket.on('disconnect', () => {
        if (socket.userType === 'driver') {
          this.connectedUsers.delete(socket.userId!);
        } else if (socket.userType === 'mechanic') {
          this.connectedMechanics.delete(socket.userId!);
        }
      });

      // Hata yönetimi
      socket.on('error', (error) => {
        });
    });
  }

  public async handleEmergencyTowingRequest(socket: AuthenticatedSocket, data: EmergencyTowingData) {
    try {
      // Acil talep cache'e ekle (veritabanına kayıt HTTP route'unda yapılıyor)
      this.emergencyRequests.set(data.requestId, data);

      // Yakın çekicilere bildirim gönder
      await this.notifyNearbyMechanics(data);

      // Kullanıcıya onay gönder
      const userSocket = this.connectedUsers.get(data.userId);
      if (userSocket) {
        userSocket.emit('emergency_request_sent', {
          requestId: data.requestId,
          message: 'Acil çekici talebiniz gönderildi. En yakın çekicilere bildirim iletildi.',
          status: 'pending'
        });
      }

    } catch (error: unknown) {
      const userSocket = this.connectedUsers.get(data.userId);
      if (userSocket) {
        userSocket.emit('emergency_request_error', {
          message: 'Acil çekici talebi gönderilemedi. Lütfen tekrar deneyin.',
          error: (error as any).message
        });
      }
    }
  }

  private async handleMechanicResponse(socket: AuthenticatedSocket, data: MechanicResponse) {
    try {
      const emergencyRequest = this.emergencyRequests.get(data.requestId);
      if (!emergencyRequest) {
        socket.emit('response_error', { message: 'Acil talep bulunamadı' });
        return;
      }

      if (data.response === 'accepted') {
        // Talep kabul edildi
        await this.handleRequestAccepted(data.requestId, data.mechanicId, data.estimatedArrival);
        
        // Kullanıcıya kabul bildirimi gönder
        const userSocket = this.connectedUsers.get(emergencyRequest.userId);
        if (userSocket) {
          userSocket.emit('request_accepted', {
            requestId: data.requestId,
            mechanicId: data.mechanicId,
            estimatedArrival: data.estimatedArrival,
            message: 'Çekici talebiniz kabul edildi! Çekici yolda.'
          });
        }

        // Diğer çekicilere iptal bildirimi gönder
        await this.notifyOtherMechanics(data.requestId, data.mechanicId, 'request_cancelled');
      } else {
        // Talep reddedildi
        await this.handleRequestRejected(data.requestId, data.mechanicId);
        
        // Kullanıcıya red bildirimi gönder
        const userSocket = this.connectedUsers.get(emergencyRequest.userId);
        if (userSocket) {
          userSocket.emit('request_rejected', {
            requestId: data.requestId,
            mechanicId: data.mechanicId,
            message: 'Bu çekici talebi kabul edemedi. Diğer çekiciler aranıyor...'
          });
        }
      }

    } catch (error) {
      socket.emit('response_error', { message: 'Yanıt gönderilemedi' });
    }
  }

  private async handleLocationUpdate(socket: AuthenticatedSocket, data: { latitude: number; longitude: number; accuracy: number }) {
    try {
      // Çekici konum güncellemesi
      if (socket.userType === 'mechanic') {
        // Aktif çekici taleplerini bul ve konum güncelle
        for (const [requestId, request] of this.emergencyRequests) {
          if (request.status === 'accepted' && request.acceptedBy === socket.userId) {
            // Kullanıcıya konum güncellemesi gönder
            const userSocket = this.connectedUsers.get(request.userId);
            if (userSocket) {
              userSocket.emit('mechanic_location_update', {
                requestId,
                mechanicId: socket.userId,
                location: data,
                timestamp: new Date()
              });
            }
          }
        }
      }
    } catch (error) {
      }
  }

  private async notifyNearbyMechanics(data: EmergencyTowingData) {
    try {
      // Yakın çekicileri bul (mesafe tabanlı)
      const nearbyMechanics = await this.findNearbyMechanics(data.location.coordinates);
      
      // Her çekiciye bildirim gönder
      for (const mechanic of nearbyMechanics) {
        if (!mechanic) continue;
        const mechanicSocket = this.connectedMechanics.get((mechanic._id as any).toString());
        
        if (mechanicSocket) {
          mechanicSocket.emit('emergency_notification', {
            requestId: data.requestId,
            data: {
              userInfo: data.userInfo,
              vehicleInfo: data.vehicleInfo,
              location: data.location,
              emergencyDetails: data.emergencyDetails,
              createdAt: data.createdAt
            },
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 dakika
          });

          // Push notification da gönder
          await this.sendPushNotification(mechanic, data);
        }
      }

    } catch (error) {
      }
  }

  private async findNearbyMechanics(coordinates: { latitude: number; longitude: number }) {
    // Mesafe hesaplama fonksiyonu
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Dünya yarıçapı (km)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Çekici ustalarını bul
    const mechanics = await Mechanic.find({
      isAvailable: true,
      serviceCategories: { $regex: /çekici|kurtarma|towing|tow/i }
    }).select('name surname phone pushToken location serviceCategories rating');
    // Mesafeye göre sırala (50km yarıçap)
    const nearbyMechanics = mechanics
      .map(mechanic => {
        if (mechanic.location?.coordinates) {
          const distance = calculateDistance(
            coordinates.latitude,
            coordinates.longitude,
            mechanic.location.coordinates.latitude,
            mechanic.location.coordinates.longitude
          );
          return { ...mechanic.toObject(), distance };
        }
        return null;
      })
      .filter(mechanic => mechanic && mechanic.distance <= 50) // 50km yarıçap
      .sort((a, b) => (a?.distance || 0) - (b?.distance || 0))
      .slice(0, 10); // En yakın 10 çekici

    return nearbyMechanics;
  }

  private async sendPushNotification(mechanic: any, data: EmergencyTowingData) {
    try {
      if (!mechanic.pushToken) return;

      const notification = new Notification({
        userId: mechanic._id,
        type: 'emergency_towing_request',
        title: '🚨 Acil Çekici Talebi',
        message: `${data.userInfo.name} ${data.userInfo.surname} - ${data.vehicleInfo.brand} ${data.vehicleInfo.model}`,
        data: {
          requestId: data.requestId,
          userInfo: data.userInfo,
          vehicleInfo: data.vehicleInfo,
          location: data.location,
          emergencyDetails: data.emergencyDetails
        },
        isRead: false
      });

      await notification.save();

      // Expo push notification gönder
      // Bu kısım mevcut push notification servisi ile entegre edilecek

    } catch (error) {
      }
  }

  private async handleRequestAccepted(requestId: string, mechanicId: string, estimatedArrival?: number) {
    try {
      // Veritabanını güncelle
      await EmergencyTowingRequest.findOneAndUpdate(
        { requestId },
        {
          status: 'accepted',
          acceptedBy: mechanicId,
          estimatedArrival: estimatedArrival ? new Date(Date.now() + estimatedArrival * 60 * 1000) : undefined,
          acceptedAt: new Date()
        });
      // Cache'i güncelle
      const request = this.emergencyRequests.get(requestId);
      if (request) {
        request.status = 'accepted';
        request.acceptedBy = mechanicId;
        this.emergencyRequests.set(requestId, request);
      }

    } catch (error) {
      }
  }

  private async handleRequestRejected(requestId: string, mechanicId: string) {
    try {
      // Reddedilen çekiciyi listeye ekle
      await EmergencyTowingRequest.findOneAndUpdate(
        { requestId },
        { $addToSet: { rejectedBy: mechanicId } }
      );
    } catch (error) {
      console.error('Error handling request rejection:', error);
    }
  }

  private async notifyOtherMechanics(requestId: string, acceptedMechanicId: string, eventType: string) {
    try {
      const request = this.emergencyRequests.get(requestId);
      if (!request) return;

      // Diğer çekicilere iptal bildirimi gönder
      for (const [mechanicId, socket] of this.connectedMechanics) {
        if (mechanicId !== acceptedMechanicId) {
          socket.emit(eventType, {
            requestId,
            message: 'Bu acil talep başka bir çekici tarafından kabul edildi.'
          });
        }
      }

    } catch (error) {
      }
  }

  // Public methods
  public getIO() {
    return this.io;
  }

  public getConnectedUsers() {
    return this.connectedUsers;
  }

  public getConnectedMechanics() {
    return this.connectedMechanics;
  }

  public getEmergencyRequests() {
    return this.emergencyRequests;
  }
}

export default WebSocketService;
