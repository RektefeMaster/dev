import mongoose from 'mongoose';
import { Appointment, IAppointment } from '../models/Appointment';
import { User, IUser } from '../models/User';
import { Mechanic, IMechanic } from '../models/Mechanic';
import { CustomError } from '../middleware/errorHandler';
import { Vehicle, IVehicle } from '../models/Vehicle';
import { AppointmentStatus, PaymentStatus } from '../../../shared/types/enums';
import { sendNotification } from '../utils/notifications';
import Logger from '../utils/logger';

// Type definitions for aggregate results
interface PopulatedVehicle {
  _id: mongoose.Types.ObjectId;
  brand?: string;
  modelName?: string;
  year?: number;
  plateNumber?: string;
  fuelType?: string;
  engineType?: string;
  transmission?: string;
  package?: string;
  color?: string;
  mileage?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
}

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  isAvailable?: boolean;
}

type MechanicOrUser = IMechanic | (IUser & { isAvailable?: boolean });

// Mechanic model'ini dinamik olarak import et (circular dependency'den kaçınmak için)
let MechanicModel: typeof Mechanic;
const getMechanicModel = async () => {
  if (!MechanicModel) {
    MechanicModel = (await import('../models/Mechanic')).Mechanic;
  }
  return MechanicModel;
};

export interface CreateAppointmentData {
  userId?: string;
  customerId?: string;
  mechanicId: string;
  serviceType: string;
  appointmentDate: Date;
  timeSlot: string;
  description?: string;
  vehicleId?: string;
  faultReportId?: string;
  location?: {
    coordinates?: [number, number];
    address?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
  };
  paymentStatus?: string;
  isShopAppointment?: boolean;
  shareContactInfo?: boolean;
  notificationSettings?: {
    oneDayBefore?: boolean;
    oneHourBefore?: boolean;
    twoHoursBefore?: boolean;
  };
  // Service-specific fields
  electricalSystemType?: string;
  electricalProblemType?: string;
  electricalUrgencyLevel?: string;
  isRecurring?: boolean;
  lastWorkingCondition?: string;
  [key: string]: any; // Allow any additional fields
}

export interface UpdateAppointmentData {
  status: 'confirmed' | 'rejected' | 'in-progress' | 'completed' | 'cancelled';
  rejectionReason?: string;
  mechanicNotes?: string;
}

