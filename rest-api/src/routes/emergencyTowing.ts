import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types/auth.d';
import { EmergencyTowingRequest } from '../models/EmergencyTowingRequest';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { Notification } from '../models/Notification';
import { sendNotificationToUser } from '../utils/socketNotifications';
// import { WebSocketService } from '../services/websocketService';

const router = express.Router();

// Acil çekici talebi oluştur
router.post('/towing-request', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const { 
      vehicleInfo,
      location,
      userInfo,
      emergencyDetails,
      emergencyType
    } = req.body;

    // Gerekli alanları kontrol et
    if (!vehicleInfo || !location || !userInfo || !emergencyDetails || !emergencyType) {
      return res.status(400).json({
        success: false,
        message: 'Tüm gerekli alanlar doldurulmalı.'
      });
    }

    // Konum doğrulama
    if (!location.coordinates || !location.coordinates.latitude || !location.coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli konum bilgisi gerekli.'
      });
    }

    // Acil çekici talebi oluştur
    const emergencyRequest = new EmergencyTowingRequest({
      userId,
      vehicleInfo,
      location,
      userInfo,
      emergencyType,
      emergencyDetails: {
        ...emergencyDetails,
        reason: emergencyDetails.reason === 'emergency' ? emergencyType : emergencyDetails.reason
      },
      status: 'pending'
    });

    // RequestId oluştur
    const requestId = `EMR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    emergencyRequest.requestId = requestId;
    
    await emergencyRequest.save();
    // WebSocket ile gerçek zamanlı bildirim gönder (simülatörde devre dışı)
    try {
      const webSocketService = req.app.get('webSocketService');
      if (webSocketService) {
        await webSocketService.handleEmergencyTowingRequest({
          requestId: emergencyRequest.requestId,
          userId: emergencyRequest.userId,
          vehicleInfo: emergencyRequest.vehicleInfo,
          location: emergencyRequest.location,
          userInfo: emergencyRequest.userInfo,
          emergencyDetails: emergencyRequest.emergencyDetails,
          createdAt: emergencyRequest.createdAt
        });
        } else {
        }
    } catch (wsError) {
      // WebSocket hatası olsa da HTTP response'u gönder - bu hata ana işlemi durdurmamalı
    }

    res.status(201).json({
      success: true,
      message: 'Acil çekici talebi oluşturuldu ve yakın çekicilere bildirim gönderildi.',
      data: {
        requestId: emergencyRequest.requestId,
        status: emergencyRequest.status,
        createdAt: emergencyRequest.createdAt
      }
    });

  } catch (error: unknown) {
    const errorObj = error as any;
    // Mongoose validation hatası
    if (errorObj.name === 'ValidationError') {
      const validationErrors = Object.values(errorObj.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Veri doğrulama hatası',
        errors: validationErrors
      });
    }
    
    // MongoDB duplicate key hatası
    if (errorObj.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bu talep zaten mevcut',
        error: errorObj.message
      });
    }
    
    console.error('❌ Emergency towing request error:', errorObj);
    
    // MongoDB connection error
    if (errorObj.name === 'MongoNetworkError' || errorObj.name === 'MongoTimeoutError') {
      return res.status(503).json({ 
        success: false, 
        message: 'Veritabanı bağlantı hatası. Lütfen daha sonra tekrar deneyin.',
        error: 'DATABASE_CONNECTION_ERROR' 
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Acil çekici talebi oluşturulurken hata oluştu.',
      error: process.env.NODE_ENV === 'development' ? errorObj.message : 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? errorObj.stack : undefined
    });
  }
});

// Acil talep durumunu getir
router.get('/towing-request/:requestId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const emergencyRequest = await EmergencyTowingRequest.findOne({
      requestId,
      userId
    });

    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Acil talep bulunamadı.'
      });
    }

    // Kabul eden çekici bilgilerini getir
    let acceptedMechanic = null;
    if (emergencyRequest.acceptedBy) {
      acceptedMechanic = await Mechanic.findById(emergencyRequest.acceptedBy)
        .select('name surname phone rating avatar');
    }

    res.json({
      success: true,
      data: {
        requestId: emergencyRequest.requestId,
        status: emergencyRequest.status,
        emergencyType: emergencyRequest.emergencyType,
        vehicleInfo: emergencyRequest.vehicleInfo,
        location: emergencyRequest.location,
        userInfo: emergencyRequest.userInfo,
        emergencyDetails: emergencyRequest.emergencyDetails,
        acceptedBy: acceptedMechanic,
        estimatedArrival: emergencyRequest.estimatedArrival,
        acceptedAt: emergencyRequest.acceptedAt,
        completedAt: emergencyRequest.completedAt,
        createdAt: emergencyRequest.createdAt,
        updatedAt: emergencyRequest.updatedAt
      }
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Acil talep durumu getirilirken hata oluştu.'
    });
  }
});

// Çekici yanıtı (kabul/red)
router.post('/mechanic-response', auth, async (req: AuthRequest, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { requestId, response, estimatedArrival, message } = req.body;

    if (!mechanicId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Çekici doğrulanamadı.' 
      });
    }

    if (!requestId || !response) {
      return res.status(400).json({
        success: false,
        message: 'Talep ID ve yanıt gerekli.'
      });
    }

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz yanıt. Kabul veya red olmalı.'
      });
    }

    const emergencyRequest = await EmergencyTowingRequest.findOne({
      requestId,
      status: 'pending'
    });

    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Acil talep bulunamadı veya zaten işlenmiş.'
      });
    }

    if (response === 'accepted') {
      // Talep kabul edildi
      await emergencyRequest.accept(mechanicId, estimatedArrival);
      
      // Kullanıcıya bildirim gönder
      await sendNotificationToUser(emergencyRequest.userId, {
        type: 'emergency_request_accepted',
        title: '🚨 Çekici Talebiniz Kabul Edildi!',
        message: `Çekici talebiniz kabul edildi. ${estimatedArrival ? `Tahmini varış süresi: ${estimatedArrival} dakika` : 'Çekici yolda.'}`,
        data: {
          requestId,
          mechanicId,
          estimatedArrival
        }
      });

      // WebSocket ile gerçek zamanlı bildirim
      const webSocketService = req.app.get('webSocketService');
      if (webSocketService) {
        const userSocket = webSocketService.getConnectedUsers().get(emergencyRequest.userId);
        if (userSocket) {
          userSocket.emit('request_accepted', {
            requestId,
            mechanicId,
            estimatedArrival,
            message: 'Çekici talebiniz kabul edildi! Çekici yolda.'
          });
        }
      }

    } else {
      // Talep reddedildi
      await emergencyRequest.reject(mechanicId);
      
      // WebSocket ile gerçek zamanlı bildirim
      const webSocketService = req.app.get('webSocketService');
      if (webSocketService) {
        const userSocket = webSocketService.getConnectedUsers().get(emergencyRequest.userId);
        if (userSocket) {
          userSocket.emit('request_rejected', {
            requestId,
            mechanicId,
            message: 'Bu çekici talebi kabul edemedi. Diğer çekiciler aranıyor...'
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Talep ${response === 'accepted' ? 'kabul' : 'red'} edildi.`,
      data: {
        requestId,
        response,
        estimatedArrival: response === 'accepted' ? estimatedArrival : undefined
      }
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Çekici yanıtı işlenirken hata oluştu.'
    });
  }
});

