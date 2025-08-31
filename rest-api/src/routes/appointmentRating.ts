import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { AppointmentRatingController } from '../controllers/appointmentRating.controller';
import { checkRatingTimeLimit } from '../middleware/ratingTimeCheck';

const router = Router();

// Test route'u - frontend uyumluluğu için
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Appointment Rating API çalışıyor!' });
});

// Şoförün usta puanlaması (3 gün süre kontrolü ile)
router.post('/appointments/:appointmentId/rating', auth, checkRatingTimeLimit, AppointmentRatingController.createRating);

// Ustanın ortalama puanını getir
router.get('/mechanic/:mechanicId/rating', AppointmentRatingController.getMechanicRating);

// Ustanın tüm puanlarını getir
router.get('/mechanic/:mechanicId/ratings', AppointmentRatingController.getMechanicRatings);

// Şoförün verdiği puanları getir
router.get('/my-ratings', auth, AppointmentRatingController.getMyRatings);

// Mevcut usta için istatistikler
router.get('/current/stats', auth, AppointmentRatingController.getCurrentMechanicStats);

// Mevcut usta için son puanlar
router.get('/current/recent', auth, AppointmentRatingController.getCurrentMechanicRecentRatings);

export default router;
