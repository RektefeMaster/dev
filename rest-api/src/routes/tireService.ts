import { Router } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { TireServiceController } from '../controllers/tireService.controller';
import { validate } from '../middleware/validate';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createRequestSchema = Joi.object({
  mechanicId: Joi.string().optional(),
  tireServiceType: Joi.string()
    .valid('tire_change', 'tire_repair', 'tire_balance', 'tire_alignment', 'tire_inspection', 'tire_purchase', 'tire_rotation', 'tire_pressure_check')
    .required(),
  vehicleId: Joi.string().optional(),
  vehicleInfo: Joi.object({
    brand: Joi.string().required(),
    model: Joi.string().required(),
    year: Joi.string().required(),
    engine: Joi.string().optional(),
    plateNumber: Joi.string().optional()
  }).optional(),
  tireDetails: Joi.object({
    size: Joi.string().required(),
    brand: Joi.string().allow('', null).optional(),
    model: Joi.string().allow('', null).optional(),
    season: Joi.string().valid('summer', 'winter', 'all-season').allow('', null).optional(),
    condition: Joi.string().valid('new', 'used', 'good', 'fair', 'poor', 'damaged', 'worn').required(),
    quantity: Joi.number().min(1).max(10).default(1),
    notes: Joi.string().allow('', null).optional()
  }).required(),
  location: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
    address: Joi.string().optional(),
    city: Joi.string().optional(),
    district: Joi.string().optional(),
    neighborhood: Joi.string().optional()
  }).optional(),
  isMobileService: Joi.boolean().default(false),
  isUrgent: Joi.boolean().default(false),
  description: Joi.string().allow('', null).max(500).optional(),
  specialRequests: Joi.string().allow('', null).max(500).optional(),
  scheduledFor: Joi.date().optional()
});

const priceQuoteSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  breakdown: Joi.object({
    labor: Joi.number().min(0).optional(),
    parts: Joi.number().min(0).optional(),
    tax: Joi.number().min(0).optional()
  }).optional(),
  notes: Joi.string().max(500).optional(),
  estimatedDuration: Joi.number().min(0).optional()
});

const completeJobSchema = Joi.object({
  notes: Joi.string().max(1000).optional(),
  finalPrice: Joi.number().min(0).optional(),
  warrantyInfo: Joi.object({
    duration: Joi.number().min(0).max(60).required(),
    conditions: Joi.array().items(Joi.string()).min(1).required()
  }).optional()
});

const healthCheckSchema = Joi.object({
  vehicleId: Joi.string().required(),
  userId: Joi.string().required(),
  checkDate: Joi.date().optional(),
  treadDepth: Joi.array().items(Joi.number().min(0).max(20)).length(4).required(),
  pressure: Joi.array().items(Joi.number().min(0).max(5)).length(4).required(),
  condition: Joi.array().items(
    Joi.string().valid('new', 'used', 'good', 'fair', 'poor', 'damaged', 'worn')
  ).length(4).required(),
  overallCondition: Joi.string().valid('excellent', 'good', 'fair', 'poor', 'critical').required(),
  photos: Joi.array().items(Joi.string()).optional(),
  recommendations: Joi.array().items(Joi.string()).min(1).required(),
  issues: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(1000).optional(),
  nextCheckDate: Joi.date().optional(),
  nextCheckKm: Joi.number().min(0).optional()
});

// ===== LASTIK HIZMETI ENDPOINTS =====

/**
 * @route   POST /api/tire-service/request
 * @desc    Yeni lastik hizmet talebi oluştur (Müşteri)
 * @access  Private
 */
router.post('/request', auth, validate(createRequestSchema), TireServiceController.createRequest);

/**
 * @route   GET /api/tire-service/jobs
 * @desc    Usta için lastik işlerini getir
 * @access  Private (Mechanic)
 */
router.get('/jobs', auth, TireServiceController.getJobsForMechanic);

/**
 * @route   GET /api/tire-service/my-requests
 * @desc    Müşteri için kendi lastik taleplerini getir
 * @access  Private (Driver)
 */
router.get('/my-requests', auth, TireServiceController.getMyRequests);

/**
 * @route   PATCH /api/tire-service/:jobId/accept
 * @desc    İşi kabul et (Usta)
 * @access  Private (Mechanic)
 */
router.patch('/:jobId/accept', auth, TireServiceController.acceptJob);

/**
 * @route   PATCH /api/tire-service/:jobId/start
 * @desc    İşi başlat (Usta)
 * @access  Private (Mechanic)
 */
router.patch('/:jobId/start', auth, TireServiceController.startJob);

/**
 * @route   PATCH /api/tire-service/:jobId/complete
 * @desc    İşi tamamla (Usta)
 * @access  Private (Mechanic)
 */
router.patch('/:jobId/complete', auth, validate(completeJobSchema), TireServiceController.completeJob);

/**
 * @route   POST /api/tire-service/:jobId/price-quote
 * @desc    Fiyat teklifi gönder (Usta)
 * @access  Private (Mechanic)
 */
router.post('/:jobId/price-quote', auth, validate(priceQuoteSchema), TireServiceController.sendPriceQuote);

/**
 * @route   GET /api/tire-service/:jobId/status
 * @desc    İş durumunu getir
 * @access  Private
 */
router.get('/:jobId/status', auth, TireServiceController.getJobStatus);

/**
 * @route   POST /api/tire-service/health-check
 * @desc    Lastik sağlık kontrolü kaydet (Usta)
 * @access  Private (Mechanic)
 */
router.post('/health-check', auth, validate(healthCheckSchema), TireServiceController.saveTireHealthCheck);

/**
 * @route   GET /api/tire-service/health-history/:vehicleId
 * @desc    Araç lastik geçmişini getir
 * @access  Private
 */
router.get('/health-history/:vehicleId', auth, TireServiceController.getTireHealthHistory);

export default router;

