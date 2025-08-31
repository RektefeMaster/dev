import { Request, Response, NextFunction } from 'express';
import { Appointment } from '../models/Appointment';

export const checkRatingTimeLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    
    // Randevu bilgilerini getir
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Randevu bulunamadı'
      });
    }

    // Randevu durumunu kontrol et
    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Bu randevu henüz tamamlanmamış'
      });
    }

    // Basit süre kontrolü (son 30 gün)
    const appointmentDate = new Date(appointment.appointmentDate);
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - appointmentDate.getTime();
    const daysDifference = timeDifference / (1000 * 3600 * 24);

    if (daysDifference > 30) {
      return res.status(400).json({
        success: false,
        message: 'Değerlendirme süresi dolmuş. Randevu tarihinden sonra 30 gün içinde değerlendirme yapabilirsiniz.'
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
