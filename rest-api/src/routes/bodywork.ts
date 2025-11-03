import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { BodyworkService } from '../services/bodywork.service';
import { validate } from '../middleware/validate';
import Joi from 'joi';
import { BodyworkTemplate } from '../models/BodyworkTemplate';
import { BodyworkJob } from '../models/BodyworkJob';
import mongoose from 'mongoose';
import { Wallet } from '../models/Wallet';
import { TefePointService } from '../services/tefePoint.service';

const router = Router();

// ===== TEMPLATE ROUTES (Dynamic routes'dan ÖNCE olmalı) =====

// Şablonları getir - ÖNEMLİ: Bu route mutlaka dynamic route'lardan ÖNCE olmalı
router.get('/templates', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { damageType, severity } = req.query;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz usta ID'
      });
    }

    const query: any = { 
      mechanicId: new mongoose.Types.ObjectId(mechanicId), 
      isActive: true 
    };
    if (damageType) query.damageType = damageType;
    if (severity) query.severity = severity;

    const templates = await BodyworkTemplate.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: templates,
      message: 'Şablonlar getirildi'
    });
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Şablonlar getirilirken hata oluştu'
    });
  }
});

// Şablon oluştur
router.post('/templates', auth, validate(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    damageType: Joi.string().valid('collision', 'scratch', 'dent', 'rust', 'paint_damage', 'other').required(),
    severity: Joi.string().valid('minor', 'moderate', 'major', 'severe').required(),
    workflowTemplate: Joi.array().items(Joi.object({
      stage: Joi.string().required(),
      stageName: Joi.string().required(),
      estimatedHours: Joi.number().min(0).required(),
      requiredPhotos: Joi.number().min(0).default(1),
      description: Joi.string().required(),
      order: Joi.number().required()
    })).required(),
    standardParts: Joi.array().items(Joi.object({
      partName: Joi.string().required(),
      partNumber: Joi.string(),
      brand: Joi.string().required(),
      estimatedPrice: Joi.number().min(0).required(),
      notes: Joi.string()
    })).required(),
    standardMaterials: Joi.array().items(Joi.object({
      materialName: Joi.string().required(),
      estimatedQuantity: Joi.number().min(0).required(),
      estimatedPrice: Joi.number().min(0).required(),
      notes: Joi.string()
    })).required(),
    laborRates: Joi.object({
      hourlyRate: Joi.number().min(0).required(),
      overtimeRate: Joi.number().min(0).required(),
      weekendRate: Joi.number().min(0).required()
    }).required()
  })), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.createTemplate({
      ...req.body,
      mechanicId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Şablon oluşturulurken hata oluştu'
    });
  }
});

// Şablon detayını getir
router.get('/templates/:templateId', auth, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.getTemplateById(templateId, mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Şablon getirilirken hata oluştu'
    });
  }
});

// Şablonu güncelle
router.put('/templates/:templateId', auth, validate(Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    workflowTemplate: Joi.array().items(Joi.object({
      stage: Joi.string().required(),
      stageName: Joi.string().required(),
      estimatedHours: Joi.number().min(0).required(),
      requiredPhotos: Joi.number().min(0).default(1),
      description: Joi.string().required(),
      order: Joi.number().required()
    })),
    standardParts: Joi.array().items(Joi.object({
      partName: Joi.string().required(),
      partNumber: Joi.string(),
      brand: Joi.string().required(),
      estimatedPrice: Joi.number().min(0).required(),
      notes: Joi.string()
    })),
    standardMaterials: Joi.array().items(Joi.object({
      materialName: Joi.string().required(),
      estimatedQuantity: Joi.number().min(0).required(),
      estimatedPrice: Joi.number().min(0).required(),
      notes: Joi.string()
    })),
    laborRates: Joi.object({
      hourlyRate: Joi.number().min(0),
      overtimeRate: Joi.number().min(0),
      weekendRate: Joi.number().min(0)
    }),
    isActive: Joi.boolean()
  })), async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.updateTemplate(templateId, mechanicId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Şablon güncellenirken hata oluştu'
    });
  }
});

