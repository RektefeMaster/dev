import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { ElectricalService } from '../services/electrical.service';
import { validate } from '../middleware/validate';
import Joi from 'joi';
import { ElectricalJob } from '../models/ElectricalJob';
import mongoose from 'mongoose';
import { Wallet } from '../models/Wallet';
import { TefePointService } from '../services/tefePoint.service';

const router = Router();

// ===== USTA TARAFI ENDPOINT'LERİ =====

// Usta iş oluşturma
router.post('/', auth, validate(Joi.object({
  customerId: Joi.string().required(),
  vehicleId: Joi.string().required(),
  electricalInfo: Joi.object({
    description: Joi.string().required(),
    photos: Joi.array().items(Joi.string()).required(),
    videos: Joi.array().items(Joi.string()),
    systemType: Joi.string().valid('klima', 'far', 'alternator', 'batarya', 'elektrik-araci', 'sinyal', 'diger').required(),
    problemType: Joi.string().valid('calismiyor', 'arizali-bos', 'ariza-gostergesi', 'ses-yapiyor', 'isinma-sorunu', 'kisa-devre', 'tetik-atmiyor', 'diger').required(),
    urgencyLevel: Joi.string().valid('normal', 'acil').default('normal'),
    isRecurring: Joi.boolean().default(false),
    lastWorkingCondition: Joi.string().optional(),
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

    const result = await ElectricalService.createElectricalJob({
      ...req.body,
      mechanicId
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Elektrik işi oluşturulurken hata oluştu'
    });
  }
});

// Ustanın elektrik işlerini getir
router.get('/mechanic', auth, async (req: Request, res: Response) => {
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

    const result = await ElectricalService.getMechanicElectricalJobs(mechanicId, status as string, pageNum, limitNum);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Elektrik işleri getirilirken hata oluştu'
    });
  }
});

// Teklif hazırla
router.post('/:jobId/quote', auth, validate(Joi.object({
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
    diagnosisCost: Joi.number().min(0).required(),
    testingCost: Joi.number().min(0).required(),
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
    const result = await ElectricalService.prepareQuote(jobId, mechanicId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teklif hazırlanırken hata oluştu'
    });
  }
});

// Teklifi gönder
router.post('/:jobId/quote/send', auth, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }
    const result = await ElectricalService.sendQuote(jobId, mechanicId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teklif gönderilirken hata oluştu'
    });
  }
});

// İş akışı aşamasını güncelle
router.put('/:jobId/workflow', auth, validate(Joi.object({
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
    const result = await ElectricalService.updateWorkflowStage(jobId, mechanicId, req.body);
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
    const result = await ElectricalService.requestCustomerApproval(jobId, mechanicId, req.body.stage, req.body.photos);
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
    const result = await ElectricalService.performQualityCheck(jobId, mechanicId, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Kalite kontrol yapılırken hata oluştu'
    });
  }
});

// ===== MÜŞTERİ TARAFI ENDPOINT'LERİ =====

// Müşteri iş oluşturma
router.post('/customer', auth, validate(Joi.object({
  vehicleId: Joi.string().required(),
  mechanicId: Joi.string().optional(),
  electricalInfo: Joi.object({
    description: Joi.string().required(),
    photos: Joi.array().items(Joi.string()).required(),
    videos: Joi.array().items(Joi.string()),
    systemType: Joi.string().valid('klima', 'far', 'alternator', 'batarya', 'elektrik-araci', 'sinyal', 'diger').required(),
    problemType: Joi.string().valid('calismiyor', 'arizali-bos', 'ariza-gostergesi', 'ses-yapiyor', 'isinma-sorunu', 'kisa-devre', 'tetik-atmiyor', 'diger').required(),
    urgencyLevel: Joi.string().valid('normal', 'acil').default('normal'),
    isRecurring: Joi.boolean().default(false),
    lastWorkingCondition: Joi.string().optional(),
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

    const result = await ElectricalService.createCustomerElectricalJob({
      customerId,
      vehicleId: req.body.vehicleId,
      mechanicId: req.body.mechanicId,
      electricalInfo: req.body.electricalInfo
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Elektrik işi oluşturulurken hata oluştu'
    });
  }
});

// Müşteri işleri listeleme
router.get('/customer', auth, async (req: Request, res: Response) => {
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

    const result = await ElectricalService.getCustomerElectricalJobs(customerId, status as string, pageNum, limitNum);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Elektrik işleri getirilirken hata oluştu'
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
    
    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(404).json({
        success: false,
        message: 'İş bulunamadı'
      });
    }

    const result = await ElectricalService.getCustomerElectricalJobById(jobId, customerId);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'İş detayı getirilirken hata oluştu'
    });
  }
});

// Teklif onaylama/reddetme
router.post('/:jobId/quote/respond', auth, validate(Joi.object({
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

    const result = await ElectricalService.respondToQuote(jobId, customerId, action, rejectionReason);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Teklif yanıtı verilirken hata oluştu'
    });
  }
});

// Müşteri aşama onayı
router.post('/:jobId/approve-stage', auth, validate(Joi.object({
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

    const result = await ElectricalService.approveStage(jobId, customerId, stage, approved, notes);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Aşama onayı verilirken hata oluştu'
    });
  }
});

// Electrical job ödeme endpoint'i
router.post('/:jobId/payment', auth, validate(Joi.object({
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

    const result = await ElectricalService.processPayment(jobId, customerId, amount, paymentMethod);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Ödeme işlemi sırasında hata oluştu'
    });
  }
});

// Usta iş detayı (genel endpoint - /api/electrical/:jobId) - EN SON olmalı (diğer dynamic route'lardan sonra)
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
      const result = await ElectricalService.getMechanicElectricalJobById(jobId, userId);
      if (result.success) {
        return res.json(result);
      }
    } catch (error: any) {
      // Usta işi değilse, müşteri için kontrol et
      try {
        const customerResult = await ElectricalService.getCustomerElectricalJobById(jobId, userId);
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

