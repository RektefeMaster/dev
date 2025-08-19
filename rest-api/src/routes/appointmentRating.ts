import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { AppointmentRatingController } from '../controllers/appointmentRating.controller';
import { checkRatingTimeLimit } from '../middleware/ratingTimeCheck';

const router = Router();

// Şoförün usta puanlaması (3 gün süre kontrolü ile)
router.post('/appointments/:appointmentId/rating', auth, checkRatingTimeLimit, AppointmentRatingController.createRating);

// Ustanın ortalama puanını getir
router.get('/mechanic/:mechanicId/rating', AppointmentRatingController.getMechanicRating);

// Ustanın tüm puanlarını getir
router.get('/mechanic/:mechanicId/ratings', AppointmentRatingController.getMechanicRatings);

// Şoförün verdiği puanları getir
router.get('/my-ratings', auth, AppointmentRatingController.getMyRatings);

export default router;
