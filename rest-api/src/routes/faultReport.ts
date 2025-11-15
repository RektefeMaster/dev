import express from 'express';
import { auth } from '../middleware/optimizedAuth';
import { requireRole } from '../middleware/roleAuth';
import { UserType } from '../../../shared/types/enums';
import { validateSelectQuote } from '../validators/faultReport.validation';
import Logger from '../utils/logger';
// Dynamic import to avoid circular dependency issues
const faultReportController = require('../controllers/faultReport.controller');
const {
  createFaultReport,
  getUserFaultReports,
  getFaultReportById,
  getMechanicFaultReportById,
  submitMechanicResponse,
  submitQuote,
  selectQuote,
  getMechanicFaultReports,
  handleTomorrowResponse,
  initiateContact,
  createPayment,
  confirmPayment,
  finalizeWork,
  createAppointmentFromFaultReport,
  convertToBodyworkJob,
  convertToElectricalJob
} = faultReportController;

const router = express.Router();

// Arıza bildirimi oluştur (Sadece şöförler)
router.post('/', 
  auth,
  requireRole([UserType.DRIVER]),
  createFaultReport
);

// Kullanıcının arıza bildirimlerini getir (Sadece şöförler)
router.get('/my-reports',
  auth,
  requireRole([UserType.DRIVER]),
  getUserFaultReports
);

// Arıza bildirimi detayını getir (Sadece şöförler)
router.get('/:id',
  auth,
  requireRole([UserType.DRIVER]),
  getFaultReportById
);

// Usta yanıtı ver (Sadece ustalar)
router.post('/:id/response',
  auth,
  requireRole([UserType.MECHANIC]),
  submitMechanicResponse
);

// Fiyat teklifi ver (Sadece ustalar)
router.post('/:id/quote',
  auth,
  requireRole([UserType.MECHANIC]),
  submitQuote
);

// Teklif seç ve randevu oluştur (Sadece şöförler)
router.post('/:id/select-quote',
  auth,
  requireRole([UserType.DRIVER]),
  (req, res, next) => {
    Logger.debug('selectQuote middleware - Request body:', req.body);
    Logger.debug('selectQuote middleware - Request params:', req.params);
    
    const { error } = validateSelectQuote(req.body);
    if (error) {
      Logger.warn('Validation error:', error.details);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    Logger.debug('Validation passed');
    next();
  },
  selectQuote
);

// Ustaların arıza bildirimlerini getir (Sadece ustalar)
router.get('/mechanic/reports',
  auth,
  requireRole([UserType.MECHANIC]),
  getMechanicFaultReports
);

// Usta için arıza bildirimi detayını getir (Sadece ustalar)
router.get('/mechanic/:id',
  auth,
  requireRole([UserType.MECHANIC]),
  getMechanicFaultReportById
);

// Yarın bakarım yanıtını onayla/reddet (Sadece şöförler)
router.post('/:id/tomorrow-response',
  auth,
  requireRole([UserType.DRIVER]),
  handleTomorrowResponse
);

// İletişime geç - mesaj gönderme (Sadece şöförler)
router.post('/:id/contact',
  auth,
  requireRole([UserType.DRIVER]),
  initiateContact
);

// Ödeme oluştur (Sadece şöförler)
router.post('/:id/payment',
  auth,
  requireRole([UserType.DRIVER]),
  createPayment
);

// Ödeme onayla (Sadece şöförler)
router.post('/:id/confirm-payment',
  auth,
  requireRole([UserType.DRIVER]),
  confirmPayment
);

// İşi finalize et (Sadece ustalar)
router.post('/:id/finalize',
  auth,
  requireRole([UserType.MECHANIC]),
  finalizeWork
);

// Arıza bildirimi için randevu oluştur (Sadece şöförler)
router.post('/:id/create-appointment',
  auth,
  requireRole([UserType.DRIVER]),
  (req, res, next) => {
    Logger.debug('create-appointment route middleware çağrıldı');
    Logger.debug('Route params:', req.params);
    Logger.debug('Route body:', req.body);
    next();
  },
  createAppointmentFromFaultReport
);

// Kaporta/Boya kategorisindeki fault report'u bodywork job'a dönüştür (Sadece ustalar)
router.post('/:faultReportId/convert-to-bodywork-job',
  auth,
  requireRole([UserType.MECHANIC]),
  convertToBodyworkJob
);

// Elektrik-Elektronik kategorisindeki fault report'u electrical job'a dönüştür (Sadece ustalar)
router.post('/:faultReportId/convert-to-electrical-job',
  auth,
  requireRole([UserType.MECHANIC]),
  convertToElectricalJob
);

export default router;
