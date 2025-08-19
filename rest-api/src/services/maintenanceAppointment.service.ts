import MaintenanceAppointment, { IMaintenanceAppointment } from '../models/MaintenanceAppointment';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Mechanic } from '../models/Mechanic';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';

export class MaintenanceAppointmentService {
  /**
   * Yeni bakım randevusu oluştur
   */
  static async createAppointment(appointmentData: Partial<IMaintenanceAppointment>, userId: string): Promise<IMaintenanceAppointment> {
    try {
      // Kullanıcının var olduğunu kontrol et
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı', 404);
      }

      // Aracın var olduğunu ve kullanıcıya ait olduğunu kontrol et
      if (appointmentData.vehicleId) {
        const vehicle = await Vehicle.findOne({
          _id: new mongoose.Types.ObjectId(appointmentData.vehicleId),
          userId: new mongoose.Types.ObjectId(userId)
        });
        if (!vehicle) {
          throw new CustomError('Araç bulunamadı veya size ait değil', 404);
        }
      }

      // Mekaniğin var olduğunu kontrol et
      if (appointmentData.mechanicId) {
        const mechanic = await Mechanic.findById(appointmentData.mechanicId);
        if (!mechanic) {
          throw new CustomError('Mekanik bulunamadı', 404);
        }
        if (!mechanic.isAvailable) {
          throw new CustomError('Mekanik şu anda müsait değil', 400);
        }
      }

      // Randevu çakışması kontrolü
      if (appointmentData.appointmentDate && appointmentData.mechanicId) {
        const conflictingAppointment = await MaintenanceAppointment.findOne({
          mechanicId: new mongoose.Types.ObjectId(appointmentData.mechanicId),
          appointmentDate: new Date(appointmentData.appointmentDate),
          status: { $in: ['pending', 'confirmed'] }
        });

        if (conflictingAppointment) {
          throw new CustomError('Bu tarihte mekanik müsait değil', 400);
        }
      }

      const appointment = new MaintenanceAppointment({
        ...appointmentData,
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending'
      });

      const savedAppointment = await appointment.save();
      return savedAppointment;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Randevu oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Kullanıcının randevularını getir
   */
  static async getUserAppointments(userId: string): Promise<IMaintenanceAppointment[]> {
    try {
      const appointments = await MaintenanceAppointment.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      })
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage')
        .populate('mechanicId', 'shopName city rating')
        .populate('mechanicId.userId', 'name surname')
        .sort({ appointmentDate: 1 });
      
      return appointments;
    } catch (error) {
      throw new CustomError('Randevular getirilirken hata oluştu', 500);
    }
  }

  /**
   * Mekaniğin randevularını getir
   */
  static async getMechanicAppointments(mechanicId: string): Promise<IMaintenanceAppointment[]> {
    try {
      const appointments = await MaintenanceAppointment.find({ 
        mechanicId: new mongoose.Types.ObjectId(mechanicId) 
      })
        .populate('userId', 'name surname email phone')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage')
        .sort({ appointmentDate: 1 });
      
      return appointments;
    } catch (error) {
      throw new CustomError('Randevular getirilirken hata oluştu', 500);
    }
  }

  /**
   * Belirli bir randevuyu getir
   */
  static async getAppointmentById(appointmentId: string, userId: string): Promise<IMaintenanceAppointment> {
    try {
      const appointment = await MaintenanceAppointment.findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        userId: new mongoose.Types.ObjectId(userId)
      })
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage')
        .populate('mechanicId', 'shopName city rating')
        .populate('mechanicId.userId', 'name surname');

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      return appointment;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Randevu getirilirken hata oluştu', 500);
    }
  }

  /**
   * Randevu durumunu güncelle
   */
  static async updateAppointmentStatus(appointmentId: string, userId: string, status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled', notes?: string): Promise<IMaintenanceAppointment> {
    try {
      const appointment = await MaintenanceAppointment.findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Durum güncellemesi
      appointment.status = status;
      if (notes) {
        appointment.notes = notes;
      }

      if (status === 'completed') {
        appointment.completionDate = new Date();
      }

      const updatedAppointment = await appointment.save();
      return updatedAppointment;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Randevu durumu güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik randevu durumunu güncelle
   */
  static async updateAppointmentByMechanic(
    appointmentId: string, 
    mechanicId: string, 
    updateData: {
      status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
      notes?: string;
      rejectionReason?: string;
      price?: number;
      estimatedDuration?: number;
      mechanicNotes?: string;
    }
  ): Promise<IMaintenanceAppointment> {
    try {
      const appointment = await MaintenanceAppointment.findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        mechanicId: new mongoose.Types.ObjectId(mechanicId)
      });

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        throw new CustomError('Bu randevu güncellenemez', 400);
      }

      // Tüm alanları güncelle
      Object.assign(appointment, updateData);

      // Status completed ise completionDate'i otomatik set et ve payment_pending'e geç
      if (updateData.status === 'completed') {
        appointment.completionDate = new Date();
        // Eğer fiyat belirlenmişse payment_pending status'üne geç
        if (updateData.price && updateData.price > 0) {
          appointment.status = 'payment_pending';
        }
      }
      
      // Status confirmed ise confirmedAt'i set et
      if (updateData.status === 'confirmed') {
        appointment.confirmedAt = new Date();
      }
      
      // Status in-progress ise inProgressAt'i set et
      if (updateData.status === 'in-progress') {
        appointment.inProgressAt = new Date();
      }

      // Status cancelled ise cancellationDate'i set et
      if (updateData.status === 'cancelled') {
        appointment.cancellationDate = new Date();
      }

      const updatedAppointment = await appointment.save();
      return updatedAppointment;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Randevu durumu güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Randevuyu iptal et
   */
  static async cancelAppointment(appointmentId: string, userId: string): Promise<void> {
    try {
      const appointment = await MaintenanceAppointment.findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        throw new CustomError('Bu randevu iptal edilemez', 400);
      }

      appointment.status = 'cancelled';
      appointment.cancellationDate = new Date();
      await appointment.save();
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Randevu iptal edilirken hata oluştu', 500);
    }
  }

  /**
   * Randevu arama
   */
  static async searchAppointments(searchTerm: string, userId?: string): Promise<IMaintenanceAppointment[]> {
    try {
      const searchQuery: any = {
        $or: [
          { 'vehicleId.brand': { $regex: searchTerm, $options: 'i' } },
          { 'vehicleId.modelName': { $regex: searchTerm, $options: 'i' } },
          { 'vehicleId.plateNumber': { $regex: searchTerm, $options: 'i' } },
          { 'mechanicId.shopName': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (userId) {
        searchQuery.userId = new mongoose.Types.ObjectId(userId);
      }

      const appointments = await MaintenanceAppointment.find(searchQuery)
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage')
        .populate('mechanicId', 'shopName city rating')
        .populate('mechanicId.userId', 'name surname')
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      throw new CustomError('Randevu arama yapılırken hata oluştu', 500);
    }
  }

  /**
   * Bugünkü onaylanan randevuları getir
   */
  static async getTodaysAppointments(userId: string): Promise<IMaintenanceAppointment[]> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const appointments = await MaintenanceAppointment.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['confirmed', 'in-progress'] },
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      })
        .populate('vehicleId', 'brand modelName year plateNumber')
        .populate('mechanicId', 'shopName')
        .populate('mechanicId.userId', 'name surname')
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      throw new CustomError('Bugünkü randevular getirilirken hata oluştu', 500);
    }
  }

  /**
   * Tarih aralığında randevuları getir
   */
  static async getAppointmentsByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<IMaintenanceAppointment[]> {
    try {
      const dateQuery: any = {
        appointmentDate: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (userId) {
        dateQuery.userId = new mongoose.Types.ObjectId(userId);
      }

      const appointments = await MaintenanceAppointment.find(dateQuery)
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage')
        .populate('mechanicId', 'shopName city rating')
        .populate('mechanicId.userId', 'name surname')
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      throw new CustomError('Tarih aralığında randevular getirilirken hata oluştu', 500);
    }
  }

  /**
   * Randevu istatistikleri
   */
  static async getAppointmentStats(userId: string): Promise<any> {
    try {
      const stats = await MaintenanceAppointment.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalAppointments = await MaintenanceAppointment.countDocuments({ 
        userId: new mongoose.Types.ObjectId(userId) 
      });

      return {
        total: totalAppointments,
        byStatus: stats,
        pending: stats.find((s: any) => s._id === 'pending')?.count || 0,
        confirmed: stats.find((s: any) => s._id === 'pending')?.count || 0,
        completed: stats.find((s: any) => s._id === 'completed')?.count || 0,
        cancelled: stats.find((s: any) => s._id === 'cancelled')?.count || 0
      };
    } catch (error) {
      throw new CustomError('İstatistikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Mekaniğin müsaitlik durumunu getir
   */
  static async getMechanicAvailability(date: string, mechanicId: string): Promise<any[]> {
    try {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // O gün için mevcut randevuları getir
      const existingAppointments = await MaintenanceAppointment.find({
        mechanicId: new mongoose.Types.ObjectId(mechanicId),
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: { $in: ['pending', 'confirmed'] }
      });

      // Çalışma saatleri (varsayılan olarak 08:00-18:00)
      const workingHours = {
        start: 8,
        end: 18
      };

      // Müsait saatleri oluştur (1 saatlik aralıklarla)
      const availableSlots = [];
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const slotTime = `${hour.toString().padStart(2, '0')}:00`;
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(hour, 0, 0, 0);

        // Bu saatte randevu var mı kontrol et
        const isAvailable = !existingAppointments.some(appointment => {
          const appointmentHour = new Date(appointment.appointmentDate).getHours();
          return appointmentHour === hour;
        });

        availableSlots.push({
          time: slotTime,
          isAvailable: isAvailable
        });
      }

      return availableSlots;
    } catch (error) {
      throw new CustomError('Müsaitlik durumu getirilirken hata oluştu', 500);
    }
  }

  /**
   * Randevuyu sil
   */
  static async deleteAppointment(appointmentId: string, userId: string): Promise<void> {
    try {
      const appointment = await MaintenanceAppointment.findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece tamamlanmış veya iptal edilmiş randevular silinebilir
      if (appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'in-progress') {
        throw new CustomError('Bu randevu henüz silinemez', 400);
      }

      await MaintenanceAppointment.findByIdAndDelete(appointmentId);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Randevu silinirken hata oluştu', 500);
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  static async updateNotificationSettings(appointmentId: string, notificationSettings: any): Promise<IMaintenanceAppointment> {
    try {
      const appointment = await MaintenanceAppointment.findByIdAndUpdate(
        appointmentId,
        { 
          $set: { 
            notificationSettings: {
              twoHoursBefore: notificationSettings.twoHoursBefore || false,
              oneHourBefore: notificationSettings.oneHourBefore || false,
              oneDayBefore: notificationSettings.oneDayBefore || false,
              customTime: notificationSettings.customTime || false,
              customMinutes: notificationSettings.customMinutes || 30
            }
          }
        },
        { new: true }
      );

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      return appointment;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Bildirim ayarları güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Bildirim ayarlarını getir
   */
  static async getNotificationSettings(appointmentId: string): Promise<any> {
    try {
      const appointment = await MaintenanceAppointment.findById(appointmentId);
      
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      return appointment.notificationSettings || {
        twoHoursBefore: false,
        oneHourBefore: false,
        oneDayBefore: false,
        customTime: false,
        customMinutes: 30
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Bildirim ayarları getirilirken hata oluştu', 500);
    }
  }

  /**
   * Ödeme durumunu güncelle
   */
  static async updatePaymentStatus(appointmentId: string, paymentStatus: 'paid' | 'unpaid', paymentDate?: Date, status?: string): Promise<IMaintenanceAppointment> {
    try {
      const updateData: any = { paymentStatus };
      
      if (paymentStatus === 'paid' && paymentDate) {
        updateData.paymentDate = paymentDate;
      } else if (paymentStatus === 'paid' && !paymentDate) {
        updateData.paymentDate = new Date();
      }

      // Status güncelleme - frontend'den gelen status veya otomatik
      if (status) {
        updateData.status = status;
      } else if (paymentStatus === 'paid') {
        updateData.status = 'paid'; // Otomatik olarak 'paid' yap
      }

      // Eğer paymentStatus 'paid' ise ve status 'completed' ise, status'ü 'paid' yap
      if (paymentStatus === 'paid' && updateData.status === 'completed') {
        updateData.status = 'paid';
      }

      // Eğer completionDate yoksa şimdi set et
      if (paymentStatus === 'paid' && !updateData.completionDate) {
        const existingAppointment = await MaintenanceAppointment.findById(appointmentId);
        if (existingAppointment && !existingAppointment.completionDate) {
          updateData.completionDate = new Date();
        }
      }

      const appointment = await MaintenanceAppointment.findByIdAndUpdate(
        appointmentId,
        { $set: updateData },
        { new: true }
      );

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      return appointment;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Ödeme durumu güncellenirken hata oluştu', 500);
    }
  }
}
