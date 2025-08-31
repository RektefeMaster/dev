import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
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
    console.error('Activity hatası:', error);
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
    console.error('Activity hatası:', error);
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
    case 'completed': return 'appointment_completed';
    case 'confirmed': return 'appointment_confirmed';
    case 'pending': return 'appointment_created';
    case 'cancelled': return 'appointment_cancelled';
    default: return 'appointment_created';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return 'tamamlandı';
    case 'confirmed': return 'onaylandı';
    case 'pending': return 'bekliyor';
    case 'cancelled': return 'iptal edildi';
    default: return 'güncellendi';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#10B981';
    case 'confirmed': return '#3B82F6';
    case 'pending': return '#F59E0B';
    case 'cancelled': return '#EF4444';
    default: return '#6B7280';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return 'checkmark-circle';
    case 'confirmed': return 'time';
    case 'pending': return 'hourglass';
    case 'cancelled': return 'close-circle';
    default: return 'information-circle';
  }
};

export default router;