// Şablonu sil
router.delete('/templates/:templateId', auth, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.deleteTemplate(templateId, mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Şablon silinirken hata oluştu'
    });
  }
});

// ===== JOB ROUTES =====

// Yeni kaporta/boya işi oluştur
router.post('/create', auth, validate(Joi.object({
  customerId: Joi.string().required(),
  vehicleId: Joi.string().required(),
  damageInfo: Joi.object({
    description: Joi.string().required(),
    photos: Joi.array().items(Joi.string()).required(),
    videos: Joi.array().items(Joi.string()),
    damageType: Joi.string().valid('collision', 'scratch', 'dent', 'rust', 'paint_damage', 'other').required(),
    severity: Joi.string().valid('minor', 'moderate', 'major', 'severe').required(),
    affectedAreas: Joi.array().items(Joi.string()).required(),
    estimatedRepairTime: Joi.number().min(0).required()
  }).required()
})), async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.createBodyworkJob({
      ...req.body,
      mechanicId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kaporta işi oluşturulurken hata oluştu'
    });
  }
});

// ÖNEMLİ: Dynamic route'lar - Bunlar /templates route'undan SONRA olmalı
// Teklif hazırla
router.post('/:jobId/prepare-quote', auth, validate(Joi.object({
    partsToReplace: Joi.array().items(Joi.object({
      partName: Joi.string().required(),
      partNumber: Joi.string(),
      brand: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      notes: Joi.string()
    })).required(),
    partsToRepair: Joi.array().items(Joi.object({
      partName: Joi.string().required(),
      laborHours: Joi.number().min(0).required(),
      laborRate: Joi.number().min(0).required(),
      notes: Joi.string()
    })).required(),
    paintMaterials: Joi.array().items(Joi.object({
      materialName: Joi.string().required(),
      quantity: Joi.number().min(0).required(),
      unitPrice: Joi.number().min(0).required(),
      notes: Joi.string()
    })).required(),
    validityDays: Joi.number().min(1).max(90)
  })), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }
    const result = await BodyworkService.prepareQuote(jobId, mechanicId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teklif hazırlanırken hata oluştu'
    });
  }
});

// Teklifi gönder
router.post('/:jobId/send-quote', auth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }
    const result = await BodyworkService.sendQuote(jobId, mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teklif gönderilirken hata oluştu'
    });
  }
});

// İş akışı aşamasını güncelle
router.put('/:jobId/workflow-stage', auth, validate(Joi.object({
    stage: Joi.string().required(),
    status: Joi.string().valid('in_progress', 'completed', 'skipped').required(),
    photos: Joi.array().items(Joi.string()),
    notes: Joi.string(),
    assignedTo: Joi.string()
  })), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }
    const result = await BodyworkService.updateWorkflowStage(jobId, mechanicId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İş akışı güncellenirken hata oluştu'
    });
  }
});

// Müşteri onayı iste
router.post('/:jobId/request-approval', auth, validate(Joi.object({
    stage: Joi.string().required(),
    photos: Joi.array().items(Joi.string())
  })), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }
    const result = await BodyworkService.requestCustomerApproval(jobId, mechanicId, req.body.stage, req.body.photos);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Müşteri onayı istenirken hata oluştu'
    });
  }
});

// Kalite kontrol yap
router.post('/:jobId/quality-check', auth, validate(Joi.object({
    passed: Joi.boolean().required(),
    checkedBy: Joi.string().required(),
    issues: Joi.array().items(Joi.string()),
    photos: Joi.array().items(Joi.string()),
    notes: Joi.string()
  })), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }
    const result = await BodyworkService.performQualityCheck(jobId, mechanicId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kalite kontrol yapılırken hata oluştu'
    });
  }
});

// Ustanın kaporta işlerini getir
router.get('/mechanic-jobs', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { status, page, limit } = req.query;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    const result = await BodyworkService.getMechanicBodyworkJobs(mechanicId, status as string, pageNum, limitNum);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kaporta işleri getirilirken hata oluştu'
    });
  }
});

// ===== MÜŞTERİ TARAFI ENDPOINT'LERİ =====

