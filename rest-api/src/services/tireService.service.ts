import { Appointment, IAppointment } from '../models/Appointment';
import { TireHealthRecord, ITireHealthRecord } from '../models/TireHealthRecord';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';
import { sendNotificationToUser } from '../utils/socketNotifications';
import { sendPushNotification } from '../services/pushNotificationService';
import { AppointmentStatus } from '../../../shared/types/enums';

export class TireServiceService {
  /**
   * Yeni lastik hizmet talebi oluştur
   */
  static async createTireServiceRequest(data: {
    userId: string;
    mechanicId?: string;
    tireServiceType: string;
    vehicleInfo?: any;
    vehicleId?: string;
    tireDetails: {
      size: string;
      brand?: string;
      model?: string;
      season?: string;
      condition: string;
      quantity: number;
      notes?: string;
    };
    location?: any;
    isMobileService?: boolean;
    isUrgent?: boolean;
    description?: string;
    specialRequests?: string;
    scheduledFor?: Date;
  }) {
    try {
      const {
        userId,
        mechanicId,
        tireServiceType,
        vehicleInfo,
        vehicleId,
        tireDetails,
        location,
        isMobileService = false,
        isUrgent = false,
        description,
        specialRequests,
        scheduledFor
      } = data;

      // Yeni appointment oluştur
      const appointment = new Appointment({
        userId: new mongoose.Types.ObjectId(userId),
        mechanicId: mechanicId ? new mongoose.Types.ObjectId(mechanicId) : undefined,
        serviceType: 'lastik-servisi', // ServiceType enum'dan
        tireServiceType,
        vehicleId: vehicleId ? new mongoose.Types.ObjectId(vehicleId) : undefined,
        vehicleInfo,
        tireSize: tireDetails.size,
        tireBrand: tireDetails.brand,
        tireModel: tireDetails.model,
        season: tireDetails.season,
        tireCondition: tireDetails.condition,
        quantity: tireDetails.quantity,
        description: description || tireDetails.notes,
        specialRequests,
        isMobileService,
        isUrgent,
        location,
        appointmentDate: scheduledFor || new Date(),
        timeSlot: scheduledFor ? new Date(scheduledFor).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'En Kısa Sürede',
        status: mechanicId ? AppointmentStatus.SCHEDULED : AppointmentStatus.REQUESTED,
        requestType: isUrgent ? 'immediate' : 'scheduled',
        priceSource: 'to_be_determined',
        paymentStatus: 'PENDING',
        notificationSettings: {
          oneHourBefore: true,
          twoHoursBefore: false,
          oneDayBefore: false
        },
        shareContactInfo: true
      });

      await appointment.save();

      // Bildirim gönder
      if (mechanicId) {
        // Belirli bir ustaya gönderildi
        await this.notifySpecificMechanic(appointment, mechanicId);
      } else if (location && location.coordinates) {
        // Yakındaki uygun ustalara bildirim gönder
        await this.notifyNearbyMechanics(appointment, location.coordinates);
      }

      return {
        success: true,
        message: 'Lastik hizmet talebi başarıyla oluşturuldu',
        data: appointment
      };
    } catch (error: any) {
      console.error('Lastik hizmet talebi oluşturma hatası:', error);
      throw new CustomError('Lastik hizmet talebi oluşturulamadı', 500);
    }
  }

