import { Router, Request, Response } from 'express';
import { auth } from '../middleware/optimizedAuth';
import { Appointment } from '../models/Appointment';

const router = Router();

// ===== ACTIVITY ENDPOINTS =====
router.get('/recent', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Mekanik ID bulunamadı'
      });
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Son aktiviteleri getir (appointments, ratings, etc.)
    const recentAppointments = await Appointment.find({ mechanicId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name surname')
      .populate('vehicleId', 'brand modelName plateNumber');
    
    const activities = recentAppointments.map(appointment => ({
      _id: appointment._id,
      type: getActivityType(appointment.status),
      description: `${(appointment.userId as any)?.name || 'Bilinmeyen'} ${(appointment.userId as any)?.surname || 'Müşteri'} için ${appointment.serviceType} randevusu ${getStatusText(appointment.status)}`,
      createdAt: appointment.createdAt,
      appointmentId: appointment._id
    }));
    
    res.json({
      success: true,
      data: activities,
      message: 'Recent activities başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Activities getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    
    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Mekanik ID bulunamadı'
      });
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Son aktiviteleri getir (appointments, ratings, etc.)
    const recentAppointments = await Appointment.find({ mechanicId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name surname')
      .populate('vehicleId', 'brand modelName plateNumber');
    
    const activities = recentAppointments.map(appointment => ({
      id: appointment._id,
      type: 'appointment',
      title: `${(appointment.userId as any)?.name || 'Bilinmeyen'} ${(appointment.userId as any)?.surname || 'Müşteri'} - ${appointment.serviceType}`,
      subtitle: appointment.status,
      time: new Date(appointment.createdAt).toLocaleDateString('tr-TR'),
      color: getStatusColor(appointment.status),
      icon: getStatusIcon(appointment.status)
    }));
    
    res.json({
      success: true,
      data: activities,
      message: 'Recent activities başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Activities getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Helper functions
const getActivityType = (status: string) => {
  switch (status) {
    case 'TAMAMLANDI': return 'appointment_completed';
    case 'PLANLANDI': return 'appointment_confirmed';
    case 'SERVISTE': return 'appointment_in_service';
    case 'ODEME_BEKLIYOR': return 'appointment_payment_pending';
    case 'TALEP_EDILDI': return 'appointment_created';
    case 'IPTAL': return 'appointment_cancelled';
    case 'NO_SHOW': return 'appointment_no_show';
    default: return 'appointment_updated';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'TAMAMLANDI': return 'tamamlandı';
    case 'PLANLANDI': return 'planlandı';
    case 'SERVISTE': return 'serviste';
    case 'ODEME_BEKLIYOR': return 'ödeme bekliyor';
    case 'TALEP_EDILDI': return 'talep edildi';
    case 'IPTAL': return 'iptal edildi';
    case 'NO_SHOW': return 'gelinmedi';
    default: return 'güncellendi';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'TAMAMLANDI': return '#10B981';
    case 'PLANLANDI': return '#3B82F6';
    case 'SERVISTE': return '#8B5CF6';
    case 'ODEME_BEKLIYOR': return '#F59E0B';
    case 'TALEP_EDILDI': return '#06B6D4';
    case 'IPTAL': return '#EF4444';
    case 'NO_SHOW': return '#F97316';
    default: return '#6B7280';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'TAMAMLANDI': return 'checkmark-circle';
    case 'PLANLANDI': return 'calendar';
    case 'SERVISTE': return 'build';
    case 'ODEME_BEKLIYOR': return 'card';
    case 'TALEP_EDILDI': return 'time';
    case 'IPTAL': return 'close-circle';
    case 'NO_SHOW': return 'alert-circle';
    default: return 'information-circle';
  }
};

export default router;
