import express from 'express';
import { auth } from '../middleware/optimizedAuth';
import { requireRole } from '../middleware/roleAuth';
import { UserType } from '../../../shared/types/enums';
import { validateSelectQuote } from '../validators/faultReport.validation';
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
  finalizeWork
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
    const { error } = validateSelectQuote(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
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

export default router;