  /**
   * Usta için lastik işlerini getir
   */
  static async getTireJobsForMechanic(mechanicId: string, filters?: {
    status?: string;
    serviceType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const query: any = {
        $or: [
          { mechanicId: new mongoose.Types.ObjectId(mechanicId) },
          { mechanicId: { $exists: false }, status: AppointmentStatus.REQUESTED }
        ],
        serviceType: 'lastik-servisi'
      };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.serviceType) {
        query.tireServiceType = filters.serviceType;
      }

      if (filters?.startDate || filters?.endDate) {
        query.appointmentDate = {};
        if (filters.startDate) {
          query.appointmentDate.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.appointmentDate.$lte = filters.endDate;
        }
      }

      const jobs = await Appointment.find(query)
        .populate('userId', 'name surname phone email')
        .populate('vehicleId', 'brand model year plateNumber')
        .sort({ appointmentDate: -1, createdAt: -1 })
        .lean();

      return {
        success: true,
        data: jobs
      };
    } catch (error: any) {
      console.error('Lastik işleri getirme hatası:', error);
      throw new CustomError('Lastik işleri getirilemedi', 500);
    }
  }

  /**
   * Müşteri için kendi lastik taleplerini getir
   */
  static async getMyTireRequests(userId: string, filters?: {
    status?: string;
    includeCompleted?: boolean;
  }) {
    try {
      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        serviceType: 'lastik-servisi'
      };

      if (filters?.status) {
        query.status = filters.status;
      } else if (!filters?.includeCompleted) {
        query.status = { $nin: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED] };
      }

      const requests = await Appointment.find(query)
        .populate('mechanicId', 'name surname phone shopName rating')
        .populate('vehicleId', 'brand model year plateNumber')
        .sort({ appointmentDate: -1, createdAt: -1 })
        .lean();

      return {
        success: true,
        data: requests
      };
    } catch (error: any) {
      console.error('Lastik talepleri getirme hatası:', error);
      throw new CustomError('Lastik talepleri getirilemedi', 500);
    }
  }

  /**
   * İşi kabul et
   */
  static async acceptJob(jobId: string, mechanicId: string) {
    try {
      const job = await Appointment.findById(jobId);

      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      if (job.mechanicId && job.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu iş başka bir usta tarafından alınmış', 400);
      }

      job.mechanicId = new mongoose.Types.ObjectId(mechanicId);
      job.status = AppointmentStatus.SCHEDULED;

      if (!job.statusHistory) {
        job.statusHistory = [];
      }
      job.statusHistory.push({
        status: AppointmentStatus.SCHEDULED,
        timestamp: new Date(),
        mechanicId,
        notes: 'İş kabul edildi'
      });

      await job.save();

      // Müşteriye bildirim gönder
      const notification = new Notification({
        recipientId: job.userId,
        recipientType: 'driver',
        title: 'İşiniz Kabul Edildi',
        message: `Lastik ${job.tireServiceType} talebiniz kabul edildi.`,
        type: 'appointment_confirmed',
        data: {
          appointmentId: job._id,
          status: AppointmentStatus.SCHEDULED
        }
      });
      await notification.save();
      
      // Socket ve push notification gönder
      sendNotificationToUser(job.userId.toString(), notification);
      
      const user = await User.findById(job.userId);
      if (user?.pushToken) {
        await sendPushNotification(user.pushToken, {
          title: 'İşiniz Kabul Edildi',
          body: `Lastik ${job.tireServiceType} talebiniz kabul edildi.`,
          data: { appointmentId: job._id.toString() }
        });
      }

      return {
        success: true,
        message: 'İş başarıyla kabul edildi',
        data: job
      };
    } catch (error: any) {
      console.error('İş kabul etme hatası:', error);
      throw error;
    }
  }

  /**
   * İşi başlat
   */
  static async startJob(jobId: string, mechanicId: string) {
    try {
      const job = await Appointment.findOne({
        _id: jobId,
        mechanicId: new mongoose.Types.ObjectId(mechanicId)
      });

      if (!job) {
        throw new CustomError('İş bulunamadı veya yetkiniz yok', 404);
      }

      job.status = AppointmentStatus.IN_SERVICE;

      if (!job.statusHistory) {
        job.statusHistory = [];
      }
      job.statusHistory.push({
        status: AppointmentStatus.IN_SERVICE,
        timestamp: new Date(),
        mechanicId,
        notes: 'İş başlatıldı'
      });

      await job.save();

      // Müşteriye bildirim gönder
      const notification = new Notification({
        recipientId: job.userId,
        recipientType: 'driver',
        title: 'İşiniz Başladı',
        message: `Lastik ${job.tireServiceType} işleminiz başladı.`,
        type: 'system',
        data: {
          appointmentId: job._id,
          status: AppointmentStatus.IN_SERVICE
        }
      });
      await notification.save();
      
      sendNotificationToUser(job.userId.toString(), notification);
      
      const user = await User.findById(job.userId);
      if (user?.pushToken) {
        await sendPushNotification(user.pushToken, {
          title: 'İşiniz Başladı',
          body: `Lastik ${job.tireServiceType} işleminiz başladı.`,
          data: { appointmentId: job._id.toString() }
        });
      }

      return {
        success: true,
        message: 'İş başarıyla başlatıldı',
        data: job
      };
    } catch (error: any) {
      console.error('İş başlatma hatası:', error);
      throw error;
    }
  }

  /**
   * İşi tamamla
   */
  static async completeJob(jobId: string, mechanicId: string, completionData?: {
    notes?: string;
    finalPrice?: number;
    warrantyInfo?: {
      duration: number;
      conditions: string[];
    };
  }) {
    try {
      const job = await Appointment.findOne({
        _id: jobId,
        mechanicId: new mongoose.Types.ObjectId(mechanicId)
      });

      if (!job) {
        throw new CustomError('İş bulunamadı veya yetkiniz yok', 404);
      }

      job.status = AppointmentStatus.COMPLETED;
      job.completionDate = new Date();
      
      if (completionData?.notes) {
        job.mechanicNotes = completionData.notes;
      }
      
      if (completionData?.finalPrice) {
        job.finalPrice = completionData.finalPrice;
      }
      
      if (completionData?.warrantyInfo) {
        job.warrantyInfo = completionData.warrantyInfo;
      }

      if (!job.statusHistory) {
        job.statusHistory = [];
      }
      job.statusHistory.push({
        status: AppointmentStatus.COMPLETED,
        timestamp: new Date(),
        mechanicId,
        notes: completionData?.notes || 'İş tamamlandı'
      });

      await job.save();

      // Müşteriye bildirim gönder
      const notification = new Notification({
        recipientId: job.userId,
        recipientType: 'driver',
        title: 'İşiniz Tamamlandı',
        message: `Lastik ${job.tireServiceType} işleminiz tamamlandı.`,
        type: 'system',
        data: {
          appointmentId: job._id,
          status: AppointmentStatus.COMPLETED
        }
      });
      await notification.save();
      
      sendNotificationToUser(job.userId.toString(), notification);
      
      const user = await User.findById(job.userId);
      if (user?.pushToken) {
        await sendPushNotification(user.pushToken, {
          title: 'İşiniz Tamamlandı',
          body: `Lastik ${job.tireServiceType} işleminiz tamamlandı.`,
          data: { appointmentId: job._id.toString() }
        });
      }

      return {
        success: true,
        message: 'İş başarıyla tamamlandı',
        data: job
      };
    } catch (error: any) {
      console.error('İş tamamlama hatası:', error);
      throw error;
    }
  }

  /**
   * Fiyat teklifi gönder
   */
  static async sendPriceQuote(jobId: string, mechanicId: string, quoteData: {
    amount: number;
    breakdown?: {
      labor?: number;
      parts?: number;
      tax?: number;
    };
    notes?: string;
    estimatedDuration?: number;
  }) {
    try {
      const job = await Appointment.findOne({
        _id: jobId,
        mechanicId: new mongoose.Types.ObjectId(mechanicId)
      });

      if (!job) {
        throw new CustomError('İş bulunamadı veya yetkiniz yok', 404);
      }

      job.quotedPrice = quoteData.amount;
      job.price = quoteData.amount;
      job.priceSource = 'mechanic_quoted';
      
      if (quoteData.estimatedDuration) {
        job.estimatedDuration = quoteData.estimatedDuration;
      }

      if (quoteData.notes) {
        job.mechanicNotes = quoteData.notes;
      }

      await job.save();

      // Müşteriye bildirim gönder
      const notification = new Notification({
        recipientId: job.userId,
        recipientType: 'driver',
        title: 'Fiyat Teklifi Aldınız',
        message: `Lastik hizmetiniz için ${quoteData.amount} TL fiyat teklifi aldınız.`,
        type: 'quote_received',
        data: {
          appointmentId: job._id,
          price: quoteData.amount
        }
      });
      await notification.save();
      
      sendNotificationToUser(job.userId.toString(), notification);
      
      const user = await User.findById(job.userId);
      if (user?.pushToken) {
        await sendPushNotification(user.pushToken, {
          title: 'Fiyat Teklifi Aldınız',
          body: `Lastik hizmetiniz için ${quoteData.amount} TL fiyat teklifi aldınız.`,
          data: { appointmentId: job._id.toString(), price: quoteData.amount }
        });
      }

      return {
        success: true,
        message: 'Fiyat teklifi başarıyla gönderildi',
        data: job
      };
    } catch (error: any) {
      console.error('Fiyat teklifi gönderme hatası:', error);
      throw error;
    }
  }

  /**
   * Lastik sağlık kontrolü kaydet
   */
  static async saveTireHealthCheck(data: {
    vehicleId: string;
    userId: string;
    mechanicId: string;
    checkDate?: Date;
    treadDepth: [number, number, number, number];
    pressure: [number, number, number, number];
    condition: [string, string, string, string];
    overallCondition: string;
    photos?: string[];
    recommendations: string[];
    issues?: string[];
    notes?: string;
    nextCheckDate?: Date;
    nextCheckKm?: number;
  }) {
    try {
      const healthRecord = new TireHealthRecord({
        ...data,
        checkDate: data.checkDate || new Date()
      });

      await healthRecord.save();

      // Müşteriye bildirim gönder
      const notification = new Notification({
        recipientId: new mongoose.Types.ObjectId(data.userId),
        recipientType: 'driver',
        title: 'Lastik Kontrolü Tamamlandı',
        message: `Aracınızın lastik kontrolü tamamlandı. Genel durum: ${data.overallCondition}`,
        type: 'system',
        data: {
          healthRecordId: healthRecord._id
        }
      });
      await notification.save();
      
      sendNotificationToUser(data.userId, notification);
      
      const user = await User.findById(data.userId);
      if (user?.pushToken) {
        await sendPushNotification(user.pushToken, {
          title: 'Lastik Kontrolü Tamamlandı',
          body: `Aracınızın lastik kontrolü tamamlandı. Genel durum: ${data.overallCondition}`,
          data: { healthRecordId: healthRecord._id.toString() }
        });
      }

      return {
        success: true,
        message: 'Lastik sağlık kontrolü başarıyla kaydedildi',
        data: healthRecord
      };
    } catch (error: any) {
      console.error('Lastik sağlık kontrolü kaydetme hatası:', error);
      throw new CustomError('Lastik sağlık kontrolü kaydedilemedi', 500);
    }
  }

  /**
   * Araç lastik geçmişini getir
   */
  static async getTireHealthHistory(vehicleId: string, userId: string) {
    try {
      const history = await TireHealthRecord.find({
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
        userId: new mongoose.Types.ObjectId(userId)
      })
        .populate('mechanicId', 'name surname shopName')
        .sort({ checkDate: -1 })
        .lean();

      return {
        success: true,
        data: history
      };
    } catch (error: any) {
      console.error('Lastik geçmişi getirme hatası:', error);
      throw new CustomError('Lastik geçmişi getirilemedi', 500);
    }
  }

  /**
   * Belirli bir ustaya bildirim gönder
   */
  private static async notifySpecificMechanic(appointment: IAppointment, mechanicId: string) {
    try {
      const mechanic = await User.findById(mechanicId);
      if (!mechanic) {
        return;
      }

      const notification = new Notification({
        recipientId: mechanic._id,
        recipientType: 'mechanic',
        title: 'Yeni Lastik İşi',
        message: `Yeni bir lastik ${appointment.tireServiceType} talebiniz var.`,
        type: 'appointment_request',
        data: {
          appointmentId: appointment._id,
          serviceType: appointment.tireServiceType,
          isMobileService: appointment.isMobileService,
          isUrgent: appointment.isUrgent
        }
      });
      await notification.save();
      
      sendNotificationToUser(mechanic._id.toString(), notification);
      
      if (mechanic.pushToken) {
        await sendPushNotification(mechanic.pushToken, {
          title: 'Yeni Lastik İşi',
          body: `Yeni bir lastik ${appointment.tireServiceType} talebiniz var.`,
          data: { 
            appointmentId: appointment._id.toString(),
            isUrgent: appointment.isUrgent 
          }
        });
      }
    } catch (error: any) {
      console.error('Ustaya bildirim gönderme hatası:', error);
    }
  }

  /**
   * Yakındaki ustalara bildirim gönder
   */
  private static async notifyNearbyMechanics(appointment: IAppointment, coordinates: number[]) {
    try {
      // 20km yarıçapında lastik hizmeti veren ustaları bul
      const nearbyMechanics = await User.find({
        userType: 'mechanic',
        serviceCategories: 'tire',
        isAvailable: true,
        'currentLocation.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: 20000 // 20km
          }
        }
      }).limit(10);

      // Her ustaya bildirim gönder
      for (const mechanic of nearbyMechanics) {
        const notification = new Notification({
          recipientId: mechanic._id,
          recipientType: 'mechanic',
          title: 'Yeni Lastik İşi',
          message: `Yakınınızda yeni bir lastik ${appointment.tireServiceType} talebi var.`,
          type: 'appointment_request',
          data: {
            appointmentId: appointment._id,
            serviceType: appointment.tireServiceType,
            isMobileService: appointment.isMobileService,
            isUrgent: appointment.isUrgent
          }
        });
        await notification.save();
        
        sendNotificationToUser(mechanic._id.toString(), notification);
        
        if (mechanic.pushToken) {
          await sendPushNotification(mechanic.pushToken, {
            title: 'Yeni Lastik İşi',
            body: `Yakınınızda yeni bir lastik ${appointment.tireServiceType} talebi var.`,
            data: { 
              appointmentId: appointment._id.toString(),
              isUrgent: appointment.isUrgent 
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Ustalara bildirim gönderme hatası:', error);
      // Bildirim hatası kritik değil, devam et
    }
  }

  /**
   * İş durumunu getir
   */
  static async getJobStatus(jobId: string, userId: string) {
    try {
      const job = await Appointment.findOne({
        _id: jobId,
        $or: [
          { userId: new mongoose.Types.ObjectId(userId) },
          { mechanicId: new mongoose.Types.ObjectId(userId) }
        ]
      })
        .populate('userId', 'name surname phone')
        .populate('mechanicId', 'name surname phone shopName rating')
        .populate('vehicleId', 'brand model year plateNumber')
        .lean();

      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      return {
        success: true,
        data: job
      };
    } catch (error: any) {
      console.error('İş durumu getirme hatası:', error);
      throw error;
    }
  }
}