export interface AppointmentFilters {
  status?: string;
  serviceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentData {
  paymentStatus: string;
  paymentDate?: Date;
  transactionId?: string;
}

export interface NotificationSettings {
  oneDayBefore?: boolean;
  oneHourBefore?: boolean;
  twoHoursBefore?: boolean;
  customTime?: number;
}

export class AppointmentService {
  /**
   * Yeni randevu oluştur
   */
  static async createAppointment(data: CreateAppointmentData) {
    try {
      // CRITICAL FIX: mechanicId validation ve doğru model'de arama
      if (!data.mechanicId || data.mechanicId === 'temp' || data.mechanicId === 'unknown') {
        throw new CustomError('Geçerli bir usta ID\'si gereklidir', 400);
      }

      // Önce ObjectId formatını kontrol et
      if (!mongoose.Types.ObjectId.isValid(data.mechanicId)) {
        throw new CustomError('Geçersiz usta ID formatı', 400);
      }

      // Önce Mechanic collection'ında ara (Appointment model'inde ref: 'Mechanic' olduğu için)
      const MechanicModel = await getMechanicModel();
      let mechanic = await MechanicModel.findById(data.mechanicId)
        .select('name surname email phone rating experience city shopName shopType availability')
        .lean();
      
      // Eğer Mechanic collection'ında bulunamazsa, User collection'ında userType: 'mechanic' olanları kontrol et
      if (!mechanic) {
        const userAsMechanic = await User.findOne({ 
          _id: data.mechanicId, 
          userType: 'mechanic' 
        })
        .select('name surname email phone rating experience city shopName shopType availability')
        .lean();
        
        if (userAsMechanic) {
          // User'ı mechanic olarak kabul et
          mechanic = userAsMechanic as MechanicOrUser;
        } else {
          Logger.error(`Usta bulunamadı - mechanicId: ${data.mechanicId}`);
          throw new CustomError('Belirtilen usta bulunamadı. Lütfen geçerli bir usta seçin.', 404);
        }
      }

      // Ustanın müsait olup olmadığını kontrol et
      if (!mechanic.isAvailable) {
        throw new CustomError('Usta şu anda müsait değil', 400);
      }

      // mechanicId'yi doğru formatta sakla (eğer User'dan geldiyse bile ObjectId olarak sakla)
      const finalMechanicId = mechanic._id ? mechanic._id.toString() : data.mechanicId;

      // userId veya customerId'den birini al
      const userId = data.userId || data.customerId;
      if (!userId) {
        throw new CustomError('Kullanıcı ID\'si gereklidir', 400);
      }

      // appointmentDate'i Date objesine çevir
      const appointmentDateObj = new Date(data.appointmentDate);
      
      // Aynı tarih ve saatte çakışan randevu var mı kontrol et
      const conflictingAppointment = await Appointment.findOne({
        mechanicId: finalMechanicId,
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

      // Aynı faultReportId ile zaten randevu oluşturulmuş mu kontrol et
      if (data.faultReportId) {
        const existingFaultReportAppointment = await Appointment.findOne({
          faultReportId: data.faultReportId,
          status: { $nin: ['cancelled', 'completed'] }
        });

        if (existingFaultReportAppointment) {
          throw new CustomError('Bu arıza bildirimi için zaten randevu oluşturulmuş', 400);
        }
      }

      // Eğer vehicleId gönderilmemişse, kullanıcının son kayıtlı aracını ata
      let resolvedVehicleId: mongoose.Types.ObjectId | undefined;
      if (!data.vehicleId) {
        const lastVehicle = await Vehicle.findOne({ userId: userId })
          .select('_id brand modelName year plateNumber')
          .sort({ createdAt: -1 })
          .lean(); // Memory optimization
        if (lastVehicle) {
          resolvedVehicleId = new mongoose.Types.ObjectId(lastVehicle._id.toString());
        }
      } else {
        resolvedVehicleId = new mongoose.Types.ObjectId(data.vehicleId);
      }

      // Arıza bildiriminden fiyat bilgisini al
      let faultReportPrice = null;
      let priceSource = 'to_be_determined';
      
      if (data.faultReportId) {
        try {
          const FaultReport = require('../models/FaultReport').default;
          const faultReport = await FaultReport.findById(data.faultReportId)
            .select('_id status quotes selectedQuoteId')
            .lean();
          
          if (faultReport) {
            // Seçilen teklif varsa onun fiyatını al
            if (faultReport.selectedQuote && faultReport.selectedQuote.quoteAmount) {
              faultReportPrice = faultReport.selectedQuote.quoteAmount;
              priceSource = 'fault_report_quoted';
            }
            // Eğer seçilen teklif yoksa ama quotes varsa, ilk teklifin fiyatını al
            else if (faultReport.quotes && faultReport.quotes.length > 0) {
              faultReportPrice = faultReport.quotes[0].quoteAmount;
              priceSource = 'fault_report_quoted';
            }
          }
        } catch (error) {
          }
      }

      // Randevu oluştur - tüm servis-specific alanları dahil et
      const appointmentData: Partial<IAppointment> & Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(userId),
        mechanicId: new mongoose.Types.ObjectId(finalMechanicId),
        serviceType: data.serviceType,
        appointmentDate: appointmentDateObj,
        timeSlot: data.timeSlot,
        description: data.description || '',
        vehicleId: resolvedVehicleId,
        faultReportId: data.faultReportId ? new mongoose.Types.ObjectId(data.faultReportId) : undefined,
        location: data.location || undefined,
        quotedPrice: faultReportPrice, // Arıza bildirimindeki fiyatı kopyala
        price: faultReportPrice, // Mevcut fiyat alanı için de aynı değer
        finalPrice: faultReportPrice, // Nihai fiyat
        priceSource: priceSource, // Fiyat kaynağı
        status: 'TALEP_EDILDI',
        paymentStatus: data.paymentStatus || PaymentStatus.PENDING,
        shareContactInfo: data.shareContactInfo || false,
        isShopAppointment: data.isShopAppointment || false, // Ustanın kendi eklediği randevu mu?
        notificationSettings: data.notificationSettings || {
          oneDayBefore: false,
          oneHourBefore: true,
          twoHoursBefore: false
        },
        createdAt: new Date()
      };

      // Service-specific fields (electrical, tire, wash, towing, bodywork, etc.)
      if (data.electricalSystemType) appointmentData.electricalSystemType = data.electricalSystemType;
      if (data.electricalProblemType) appointmentData.electricalProblemType = data.electricalProblemType;
      if (data.electricalUrgencyLevel) appointmentData.electricalUrgencyLevel = data.electricalUrgencyLevel;
      if (data.isRecurring !== undefined) appointmentData.isRecurring = data.isRecurring;
      if (data.lastWorkingCondition) appointmentData.lastWorkingCondition = data.lastWorkingCondition;

      const appointment = new Appointment(appointmentData);
      await appointment.save();
      
      // CRITICAL FIX: Dönen appointment'ta mechanicId'nin doğru olduğundan emin ol
      Logger.info(`Randevu oluşturuldu - appointmentId: ${appointment._id}, mechanicId: ${appointment.mechanicId}`);
      
      return appointment;
    } catch (error) {
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
        .sort({ appointmentDate: -1 })
        .lean(); // 🚀 OPTIMIZE: Memory optimization

      return appointments;
    } catch (error) {
      throw error;
    }
  }

  /**
   * FaultReportId ile randevu bul
   */
  static async getAppointmentByFaultReportId(faultReportId: string) {
    try {
      if (!faultReportId || faultReportId.trim() === '') {
        return null;
      }
      
      if (!mongoose.Types.ObjectId.isValid(faultReportId)) {
        return null;
      }
      
      const appointment = await Appointment.findOne({ faultReportId })
        .populate('mechanicId', 'name surname rating experience city shopName shopType')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage lastMaintenanceDate nextMaintenanceDate')
        .sort({ appointmentDate: -1 })
        .select('-__v')
        .lean(); // Memory optimization - populate ile birlikte kullanılabilir

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Ustanın randevularını getir (Usta/Dükkan için)
   */
  static async getMechanicAppointments(mechanicId: string, statusFilter?: string, filters?: AppointmentFilters) {
    try {
      // CRITICAL FIX: mechanicId validation
      if (!mechanicId || !mongoose.Types.ObjectId.isValid(mechanicId)) {
        Logger.error(`Geçersiz mechanicId: ${mechanicId}`);
        return [];
      }

      const mapENtoTR: Record<string, string> = {
        'pending': 'TALEP_EDILDI',
        'confirmed': 'PLANLANDI',
        'in-progress': 'SERVISTE',
        'in_progress': 'SERVISTE',
        'payment-pending': 'ODEME_BEKLIYOR',
        'completed': 'TAMAMLANDI',
        'cancelled': 'IPTAL_EDILDI',
        'no-show': 'NO_SHOW',
      };
      const legacyMap: Record<string, string[]> = {
        'TALEP_EDILDI': ['pending'],
        'PLANLANDI': ['confirmed', 'approved'],
        'SERVISTE': ['in-progress', 'in_progress'],
        'ODEME_BEKLIYOR': ['payment-pending', 'payment_pending'],
        'TAMAMLANDI': ['completed', 'paid'],
        'IPTAL_EDILDI': ['cancelled', 'rejected'],
        'NO_SHOW': ['no-show']
      };

      // CRITICAL FIX: mechanicId'yi ObjectId'ye dönüştür (MongoDB sorgusu için)
      const query: Record<string, unknown> = { mechanicId: new mongoose.Types.ObjectId(mechanicId) };
      
      if (statusFilter) {
        // İngilizce status'ları Türkçe'ye çevir
        const turkishStatus = mapENtoTR[statusFilter] || statusFilter;
        const statusValues = [turkishStatus];
        
        // Eğer Türkçe status gelirse, İngilizce karşılıklarını da ekle
        if (legacyMap[turkishStatus]) {
          statusValues.push(...legacyMap[turkishStatus]);
        }
        
        // No-show artık ayrı bir status olduğu için özel durum kaldırıldı
        
        query.status = { $in: statusValues };
        
        }

      // Tarih filtreleri
      const now = new Date();
      if (filters?.range === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        query.appointmentDate = { $gte: start, $lt: end };
      } else if (filters?.range === 'week') {
        const day = now.getDay(); // 0 pazar
        const diffToMonday = (day === 0 ? -6 : 1) - day; // pazartesiye dön
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        query.appointmentDate = { $gte: monday, $lt: nextMonday };
      }

      if (filters?.overdue === 'true' || filters?.overdue === true) {
        query.appointmentDate = { ...(query.appointmentDate || {}), $lt: now };
        query.status = { $in: ['PLANLANDI', 'SERVISTE', ...(legacyMap['PLANLANDI'] || []), ...(legacyMap['SERVISTE'] || [])] };
      }

      if (filters?.waitingParts === 'true' || filters?.waitingParts === true) {
        query.parcaBekleniyor = true;
      }

      if (filters?.paymentPending === 'true' || filters?.paymentPending === true) {
        query.status = { $in: ['ODEME_BEKLIYOR', ...(legacyMap['ODEME_BEKLIYOR'] || [])] };
      }

      // Pagination ve limit ekle
      const limit = parseInt(filters?.limit as string) || 100; // Maksimum 100
      const skip = parseInt(filters?.skip as string) || 0;

      const appointments = await Appointment.find(query)
      .populate({
        path: 'userId',
        select: 'name surname email phone',
        options: { lean: true }
      })
      .populate('vehicleId')
      .sort({ appointmentDate: -1 })
      .limit(limit)
      .skip(skip)
      .lean(); // Memory optimization

      // Randevuları frontend formatına çevir
      const mapTRtoEN: Record<string, string> = {
        'TALEP_EDILDI': 'pending',
        'PLANLANDI': 'confirmed',
        'SERVISTE': 'in-progress',
        'ODEME_BEKLIYOR': 'payment-pending',
        'TAMAMLANDI': 'completed',
        'IPTAL_EDILDI': 'cancelled',
        'NO_SHOW': 'no-show',
      };

      const formattedAppointments = appointments.map(obj => {
        if (!obj.userId) {
          return null;
        }

        // Vehicle bilgilerini formatla
        let vehicle = null;
        if (obj.vehicleId) {
          const vehicleData = obj.vehicleId as PopulatedVehicle;
          vehicle = {
            _id: vehicleData._id,
            brand: vehicleData.brand || 'Bilinmiyor',
            modelName: vehicleData.modelName || 'Bilinmiyor',
            year: vehicleData.year || 'Bilinmiyor',
            plateNumber: vehicleData.plateNumber || 'Bilinmiyor',
            fuelType: vehicleData.fuelType || 'Bilinmiyor',
            engineType: vehicleData.engineType || 'Bilinmiyor',
            transmission: vehicleData.transmission || 'Bilinmiyor',
            package: vehicleData.package || 'Bilinmiyor',
            color: vehicleData.color || undefined,
            mileage: vehicleData.mileage || undefined,
            lastMaintenanceDate: vehicleData.lastMaintenanceDate || undefined,
            nextMaintenanceDate: vehicleData.nextMaintenanceDate || undefined
          };
        } else {
          vehicle = {
            brand: 'Araç bilgisi yok',
            modelName: '',
            plateNumber: 'Belirtilmemiş'
          };
        }

        // lean() kullanıldığı için obj zaten plain object, toObject() gerekmez
        const raw = obj as any;
        // Basit arama filtresi (q) - populate sonrası filtreleme
        const q = (filters?.q || '').toString().toLowerCase();
        if (q) {
          const hay = [
            ((obj.userId as PopulatedUser)?.name || '') + ' ' + ((obj.userId as PopulatedUser)?.surname || ''),
            (obj as { serviceType?: string }).serviceType || '',
            (obj.vehicleId as PopulatedVehicle)?.plateNumber || '',
            (obj.vehicleId as PopulatedVehicle)?.brand || '',
            (obj.vehicleId as PopulatedVehicle)?.modelName || ''
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return null as any;
        }

        return {
          ...raw,
          status: mapTRtoEN[raw.status] || raw.status,
          statusTR: raw.status,
          customer: {
            _id: obj.userId._id,
            name: (obj.userId as PopulatedUser).name || 'Bilinmiyor',
            surname: (obj.userId as PopulatedUser).surname || 'Bilinmiyor',
            email: (obj.userId as PopulatedUser).email || 'Bilinmiyor',
            phone: (obj.userId as PopulatedUser).phone || 'Bilinmiyor'
          },
          vehicle: vehicle
        };
      }).filter(Boolean);

      return formattedAppointments;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dükkan randevularını getir - ustanın kendi eklediği randevular
   */
  static async getShopAppointments(mechanicId: string, status?: string) {
    try {
      // Status filtreleme
      let statusFilter: Record<string, unknown> = {};
      if (status) {
        switch (status) {
          case 'active':
            statusFilter = { status: { $in: ['pending', 'confirmed', 'in-progress'] } };
            break;
          case 'completed':
            statusFilter = { status: 'completed' };
            break;
          case 'cancelled':
            statusFilter = { status: { $in: ['cancelled', 'rejected'] } };
            break;
          default:
            statusFilter = { status: status };
        }
      }

      // Dükkan randevuları: isShopAppointment: true olan randevular
      const appointments = await Appointment.find({
        mechanicId: mechanicId,
        isShopAppointment: true,
        ...statusFilter
      })
        .populate('userId', 'name surname phone email')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType engineType transmission package color mileage lastMaintenanceDate nextMaintenanceDate')
        .sort({ appointmentDate: -1, createdAt: -1 })
        .lean(); // 🚀 OPTIMIZE: Memory optimization

      // Frontend formatına çevir
      const formattedAppointments = appointments.map(appointment => {
        // lean() kullanıldığı için obj zaten plain object, toObject() gerekmez
        const obj = appointment as Record<string, unknown> & {
          userId?: PopulatedUser;
          vehicleId?: PopulatedVehicle;
          customer?: PopulatedUser;
          vehicle?: PopulatedVehicle;
        };
        
        // customer field'ını ekle (userId'den)
        if (obj.userId) {
          obj.customer = {
            _id: obj.userId._id,
            name: obj.userId.name,
            surname: obj.userId.surname,
            email: obj.userId.email,
            phone: obj.userId.phone
          };
        }

        // vehicle field'ını ekle (vehicleId'den)
        if (obj.vehicleId) {
          obj.vehicle = {
            _id: obj.vehicleId._id,
            brand: obj.vehicleId.brand,
            modelName: obj.vehicleId.modelName,
            year: obj.vehicleId.year,
            plateNumber: obj.vehicleId.plateNumber,
            fuelType: obj.vehicleId.fuelType,
            engineType: obj.vehicleId.engineType,
            transmission: obj.vehicleId.transmission,
            package: obj.vehicleId.package,
            color: obj.vehicleId.color,
            mileage: obj.vehicleId.mileage,
            lastMaintenanceDate: obj.vehicleId.lastMaintenanceDate,
            nextMaintenanceDate: obj.vehicleId.nextMaintenanceDate
          };
        }

        return obj;
      });

      return formattedAppointments;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Randevu detayını getir
   */
  static async getAppointmentById(appointmentId: string, userId: string) {
    try {
      // String ID'leri kontrol et (apt_ ile başlayanlar local storage ID'leri)
      if (appointmentId.startsWith('apt_')) {
        throw new CustomError('Bu randevu yerel depolamada bulunuyor', 404);
      }

      // MongoDB ObjectId formatını kontrol et
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
        throw new CustomError('Geçersiz randevu ID formatı', 400);
      }
      
      // Optimized query with aggregation to avoid N+1 problem
      const [appointment] = await Appointment.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(appointmentId) } },
        
        // Join user data
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'customer',
            pipeline: [
              { $project: { name: 1, surname: 1, phone: 1, email: 1 } }
            ]
          }
        },
        
        // Join mechanic data
        {
          $lookup: {
            from: 'mechanics',
            localField: 'mechanicId',
            foreignField: '_id',
            as: 'mechanic',
            pipeline: [
              { $project: { name: 1, surname: 1, phone: 1, email: 1, rating: 1, experience: 1, city: 1, shopType: 1 } }
            ]
          }
        },
        
        // Join vehicle data
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicle',
            pipeline: [
              { $project: { brand: 1, modelName: 1, year: 1, plateNumber: 1, fuelType: 1, engineType: 1, transmission: 1, package: 1, color: 1, mileage: 1, lastMaintenanceDate: 1, nextMaintenanceDate: 1 } }
            ]
          }
        },
        
        // Format output
        {
          $project: {
            _id: 1,
            serviceType: 1,
            appointmentDate: 1,
            timeSlot: 1,
            status: 1,
            description: 1,
            mechanicNotes: 1,
            rejectionReason: 1,
            estimatedDuration: 1,
            actualDuration: 1,
            price: 1,
            quotedPrice: 1,
            finalPrice: 1,
            priceSource: 1,
            paymentStatus: 1,
            paymentDate: 1,
            transactionId: 1,
            completionDate: 1,
            notificationSettings: 1,
            shareContactInfo: 1,
            isShopAppointment: 1,
            faultReportId: 1,
            location: 1,
            requestType: 1,
            vehicleType: 1,
            reason: 1,
            pickupLocation: 1,
            dropoffLocation: 1,
            packageType: 1,
            options: 1,
            partType: 1,
            vehicleInfo: 1,
            tireSize: 1,
            createdAt: 1,
            updatedAt: 1,
            customer: { $arrayElemAt: ['$customer', 0] },
            mechanic: { $arrayElemAt: ['$mechanic', 0] },
            vehicle: { $arrayElemAt: ['$vehicle', 0] },
            // Keep original field names for backward compatibility
            userId: '$customer',
            mechanicId: '$mechanic',
            vehicleId: '$vehicle'
          }
        }
      ])

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }
      
