import { Request, Response, NextFunction } from 'express';
import MaintenanceAppointment from '../models/MaintenanceAppointment';

export const checkRatingTimeLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    
    // Randevu bilgilerini getir
    const appointment = await MaintenanceAppointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Randevu tamamlanma tarihini kontrol et
    if (!appointment.completionDate) {
      return res.status(400).json({
        success: false,
        message: 'Bu randevu henüz tamamlanmamış'
      });
    }

    // 3 gün süre kontrolü
    const completionDate = new Date(appointment.completionDate);
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - completionDate.getTime();
    const daysDifference = timeDifference / (1000 * 3600 * 24);

    if (daysDifference > 3) {
      return res.status(400).json({
        success: false,
        message: 'Değerlendirme süresi dolmuş. Randevu tamamlandıktan sonra 3 gün içinde değerlendirme yapabilirsiniz.'
      });
    }

    next();
  } catch (error) {
    console.error('Değerlendirme süresi kontrolü hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};
