import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { WashService } from '../services/wash.service';
import { WashSlotService } from '../services/washSlot.service';
import { WashPackage } from '../models/WashPackage';
import { WashProvider } from '../models/WashProvider';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

// ==================== DV (Driver) Endpoints ====================

/**
 * POST /api/wash/quote
 * Fiyat teklifi al
 */
router.post('/quote', auth, validate(Joi.object({
  packageId: Joi.string().required(),
  vehicleSegment: Joi.string().valid('A', 'B', 'C', 'SUV', 'Commercial').required(),
  type: Joi.string().valid('shop', 'mobile').required(),
  providerId: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number(),
    longitude: Joi.number(),
  }),
  scheduledDate: Joi.date(),
})), async (req: Request, res: Response) => {
  try {
    const result = await WashService.createQuote(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Fiyat teklifi oluşturulamadı',
    });
  }
});

/**
 * POST /api/wash/order
 * Sipariş oluştur
 */
router.post('/order', auth, validate(Joi.object({
  providerId: Joi.string().required(),
  packageId: Joi.string().required(),
  vehicleId: Joi.string(),
  vehicle: Joi.object({
    brand: Joi.string().required(),
    model: Joi.string().required(),
    year: Joi.number(),
    plateNumber: Joi.string(),
    segment: Joi.string().valid('A', 'B', 'C', 'SUV', 'Commercial').required(),
  }).required(),
  type: Joi.string().valid('shop', 'mobile').required(),
  location: Joi.object({
    address: Joi.string().required(),
    latitude: Joi.number(),
    longitude: Joi.number(),
    requiresPower: Joi.boolean(),
    requiresWater: Joi.boolean(),
    isIndoorParking: Joi.boolean(),
  }).required(),
  scheduling: Joi.object({
    slotStart: Joi.date(),
    slotEnd: Joi.date(),
    timeWindowStart: Joi.date(),
    timeWindowEnd: Joi.date(),
  }).required(),
  laneId: Joi.string(),
  tefePuanUsed: Joi.number().min(0),
  paymentMethod: Joi.string().valid('wallet', 'card').default('card'),
  cardInfo: Joi.object({
    cardNumber: Joi.string().required(),
    cardHolderName: Joi.string().required(),
    expiryMonth: Joi.string().required(),
    expiryYear: Joi.string().required(),
    cvv: Joi.string().required(),
  }).required(),
  extras: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    price: Joi.number().required(),
    duration: Joi.number().required(),
  })),
  note: Joi.string().allow(''),
})), async (req: Request, res: Response) => {
  try {
    const driverId = req.user?.userId;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı',
      });
    }

    const result = await WashService.createOrder({
      ...req.body,
      driverId,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Sipariş oluşturulamadı',
    });
  }
});

/**
 * GET /api/wash/order/:id
 * Sipariş detayı
 */
router.get('/order/:id', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı',
      });
    }

    const result = await WashService.getOrder(req.params.id, userId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Sipariş detayı getirilemedi',
    });
  }
});

/**
 * POST /api/wash/order/:id/cancel
 * Siparişi iptal et
 */
router.post('/order/:id/cancel', auth, validate(Joi.object({
  reason: Joi.string().required(),
})), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı',
      });
    }

    const result = await WashService.cancelOrder({
      orderId: req.params.id,
      userId,
      cancelledBy: userRole === 'mechanic' ? 'provider' : 'driver',
      reason: req.body.reason,
    });

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Sipariş iptal edilemedi',
    });
  }
});

/**
 * POST /api/wash/order/:id/qa-approve
 * QA onayla (driver)
 */
router.post('/order/:id/qa-approve', auth, validate(Joi.object({
  approved: Joi.boolean().required(),
  feedback: Joi.string(),
})), async (req: Request, res: Response) => {
  try {
    const driverId = req.user?.userId;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı',
      });
    }

    const result = await WashService.approveQA({
      orderId: req.params.id,
      driverId,
      approved: req.body.approved,
      feedback: req.body.feedback,
    });

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'QA onaylanamadı',
    });
  }
});

/**
 * GET /api/wash/my-orders
 * Sürücü siparişlerini listele
 */
router.get('/my-orders', auth, async (req: Request, res: Response) => {
  try {
    const driverId = req.user?.userId;
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı',
      });
    }

    const status = req.query.status as string | undefined;
    const result = await WashService.getDriverOrders(driverId, status);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Siparişler getirilemedi',
    });
  }
});