// Çekici için acil talepleri getir
router.get('/mechanic/emergency-requests', auth, async (req: AuthRequest, res: Response) => {
  try {
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Çekici doğrulanamadı.' 
      });
    }

    // Bekleyen acil talepleri getir
    const emergencyRequests = await EmergencyTowingRequest.find({
      status: 'pending',
      rejectedBy: { $ne: mechanicId }
    }).sort({ createdAt: -1 }).limit(20);

    res.json({
      success: true,
      data: emergencyRequests.map(request => ({
        requestId: request.requestId,
        vehicleInfo: request.vehicleInfo,
        location: request.location,
        userInfo: request.userInfo,
        emergencyDetails: request.emergencyDetails,
        createdAt: request.createdAt,
        distance: request.location.coordinates ? 
          calculateDistance(
            request.location.coordinates.latitude,
            request.location.coordinates.longitude,
            // Çekici konumu burada hesaplanacak
            0, 0
          ) : null
      }))
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Acil talepler getirilirken hata oluştu.'
    });
  }
});

// Çekici için kabul edilen talepleri getir
router.get('/mechanic/accepted-requests', auth, async (req: AuthRequest, res: Response) => {
  try {
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Çekici doğrulanamadı.' 
      });
    }

    const acceptedRequests = await EmergencyTowingRequest.find({
      acceptedBy: mechanicId,
      status: { $in: ['accepted', 'completed'] }
    }).sort({ acceptedAt: -1 });

    res.json({
      success: true,
      data: acceptedRequests
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Kabul edilen talepler getirilirken hata oluştu.'
    });
  }
});

// Talep durumunu güncelle (tamamlandı/iptal)
router.put('/towing-request/:requestId/status', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    if (!['completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum. Tamamlandı veya iptal olmalı.'
      });
    }

    const emergencyRequest = await EmergencyTowingRequest.findOne({
      requestId,
      $or: [
        { userId },
        { acceptedBy: userId }
      ]
    });

    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Acil talep bulunamadı veya yetkiniz yok.'
      });
    }

    if (status === 'completed') {
      await emergencyRequest.complete();
    } else {
      await emergencyRequest.cancel();
    }

    res.json({
      success: true,
      message: `Talep ${status === 'completed' ? 'tamamlandı' : 'iptal edildi'}.`,
      data: {
        requestId,
        status: emergencyRequest.status
      }
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Talep durumu güncellenirken hata oluştu.'
    });
  }
});

// Talep iptal et
router.post('/towing-request/:requestId/cancel', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const emergencyRequest = await EmergencyTowingRequest.findOne({
      requestId,
      userId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Acil talep bulunamadı veya iptal edilemez durumda.'
      });
    }

    await emergencyRequest.cancel();

    res.json({
      success: true,
      message: 'Acil talep başarıyla iptal edildi.',
      data: {
        requestId,
        status: emergencyRequest.status
      }
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Talep iptal edilirken hata oluştu.'
    });
  }
});

// Talep durumu getir (basit endpoint)
router.get('/towing-request/:requestId/status', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const emergencyRequest = await EmergencyTowingRequest.findOne({
      requestId,
      userId
    }).select('requestId status acceptedBy estimatedArrival acceptedAt completedAt createdAt');

    if (!emergencyRequest) {
      return res.status(404).json({
        success: false,
        message: 'Acil talep bulunamadı.'
      });
    }

    res.json({
      success: true,
      data: {
        requestId: emergencyRequest.requestId,
        status: emergencyRequest.status,
        acceptedBy: emergencyRequest.acceptedBy,
        estimatedArrival: emergencyRequest.estimatedArrival,
        acceptedAt: emergencyRequest.acceptedAt,
        completedAt: emergencyRequest.completedAt,
        createdAt: emergencyRequest.createdAt
      }
    });

  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: 'Talep durumu getirilirken hata oluştu.'
    });
  }
});

// Mesafe hesaplama fonksiyonu
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router;