      // Kullanıcının bu randevuyu görme yetkisi var mı kontrol et - Updated for aggregate result
      const appointmentUserId = appointment.customer?._id?.toString();
      const appointmentMechanicId = appointment.mechanic?._id?.toString();
      
      // Kullanıcının bu randevuyu görme yetkisi var mı kontrol et
      const isUserAuthorized = appointmentUserId === userId || appointmentMechanicId === userId;
      if (!isUserAuthorized) {
        throw new CustomError('Bu randevuyu görme yetkiniz yok', 403);
      }

      // Aggregate result is already in the correct format - no need for toObject() conversion
      // Customer, mechanic, and vehicle data are already joined and formatted
      
      // İptal edilen randevularda hassas bilgileri gizle
      if (appointment.status === 'IPTAL') {
        if (appointment.customer) {
          delete appointment.customer.phone;
          delete appointment.customer.email;
        }
        appointment.vehicle = undefined;
      }

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Usta fiyat belirleme (normal randevu için)
   */
  static async setAppointmentPrice(appointmentId: string, mechanicId: string, price: number, notes?: string) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      if (appointment.mechanicId?.toString() !== mechanicId) {
        throw new CustomError('Bu randevuya fiyat belirleme yetkiniz yok', 403);
      }

      if (appointment.status !== 'TALEP_EDILDI' && appointment.status !== 'PLANLANDI') {
        throw new CustomError('Bu randevuya fiyat belirlenemez', 400);
      }

