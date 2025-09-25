import { Appointment } from '../models/Appointment';
import { Mechanic } from '../models/Mechanic';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { NotificationTriggerService } from './notificationTriggerService';
import { sendNotificationToUser } from '../index';
import mongoose from 'mongoose';

export interface TowingRequestData {
  userId: string;
  vehicleType: string;
  reason: string;
  pickupLocation: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address?: string;
  };
  dropoffLocation?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address?: string;
  };
  description: string;
  emergencyLevel: 'high' | 'medium';
  towingType: 'flatbed' | 'wheel-lift';
  requestType: 'emergency' | 'quick' | 'normal';
}

export interface TowingMechanic {
  _id: string;
  name: string;
  surname: string;
  phone: string;
  pushToken?: string;
  location?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  serviceCategories?: string[];
  isAvailable: boolean;
  rating: number;
  distance?: number;
}

export class TowingRequestService {
  /**
   * Çekici talebi oluştur ve yakın ustalara bildirim gönder
   */
  static async createTowingRequest(requestData: TowingRequestData): Promise<any> {
    try {
      // Kullanıcı bilgilerini al
      const user = await User.findById(requestData.userId).select('name surname phone');
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Çekici talebi oluştur
      const towingRequest = new Appointment({
        userId: requestData.userId,
        serviceType: 'towing',
        vehicleType: requestData.vehicleType,
        reason: requestData.reason,
        pickupLocation: requestData.pickupLocation,
        dropoffLocation: requestData.dropoffLocation,
        description: requestData.description,
        emergencyLevel: requestData.emergencyLevel,
        towingType: requestData.towingType,
        status: 'TALEP_EDILDI',
        requestType: requestData.requestType,
        appointmentDate: new Date(),
        timeSlot: requestData.emergencyLevel === 'high' ? 'Acil' : 'Normal',
        // Çekici talebi için özel alanlar
        notificationSent: false,
        acceptedBy: null,
        rejectedBy: [],
        notificationQueue: []
      });

      await towingRequest.save();

      // Yakın çekici ustalarını bul ve bildirim gönder
      await this.findAndNotifyNearbyMechanics(towingRequest, user);

      return {
        success: true,
        message: 'Çekici talebi oluşturuldu ve yakın ustalara bildirim gönderildi',
        data: towingRequest
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Yakın çekici ustalarını bul ve bildirim gönder
   */
  static async findAndNotifyNearbyMechanics(towingRequest: any, user: any): Promise<void> {
    try {
      const { latitude, longitude } = towingRequest.pickupLocation.coordinates;
      
      // Çekici ustalarını bul (çekici, kurtarma, towing servisi olanlar)
      const towingMechanics = await User.find({
        $and: [
          { userType: 'mechanic' },
          {
            $or: [
              { serviceCategories: { $regex: /çekici|kurtarma|towing|tow/i } },
              { serviceCategories: { $regex: /araç çekme|araç kurtarma/i } }
            ]
          },
          { isAvailable: true }
        ]
      }).select('name surname phone pushToken location serviceCategories isAvailable rating');

      if (towingMechanics.length === 0) {
        return;
      }

      // Bildirim kuyruğunu güncelle
      const notificationQueue = towingMechanics.map(mechanic => ({
        mechanicId: mechanic._id,
        status: 'pending', // pending, accepted, rejected
        notifiedAt: new Date()
      }));

      await Appointment.findByIdAndUpdate(towingRequest._id, {
        notificationQueue,
        notificationSent: true
      });

      // Her ustaya bildirim gönder
      for (const mechanic of towingMechanics) {
        await this.sendTowingNotificationToMechanic(towingRequest, user, mechanic);
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Ustaya çekici bildirimi gönder
   */
  static async sendTowingNotificationToMechanic(
    towingRequest: any, 
    user: any, 
    mechanic: any
  ): Promise<void> {
    try {
      const notificationData = {
        recipientId: mechanic._id.toString(),
        recipientType: 'mechanic' as const,
        type: 'towing_request',
        title: towingRequest.emergencyLevel === 'high' ? 
          '🚨 ACİL ÇEKİCİ TALEBİ' : 
          '🚛 Çekici Talebi',
        message: `${user.name} ${user.surname} - ${towingRequest.reason} sebebiyle çekici talebi`,
        data: {
          towingRequestId: towingRequest._id,
          requestType: towingRequest.requestType,
          emergencyLevel: towingRequest.emergencyLevel,
          vehicleType: towingRequest.vehicleType,
          reason: towingRequest.reason,
          pickupLocation: towingRequest.pickupLocation,
          dropoffLocation: towingRequest.dropoffLocation,
          description: towingRequest.description,
          towingType: towingRequest.towingType,
          userPhone: user.phone,
          userName: `${user.name} ${user.surname}`,
          requestDate: towingRequest.appointmentDate,
          // Kabul/Reddet için gerekli bilgiler
          canAccept: true,
          canReject: true,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 dakika
        }
      };

      // Bildirim servisi ile gönder
      await NotificationTriggerService.createAndSendNotification(notificationData);

      // Real-time bildirim gönder
      sendNotificationToUser(mechanic._id.toString(), {
        type: 'towing_request',
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data
      });

      } catch (error) {
      }
  }

  /**
   * Usta çekici talebini kabul etti
   */
  static async acceptTowingRequest(
    towingRequestId: string, 
    mechanicId: string
  ): Promise<any> {
    try {
      const towingRequest = await Appointment.findById(towingRequestId);
      if (!towingRequest) {
        throw new Error('Çekici talebi bulunamadı');
      }

      if (towingRequest.status !== 'TALEP_EDILDI') {
        throw new Error('Bu talep zaten işleme alınmış');
      }

      // Usta bilgilerini al
      const mechanic = await User.findById(mechanicId).select('name surname phone');
      if (!mechanic) {
        throw new Error('Usta bulunamadı');
      }

      // Talebi kabul olarak güncelle
      const updatedRequest = await Appointment.findByIdAndUpdate(towingRequestId, {
        status: 'PLANLANDI',
        acceptedBy: mechanicId,
        acceptedAt: new Date(),
        $set: { 'notificationQueue.$[elem].status': 'accepted' }
      }, {
        arrayFilters: [{ 'elem.mechanicId': new mongoose.Types.ObjectId(mechanicId) }],
        new: true
      });

      // Kullanıcıya kabul bildirimi gönder
      const user = await User.findById(towingRequest.userId).select('name surname phone pushToken');
      if (user) {
        await NotificationTriggerService.createAndSendNotification({
          recipientId: towingRequest.userId.toString(),
          recipientType: 'driver',
          type: 'towing_accepted',
          title: '✅ Çekici Talebi Kabul Edildi',
          message: `${mechanic.name} ${mechanic.surname} çekici talebinizi kabul etti`,
          data: {
            towingRequestId,
            mechanicId,
            mechanicName: `${mechanic.name} ${mechanic.surname}`,
            mechanicPhone: mechanic.phone,
            estimatedArrival: '15-30 dakika'
          }
        });

        // Real-time bildirim
        sendNotificationToUser(towingRequest.userId.toString(), {
          type: 'towing_accepted',
          title: '✅ Çekici Talebi Kabul Edildi',
          message: `${mechanic.name} ${mechanic.surname} çekici talebinizi kabul etti`,
          data: {
            towingRequestId,
            mechanicId,
            mechanicName: `${mechanic.name} ${mechanic.surname}`,
            mechanicPhone: mechanic.phone
          }
        });
      }

      // Diğer ustalara talep iptal bildirimi gönder
      await this.notifyOtherMechanicsRequestCancelled(towingRequest, mechanicId);

      return {
        success: true,
        message: 'Çekici talebi başarıyla kabul edildi',
        data: {
          towingRequest: updatedRequest,
          acceptedBy: mechanic
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Usta çekici talebini reddetti
   */
  static async rejectTowingRequest(
    towingRequestId: string, 
    mechanicId: string,
    reason?: string
  ): Promise<any> {
    try {
      const towingRequest = await Appointment.findById(towingRequestId);
      if (!towingRequest) {
        throw new Error('Çekici talebi bulunamadı');
      }

      // Usta bilgilerini al
      const mechanic = await User.findById(mechanicId).select('name surname');
      if (!mechanic) {
        throw new Error('Usta bulunamadı');
      }

      // Reddeden ustaları güncelle
      const rejectedBy = (towingRequest as any).rejectedBy || [];
      if (!rejectedBy.includes(new mongoose.Types.ObjectId(mechanicId))) {
        rejectedBy.push(new mongoose.Types.ObjectId(mechanicId));
        await Appointment.findByIdAndUpdate(towingRequestId, {
          rejectedBy
        });
      }

      // Bildirim kuyruğunu güncelle
      const notificationQueue = ((towingRequest as any).notificationQueue || []).map((item: any) => {
        if (item.mechanicId.toString() === mechanicId) {
          return { ...item, status: 'rejected', rejectedAt: new Date() };
        }
        return item;
      });

      await Appointment.findByIdAndUpdate(towingRequestId, {
        notificationQueue
      });

      // Başka usta var mı kontrol et
      const pendingMechanics = notificationQueue.filter((item: any) => item.status === 'pending');
      
      if (pendingMechanics.length === 0) {
        // Tüm ustalar reddetti, kullanıcıya bildir
        await this.notifyUserAllMechanicsRejected(towingRequest);
      } else {
        // Başka ustalara tekrar bildirim gönder
        await this.sendNotificationToRemainingMechanics(towingRequest);
      }

      return {
        success: true,
        message: 'Çekici talebi reddedildi',
        data: {
          towingRequest,
          rejectedBy: mechanic,
          remainingMechanics: pendingMechanics.length
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Diğer ustalara talep iptal bildirimi gönder
   */
  private static async notifyOtherMechanicsRequestCancelled(
    towingRequest: any, 
    acceptedMechanicId: string
  ): Promise<void> {
    try {
      const notificationQueue = towingRequest.notificationQueue || [];
      
      for (const item of notificationQueue) {
        if (item.mechanicId.toString() !== acceptedMechanicId && item.status === 'pending') {
          await NotificationTriggerService.createAndSendNotification({
            recipientId: item.mechanicId,
            recipientType: 'mechanic',
            type: 'towing_cancelled',
            title: 'Çekici Talebi İptal',
            message: 'Bu çekici talebi başka bir usta tarafından kabul edildi',
            data: {
              towingRequestId: towingRequest._id,
              acceptedBy: acceptedMechanicId,
              reason: 'accepted_by_other'
            }
          });

          // Real-time bildirim
          sendNotificationToUser(item.mechanicId, {
            type: 'towing_cancelled',
            title: 'Çekici Talebi İptal',
            message: 'Bu çekici talebi başka bir usta tarafından kabul edildi',
            data: {
              towingRequestId: towingRequest._id,
              acceptedBy: acceptedMechanicId
            }
          });
        }
      }
    } catch (error) {
      }
  }

  /**
   * Kalan ustalara tekrar bildirim gönder
   */
  private static async sendNotificationToRemainingMechanics(towingRequest: any): Promise<void> {
    try {
      const notificationQueue = towingRequest.notificationQueue || [];
      const pendingMechanics = notificationQueue.filter((item: any) => item.status === 'pending');
      
      if (pendingMechanics.length === 0) return;

      // Kalan ustaları bul
      const mechanicIds = pendingMechanics.map((item: any) => item.mechanicId);
      const mechanics = await Mechanic.find({
        _id: { $in: mechanicIds }
      }).select('name surname phone pushToken');

      const user = await User.findById(towingRequest.userId).select('name surname phone');

      // Her ustaya tekrar bildirim gönder
      for (const mechanic of mechanics) {
        await this.sendTowingNotificationToMechanic(towingRequest, user, mechanic);
      }

    } catch (error) {
      }
  }

  /**
   * Tüm ustalar reddetti bildirimi
   */
  private static async notifyUserAllMechanicsRejected(towingRequest: any): Promise<void> {
    try {
      await Appointment.findByIdAndUpdate(towingRequest._id, {
        status: 'REDDEDILDI'
      });

      const user = await User.findById(towingRequest.userId);
      if (user) {
        await NotificationTriggerService.createAndSendNotification({
          recipientId: towingRequest.userId.toString(),
          recipientType: 'driver',
          type: 'towing_rejected',
          title: 'Çekici Talebi Reddedildi',
          message: 'Malesef şu anda müsait çekici usta bulunamadı. Lütfen daha sonra tekrar deneyin.',
          data: {
            towingRequestId: towingRequest._id,
            reason: 'no_available_mechanics',
            suggestion: 'Lütfen daha sonra tekrar deneyin veya farklı bir konum belirtin.'
          }
        });

        // Real-time bildirim
        sendNotificationToUser(towingRequest.userId.toString(), {
          type: 'towing_rejected',
          title: 'Çekici Talebi Reddedildi',
          message: 'Malesef şu anda müsait çekici usta bulunamadı.',
          data: {
            towingRequestId: towingRequest._id,
            reason: 'no_available_mechanics'
          }
        });
      }
    } catch (error) {
      }
  }
}
