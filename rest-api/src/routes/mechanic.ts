import express from 'express';
import { auth } from '../middleware/auth';
import * as mechanicController from '../controllers/mechanicController';

const router = express.Router();

// PROFİL
router.get('/me', auth, mechanicController.getProfile);
router.put('/me', auth, mechanicController.updateProfile);

// HİZMETLER
router.get('/me/services', auth, mechanicController.getServices);
router.put('/me/services', auth, mechanicController.updateServices);

// RANDEVULAR
router.get('/me/appointments', auth, mechanicController.getAppointments);
router.put('/appointments/:id/confirm', auth, mechanicController.confirmAppointment);
router.put('/appointments/:id/complete', auth, mechanicController.completeAppointment);
router.put('/appointments/:id/reject', auth, mechanicController.rejectAppointment);

// İSTATİSTİK
router.get('/me/statistics', auth, mechanicController.getStatistics);

// BİLDİRİMLER
router.get('/me/notifications', auth, mechanicController.getNotifications);
router.post('/me/notifications/read', auth, mechanicController.readNotification);

// ÇALIŞMA SAATLERİ
router.get('/me/working-hours', auth, mechanicController.getWorkingHours);
router.post('/me/working-hours', auth, mechanicController.setWorkingHours);

// KONUM
router.post('/me/location', auth, mechanicController.updateLocation);

export default router; 