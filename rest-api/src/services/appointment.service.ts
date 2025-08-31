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
      console.log('🔍 AppointmentService: createAppointment called with data:', JSON.stringify(data, null, 2));
      
      // Ustanın müsait olup olmadığını kontrol et
      const mechanic = await Mechanic.findById(data.mechanicId);
      console.log('🔍 AppointmentService: Mechanic found:', mechanic ? 'Yes' : 'No');
      if (!mechanic) {
        throw new CustomError('Usta bulunamadı', 404);
      }

      if (!mechanic.isAvailable) {
        throw new CustomError('Usta şu anda müsait değil', 400);
      }

      // appointmentDate'i Date objesine çevir
      const appointmentDateObj = new Date(data.appointmentDate);
      
      // Aynı tarih ve saatte çakışan randevu var mı kontrol et
      const conflictingAppointment = await Appointment.findOne({
        mechanicId: data.mechanicId,
        appointmentDate: {
          $gte: new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate()),
          $lt: new Date(appointmentDateObj.getFullYear(), appointmentDateObj.getMonth(), appointmentDateObj.getDate() + 1)
        },
        timeSlot: data.timeSlot,
        status: { $in: ['pending', 'confirmed', 'in-progress'] }
      });

      if (conflictingAppointment) {
        throw new CustomError('Bu tarih ve saatte usta müsait değil', 400);
      }

      // Eğer vehicleId gönderilmemişse, kullanıcının son kayıtlı aracını ata
      let resolvedVehicleId: mongoose.Types.ObjectId;
      if (!data.vehicleId) {
        const lastVehicle = await Vehicle.findOne({ userId: data.userId }).sort({ updatedAt: -1, createdAt: -1 });
        if (!lastVehicle) {
          throw new CustomError('Kullanıcının kayıtlı aracı bulunamadı. Lütfen önce araç ekleyin.', 400);
        }
        resolvedVehicleId = new mongoose.Types.ObjectId((lastVehicle as any)._id.toString());
      } else {
        resolvedVehicleId = new mongoose.Types.ObjectId(data.vehicleId);
      }

      // Randevu oluştur
      const appointment = new Appointment({
        userId: new mongoose.Types.ObjectId(data.userId),
        mechanicId: new mongoose.Types.ObjectId(data.mechanicId),
        serviceType: data.serviceType,
        appointmentDate: appointmentDateObj,
        timeSlot: data.timeSlot,
        description: data.description || '',
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
   * Kullanıcının randevularını getir (Şöför/Müşteri için)
   */
  static async getAppointmentsByUserId(userId: string) {
    try {
      if (!userId || userId.trim() === '') {
        return [];
      }
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return [];
      }
      
      const appointments = await Appointment.find({ userId })
        .populate('mechanicId', 'name surname rating experience city shopName shopType')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage lastMaintenanceDate nextMaintenanceDate')
        .sort({ appointmentDate: -1 });

      // Debug: Fiyat bilgilerini kontrol et
      appointments.forEach((apt, index) => {
        if (apt.status === 'completed' && apt.paymentStatus === 'pending') {
          console.log(`🔍 AppointmentService: Ödeme bekleyen appointment ${index + 1}:`, {
            id: apt._id,
            price: apt.price,
            priceType: typeof apt.price,
            hasPrice: apt.price && apt.price > 0
          });
        }
      });

      return appointments;
    } catch (error) {
      console.error('❌ AppointmentService: Kullanıcı randevuları getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Ustanın randevularını getir (Usta/Dükkan için)
   */
  static async getMechanicAppointments(mechanicId: string, statusFilter?: string) {
    try {
      const appointments = await Appointment.find({
        mechanicId: mechanicId,
        ...(statusFilter && { status: statusFilter })
      })
      .populate({
        path: 'userId',
        select: 'name surname email phone',
        options: { lean: true }
      })
      .populate('vehicleId')
      .sort({ appointmentDate: -1 });

      // Randevuları frontend formatına çevir
      const formattedAppointments = appointments.map(obj => {
        if (!obj.userId) {
          console.warn('⚠️ AppointmentService: userId populate failed for appointment:', obj._id, '- User document not found or deleted');
          return null;
        }

        // Vehicle bilgilerini formatla
        let vehicle = null;
        if (obj.vehicleId) {
          vehicle = {
            _id: obj.vehicleId._id,
            brand: (obj.vehicleId as any).brand || 'Bilinmiyor',
            modelName: (obj.vehicleId as any).modelName || 'Bilinmiyor',
            year: (obj.vehicleId as any).year || 'Bilinmiyor',
            plateNumber: (obj.vehicleId as any).plateNumber || 'Bilinmiyor',
            fuelType: (obj.vehicleId as any).fuelType || 'Bilinmiyor',
            engineType: (obj.vehicleId as any).engineType || 'Bilinmiyor',
            transmission: (obj.vehicleId as any).transmission || 'Bilinmiyor',
            package: (obj.vehicleId as any).package || 'Bilinmiyor',
            color: (obj.vehicleId as any).color || undefined,
            mileage: (obj.vehicleId as any).mileage || undefined,
            lastMaintenanceDate: (obj.vehicleId as any).lastMaintenanceDate || undefined,
            nextMaintenanceDate: (obj.vehicleId as any).nextMaintenanceDate || undefined
          };
        } else {
          vehicle = {
            brand: 'Araç bilgisi yok',
            modelName: '',
            plateNumber: 'Belirtilmemiş'
          };
        }

        return {
          ...obj.toObject(),
          customer: {
            _id: obj.userId._id,
            name: (obj.userId as any).name || 'Bilinmiyor',
            surname: (obj.userId as any).surname || 'Bilinmiyor',
            email: (obj.userId as any).email || 'Bilinmiyor',
            phone: (obj.userId as any).phone || 'Bilinmiyor'
          },
          vehicle: vehicle
        };
      }).filter(Boolean);

      return formattedAppointments;
    } catch (error) {
      console.error('getMechanicAppointments error:', error);
      throw error;
    }
  }

  /**
   * Randevu detayını getir
   */
  static async getAppointmentById(appointmentId: string, userId: string) {
    try {
      console.log('🔍 AppointmentService: getAppointmentById called with:', appointmentId);
      
      const appointment = await Appointment.findById(appointmentId)
        .populate('userId', 'name surname phone email')
        .populate('mechanicId', 'name surname phone email rating experience city shopType')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage lastMaintenanceDate nextMaintenanceDate')

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }
      
      // Kullanıcının bu randevuyu görme yetkisi var mı kontrol et
      const appointmentUserId = appointment.userId._id ? appointment.userId._id.toString() : appointment.userId.toString();
      const appointmentMechanicId = appointment.mechanicId._id ? appointment.mechanicId._id.toString() : appointment.mechanicId.toString();
      
      if (appointmentUserId !== userId && appointmentMechanicId !== userId) {
        throw new CustomError('Bu randevuyu görme yetkiniz yok', 403);
      }

      // Frontend formatına çevir
      const obj = appointment.toObject();
      
      // customer field'ını ekle (userId'den)
      if (obj.userId) {
        (obj as any).customer = {
          _id: (obj.userId as any)._id,
          name: (obj.userId as any).name,
          surname: (obj.userId as any).surname,
          email: (obj.userId as any).email,
          phone: (obj.userId as any).phone
        };
        delete (obj as any).userId;
      }
      
      // vehicle field'ını ekle (vehicleId'den)
      if (obj.vehicleId) {
        (obj as any).vehicle = {
          _id: (obj.vehicleId as any)._id,
          brand: (obj.vehicleId as any).brand,
          modelName: (obj.vehicleId as any).modelName,
          year: (obj.vehicleId as any).year,
          plateNumber: (obj.vehicleId as any).plateNumber,
          fuelType: (obj.vehicleId as any).fuelType,
          engineType: (obj.vehicleId as any).engineType,
          transmission: (obj.vehicleId as any).transmission,
          package: (obj.vehicleId as any).package,
          color: (obj.vehicleId as any).color,
          mileage: (obj.vehicleId as any).mileage,
          lastMaintenanceDate: (obj.vehicleId as any).lastMaintenanceDate,
          nextMaintenanceDate: (obj.vehicleId as any).nextMaintenanceDate
        };
        delete (obj as any).vehicleId;
      }
      
      // Reddedilen randevularda hassas bilgileri gizle
      if (obj.status === 'rejected') {
        if ((obj as any).customer) {
          delete (obj as any).customer.phone;
          delete (obj as any).customer.email;
        }
        (obj as any).vehicle = undefined;
      }

      return obj;
    } catch (error) {
      console.error('Randevu detayı getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Randevu durumunu güncelle (onay/red/işlem)
   */
  static async updateAppointmentStatus(
    appointmentId: string,
    status: string,
    rejectionReason?: string,
    mechanicNotes?: string
  ) {
    try {
      console.log('🔧 AppointmentService: updateAppointmentStatus called with:', {
        appointmentId,
        status,
        rejectionReason,
        mechanicNotes
      });

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Status geçişlerini kontrol et
      const validTransitions: { [key: string]: string[] } = {
        'pending': ['confirmed', 'rejected', 'cancelled'],
        'confirmed': ['in-progress', 'completed', 'cancelled'], // completed eklendi
        'in-progress': ['completed', 'cancelled'],
        'completed': ['cancelled'], // completed'dan başka duruma geçilemez
        'rejected': [], // rejected'dan başka duruma geçilemez
        'cancelled': [] // cancelled'dan başka duruma geçilemez
      };

      const currentStatus = appointment.status;
      
      // Eğer aynı status'e geçilmeye çalışılıyorsa, hata verme, sadece güncelle
      if (currentStatus === status) {
        console.log(`⚠️ AppointmentService: Aynı status'e geçiş yapılıyor: ${currentStatus} → ${status}`);
        
        // Sadece rejectionReason veya mechanicNotes güncelleniyorsa
        if (rejectionReason || mechanicNotes) {
          if (rejectionReason) appointment.rejectionReason = rejectionReason;
          if (mechanicNotes) appointment.mechanicNotes = mechanicNotes;
          appointment.updatedAt = new Date();
          await appointment.save();
          return appointment;
        }
        
        // Hiçbir değişiklik yoksa mevcut appointment'ı döndür
        return appointment;
      }
      
      const allowedTransitions = validTransitions[currentStatus] || [];

      if (!allowedTransitions.includes(status)) {
        throw new CustomError(`Geçersiz status geçişi: ${currentStatus} → ${status}`, 400);
      }

      // Durum güncellemesi
      appointment.status = status as any;
      
      if (status === 'rejected' && rejectionReason) {
        appointment.rejectionReason = rejectionReason;
      }

      if (mechanicNotes) {
        appointment.mechanicNotes = mechanicNotes;
      }

      await appointment.save();
      console.log('🔧 AppointmentService: Appointment status updated successfully to:', appointment.status);
      return appointment;
    } catch (error) {
      console.error('Randevu durumu güncelleme hatası:', error);
      throw error;
    }
  }

  /**
   * Randevuyu tamamla (iş bitir)
   */
  static async completeAppointment(appointmentId: string, completionNotes: string, price: number, estimatedDuration?: number) {
    try {
      console.log('🔧 AppointmentService: completeAppointment called with:', {
        appointmentId,
        completionNotes,
        price,
        estimatedDuration
      });

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece confirmed veya in-progress durumundaki randevular tamamlanabilir
      if (appointment.status !== 'confirmed' && appointment.status !== 'in-progress') {
        throw new CustomError('Sadece onaylanmış veya devam eden işler tamamlanabilir', 400);
      }

      // Randevuyu tamamla
      console.log('🔧 AppointmentService: Fiyat kaydediliyor:', price, 'Type:', typeof price);
      console.log('🔧 AppointmentService: Appointment öncesi price:', appointment.price);
      
      appointment.status = 'completed';
      appointment.mechanicNotes = completionNotes;
      appointment.price = price;
      appointment.paymentStatus = 'pending'; // Ödeme bekleniyor
      
      console.log('🔧 AppointmentService: Appointment sonrası price:', appointment.price);
      
      // Usta tahmini süreyi belirler
      if (estimatedDuration && estimatedDuration > 0) {
        appointment.estimatedDuration = estimatedDuration;
      }
      
      appointment.actualDuration = appointment.estimatedDuration || 0;
      appointment.completionDate = new Date();

      console.log('🔧 AppointmentService: Appointment kaydedilmeden önce price:', appointment.price);
      await appointment.save();
      console.log('🔧 AppointmentService: Appointment kaydedildikten sonra price:', appointment.price);
      console.log('🔧 AppointmentService: Appointment completed successfully with price:', appointment.price);
      return appointment;
    } catch (error) {
      console.error('Randevu tamamlama hatası:', error);
      throw error;
    }
  }

  /**
   * Ödeme durumunu güncelle
   */
  static async updatePaymentStatus(appointmentId: string, paymentData: any, userId: string) {
    try {
      const appointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, userId: new mongoose.Types.ObjectId(userId) },
        { 
          paymentStatus: paymentData.paymentStatus,
          paymentDate: paymentData.paymentDate || new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      return appointment;
    } catch (error) {
      console.error('Ödeme durumu güncelleme hatası:', error);
      throw error;
    }
  }

  /**
   * Randevuyu iptal et
   */
  static async cancelAppointment(appointmentId: string, userId: string) {
    try {
      const appointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, userId: new mongoose.Types.ObjectId(userId) },
        { status: 'cancelled', updatedAt: new Date() },
        { new: true }
      );

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı veya iptal edilemez', 404);
      }

      return appointment;
    } catch (error) {
      console.error('Randevu iptal etme hatası:', error);
      throw error;
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  static async updateNotificationSettings(appointmentId: string, settings: any, userId: string) {
    try {
      const appointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, userId: new mongoose.Types.ObjectId(userId) },
        { 
          notificationSettings: settings,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      return appointment;
    } catch (error) {
      console.error('Bildirim ayarları güncelleme hatası:', error);
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
      if (appointment.status !== 'confirmed' && appointment.status !== 'in-progress') {
        throw new CustomError('Randevu henüz onaylanmamış', 400);
      }

      // Kullanıcının bu randevuyu görme yetkisi var mı kontrol et
      const appointmentUserId = appointment.userId._id ? appointment.userId._id.toString() : appointment.userId.toString();
      const appointmentMechanicId = appointment.mechanicId._id ? appointment.mechanicId._id.toString() : appointment.mechanicId.toString();
      
      if (appointmentUserId !== userId && appointmentMechanicId !== userId) {
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
   * Randevu istatistiklerini getir
   */
  static async getAppointmentStats(mechanicId: string) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Aktif işler (pending + confirmed + in-progress)
      const activeJobs = await Appointment.countDocuments({
        mechanicId,
        status: { $in: ['pending', 'confirmed', 'in-progress'] }
      });

      // Bugünkü kazanç (tamamlanan işler)
      const todayCompletedAppointments = await Appointment.find({
        mechanicId,
        status: 'completed',
        updatedAt: { $gte: startOfDay, $lt: endOfDay }
      });

      const todayEarnings = todayCompletedAppointments.reduce((total, app) => total + (app.price || 0), 0);

      // Gerçek rating bilgisini getir
      const { AppointmentRating } = await import('../models/AppointmentRating');
      const ratings = await AppointmentRating.find({ mechanicId });
      
      let averageRating = 0;
      if (ratings.length > 0) {
        const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
        averageRating = totalRating / ratings.length;
      }

      return {
        activeJobs,
        todayEarnings,
        rating: Math.round(averageRating * 10) / 10
      };
    } catch (error) {
      console.error('İstatistik getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Bugünkü randevuları getir
   */
  static async getTodaysAppointments(userId: string) {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const appointments = await Appointment.find({
        userId: new mongoose.Types.ObjectId(userId),
        appointmentDate: { $gte: startOfDay, $lt: endOfDay },
        status: { $in: ['confirmed', 'in-progress'] }
      })
        .populate('mechanicId', 'name surname rating experience city shopName shopType')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      console.error('Bugünkü randevuları getirme hatası:', error);
      return [];
    }
  }

  /**
   * Randevu ara
   */
  static async searchAppointments(query: string, userId: string) {
    try {
      const appointments = await Appointment.find({
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
          { serviceType: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      })
        .populate('mechanicId', 'name surname rating experience city shopName shopType')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .sort({ appointmentDate: -1 });

      return appointments;
    } catch (error) {
      console.error('Randevu arama hatası:', error);
      throw error;
    }
  }

  /**
   * Tarih aralığında randevuları getir
   */
  static async getAppointmentsByDateRange(startDate: string, endDate: string, userId: string) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const appointments = await Appointment.find({
        userId: new mongoose.Types.ObjectId(userId),
        appointmentDate: { $gte: start, $lte: end }
      })
        .populate('mechanicId', 'name surname rating experience city shopName shopType')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .sort({ appointmentDate: -1 });

      return appointments;
    } catch (error) {
      console.error('Tarih aralığında randevu getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Mekaniğin müsaitlik durumunu getir
   */
  static async getMechanicAvailability(date: string, mechanicId: string) {
    try {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

      const appointments = await Appointment.find({
        mechanicId: new mongoose.Types.ObjectId(mechanicId),
        appointmentDate: { $gte: startOfDay, $lt: endOfDay },
        status: { $in: ['pending', 'confirmed', 'in-progress'] }
      })
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      console.error('Müsaitlik durumu getirme hatası:', error);
      return [];
    }
  }

  /**
   * Tüm randevuları getir (debug için)
   */
  static async getAllAppointments() {
    try {
      const appointments = await Appointment.find({})
        .populate('userId', 'name surname')
        .populate('mechanicId', 'name surname shopName shopType')
        .populate('vehicleId', 'brand modelName plateNumber')
        .sort({ createdAt: -1 });

      return appointments;
    } catch (error) {
      console.error('Tüm randevuları getirme hatası:', error);
      return [];
    }
  }
}