/**
 * GET /api/wash/providers
 * Yakındaki işletmeleri listele
 * NOT: Public endpoint - herkes görebilmeli
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, type, maxDistance } = req.query;

    const query: any = {
      isActive: true,
      isVerified: true,
    };

    if (type) {
      query.$or = [
        { type: type },
        { type: 'both' },
      ];
    }

    let providers = await WashProvider.find(query)
      .populate('userId', 'name surname phone profilePhotoUrl')
      .lean();

    // Mesafe hesapla ve sırala (eğer konum gönderildiyse)
    if (latitude && longitude) {
      const userLat = parseFloat(latitude as string);
      const userLng = parseFloat(longitude as string);

      providers = providers.map(provider => {
        const distance = WashService.calculateDistance(
          { latitude: userLat, longitude: userLng },
          provider.location.coordinates
        );
        return { ...provider, distance };
      });

      // Mesafeye göre sırala
      providers.sort((a: any, b: any) => a.distance - b.distance);

      // Maksimum mesafe filtresi
      if (maxDistance) {
        const maxDist = parseFloat(maxDistance as string);
        providers = providers.filter((p: any) => p.distance <= maxDist);
      }
    } else {
      // Konum yoksa şehre göre sırala
      providers.sort((a: any, b: any) => {
        return a.location.city.localeCompare(b.location.city, 'tr');
      });
    }

    res.json({
      success: true,
      data: providers,
      message: 'İşletmeler getirildi',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'İşletmeler getirilemedi',
    });
  }
});

// ==================== US (Provider) Endpoints ====================

/**
 * GET /api/wash/jobs
 * İşletme siparişlerini listele
 */
router.get('/jobs', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const status = req.query.status as string | undefined;
    const result = await WashService.getProviderOrders(providerId, status);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Siparişler getirilemedi',
    });
  }
});

/**
 * POST /api/wash/jobs/:id/accept
 * Siparişi kabul et
 */
router.post('/jobs/:id/accept', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const result = await WashService.acceptOrder(req.params.id, providerId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Sipariş kabul edilemedi',
    });
  }
});

/**
 * POST /api/wash/jobs/:id/checkin
 * Check-in yap
 */
router.post('/jobs/:id/checkin', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const result = await WashService.checkIn(req.params.id, providerId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Check-in başarısız',
    });
  }
});

/**
 * POST /api/wash/jobs/:id/start
 * İşlemi başlat
 */
router.post('/jobs/:id/start', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const result = await WashService.startWork(req.params.id, providerId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İşlem başlatılamadı',
    });
  }
});

/**
 * POST /api/wash/jobs/:id/progress
 * İlerleme güncelle
 */
router.post('/jobs/:id/progress', auth, validate(Joi.object({
  stepIndex: Joi.number().required(),
  photos: Joi.array().items(Joi.string()),
  notes: Joi.string(),
  completed: Joi.boolean(),
})), async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const result = await WashService.updateProgress({
      orderId: req.params.id,
      providerId,
      ...req.body,
    });

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İlerleme güncellenemedi',
    });
  }
});

/**
 * POST /api/wash/jobs/:id/qa-submit
 * QA gönder
 */
router.post('/jobs/:id/qa-submit', auth, validate(Joi.object({
  photosBefore: Joi.array().items(Joi.string()).required(),
  photosAfter: Joi.array().items(Joi.string()).required(),
})), async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const result = await WashService.submitQA({
      orderId: req.params.id,
      providerId,
      ...req.body,
    });

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'QA gönderilemedi',
    });
  }
});

// ==================== Slot Yönetimi ====================

/**
 * GET /api/wash/slots/available
 * Müsait slotları getir
 */
router.get('/slots/available', auth, async (req: Request, res: Response) => {
  try {
    const { providerId, date, duration } = req.query;

    if (!providerId || !date || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Eksik parametreler',
      });
    }

    const result = await WashSlotService.getAvailableSlots({
      providerId: providerId as string,
      date: new Date(date as string),
      duration: parseInt(duration as string),
    });

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Slotlar getirilemedi',
    });
  }
});

/**
 * GET /api/wash/slots/occupancy
 * Doluluk oranı
 */
router.get('/slots/occupancy', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const { date } = req.query;

    if (!providerId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Eksik parametreler',
      });
    }

    const result = await WashSlotService.calculateOccupancyRate(
      providerId,
      new Date(date as string)
    );

    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Doluluk oranı hesaplanamadı',
    });
  }
});

// ==================== Paketler ====================

/**
 * GET /api/wash/packages
 * Paketleri listele
 * 
 * NOT: providerId ZORUNLU - Her usta kendi paketlerini oluşturmalı
 * Genel/varsayılan paket sistemi YOK
 */
router.get('/packages', async (req: Request, res: Response) => {
  try {
    const { providerId, type } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'providerId parametresi gerekli',
      });
    }

    const query: any = { 
      isActive: true,
      providerId: providerId // SADECE bu provider'ın paketleri
    };

    if (type) {
      query.availableFor = { $in: [type, 'both'] };
    }

    const packages = await WashPackage.find(query).sort({ sortOrder: 1, isPopular: -1 });

    res.json({
      success: true,
      data: packages,
      message: 'Paketler getirildi',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Paketler getirilemedi',
    });
  }
});

/**
 * POST /api/wash/packages/create
 * Paket oluştur (provider)
 */
