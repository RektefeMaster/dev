import { Mechanic } from '../models/Mechanic';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MaintenanceAppointment, { IMaintenanceAppointment } from '../models/MaintenanceAppointment';
import { Vehicle } from '../models/Vehicle';
import { sendPushNotification } from '../utils/notifications';

// RANDEVU OLUŞTURMA (Müşteri Tarafı)
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }
    const objectUserId = new mongoose.Types.ObjectId(userId);

    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId: objectUserId });
    if (!vehicle) {
      return res.status(404).json({ message: 'Araç bulunamadı veya bu araca erişim yetkiniz yok' });
    }

    const newAppointment = new MaintenanceAppointment({
      userId: objectUserId,
      ...req.body,
    });

    await newAppointment.save();

    // Ustaya anlık bildirim gönder
    if (newAppointment.mechanicId) {
      const mechanicIdString = newAppointment.mechanicId.toString();
      await sendPushNotification(
        mechanicIdString,
        'Yeni Randevu Talebi!',
        `Yeni bir randevu talebiniz var. Detayları görmek için uygulamayı açın.`
      );
    }

    res.status(201).json({ 
      message: 'Randevu başarıyla oluşturuldu',
      appointment: newAppointment,
    });
  } catch (error) {
    res.status(500).json({ message: 'Randevu oluşturulurken bir hata oluştu', error });
  }
};

// USTA İÇİN RANDEVULARI GETİRME
export const getMechanicAppointments = async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

      const appointments = await MaintenanceAppointment.find({ mechanicId: mechanicId })
        .populate('userId', 'name avatar')
        .populate('vehicleId', 'brand modelName plateNumber year')
        .sort({ appointmentDate: -1 });

      res.json(appointments);
  } catch (error) {
      console.error('Usta randevuları getirme hatası:', error);
    res.status(500).json({ message: 'Randevular getirilirken bir hata oluştu' });
  }
};

// USTA İÇİN RANDEVU ONAYLAMA
export const confirmAppointmentByMechanic = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const mechanicId = req.user?.userId;

      const appointment = await MaintenanceAppointment.findOneAndUpdate(
        { _id: appointmentId, mechanicId: mechanicId, status: 'pending' },
        { status: 'confirmed' },
        { new: true }
      );

    if (!appointment) {
        return res.status(404).json({ message: 'Randevu bulunamadı veya zaten işleme alınmış.' });
      }
  
      res.status(200).json(appointment);
  } catch (error) {
      res.status(500).json({ message: 'Randevu onaylanırken bir hata oluştu', error });
  }
};

// USTA İÇİN RANDEVU TAMAMLAMA
export const completeAppointmentByMechanic = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const mechanicId = req.user?.userId;

        const appointment = await MaintenanceAppointment.findOneAndUpdate(
            { _id: appointmentId, mechanicId: mechanicId, status: 'confirmed' },
            { status: 'completed' },
            { new: true }
        );

    if (!appointment) {
            return res.status(404).json({ message: 'Randevu bulunamadı veya henüz onaylanmamış.' });
    }

        res.status(200).json(appointment);
  } catch (error) {
        res.status(500).json({ message: 'Randevu tamamlanırken bir hata oluştu', error });
  }
};

// USTA İÇİN RANDEVU REDDETME
export const rejectAppointmentByMechanic = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const mechanicId = req.user?.userId;

        const appointment = await MaintenanceAppointment.findOneAndUpdate(
            { _id: appointmentId, mechanicId: mechanicId, status: 'pending' },
            { status: 'rejected' },
            { new: true }
        );

    if (!appointment) {
            return res.status(404).json({ message: 'Randevu bulunamadı veya zaten işleme alınmış.' });
        }
    
        res.status(200).json(appointment);
    } catch (error) {
        res.status(500).json({ message: 'Randevu reddedilirken bir hata oluştu', error });
  }
};

// Ustanın belirli bir gündeki müsaitlik durumunu getirme
export const getMechanicAvailability = async (req: Request, res: Response) => {
  try {
    const { date, mechanicId } = req.query;

    if (!date || !mechanicId) {
      return res.status(400).json({ message: 'Tarih ve usta IDsi zorunludur.' });
    }

    const mechanic = await Mechanic.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({ message: 'Usta bulunamadı.' });
    }

    // Tarih aralığını belirle (o günün başlangıcı ve sonu)
    const startDate = new Date(date as string);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date as string);
    endDate.setHours(23, 59, 59, 999);

    // O gün için mevcut randevuları al
    const appointments = await MaintenanceAppointment.find({
      mechanicId,
      appointmentDate: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const bookedSlots = appointments.map(app => {
      const appDate = new Date(app.appointmentDate);
      return `${String(appDate.getHours()).padStart(2, '0')}:${String(appDate.getMinutes()).padStart(2, '0')}`;
    });

    // Ustanın çalışma saatlerine göre tüm slotları oluştur (örneğin 09:00 - 18:00 arası yarım saatlik slotlar)
    const availableSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        availableSlots.push({
          time,
          isAvailable: !bookedSlots.includes(time),
        });
      }
    }

    res.json({ availableSlots });
  } catch (error) {
    console.error('Müsaitlik durumu alınırken hata:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// ------ Müşteri için olan diğer fonksiyonlar (şimdilik eklenmedi) ------
// getUserAppointments, cancelAppointment etc. 