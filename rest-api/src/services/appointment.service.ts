import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { CustomError } from '../utils/response';
import { Vehicle } from '../models/Vehicle';

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
      const mechanic = await User.findById(data.mechanicId);
      if (!mechanic || mechanic.userType !== 'mechanic') {
        throw new CustomError('Usta bulunamadı', 404);
      }

      if (!mechanic.isAvailable) {
        throw new CustomError('Usta şu anda müsait değil', 400);
      }

      // userId veya customerId'den birini al
      const userId = data.userId || data.customerId;
      if (!userId) {
        throw new CustomError('Kullanıcı ID\'si gereklidir', 400);
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
        const lastVehicle = await Vehicle.findOne({ userId: userId }).sort({ updatedAt: -1, createdAt: -1 });
        if (lastVehicle) {
          resolvedVehicleId = new mongoose.Types.ObjectId((lastVehicle as any)._id.toString());
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
          const faultReport = await FaultReport.findById(data.faultReportId);
          
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

      // Randevu oluştur
      const appointment = new Appointment({
        userId: new mongoose.Types.ObjectId(userId),
        mechanicId: new mongoose.Types.ObjectId(data.mechanicId),
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
        paymentStatus: data.paymentStatus || 'pending',
        shareContactInfo: data.shareContactInfo || false,
        isShopAppointment: data.isShopAppointment || false, // Ustanın kendi eklediği randevu mu?
        notificationSettings: data.notificationSettings || {
          oneDayBefore: false,
          oneHourBefore: true,
          twoHoursBefore: false
        },
        createdAt: new Date()
      });

      await appointment.save();
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
        .sort({ appointmentDate: -1 });

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
        .sort({ appointmentDate: -1 });

      return appointment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Ustanın randevularını getir (Usta/Dükkan için)
   */
  static async getMechanicAppointments(mechanicId: string, statusFilter?: string, filters?: any) {
    try {
      const mapENtoTR: Record<string, string> = {
        'pending': 'TALEP_EDILDI',
        'confirmed': 'PLANLANDI',
        'in-progress': 'SERVISTE',
        'in_progress': 'SERVISTE',
        'payment-pending': 'ODEME_BEKLIYOR',
        'completed': 'TAMAMLANDI',
        'cancelled': 'IPTAL',
        'no-show': 'TALEP_EDILDI', // no-show'u da pending olarak göster
      };
      const legacyMap: Record<string, string[]> = {
        'TALEP_EDILDI': ['pending', 'no-show'], // no-show'u da TALEP_EDILDI'ye ekle
        'PLANLANDI': ['confirmed', 'approved'],
        'SERVISTE': ['in-progress', 'in_progress'],
        'ODEME_BEKLIYOR': ['payment-pending', 'payment_pending'],
        'TAMAMLANDI': ['completed', 'paid'],
        'IPTAL': ['cancelled', 'rejected']
        // NO_SHOW kaldırıldı - artık TALEP_EDILDI kategorisinde
      };

      const query: any = { mechanicId: mechanicId };
      
      if (statusFilter) {
        // İngilizce status'ları Türkçe'ye çevir
        const turkishStatus = mapENtoTR[statusFilter] || statusFilter;
        const statusValues = [turkishStatus];
        
        // Eğer Türkçe status gelirse, İngilizce karşılıklarını da ekle
        if (legacyMap[turkishStatus]) {
          statusValues.push(...legacyMap[turkishStatus]);
        }
        
        // Özel durum: pending için no-show'u da ekle
        if (statusFilter === 'pending') {
          statusValues.push('no-show');
        }
        
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

      const appointments = await Appointment.find(query)
      .populate({
        path: 'userId',
        select: 'name surname email phone',
        options: { lean: true }
      })
      .populate('vehicleId')
      .sort({ appointmentDate: -1 });

      // Randevuları frontend formatına çevir
      const mapTRtoEN: Record<string, string> = {
        'TALEP_EDILDI': 'pending',
        'PLANLANDI': 'confirmed',
        'SERVISTE': 'in-progress',
        'ODEME_BEKLIYOR': 'payment-pending',
        'TAMAMLANDI': 'completed',
        'IPTAL': 'cancelled',
        'NO_SHOW': 'no-show',
      };

      const formattedAppointments = appointments.map(obj => {
        if (!obj.userId) {
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

        const raw = obj.toObject();
        // Basit arama filtresi (q) - populate sonrası filtreleme
        const q = (filters?.q || '').toString().toLowerCase();
        if (q) {
          const hay = [
            ((obj.userId as any)?.name || '') + ' ' + ((obj.userId as any)?.surname || ''),
            (obj as any).serviceType || '',
            (obj.vehicleId as any)?.plateNumber || '',
            (obj.vehicleId as any)?.brand || '',
            (obj.vehicleId as any)?.modelName || ''
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return null as any;
        }

        return {
          ...raw,
          status: mapTRtoEN[raw.status] || raw.status,
          statusTR: raw.status,
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
      throw error;
    }
  }

  /**
   * Dükkan randevularını getir - ustanın kendi eklediği randevular
   */
  static async getShopAppointments(mechanicId: string, status?: string) {
    try {
      // Status filtreleme
      let statusFilter: any = {};
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
        .sort({ appointmentDate: -1, createdAt: -1 });

      // Frontend formatına çevir
      const formattedAppointments = appointments.map(appointment => {
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
      
      if (appointmentUserId !== userId && appointmentMechanicId !== userId) {
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
      const appointment = await Appointment.findById(appointmentId);
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
      const appointment = await Appointment.findById(appointmentId);
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
        'cancelled': 'IPTAL',
        'no-show': 'NO_SHOW',
        'rejected': 'IPTAL',
      };
      if (status && mapENtoTR[status]) {
        status = mapENtoTR[status];
      }

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Yeni durum geçiş kuralları
      const validTransitions: { [key: string]: string[] } = {
        'pending': ['PLANLANDI', 'IPTAL'],
        'TALEP_EDILDI': ['PLANLANDI', 'IPTAL'],
        'PLANLANDI': ['SERVISTE', 'IPTAL', 'NO_SHOW'],
        'SERVISTE': ['ODEME_BEKLIYOR'],
        'ODEME_BEKLIYOR': ['TAMAMLANDI', 'IPTAL'],
        'TAMAMLANDI': [], // Tamamlandı'dan başka duruma geçilemez
        'IPTAL': [], // İptal'dan başka duruma geçilemez
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
      
      if (status === 'IPTAL' && rejectionReason) {
        appointment.rejectionReason = rejectionReason;
      }

      if (mechanicNotes) {
        appointment.mechanicNotes = mechanicNotes;
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
  static async completeAppointment(appointmentId: string, completionNotes: string, price: number, estimatedDuration?: number) {
    try {

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new CustomError('Randevu bulunamadı', 404);
      }

      // Sadece SERVISTE durumundaki randevular ödeme beklemeye geçebilir
      if (appointment.status !== 'SERVISTE') {
        throw new CustomError('Sadece serviste olan işler tamamlanabilir', 400);
      }

      // Randevuyu ödeme bekliyor durumuna al
      appointment.status = 'ODEME_BEKLIYOR';
      appointment.mechanicNotes = completionNotes;
      appointment.price = price;
      appointment.paymentStatus = 'pending'; // Ödeme bekleniyor
      
      // Usta tahmini süreyi belirler
      if (estimatedDuration && estimatedDuration > 0) {
        appointment.estimatedDuration = estimatedDuration;
      }
      
      appointment.actualDuration = appointment.estimatedDuration || 0;
      appointment.completionDate = new Date();

      await appointment.save();
      return appointment;
    } catch (error) {
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
        { status: 'IPTAL', updatedAt: new Date() },
        { new: true }
      );

      if (!appointment) {
        throw new CustomError('Randevu bulunamadı veya iptal edilemez', 404);
      }

      return appointment;
    } catch (error) {
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
}
