import express from 'express';
import { auth } from '../middleware/auth';
import {
  createAppointment,
  getMechanicAppointments,
  confirmAppointmentByMechanic,
  completeAppointmentByMechanic,
  rejectAppointmentByMechanic,
  getMechanicAvailability,
} from '../controllers/maintenanceAppointmentController';

const router = express.Router();

// ===== MÜŞTERİ İÇİN ENDPOINT =====
// Randevu oluşturma
router.post('/', auth, createAppointment);


// ===== USTA İÇİN ENDPOINT'LER =====

// Ustanın randevularını getirme
router.get('/mechanic', auth, getMechanicAppointments);

// Usta için randevu onaylama
router.put('/:appointmentId/mechanic/confirm', auth, confirmAppointmentByMechanic);

// Usta için randevu tamamlama
router.put('/:appointmentId/mechanic/complete', auth, completeAppointmentByMechanic);

// Usta için randevu reddetme
router.put('/:appointmentId/mechanic/reject', auth, rejectAppointmentByMechanic);

// Ustanın belirli bir gündeki müsaitlik durumunu getirme
router.get('/mechanic-availability', auth, getMechanicAvailability);

export default router; 