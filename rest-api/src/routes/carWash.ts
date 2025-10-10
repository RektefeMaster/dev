import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { CarWashService } from '../services/carWash.service';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

// Yeni yıkama paketi oluştur
router.post('/packages', auth, validate(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    packageType: Joi.string().valid('basic', 'premium', 'deluxe', 'detailing', 'custom').required(),
    services: Joi.array().items(Joi.object({
      serviceName: Joi.string().required(),
      serviceType: Joi.string().valid('exterior', 'interior', 'engine', 'special').required(),
      duration: Joi.number().min(0).required(),
      price: Joi.number().min(0).required(),
      description: Joi.string().required(),
      isOptional: Joi.boolean().default(false),
      order: Joi.number().required()
    })).required(),
    basePrice: Joi.number().min(0).required(),
    vehicleTypeMultipliers: Joi.object({
      car: Joi.number().min(0).default(1.0),
      suv: Joi.number().min(0).default(1.2),
      truck: Joi.number().min(0).default(1.5),
      motorcycle: Joi.number().min(0).default(0.6),
      van: Joi.number().min(0).default(1.3)
    }).required(),
    features: Joi.object({
      includesInterior: Joi.boolean().default(false),
      includesExterior: Joi.boolean().default(true),
      includesEngine: Joi.boolean().default(false),
      includesWaxing: Joi.boolean().default(false),
      includesPolishing: Joi.boolean().default(false),
      includesDetailing: Joi.boolean().default(false),
      ecoFriendly: Joi.boolean().default(false),
      premiumProducts: Joi.boolean().default(false)
    }).required(),
    images: Joi.array().items(Joi.string()),
    thumbnail: Joi.string()
  })), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await CarWashService.createPackage({
      ...req.body,
      mechanicId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Paket oluşturulurken hata oluştu'
    });
  }
});

// Paketleri getir
router.get('/packages', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { packageType } = req.query;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await CarWashService.getMechanicPackages(mechanicId, packageType as string);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Paketler getirilirken hata oluştu'
    });
  }
});

// Yıkama işi oluştur
router.post('/jobs', auth, validate(Joi.object({
    customerId: Joi.string().required(),
    vehicleId: Joi.string().required(),
    packageId: Joi.string().required(),
    vehicleInfo: Joi.object({
      brand: Joi.string().required(),
      model: Joi.string().required(),
      year: Joi.number().required(),
      plateNumber: Joi.string().required(),
      vehicleType: Joi.string().valid('car', 'suv', 'truck', 'motorcycle', 'van').required(),
      color: Joi.string().required(),
      size: Joi.string().valid('small', 'medium', 'large', 'extra_large').required()
    }).required(),
    location: Joi.object({
      address: Joi.string().required(),
      coordinates: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required()
      }).required(),
      isMobile: Joi.boolean().default(false)
    }).required(),
    specialRequests: Joi.array().items(Joi.string()),
    notes: Joi.string(),
    scheduledAt: Joi.date()
  })), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await CarWashService.createJob({
      ...req.body,
      mechanicId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Yıkama işi oluşturulurken hata oluştu'
    });
  }
});

// Yıkama işini başlat
router.post('/jobs/:jobId/start', auth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await CarWashService.startJob(jobId, mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İş başlatılırken hata oluştu'
    });
  }
});

// Hizmeti tamamla
router.post('/jobs/:jobId/services/:serviceName/complete', auth, validate(Joi.object({
  photos: Joi.array().items(Joi.string()),
  notes: Joi.string()
})), async (req: Request, res: Response) => {
  try {
    const { jobId, serviceName } = req.params;
    const { photos, notes } = req.body;

    const result = await CarWashService.completeService(jobId, serviceName, photos, notes);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Hizmet tamamlanırken hata oluştu'
    });
  }
});

