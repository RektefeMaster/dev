import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { BodyworkService } from '../services/bodywork.service';
import { validate } from '../middleware/validate';
import Joi from 'joi';
import { BodyworkTemplate } from '../models/BodyworkTemplate';

const router = Router();

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
    const result = await BodyworkService.prepareQuote(jobId, req.body);
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
    const result = await BodyworkService.sendQuote(jobId);
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
    const result = await BodyworkService.updateWorkflowStage(jobId, req.body);
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
    const result = await BodyworkService.requestCustomerApproval(jobId, req.body.stage, req.body.photos);
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
    const result = await BodyworkService.performQualityCheck(jobId, req.body);
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
    const { status } = req.query;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const result = await BodyworkService.getMechanicBodyworkJobs(mechanicId, status as string);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kaporta işleri getirilirken hata oluştu'
    });
  }
});

// Kaporta işi detayını getir
router.get('/:jobId', auth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    // İşi bul ve sadece sahibi erişebilsin
    const result = await BodyworkService.getMechanicBodyworkJobs(mechanicId);
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

// Şablonları getir
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

    const query: any = { mechanicId, isActive: true };
    if (damageType) query.damageType = damageType;
    if (severity) query.severity = severity;

    const templates = await BodyworkTemplate.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: templates,
      message: 'Şablonlar getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Şablonlar getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