      // Fiyat kaynağını güncelle
      appointment.priceSource = 'mechanic_quoted';
      appointment.price = price;
      appointment.finalPrice = price;
      appointment.mechanicNotes = notes || appointment.mechanicNotes;

      await appointment.save();

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Usta ek fiyat ekleme (arıza bildirimi randevusu için)
   */
  static async addPriceIncrease(appointmentId: string, mechanicId: string, additionalAmount: number, reason: string) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      if (appointment.mechanicId?.toString() !== mechanicId) {
        throw new CustomError('Bu randevuya fiyat ekleme yetkiniz yok', 403);
      }

      if (appointment.priceSource !== 'fault_report_quoted') {
        throw new CustomError('Bu randevu türüne ek fiyat eklenemez', 400);
      }

      if (appointment.status !== 'SERVISTE') {
        throw new CustomError('Sadece servisteki randevulara ek fiyat eklenebilir', 400);
      }

      // Fiyat artışı geçmişine ekle
      const priceIncrease = {
        amount: additionalAmount,
        reason: reason,
        date: new Date(),
        mechanicId: mechanicId
      };

      if (!appointment.priceIncreaseHistory) {
        appointment.priceIncreaseHistory = [];
      }
      appointment.priceIncreaseHistory.push(priceIncrease);