// Müşteri iş oluşturma
router.post('/customer/create', auth, validate(Joi.object({
  vehicleId: Joi.string().required(),
  mechanicId: Joi.string().optional(),
  damageInfo: Joi.object({
    description: Joi.string().required(),
    photos: Joi.array().items(Joi.string()).required(),
    videos: Joi.array().items(Joi.string()),
    damageType: Joi.string().valid('collision', 'scratch', 'dent', 'rust', 'paint_damage', 'other').required(),
    severity: Joi.string().valid('minor', 'moderate', 'major', 'severe').required(),
    affectedAreas: Joi.array().items(Joi.string()).required(),
    estimatedRepairTime: Joi.number().min(0).required()
  }).required()
})), async (req: Request, res: Response) => {
  try {
    const customerId = req.user?.userId;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.createCustomerBodyworkJob({
      customerId,
      vehicleId: req.body.vehicleId,
      mechanicId: req.body.mechanicId,
      damageInfo: req.body.damageInfo
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kaporta işi oluşturulurken hata oluştu'
    });
  }
});

// Müşteri işleri listeleme
router.get('/customer/jobs', auth, async (req: Request, res: Response) => {
  try {
    const customerId = req.user?.userId;
    const { status, page, limit } = req.query;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;

    const result = await BodyworkService.getCustomerBodyworkJobs(customerId, status as string, pageNum, limitNum);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kaporta işleri getirilirken hata oluştu'
    });
  }
});

// Müşteri iş detayı
router.get('/customer/:jobId', auth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const customerId = req.user?.userId;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }
    
    // ObjectId validation - eğer geçersiz ObjectId ise bu route'a gitmemeli
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(404).json({
        success: false,
        message: 'İş bulunamadı'
      });
    }

    const result = await BodyworkService.getCustomerBodyworkJobById(jobId, customerId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İş detayı getirilirken hata oluştu'
    });
  }
});

// Teklif onaylama/reddetme
router.post('/:jobId/customer/quote-response', auth, validate(Joi.object({
  action: Joi.string().valid('accept', 'reject').required(),
  rejectionReason: Joi.string().optional()
})), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const customerId = req.user?.userId;
    const { action, rejectionReason } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.respondToQuote(jobId, customerId, action, rejectionReason);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teklif yanıtı verilirken hata oluştu'
    });
  }
});

// Müşteri aşama onayı
router.post('/:jobId/customer/approve-stage', auth, validate(Joi.object({
  stage: Joi.string().required(),
  approved: Joi.boolean().required(),
  notes: Joi.string().optional()
})), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const customerId = req.user?.userId;
    const { stage, approved, notes } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.approveStage(jobId, customerId, stage, approved, notes);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Aşama onayı verilirken hata oluştu'
    });
  }
});

// Bodywork job ödeme endpoint'i
router.post('/:jobId/customer/payment', auth, validate(Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'bank_transfer').default('card')
})), async (req: Request, res: Response) => {
  try {
    const customerId = req.user?.userId;
    const { jobId } = req.params;
    const { amount, paymentMethod } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.processPayment(jobId, customerId, amount, paymentMethod);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Ödeme işlemi sırasında hata oluştu'
    });
  }
});

// Usta iş detayı (genel endpoint - /api/bodywork/:jobId) - EN SON olmalı (diğer dynamic route'lardan sonra)
router.get('/:jobId', auth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(404).json({
        success: false,
        message: 'İş bulunamadı'
      });
    }

    // Önce usta için kontrol et
    try {
      const result = await BodyworkService.getMechanicBodyworkJobById(jobId, userId);
      if (result.success) {
        return res.json(result);
      }
    } catch (error: any) {
      // Usta işi değilse, müşteri için kontrol et
      try {
        const customerResult = await BodyworkService.getCustomerBodyworkJobById(jobId, userId);
        return res.json(customerResult);
      } catch (customerError: any) {
        // Her iki durumda da bulunamadı
        throw error; // İlk hatayı fırlat
      }
    }
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İş detayı getirilirken hata oluştu'
    });
  }
});

export default router;
