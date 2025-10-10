import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types/auth.d';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';

const router = express.Router();

// Çekici talebi oluştur - Acil çağrı sistemi
router.post('/towing', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const { 
      vehicleType, 
      reason, 
      pickupLocation, 
      dropoffLocation, 
      estimatedPrice,
      description,
      emergencyLevel = 'medium',
      towingType = 'flatbed'
    } = req.body;

    // Gerekli alanları kontrol et
    if (!vehicleType || !reason || !pickupLocation) {
      return res.status(400).json({
        success: false,
        message: 'Araç tipi, sebep ve alış konumu gerekli.'
      });
    }

    // Çekici talebi oluştur
    const towingRequest = new Appointment({
      userId,
      serviceType: 'towing',
      vehicleType,
      reason,
      pickupLocation,
      dropoffLocation,
      estimatedPrice,
      description,
      emergencyLevel,
      towingType,
      vehicleInfo: req.body.vehicleInfo,
      userInfo: req.body.userInfo,
      status: 'TALEP_EDILDI',
      requestType: 'immediate',
      appointmentDate: new Date(),
      timeSlot: 'Acil'
    });

    await towingRequest.save();

    res.status(201).json({
      success: true,
      message: 'Acil çekici talebi başarıyla oluşturuldu',
      data: towingRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çekici talebi oluşturulurken hata oluştu'
    });
  }
});

// Yıkama randevusu oluştur
router.post('/wash', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const { 
      packageType, 
      options, 
      appointmentDate, 
      timeSlot, 
      totalPrice,
      description,
      vehicleType = 'binek',
      vehicleBrand = '',
      vehicleModel = '',
      vehicleYear = '',
      specialRequests = ''
    } = req.body;

    // Gerekli alanları kontrol et
    if (!packageType || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Paket tipi, tarih ve saat gerekli.'
      });
    }

    // Yıkama randevusu oluştur - Usta verilerine entegre
    const washBooking = new Appointment({
      userId,
      serviceType: 'wash',
      packageType,
      options: options || [],
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      totalPrice,
      description,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      specialRequests,
      status: 'TALEP_EDILDI',
      requestType: 'scheduled'
    });

    await washBooking.save();

    res.status(201).json({
      success: true,
      message: 'Yıkama randevusu başarıyla oluşturuldu',
      data: washBooking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yıkama randevusu oluşturulurken hata oluştu'
    });
  }
});

// Lastik & Parça talebi oluştur
router.post('/tire-parts', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const { 
      partType, 
      vehicleInfo, 
      tireSize, 
      tireBrand = '',
      tireModel = '',
      season = 'all-season',
      quantity, 
      estimatedPrice,
      description,
      specialRequests = ''
    } = req.body;

    // Gerekli alanları kontrol et
    if (!partType) {
      return res.status(400).json({
        success: false,
        message: 'Parça tipi gerekli.'
      });
    }

    // Lastik & Parça talebi oluştur - Usta verilerine entegre
    const tirePartsRequest = new Appointment({
      userId,
      serviceType: 'tire_parts',
      partType,
      vehicleInfo: vehicleInfo || {},
      tireSize,
      tireBrand,
      tireModel,
      season,
      quantity: quantity || 1,
      estimatedPrice,
      description,
      specialRequests,
      status: 'TALEP_EDILDI',
      requestType: 'quoted'
    });

    await tirePartsRequest.save();

    res.status(201).json({
      success: true,
      message: 'Lastik & Parça talebi başarıyla oluşturuldu',
      data: tirePartsRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lastik & Parça talebi oluşturulurken hata oluştu'
    });
  }
});

// Usta yeteneklerine göre talepleri getir
router.get('/mechanic-requests', auth, async (req: AuthRequest, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usta doğrulanamadı.' 
      });
    }

    // Ustanın yeteneklerini al
    const mechanic = await User.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı.'
      });
    }

    const capabilities = mechanic.serviceCategories || [];
    
    // Ustanın yeteneklerine göre talepleri getir
    const requests = await Appointment.find({
      serviceType: { $in: capabilities },
      status: 'TALEP_EDILDI'
    })
    .populate('userId', 'name surname phone')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Usta talepleri getirilirken hata oluştu'
    });
  }
});

// Belirli hizmet türüne göre ustaları getir
router.get('/mechanics-by-service/:serviceType', async (req: Request, res: Response) => {
  try {
    const { serviceType } = req.params;
    
    // Geçerli hizmet türlerini kontrol et
    const validServiceTypes = ['towing', 'repair', 'wash', 'tire'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz hizmet türü.'
      });
    }

    // Bu hizmet türünde çalışan ustaları getir
    const mechanics = await User.find({
      userType: 'mechanic',
      serviceCategories: serviceType,
      isAvailable: true
    })
    .select('name surname shopName rating ratingCount experience city serviceCategories location avatar')
    .sort({ rating: -1 })
    .lean(); // Performans için lean() ekle

    // Gerçek usta verilerini kullan
    let formattedMechanics;
    if (mechanics.length === 0) {
      formattedMechanics = []; // Mock data kaldırıldı
    } else {
      // Frontend için uygun formata çevir
      formattedMechanics = mechanics.map(mechanic => ({
        id: mechanic._id,
        name: mechanic.shopName || `${mechanic.name} ${mechanic.surname}`,
        rating: mechanic.rating || 0,
        address: `${mechanic.location?.neighborhood || ''} ${mechanic.location?.street || ''}`.trim() || `${mechanic.city || 'Şehir belirtilmemiş'}`,
        distance: '2.5 km', // TODO: Gerçek mesafe hesaplama
        image: mechanic.avatar,
        serviceCategories: mechanic.serviceCategories
      }));
    }

    res.status(200).json({
      success: true,
      data: formattedMechanics
    });
  } catch (error: any) {
    console.error('❌ Get mechanics by service error:', error);
    
    // Detaylı hata bilgisi
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz servis türü formatı',
        error: error.message 
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Veri doğrulama hatası',
        error: error.message 
      });
    }
    
    // MongoDB connection error
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return res.status(503).json({ 
        success: false, 
        message: 'Veritabanı bağlantı hatası. Lütfen daha sonra tekrar deneyin.',
        error: 'DATABASE_CONNECTION_ERROR' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Çekici talebi detayını getir
router.get('/towing/:requestId', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const towingRequest = await Appointment.findOne({
      _id: requestId,
      userId,
      serviceType: 'towing'
    });

    if (!towingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Talep bulunamadı'
      });
    }

    res.json({
      success: true,
      data: towingRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Talep bilgileri alınırken hata oluştu'
    });
  }
});

export default router;
