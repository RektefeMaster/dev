import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { CustomError } from '../utils/response';
import { Vehicle } from '../models/Vehicle';

export interface CreateAppointmentData {
  userId: string;
  mechanicId: string;
  serviceType: string;
  appointmentDate: Date;
  timeSlot: string;
  description: string;
  vehicleId?: string;
}

export interface UpdateAppointmentData {
  status: 'confirmed' | 'rejected' | 'in-progress' | 'completed' | 'cancelled';
  rejectionReason?: string;
  mechanicNotes?: string;
}

export class AppointmentService {
  /**
   * Yeni randevu oluştur
   */
  static async createAppointment(data: CreateAppointmentData) {
    try {
      // Ustanın müsait olup olmadığını kontrol et
      const mechanic = await Mechanic.findById(data.mechanicId);
      if (!mechanic) {
        throw new CustomError('Usta bulunamadı', 404);
      }

      if (!mechanic.isAvailable) {
        throw new CustomError('Usta şu anda müsait değil', 400);
      }

      // Aynı tarih ve saatte çakışan randevu var mı kontrol et
      const conflictingAppointment = await Appointment.findOne({
        mechanicId: data.mechanicId,
        appointmentDate: {
          $gte: new Date(data.appointmentDate.getFullYear(), data.appointmentDate.getMonth(), data.appointmentDate.getDate()),
          $lt: new Date(data.appointmentDate.getFullYear(), data.appointmentDate.getMonth(), data.appointmentDate.getDate() + 1)
        },
        timeSlot: data.timeSlot,
        status: { $in: ['pending', 'confirmed', 'in-progress'] }
      });

      if (conflictingAppointment) {
        throw new CustomError('Bu tarih ve saatte usta müsait değil', 400);
      }

      // Eğer vehicleId gönderilmemişse, kullanıcının son kayıtlı aracını ata
      let resolvedVehicleId: mongoose.Types.ObjectId | undefined = undefined;
      if (!data.vehicleId) {
        const lastVehicle = await Vehicle.findOne({ userId: data.userId }).sort({ updatedAt: -1, createdAt: -1 });
        if (lastVehicle) {
          resolvedVehicleId = new mongoose.Types.ObjectId((lastVehicle as any)._id.toString());
        }
      } else {
        resolvedVehicleId = new mongoose.Types.ObjectId(data.vehicleId);
      }

      // Randevu oluştur
      const appointment = new Appointment({
        userId: new mongoose.Types.ObjectId(data.userId),
        mechanicId: new mongoose.Types.ObjectId(data.mechanicId),
        serviceType: data.serviceType,
        appointmentDate: data.appointmentDate,
        timeSlot: data.timeSlot,
        description: data.description,
        vehicleId: resolvedVehicleId,
        status: 'pending',
        createdAt: new Date()
      });

      await appointment.save();
      return appointment;
    } catch (error) {
      console.error('Randevu oluşturma hatası:', error);
      throw error;
    }
  }

