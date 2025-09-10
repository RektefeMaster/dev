import express from 'express';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import {
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
} from '../controllers/faultReport.controller';

const router = express.Router();

// Arıza bildirimi oluştur (Sadece şöförler)
router.post('/', 
  auth,
  requireRole(['driver']),
  createFaultReport
);

// Kullanıcının arıza bildirimlerini getir (Sadece şöförler)
router.get('/my-reports',
  auth,
  requireRole(['driver']),
  getUserFaultReports
);

// Arıza bildirimi detayını getir (Sadece şöförler)
router.get('/:id',
  auth,
  requireRole(['driver']),
  getFaultReportById
);

// Usta yanıtı ver (Sadece ustalar)
router.post('/:id/response',
  auth,
  requireRole(['mechanic']),
  submitMechanicResponse
);

// Fiyat teklifi ver (Sadece ustalar)
router.post('/:id/quote',
  auth,
  requireRole(['mechanic']),
  submitQuote
);

// Teklif seç ve randevu oluştur (Sadece şöförler)
router.post('/:id/select-quote',
  auth,
  requireRole(['driver']),
  selectQuote
);

// Ustaların arıza bildirimlerini getir (Sadece ustalar)
router.get('/mechanic/reports',
  auth,
  requireRole(['mechanic']),
  getMechanicFaultReports
);

// Usta için arıza bildirimi detayını getir (Sadece ustalar)
router.get('/mechanic/:id',
  auth,
  requireRole(['mechanic']),
  getMechanicFaultReportById
);

// Yarın bakarım yanıtını onayla/reddet (Sadece şöförler)
router.post('/:id/tomorrow-response',
  auth,
  requireRole(['driver']),
  handleTomorrowResponse
);

// İletişime geç - mesaj gönderme (Sadece şöförler)
router.post('/:id/contact',
  auth,
  requireRole(['driver']),
  initiateContact
);

// Ödeme oluştur (Sadece şöförler)
router.post('/:id/payment',
  auth,
  requireRole(['driver']),
  createPayment
);

// Ödeme onayla (Sadece şöförler)
router.post('/:id/confirm-payment',
  auth,
  requireRole(['driver']),
  confirmPayment
);

// İşi finalize et (Sadece ustalar)
router.post('/:id/finalize',
  auth,
  requireRole(['mechanic']),
  finalizeWork
);

export default router;