router.post('/packages/create', auth, validate(Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  packageType: Joi.string().valid('quick_exterior', 'standard', 'detailed_interior', 'ceramic_protection', 'engine', 'custom').required(),
  basePrice: Joi.number().min(0).required(),
  duration: Joi.number().min(5).required(),
  services: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    category: Joi.string().valid('exterior', 'interior', 'engine', 'special').required(),
    order: Joi.number().required(),
  })),
  extras: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().min(0).required(),
    duration: Joi.number().min(0).required(),
  })),
  availableFor: Joi.string().valid('shop', 'mobile', 'both'),
  requirements: Joi.object({
    requiresPower: Joi.boolean(),
    requiresWater: Joi.boolean(),
    requiresCoveredArea: Joi.boolean(),
  }),
})), async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    // İş adımlarını otomatik oluştur
    const workSteps = req.body.services?.map((service: any, index: number) => ({
      step: service.name.toLowerCase().replace(/\s+/g, '_'),
      name: service.name,
      order: index + 1,
      requiresPhoto: index === 0 || index === req.body.services.length - 1, // İlk ve son adım foto gerektirir
    })) || [];

    // Final check adımı ekle
    workSteps.push({
      step: 'final_check',
      name: 'Son Kontrol',
      order: workSteps.length + 1,
      requiresPhoto: true,
    });

    const newPackage = new WashPackage({
      ...req.body,
      providerId,
      workSteps,
      isActive: true,
      sortOrder: 0,
    });

    await newPackage.save();

    res.status(201).json({
      success: true,
      data: newPackage,
      message: 'Paket başarıyla oluşturuldu',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Paket oluşturulamadı',
    });
  }
});

/**
 * PUT /api/wash/packages/:id
 * Paketi güncelle (provider)
 */
router.put('/packages/:id', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const washPackage = await WashPackage.findOne({
      _id: req.params.id,
      providerId,
    });

    if (!washPackage) {
      return res.status(404).json({
        success: false,
        message: 'Paket bulunamadı',
      });
    }

    Object.assign(washPackage, req.body);
    await washPackage.save();

    res.json({
      success: true,
      data: washPackage,
      message: 'Paket güncellendi',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Paket güncellenemedi',
    });
  }
});

/**
 * DELETE /api/wash/packages/:id
 * Paketi sil (soft delete)
 */
router.delete('/packages/:id', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const washPackage = await WashPackage.findOne({
      _id: req.params.id,
      providerId,
    });

    if (!washPackage) {
      return res.status(404).json({
        success: false,
        message: 'Paket bulunamadı',
      });
    }

    washPackage.isActive = false;
    await washPackage.save();

    res.json({
      success: true,
      message: 'Paket silindi',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Paket silinemedi',
    });
  }
});

/**
 * GET /api/wash/my-packages
 * Kendi paketlerimi getir (provider)
 */
router.get('/my-packages', auth, async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!providerId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const packages = await WashPackage.find({ providerId }).sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      data: packages,
      message: 'Paketler getirildi',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Paketler getirilemedi',
    });
  }
});

// ==================== Provider Yönetimi ====================

/**
 * POST /api/wash/provider/setup
 * Provider profili oluştur/güncelle
 */
router.post('/provider/setup', auth, validate(Joi.object({
  businessName: Joi.string().required(),
  type: Joi.string().valid('shop', 'mobile', 'both').required(),
  location: Joi.object({
    address: Joi.string().required(),
    city: Joi.string().required(),
    district: Joi.string().required(),
    coordinates: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
    }).required(),
  }).required(),
  shop: Joi.object({
    hasLanes: Joi.boolean(),
    laneCount: Joi.number().min(1).max(10),
    totalCapacity: Joi.number().min(1),
    workingHours: Joi.array().items(Joi.object({
      day: Joi.number().min(0).max(6),
      isOpen: Joi.boolean(),
      openTime: Joi.string(),
      closeTime: Joi.string(),
    })),
  }),
  mobile: Joi.object({
    maxDistance: Joi.number().min(1).max(100),
    equipment: Joi.object({
      hasWaterTank: Joi.boolean(),
      waterCapacity: Joi.number(),
      hasGenerator: Joi.boolean(),
      generatorPower: Joi.number(),
      hasVacuum: Joi.boolean(),
    }),
    pricing: Joi.object({
      baseDistanceFee: Joi.number(),
      perKmFee: Joi.number(),
    }),
  }),
})), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!userId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const provider = await WashProvider.findOneAndUpdate(
      { userId },
      { ...req.body, userId },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: provider,
      message: 'İşletme ayarları kaydedildi',
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İşletme ayarları kaydedilemedi',
    });
  }
});

/**
 * GET /api/wash/provider/my-profile
 * Kendi provider profilimi getir
 */
router.get('/provider/my-profile', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.userType;

    if (!userId || userRole !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    const provider = await WashProvider.findOne({ userId });

    res.json({
      success: true,
      data: provider,
      message: 'İşletme profili getirildi',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'İşletme profili getirilemedi',
    });
  }
});

export default router;