  /**
   * Kullanıcının randevularını getir
   */
  static async getAppointmentsByUserId(userId: string) {
    try {
      const appointments = await Appointment.find({ userId })
        .populate('mechanicId', 'name surname rating experience city')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package')
        .sort({ appointmentDate: -1 });

      return appointments;
    } catch (error) {
      console.error('Kullanıcı randevuları getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Ustanın randevularını getir
   */
  static async getAppointmentsByMechanicId(mechanicId: string) {
    try {
      const appointments = await Appointment.find({ mechanicId })
        .populate('userId', 'name surname phone email')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package')
        .sort({ appointmentDate: -1 });

      // Reddedilen randevularda usta araç ve iletişim bilgilerini görmesin
      const sanitized = appointments.map((apt: any) => {
        const obj = apt.toObject();
        if (obj.status === 'rejected') {
          if (obj.userId) {
            // Telefon ve e-posta bilgilerini kaldır
            delete obj.userId.phone;
            delete obj.userId.email;
          }
          // Araç bilgisini gizle
          obj.vehicleId = undefined;
        }
        return obj;
      });

      return sanitized as any;
    } catch (error) {
      console.error('Usta randevuları getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Randevu detayını getir
   */
  static async getAppointmentById(appointmentId: string, userId: string) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('userId', 'name surname phone email')
        .populate('mechanicId', 'name surname phone email rating experience city')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package');

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Kullanıcının bu randevuyu görme yetkisi var mı kontrol et
      if (appointment.userId.toString() !== userId && appointment.mechanicId.toString() !== userId) {
        throw new CustomError('Bu randevuyu görme yetkiniz yok', 403);
      }

      return appointment;
    } catch (error) {
      console.error('Randevu detayı getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Randevu durumunu güncelle
   */
  static async updateAppointmentStatus(
    appointmentId: string,
    mechanicId: string,
    status: string,
    rejectionReason?: string,
    mechanicNotes?: string
  ) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece usta kendi randevusunu güncelleyebilir
      if (appointment.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu randevuyu güncelleme yetkiniz yok', 403);
      }

      // Durum güncellemesi
      appointment.status = status as any;
      
      if (status === 'rejected' && rejectionReason) {
        appointment.rejectionReason = rejectionReason;
      }

      if (mechanicNotes) {
        appointment.mechanicNotes = mechanicNotes;
      }

      // Randevu onaylandıysa otomatik in-progress yap
      if (status === 'confirmed') {
        appointment.status = 'in-progress';
        console.log('Randevu onaylandı, otomatik olarak devam ediyor durumuna geçirildi');
      }

      await appointment.save();
      return appointment;
    } catch (error) {
      console.error('Randevu durumu güncelleme hatası:', error);
      throw error;
    }
  }

  /**
   * İletişim bilgilerini paylaş
   */
  static async shareContactInfo(appointmentId: string, userId: string) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('userId', 'name surname phone email')
        .populate('mechanicId', 'name surname phone email');

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece onaylanmış randevularda iletişim bilgileri paylaşılabilir
      if (appointment.status !== 'confirmed') {
        throw new CustomError('Randevu henüz onaylanmamış', 400);
      }

      // Kullanıcının bu randevuyu görme yetkisi var mı kontrol et
      if (appointment.userId.toString() !== userId && appointment.mechanicId.toString() !== userId) {
        throw new CustomError('Bu randevuyu görme yetkiniz yok', 403);
      }

      // İletişim bilgilerini hazırla
      const contactInfo = {
        driver: {
          name: (appointment.userId as any).name + ' ' + (appointment.userId as any).surname,
          phone: (appointment.userId as any).phone,
          email: (appointment.userId as any).email
        },
        mechanic: {
          name: (appointment.mechanicId as any).name + ' ' + (appointment.mechanicId as any).surname,
          phone: (appointment.mechanicId as any).phone,
          email: (appointment.mechanicId as any).email
        }
      };

      return contactInfo;
    } catch (error) {
      console.error('İletişim bilgileri paylaşma hatası:', error);
      throw error;
    }
  }

  /**
   * Yaklaşan randevular için bildirim gönder
   */
  static async sendReminderNotifications() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 saat sonra

      // 1 saat kala randevuları bul
      const upcomingAppointments = await Appointment.find({
        appointmentDate: {
          $gte: now,
          $lte: oneHourFromNow
        },
        status: 'confirmed',
        'notificationSettings.oneHourBefore': true
      }).populate('userId mechanicId');

      for (const appointment of upcomingAppointments) {
        // Ustaya bildirim gönder
        console.log(`Usta ${(appointment.mechanicId as any).name} için 1 saat kala bildirim gönderiliyor`);
        
        // Burada gerçek bildirim servisi kullanılacak
        // await NotificationService.sendPushNotification(...)
      }

      return upcomingAppointments.length;
    } catch (error) {
      console.error('Hatırlatma bildirimleri gönderme hatası:', error);
      throw error;
    }
  }
}
