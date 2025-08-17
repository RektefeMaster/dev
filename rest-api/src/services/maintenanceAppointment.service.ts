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
        .populate('vehicleId', 'brand modelName plateNumber')
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
        .populate('vehicleId', 'brand modelName plateNumber')
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
        .populate('vehicleId', 'brand modelName plateNumber')
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
  static async updateAppointmentByMechanic(appointmentId: string, mechanicId: string, status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled', notes?: string, rejectionReason?: string): Promise<IMaintenanceAppointment> {
    try {
      const appointment = await MaintenanceAppointment.findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        mechanicId: new mongoose.Types.ObjectId(mechanicId)
      });

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Durum güncellemesi
      appointment.status = status;
      if (notes) {
        appointment.mechanicNotes = notes;
      }
      
      if (rejectionReason) {
        appointment.rejectionReason = rejectionReason;
      }

      if (status === 'completed') {
        appointment.completionDate = new Date();
      }

      if (status === 'cancelled' || status === 'rejected') {
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
        .populate('vehicleId', 'brand modelName plateNumber')
        .populate('mechanicId', 'shopName city rating')
        .populate('mechanicId.userId', 'name surname')
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      throw new CustomError('Randevu arama yapılırken hata oluştu', 500);
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
        .populate('vehicleId', 'brand modelName plateNumber')
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
}