// Yıkama işini tamamla
router.post('/jobs/:jobId/complete', auth, validate(Joi.object({
  passed: Joi.boolean().required(),
  checkedBy: Joi.string().required(),
  issues: Joi.array().items(Joi.string()),
  photos: Joi.array().items(Joi.string()),
  customerRating: Joi.number().min(1).max(5),
  customerFeedback: Joi.string()
})), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const result = await CarWashService.completeJob(jobId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İş tamamlanırken hata oluştu'
    });
  }
});

// Yıkama işlerini getir
router.get('/jobs', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { status, date } = req.query;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await CarWashService.getMechanicJobs(
      mechanicId,
      status as string,
      date as string
    );
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Yıkama işleri getirilirken hata oluştu'
    });
  }
});

// Yıkama işi detayını getir
router.get('/jobs/:jobId', auth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await CarWashService.getMechanicJobs(mechanicId);
    const job = result.data.find((j: any) => j._id.toString() === jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'İş bulunamadı'
      });
    }

    res.json({
      success: true,
      data: job,
      message: 'İş detayı getirildi'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İş detayı getirilirken hata oluştu'
    });
  }
});

// Sadakat programı oluştur/güncelle
router.post('/loyalty-program', auth, validate(Joi.object({
  programName: Joi.string().required(),
  description: Joi.string().required(),
  loyaltyLevels: Joi.array().items(Joi.object({
      level: Joi.string().valid('bronze', 'silver', 'gold', 'platinum').required(),
      levelName: Joi.string().required(),
      minVisits: Joi.number().min(0).required(),
      minSpent: Joi.number().min(0).required(),
      benefits: Joi.object({
        discountPercentage: Joi.number().min(0).max(100).required(),
        priorityService: Joi.boolean().default(false),
        freeUpgrades: Joi.boolean().default(false),
        specialOffers: Joi.boolean().default(false),
        birthdayDiscount: Joi.number().min(0).max(100).default(0)
      }).required(),
      color: Joi.string().required(),
      icon: Joi.string().required()
    })).required(),
    campaigns: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      description: Joi.string().required(),
      type: Joi.string().valid('visit_based', 'spending_based', 'seasonal', 'referral').required(),
      conditions: Joi.object({
        minVisits: Joi.number().min(0),
        minSpent: Joi.number().min(0),
        validFrom: Joi.date().required(),
        validTo: Joi.date().required(),
        targetLevels: Joi.array().items(Joi.string())
      }).required(),
      rewards: Joi.object({
        discountPercentage: Joi.number().min(0).max(100),
        freeService: Joi.string(),
        bonusPoints: Joi.number().min(0),
        specialOffer: Joi.string()
      }).required(),
      isActive: Joi.boolean().default(true)
    })),
    referralProgram: Joi.object({
      enabled: Joi.boolean().default(false),
      referrerReward: Joi.object({
        type: Joi.string().valid('discount', 'points', 'free_service'),
        value: Joi.number().min(0),
        description: Joi.string()
      }),
      refereeReward: Joi.object({
        type: Joi.string().valid('discount', 'points', 'free_service'),
        value: Joi.number().min(0),
        description: Joi.string()
      }),
      maxReferrals: Joi.number().default(10)
    }),
    birthdayCampaign: Joi.object({
      enabled: Joi.boolean().default(false),
      discountPercentage: Joi.number().min(0).max(100).default(0),
      validDays: Joi.number().default(7),
      specialOffer: Joi.string()
    }),
    pointsSystem: Joi.object({
      enabled: Joi.boolean().default(false),
      pointsPerVisit: Joi.number().default(10),
      pointsPerSpent: Joi.number().default(1),
      pointsToDiscount: Joi.number().default(100),
      maxDiscountPercentage: Joi.number().default(50),
      pointsExpiryDays: Joi.number().default(365)
    })
  })), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await CarWashService.setupLoyaltyProgram({
      ...req.body,
      mechanicId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Sadakat programı oluşturulurken hata oluştu'
    });
  }
});

// Sadakat programını getir
router.get('/loyalty-program', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const loyaltyProgram = await CarWashService.getLoyaltyProgram(mechanicId);

    res.json({
      success: true,
      data: loyaltyProgram,
      message: 'Sadakat programı getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Sadakat programı getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
