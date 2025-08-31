import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAppointmentSchema, updateAppointmentSchema } from '../validators/appointment.validation';
import { AppointmentService } from '../services/appointment.service';
import { Appointment } from '../models/Appointment';

const router = Router();

// Debug endpoint'leri (auth olmadan)
router.get('/debug-all', async (req: Request, res: Response) => {
  try {
    const appointments = await AppointmentService.getAllAppointments();
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/debug-user/:userId', async (req: Request, res: Response) => {
  try {
    const appointments = await AppointmentService.getAppointmentsByUserId(req.params.userId);
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ana endpoint'ler
router.post('/', validate(createAppointmentSchema), async (req: Request, res: Response) => {
  try {
    console.log('🔍 Appointments Route: POST / - Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Appointments Route: POST / - User:', JSON.stringify(req.user, null, 2));
    
    const appointment = await AppointmentService.createAppointment(req.body);
    console.log('🔍 Appointments Route: POST / - Appointment created:', JSON.stringify(appointment, null, 2));
    
    res.status(201).json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('❌ Appointments Route: POST / - Error:', error);
    console.error('❌ Appointments Route: POST / - Error message:', error.message);
    console.error('❌ Appointments Route: POST / - Error stack:', error.stack);
    
    // Validation hatası ise 400, diğer hatalar 500
    const statusCode = error.message.includes('validation') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
});

router.get('/driver', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    const appointments = await AppointmentService.getAppointmentsByUserId(userId);
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/mechanic', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req.user as any)?.userId;
    const statusFilter = req.query.status as string;
    const appointments = await AppointmentService.getMechanicAppointments(mechanicId, statusFilter);
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = (req.user as any)?.userId;
    const stats = await AppointmentService.getAppointmentStats(mechanicId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;
    const appointment = await AppointmentService.getAppointmentById(req.params.id, userId);
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/approve', auth, async (req: Request, res: Response) => {
  try {
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      'confirmed',
      undefined,
      undefined
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/reject', auth, async (req: Request, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      'rejected',
      rejectionReason,
      undefined
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/start', auth, async (req: Request, res: Response) => {
  try {
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      'in-progress',
      undefined,
      undefined
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/complete', auth, async (req: Request, res: Response) => {
  try {
    const { completionNotes, price, estimatedDuration } = req.body;
    const appointment = await AppointmentService.completeAppointment(
      req.params.id,
      completionNotes,
      price,
      estimatedDuration
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/cancel', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }
    const appointment = await AppointmentService.cancelAppointment(req.params.id, userId);
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/status', auth, async (req: Request, res: Response) => {
  try {
    const { status, rejectionReason, mechanicNotes } = req.body;
    const appointment = await AppointmentService.updateAppointmentStatus(
      req.params.id,
      status,
      rejectionReason,
      mechanicNotes
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Payment status endpoint'i ekle
router.put('/:id/payment-status', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    // Ödeme durumunu güncelle
    await AppointmentService.updatePaymentStatus(id, req.body, userId);

    res.json({
      success: true,
      message: 'Ödeme durumu başarıyla güncellendi'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Transfer payment endpoint'i ekle
router.post('/:id/transfer-payment', auth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, mechanicId } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bilgisi bulunamadı' });
    }

    if (!amount || !mechanicId) {
      return res.status(400).json({ success: false, message: 'Miktar ve usta ID gerekli' });
    }

    // Burada gerçek para transferi işlemi yapılabilir
    // Şimdilik sadece başarılı yanıt döndürüyoruz
    console.log(`💰 Para transferi: ${amount}₺, Usta: ${mechanicId}, Müşteri: ${userId}`);

    res.json({
      success: true,
      message: 'Para transferi başarılı',
      data: {
        amount,
        mechanicId,
        transferDate: new Date()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Today's schedule endpoint
router.get('/today-schedule', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }
    const appointments = await AppointmentService.getTodaysAppointments(userId);
    res.json({ success: true, data: { appointments } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