      // Nihai fiyatı güncelle
      const currentFinalPrice = appointment.finalPrice || appointment.quotedPrice || 0;
      appointment.finalPrice = currentFinalPrice + additionalAmount;

      await appointment.save();

      return appointment;
    } catch (error) {
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
      const mapENtoTR: Record<string, string> = {
        'pending': 'TALEP_EDILDI',
        'confirmed': 'PLANLANDI',
        'in-progress': 'SERVISTE',
        'payment-pending': 'ODEME_BEKLIYOR',
        'completed': 'TAMAMLANDI',
        'cancelled': 'IPTAL_EDILDI',
        'no-show': 'NO_SHOW',
        'rejected': 'IPTAL_EDILDI',
      };
      if (status && mapENtoTR[status]) {
        status = mapENtoTR[status];
      }

      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Yeni durum geçiş kuralları
      const validTransitions: { [key: string]: string[] } = {
        'pending': ['PLANLANDI', 'IPTAL_EDILDI'],
        'TALEP_EDILDI': ['PLANLANDI', 'IPTAL_EDILDI'],
        'PLANLANDI': ['SERVISTE', 'IPTAL_EDILDI', 'NO_SHOW'],
        'SERVISTE': ['ODEME_BEKLIYOR', 'TAMAMLANDI'], // Direkt tamamlanmaya izin ver
        'ODEME_BEKLIYOR': ['TAMAMLANDI', 'IPTAL_EDILDI'],
        'TAMAMLANDI': [], // Tamamlandı'dan başka duruma geçilemez
        'IPTAL_EDILDI': [], // İptal'dan başka duruma geçilemez
        'NO_SHOW': [] // No-show'dan başka duruma geçilemez
      };

      const currentStatus = appointment.status;
      
      // Eğer aynı status'e geçilmeye çalışılıyorsa, hata verme, sadece güncelle
      if (currentStatus === status) {
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
      
      if (status === 'IPTAL_EDILDI' && rejectionReason) {
        appointment.rejectionReason = rejectionReason;
      }

      if (mechanicNotes) {
        appointment.mechanicNotes = mechanicNotes;
      }

      await appointment.save();

      // Eğer appointment bir FaultReport'a bağlıysa, FaultReport durumunu da güncelle
      if (appointment.faultReportId) {
        await this.updateRelatedFaultReportStatus(appointment.faultReportId.toString(), status);
      }

      // SERVISTE durumuna geçildiğinde driver'a bildirim gönder
      if (status === 'SERVISTE') {
        try {
          const mechanicName = (appointment.mechanicId as any)?.name || 'Usta';
          const { translateServiceType } = require('../utils/serviceTypeTranslator');
          const serviceTypeName = translateServiceType(appointment.serviceType) || 'Hizmet';
          
          await sendNotification(
            appointment.userId,
            'driver',
            'İş Başladı',
            `${mechanicName} usta işinize başladı. ${serviceTypeName} hizmetiniz devam ediyor.`,
            'appointment_confirmed',
            {
              appointmentId: appointment._id,
              mechanicName,
              serviceType: serviceTypeName,
              status: 'SERVISTE'
            }
          );
          Logger.info(`Driver'a iş başladı bildirimi gönderildi: ${appointment.userId}`);
        } catch (notificationError) {
          Logger.error('İş başladı bildirimi gönderme hatası:', notificationError);
        }
      }

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * İlgili arıza bildirimi durumunu güncelle
   */
  private static async updateRelatedFaultReportStatus(faultReportId: string, appointmentStatus: string) {
    try {
      const FaultReport = require('../models/FaultReport').FaultReport;
      const faultReport = await FaultReport.findById(faultReportId);
      
      if (!faultReport) {
        Logger.warn('FaultReport bulunamadı:', faultReportId);
        return;
      }

      // Appointment status'e göre FaultReport status'ünü belirle
      let faultReportStatus = faultReport.status;
      
      switch (appointmentStatus) {
        case 'PLANLANDI': // Kullanıcı randevuyu onayladı
          faultReportStatus = 'in_progress';
          break;
        case 'SERVISTE': // Usta işe başladı
          faultReportStatus = 'in_progress';
          break;
        case 'ODEME_BEKLIYOR': // İş tamamlandı, ödeme bekleniyor
          faultReportStatus = 'payment_pending';
          break;
        case 'TAMAMLANDI': // Ödeme yapıldı ve iş tamamen bitti
          faultReportStatus = 'completed';
          break;
        case 'IPTAL_EDILDI': // Randevu iptal edildi
          faultReportStatus = 'cancelled';
          break;
      }

      // Durum değiştiyse güncelle
      if (faultReport.status !== faultReportStatus) {
        faultReport.status = faultReportStatus;
        await faultReport.save();
        Logger.info(`FaultReport durumu güncellendi: ${faultReportId} -> ${faultReportStatus}`);
      }
    } catch (error) {
      Logger.error('FaultReport durumu güncellenirken hata:', error);
      // FaultReport güncelleme hatası appointment işlemini engellemez
    }
  }

  /**
   * Ek ücret ekle (usta işi tamamlamadan önce ekstra masraf ekleyebilir)
   */
  static async addExtraCharges(appointmentId: string, extraAmount: number, description: string) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece SERVISTE durumundaki randevulara ek ücret eklenebilir
      if (appointment.status !== 'SERVISTE') {
        throw new CustomError('Sadece serviste olan işlere ek ücret eklenebilir', 400);
      }

      // Ek ücret onayı ekle
      if (!appointment.araOnaylar) {
        appointment.araOnaylar = [];
      }

      appointment.araOnaylar.push({
        aciklama: description,
        tutar: extraAmount,
        onay: 'BEKLIYOR',
        tarih: new Date()
      });

      await appointment.save();

      // Driver'a ek ücret bildirimi gönder
      try {
        const mechanicName = (appointment.mechanicId as any)?.name || 'Usta';
        await sendNotification(
          appointment.userId,
          'driver',
          'Ek Ücret Talebi',
          `${mechanicName} usta ek ücret talebinde bulundu: ${description} - ${extraAmount}₺. Lütfen onaylayın veya reddedin.`,
          'payment_pending',
          {
            appointmentId: appointment._id,
            extraChargeAmount: extraAmount,
            extraChargeDescription: description,
            mechanicName
          }
        );
        Logger.info(`Driver'a ek ücret bildirimi gönderildi: ${appointment.userId}`);
      } catch (notificationError) {
        Logger.error('Ek ücret bildirimi gönderme hatası:', notificationError);
      }

      // Eğer appointment bir FaultReport'a bağlıysa, FaultReport'u da güncelle
      if (appointment.faultReportId) {
        const FaultReport = require('../models/FaultReport').FaultReport;
        const faultReport = await FaultReport.findById(appointment.faultReportId);
        
        if (faultReport) {
          // Ek ücret bilgisini not olarak ekle
          faultReport.faultDescription += `\n\n[Ek Ücret Talebi]: ${description} - ${extraAmount}₺ (Onay Bekleniyor)`;
          await faultReport.save();
        }
      }

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Ek ücreti onayla/reddet (müşteri tarafından)
   */
  static async approveExtraCharges(appointmentId: string, approvalIndex: number, approve: boolean) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      if (!appointment.araOnaylar || !appointment.araOnaylar[approvalIndex]) {
        throw new CustomError('Ek ücret talebi bulunamadı', 404);
      }

      const extraCharge = appointment.araOnaylar[approvalIndex];
      
      if (extraCharge.onay !== 'BEKLIYOR') {
        throw new CustomError('Bu ek ücret talebi zaten işlenmiş', 400);
      }

      extraCharge.onay = approve ? 'KABUL' : 'RET';
      
      // Kabul edildiyse fiyatı güncelle
      if (approve) {
        const currentPrice = appointment.finalPrice || appointment.price || appointment.quotedPrice || 0;
        appointment.finalPrice = currentPrice + extraCharge.tutar;
      }

      await appointment.save();
      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Randevuyu tamamla (iş bitir)
   */
  static async completeAppointment(appointmentId: string, completionNotes: string, price?: number, estimatedDuration?: number) {
    try {

      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece SERVISTE durumundaki randevular ödeme beklemeye geçebilir
      if (appointment.status !== 'SERVISTE') {
        throw new CustomError('Sadece serviste olan işler tamamlanabilir', 400);
      }

      // Onaylanmamış ek ücret varsa hata ver
      const hasPendingExtraCharges = appointment.araOnaylar?.some(charge => charge.onay === 'BEKLIYOR');
      if (hasPendingExtraCharges) {
        throw new CustomError('Bekleyen ek ücret onayları var. Önce bunların onaylanması gerekiyor.', 400);
      }

      // Randevuyu ödeme bekliyor durumuna al
      appointment.status = AppointmentStatus.PAYMENT_PENDING;
      appointment.mechanicNotes = completionNotes;
      
      // Fiyat belirlenmişse güncelle (opsiyonel)
      if (price) {
        appointment.price = price;
      }
      
      // finalPrice'ı hesapla (orijinal fiyat + kabul edilen ek ücretler)
      const basePrice = appointment.price || appointment.quotedPrice || 0;
      const approvedExtraCharges = appointment.araOnaylar
        ?.filter(charge => charge.onay === 'KABUL')
        .reduce((sum, charge) => sum + charge.tutar, 0) || 0;
      
      appointment.finalPrice = basePrice + approvedExtraCharges;
      appointment.paymentStatus = PaymentStatus.PENDING; // Ödeme bekleniyor
      
      // Eğer indirim isteği yoksa, priceApproval'ı otomatik olarak APPROVED yap (direkt ödeme yapılabilir)
      if (!appointment.discountRequest || appointment.discountRequest.status === 'NONE' || !appointment.discountRequest.status) {
        if (!appointment.priceApproval) {
          appointment.priceApproval = {
            status: 'APPROVED',
            approvedAt: new Date()
          };
        } else if (appointment.priceApproval.status !== 'PENDING') {
          // Eğer zaten APPROVED veya REJECTED ise, tekrar APPROVED yap
          appointment.priceApproval.status = 'APPROVED';
          appointment.priceApproval.approvedAt = new Date();
        }
      }
      // Eğer indirim isteği REJECTED ise, priceApproval zaten APPROVED olarak set edilmiş olmalı (respondToDiscountRequest'te)
      
      // Usta tahmini süreyi belirler
      if (estimatedDuration && estimatedDuration > 0) {
        appointment.estimatedDuration = estimatedDuration;
      }
      
      appointment.actualDuration = appointment.estimatedDuration || 0;
      appointment.completionDate = new Date();

      await appointment.save();

      // Driver'a bildirim gönder - İş tamamlandı, ödeme yapabilir
      try {
        const mechanicName = (appointment.mechanicId as any)?.name || 'Usta';
        const { translateServiceType } = require('../utils/serviceTypeTranslator');
        const serviceTypeName = translateServiceType(appointment.serviceType) || 'Hizmet';
        
        await sendNotification(
          appointment.userId,
          'driver',
          'İş Tamamlandı',
          `${mechanicName} usta işinizi tamamladı. Toplam ${appointment.finalPrice || appointment.price || 0}₺ tutarında ödeme yapabilirsiniz.`,
          'payment_pending',
          {
            appointmentId: appointment._id,
            amount: appointment.finalPrice || appointment.price || 0,
            mechanicName,
            serviceType: serviceTypeName
          }
        );
        Logger.info(`Driver'a iş tamamlandı bildirimi gönderildi: ${appointment.userId}`);
      } catch (notificationError) {
        Logger.error('İş tamamlandı bildirimi gönderme hatası:', notificationError);
      }

      // FaultReport durumunu ve payment bilgisini güncelle
      if (appointment.faultReportId) {
        await this.updateRelatedFaultReportStatus(appointment.faultReportId.toString(), 'ODEME_BEKLIYOR');
        
        // FaultReport'un payment objesini oluştur
        try {
          const FaultReport = require('../models/FaultReport').FaultReport;
          const faultReport = await FaultReport.findById(appointment.faultReportId);
          
          if (faultReport) {
            faultReport.payment = {
              amount: appointment.finalPrice,
              status: 'pending',
              paymentMethod: 'credit_card',
              paymentDate: new Date()
            };
            await faultReport.save();
            Logger.info(`FaultReport ${faultReport._id} payment objesi oluşturuldu: ${appointment.finalPrice}₺`);
          }
        } catch (paymentError) {
          Logger.error('FaultReport payment güncellenirken hata:', paymentError);
        }
      }

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Ödeme durumunu güncelle
   */
  static async updatePaymentStatus(appointmentId: string, paymentData: PaymentData, userId: string) {
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
      throw error;
    }
  }

  /**
   * Randevuyu iptal et
   */
  static async cancelAppointment(appointmentId: string, userId: string) {
    try {
      Logger.debug(`Cancelling appointment ${appointmentId} for user ${userId}`);
      
      const appointment = await Appointment.findOneAndUpdate(
        { 
          _id: new mongoose.Types.ObjectId(appointmentId), 
          userId: new mongoose.Types.ObjectId(userId) 
        },
        { 
          status: 'IPTAL_EDILDI', 
          updatedAt: new Date() 
        },
        { new: true }
      );

      Logger.debug(`Found appointment:`, appointment ? 'YES' : 'NO');

      if (!appointment) {
        Logger.warn(`Appointment not found or user mismatch`);
        throw new CustomError('Randevu bulunamadı veya iptal edilemez', 404);
      }

      return appointment;
    } catch (error) {
      Logger.error(`Error cancelling appointment:`, error);
      throw error;
    }
  }

  /**
   * Bildirim ayarlarını güncelle
   */
  static async updateNotificationSettings(appointmentId: string, settings: NotificationSettings, userId: string) {
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
        .populate('mechanicId', 'name surname phone email')
        .select('-__v')
        .lean(); // Memory optimization - populate ile birlikte kullanılabilir (select populate'dan sonra olmalı)

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece planlanan veya serviste randevularda iletişim bilgileri paylaşılabilir
      if (appointment.status !== 'PLANLANDI' && appointment.status !== 'SERVISTE') {
        throw new CustomError('Randevu henüz onaylanmamış', 400);
      }

      // Kullanıcının bu randevuyu görme yetkisi var mı kontrol et
      const appointmentUserId = appointment.userId._id ? appointment.userId._id.toString() : appointment.userId.toString();
      const appointmentMechanicId = appointment.mechanicId ? (appointment.mechanicId._id ? appointment.mechanicId._id.toString() : appointment.mechanicId.toString()) : null;
      
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

      // Aktif işler (Talep edildi + Planlandı + Serviste)
      const activeJobs = await Appointment.countDocuments({
        mechanicId,
        status: { $in: ['TALEP_EDILDI', 'PLANLANDI', 'SERVISTE'] }
      });

      // Bugünkü kazanç (tamamlanan işler)
      const todayCompletedAppointments = await Appointment.find({
        mechanicId,
        status: 'TAMAMLANDI',
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
      return [];
    }
  }

  /**
   * Randevu tarih/saat bilgisini gerçek Date objesine çevir
   */
  private static resolveAppointmentDateTime(appointment: { appointmentDate?: Date; timeSlot?: string }): Date | null {
    if (!appointment || !appointment.appointmentDate) {
      return null;
    }

    const appointmentDate = new Date(appointment.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) {
      return null;
    }

    const normalizedDate = new Date(appointmentDate);

    if (appointment.timeSlot && typeof appointment.timeSlot === 'string') {
      // "09:00" veya "09:00 - 10:00" formatlarını destekle
      const slot = appointment.timeSlot.split(' ')[0];
      const timeParts = slot.includes(':') ? slot.split(':') : slot.split('.');
      if (timeParts.length >= 2) {
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);

        if (!Number.isNaN(hours)) {
          normalizedDate.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
          return normalizedDate;
        }
      }
    }

    return normalizedDate;
  }

  /**
   * Onay bekleyen ve tarihi geçmiş randevuları otomatik olarak iptal et
   */
  static async cancelExpiredPendingAppointments(referenceDate: Date = new Date()) {
    const now = referenceDate;
    const cancellationReason = 'İşlem Yok';

    const candidates = await Appointment.find({
      status: { $in: ['TALEP_EDILDI', 'pending'] },
      appointmentDate: { $lte: now },
      autoCancelled: { $ne: true }
    });

    let cancelled = 0;
    let notified = 0;

    for (const appointment of candidates) {
      const scheduledAt = this.resolveAppointmentDateTime(appointment);
      if (!scheduledAt) {
        continue;
      }

      if (scheduledAt.getTime() > now.getTime()) {
        // Tarih geldi fakat saat henüz geçmediyse iptal etme
        continue;
      }

      try {
        await this.updateAppointmentStatus(
          appointment._id.toString(),
          'IPTAL_EDILDI',
          cancellationReason
        );

        const statusHistoryEntry = {
          status: 'IPTAL_EDILDI',
          timestamp: new Date(),
          mechanicId: 'system',
          notes: 'Otomatik iptal - İşlem Yok'
        };

        const updatePayload: Record<string, unknown> = {
          $set: {
            autoCancelled: true,
            rejectionReason: cancellationReason,
            updatedAt: new Date()
          }
        };

        const hasSameHistory = Array.isArray(appointment.statusHistory)
          ? appointment.statusHistory.some(
              (entry) =>
                entry?.status === 'IPTAL_EDILDI' &&
                entry?.notes === statusHistoryEntry.notes
            )
          : false;

        if (!hasSameHistory) {
          updatePayload.$push = { statusHistory: statusHistoryEntry };
        }

        await Appointment.findByIdAndUpdate(appointment._id, updatePayload);

        if (appointment.userId) {
          const driverId =
            appointment.userId instanceof mongoose.Types.ObjectId
              ? appointment.userId
              : new mongoose.Types.ObjectId(appointment.userId);
          const formattedDate = scheduledAt.toLocaleDateString('tr-TR');
          const formattedTime = appointment.timeSlot
            ? appointment.timeSlot
            : scheduledAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

          try {
            await sendNotification(
              driverId,
              'driver',
              'Randevu Otomatik İptal Edildi',
              `${formattedDate} ${formattedTime} tarihli randevunuz ustadan yanıt gelmediği için iptal edildi.`,
              'appointment_rejected',
              {
                appointmentId: appointment._id,
                autoCancelled: true,
                status: 'cancelled',
                reason: cancellationReason
              }
            );
            notified++;
          } catch (notificationError) {
            Logger.error('Otomatik iptal bildirimi gönderilemedi:', notificationError);
          }
        }

        cancelled++;
      } catch (error) {
        Logger.error('Otomatik iptal sırasında hata oluştu:', error);
      }
    }

    return {
      checked: candidates.length,
      cancelled,
      notified
    };
  }

  /**
   * Driver indirim ister
   */
  static async requestDiscount(appointmentId: string, userId: string) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece randevu sahibi indirim isteyebilir
      if (appointment.userId.toString() !== userId) {
        throw new CustomError('Bu randevu için indirim isteği yapma yetkiniz yok', 403);
      }

      // Sadece ODEME_BEKLIYOR durumunda indirim istenebilir
      if (appointment.status !== 'ODEME_BEKLIYOR') {
        throw new CustomError('Sadece ödeme bekleyen randevular için indirim istenebilir', 400);
      }

      // Eğer zaten pending bir istek varsa hata ver
      if (appointment.discountRequest?.status === 'PENDING') {
        throw new CustomError('Zaten bekleyen bir indirim isteğiniz var', 400);
      }

      // İndirim isteğini oluştur
      if (!appointment.discountRequest) {
        appointment.discountRequest = {
          status: 'PENDING',
          requestedAt: new Date(),
          requestedBy: userId
        };
      } else {
        appointment.discountRequest.status = 'PENDING';
        appointment.discountRequest.requestedAt = new Date();
        appointment.discountRequest.requestedBy = userId;
      }

      await appointment.save();

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Usta indirim isteğine yanıt verir (yeni fiyat teklif eder veya reddeder)
   */
  static async respondToDiscountRequest(
    appointmentId: string,
    mechanicId: string,
    newPrice?: number,
    approve: boolean = true
  ) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece randevu ustası yanıt verebilir
      if (appointment.mechanicId?.toString() !== mechanicId) {
        throw new CustomError('Bu randevu için yanıt verme yetkiniz yok', 403);
      }

      // İndirim isteği olmalı ve pending olmalı
      if (!appointment.discountRequest || appointment.discountRequest.status !== 'PENDING') {
        throw new CustomError('Bekleyen bir indirim isteği bulunamadı', 400);
      }

      if (approve && newPrice !== undefined && newPrice > 0) {
        // İndirim onaylandı, yeni fiyat teklif edildi
        appointment.discountRequest.status = 'APPROVED';
        appointment.negotiatedPrice = newPrice;
        
        // Driver'ın onayı bekleniyor
        if (!appointment.priceApproval) {
          appointment.priceApproval = {
            status: 'PENDING',
            approvedAt: undefined
          };
        } else {
          appointment.priceApproval.status = 'PENDING';
          appointment.priceApproval.approvedAt = undefined;
        }
      } else {
        // İndirim reddedildi
        appointment.discountRequest.status = 'REJECTED';
        // Orijinal fiyat geçerli, driver direkt ödeme yapabilir
        if (!appointment.priceApproval) {
          appointment.priceApproval = {
            status: 'APPROVED', // Reddedildiğinde orijinal fiyatı kabul etmiş sayılır
            approvedAt: new Date()
          };
        } else {
          appointment.priceApproval.status = 'APPROVED';
          appointment.priceApproval.approvedAt = new Date();
        }
      }

      await appointment.save();

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Driver son fiyatı onaylar
   */
  static async approveFinalPrice(appointmentId: string, userId: string) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .select('-__v')
        .lean();
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece randevu sahibi onaylayabilir
      if (appointment.userId.toString() !== userId) {
        throw new CustomError('Bu randevu için fiyat onaylama yetkiniz yok', 403);
      }

      // Fiyat onayı pending olmalı
      if (!appointment.priceApproval || appointment.priceApproval.status !== 'PENDING') {
        throw new CustomError('Onay bekleyen bir fiyat bulunamadı', 400);
      }

      // Fiyatı onayla
      appointment.priceApproval.status = 'APPROVED';
      appointment.priceApproval.approvedAt = new Date();

      // Eğer negotiatedPrice varsa, finalPrice'ı güncelle
      if (appointment.negotiatedPrice && appointment.negotiatedPrice > 0) {
        appointment.finalPrice = appointment.negotiatedPrice;
      }

      await appointment.save();

      return appointment;
    } catch (error) {
      throw error;
    }
  }
}
