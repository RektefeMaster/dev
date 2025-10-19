import { WashOrder, IWashOrder } from '../models/WashOrder';
import { WashPackage, IWashPackage } from '../models/WashPackage';
import { WashProvider, IWashProvider } from '../models/WashProvider';
import { WashLane } from '../models/WashLane';
import { WashDispute } from '../models/WashDispute';
import { EscrowService } from './escrow.service';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

export class WashService {
  /**
   * Fiyat teklifi hesaplama
   */
  static async createQuote(data: {
    packageId: string;
    vehicleSegment: 'A' | 'B' | 'C' | 'SUV' | 'Commercial';
    type: 'shop' | 'mobile';
    providerId: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    scheduledDate?: Date;
  }) {
    try {
      // Paketi getir
      const washPackage = await WashPackage.findById(data.packageId);
      if (!washPackage) {
        throw new CustomError('Paket bulunamadı', 404);
      }

      // Provider'ı getir
      const provider = await WashProvider.findOne({ 
        userId: data.providerId,
        isActive: true 
      });
      if (!provider) {
        throw new CustomError('İşletme bulunamadı', 404);
      }

      // Taban fiyat
      const basePrice = washPackage.basePrice;

      // Segment çarpanı
      const segmentMultiplier = washPackage.segmentMultipliers[data.vehicleSegment];

      // Yoğunluk katsayısı hesapla (shop için)
      let densityCoefficient = 0;
      if (data.type === 'shop' && data.scheduledDate) {
        densityCoefficient = await this.calculateDensity(
          data.providerId,
          data.scheduledDate
        );
      }

      // Lokasyon çarpanı (şimdilik sabit)
      const locationMultiplier = 1.0;

      // Mesafe ücreti (mobil için)
      let distanceFee = 0;
      if (data.type === 'mobile' && data.location && provider.mobile) {
        const distance = this.calculateDistance(
          provider.location.coordinates,
          data.location
        );
        
        const baseDistance = provider.mobile.pricing.baseDistanceFee;
        const perKmFee = provider.mobile.pricing.perKmFee;
        
        if (distance > baseDistance) {
          distanceFee = (distance - baseDistance) * perKmFee;
        }
      }

      // Toplam fiyat hesapla
      const subtotal = 
        basePrice * 
        segmentMultiplier * 
        (1 + densityCoefficient) * 
        locationMultiplier;
      
      const finalPrice = subtotal + distanceFee;

      return {
        success: true,
        data: {
          package: {
            id: washPackage._id,
            name: washPackage.name,
            basePrice,
            duration: washPackage.duration,
          },
          pricing: {
            basePrice,
            segmentMultiplier,
            densityCoefficient,
            locationMultiplier,
            distanceFee,
            subtotal,
            finalPrice: Math.round(finalPrice * 100) / 100,
          },
          breakdown: {
            'Taban Fiyat': `${basePrice} TL`,
            'Segment Çarpanı': `x${segmentMultiplier}`,
            'Yoğunluk': densityCoefficient > 0 ? `+%${(densityCoefficient * 100).toFixed(0)}` : 'Normal',
            'Mesafe Ücreti': distanceFee > 0 ? `${distanceFee.toFixed(2)} TL` : 'Yok',
          },
        },
        message: 'Fiyat teklifi hesaplandı',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sipariş oluşturma
   */
  static async createOrder(data: {
    driverId: string;
    providerId: string;
    packageId: string;
    vehicleId?: string;
    vehicle: {
      brand: string;
      model: string;
      year?: number;
      plateNumber?: string;
      segment: 'A' | 'B' | 'C' | 'SUV' | 'Commercial';
    };
    type: 'shop' | 'mobile';
    location: {
      address: string;
      latitude?: number;
      longitude?: number;
      requiresPower?: boolean;
      requiresWater?: boolean;
      isIndoorParking?: boolean;
    };
    scheduling: {
      slotStart?: Date;
      slotEnd?: Date;
      timeWindowStart?: Date;
      timeWindowEnd?: Date;
    };
    laneId?: string;
    tefePuanUsed?: number;
    paymentMethod?: 'wallet' | 'card';
    cardInfo: {
      cardNumber: string;
      cardHolderName: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
    };
    extras?: Array<{
      name: string;
      price: number;
      duration: number;
    }>;
    note?: string;
  }) {
    try {
      // Paketi getir
      const washPackage = await WashPackage.findById(data.packageId);
      if (!washPackage) {
        throw new CustomError('Paket bulunamadı', 404);
      }

      // Provider'ı getir
      const provider = await WashProvider.findOne({ 
        userId: data.providerId,
        isActive: true 
      });
      if (!provider) {
        throw new CustomError('İşletme bulunamadı', 404);
      }

      // Fiyat hesapla
      const quote = await this.createQuote({
        packageId: data.packageId,
        vehicleSegment: data.vehicle.segment,
        type: data.type,
        providerId: data.providerId,
        location: data.location.latitude && data.location.longitude ? {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        } : undefined,
        scheduledDate: data.scheduling.slotStart || data.scheduling.timeWindowStart,
      });

      if (!quote.success) {
        throw new CustomError('Fiyat hesaplanamadı', 500);
      }

      // TefePuan indirimi hesapla
      const tefePuanUsed = data.tefePuanUsed || 0;
      const tefePuanDiscount = tefePuanUsed; // 1 puan = 1 TL
      const finalPrice = Math.max(0, quote.data.pricing.finalPrice - tefePuanDiscount);

      const paymentMethod = data.paymentMethod || 'card';

      // Ödeme işlemi
      let escrowResult;
      
      if (paymentMethod === 'wallet') {
        // Cüzdan ile ödeme - MongoDB transaction ile atomik işlem
        const { Wallet } = require('../models/Wallet');
        const mongoose = require('mongoose');
        
        const session = await mongoose.startSession();
        
        try {
          await session.startTransaction();
          
          // Wallet'ı bul ve bakiye kontrolü
          const wallet = await Wallet.findOne({ userId: data.driverId }).session(session);
          
          if (!wallet || wallet.balance < finalPrice) {
            await session.abortTransaction();
            throw new CustomError('Cüzdan bakiyeniz yetersiz', 400);
          }
          
          // Transaction kaydı oluştur
          const transaction = {
            type: 'debit' as const,
            amount: finalPrice,
            description: `Araç yıkama ödemesi - ${washPackage.name}`,
            date: new Date(),
            status: 'completed' as const,
            orderNumber: `WSH-${Date.now()}`,
          };
          
          // Bakiyeyi atomik olarak kes
          await Wallet.findOneAndUpdate(
            { userId: data.driverId },
            {
              $inc: { balance: -finalPrice },
              $push: { transactions: transaction }
            },
            { session, new: true }
          );
          
          await session.commitTransaction();
          
          // Escrow sonucu
          escrowResult = {
            success: true,
            escrowId: `WALLET_ESCROW_${Date.now()}`,
            amount: finalPrice,
            status: 'held',
            transactionId: transaction.orderNumber,
          };
          
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          await session.endSession();
        }
      } else {
        // Kart ile ödeme (MOCK)
        escrowResult = await EscrowService.mockHold({
          orderId: `TEMP_${Date.now()}`,
          amount: finalPrice,
          cardInfo: data.cardInfo,
        });

        if (!escrowResult.success) {
          throw new CustomError('Ödeme işlemi başarısız', 400);
        }
      }

      // Sipariş numarası oluştur
      const orderNumber = `WSH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // İş adımlarını oluştur
      const workSteps = washPackage.workSteps.map((step, index) => ({
        step: step.step,
        name: step.name,
        order: step.order,
        status: 'pending' as const,
        photos: [],
      }));

      // Sipariş oluştur
      const order = new WashOrder({
        orderNumber,
        driverId: new mongoose.Types.ObjectId(data.driverId),
        providerId: new mongoose.Types.ObjectId(data.providerId),
        vehicleId: data.vehicleId ? new mongoose.Types.ObjectId(data.vehicleId) : undefined,
        packageId: new mongoose.Types.ObjectId(data.packageId),
        type: data.type,
        vehicle: data.vehicle,
        package: {
          name: washPackage.name,
          basePrice: washPackage.basePrice,
          duration: washPackage.duration,
          extras: data.extras || [],
        },
        location: {
          address: data.location.address,
          coordinates: data.location.latitude && data.location.longitude ? {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          } : undefined,
          requiresPower: data.location.requiresPower,
          requiresWater: data.location.requiresWater,
          isIndoorParking: data.location.isIndoorParking,
        },
        scheduling: {
          slotStart: data.scheduling.slotStart,
          slotEnd: data.scheduling.slotEnd,
          timeWindow: data.scheduling.timeWindowStart && data.scheduling.timeWindowEnd ? {
            start: data.scheduling.timeWindowStart,
            end: data.scheduling.timeWindowEnd,
          } : undefined,
          estimatedDuration: washPackage.duration,
        },
        laneId: data.laneId ? new mongoose.Types.ObjectId(data.laneId) : undefined,
        pricing: {
          ...quote.data.pricing,
          tefePuanUsed,
          tefePuanDiscount,
          finalPrice,
        },
        status: 'DRIVER_CONFIRMED',
        workSteps,
        qa: {
          photosBeforeRequired: washPackage.qaRequirements.photosBefore,
          photosAfterRequired: washPackage.qaRequirements.photosAfter,
          photosBefore: [],
          photosAfter: [],
          checklist: washPackage.qaRequirements.checklist.map(item => ({
            item,
            checked: false,
          })),
        },
        escrow: {
          transactionId: escrowResult.transactionId || escrowResult.escrowId,
          status: 'held',
          amount: finalPrice,
          cardLast4: paymentMethod === 'wallet' ? 'WALLET' : data.cardInfo.cardNumber.slice(-4),
          heldAt: new Date(),
          mockCard: true,
          paymentMethod,
        },
        driverNote: data.note,
        tefePuanEarned: Math.floor(finalPrice * 0.05), // %5 puan kazanımı
      });

      await order.save();

      // Provider metriklerini güncelle
      provider.metrics.totalJobs += 1;
      await provider.save();

      // TefePuan kazandır (transaction dışında, başarısızlık siparişi engellemez)
      try {
        const { TefePointService } = require('./tefePoint.service');
        await TefePointService.processPaymentTefePoints({
          userId: data.driverId,
          amount: finalPrice,
          paymentType: 'wash',
          serviceCategory: 'car_wash',
          description: `Araç yıkama ödemesi - ${washPackage.name}`,
          serviceId: order._id.toString(),
          appointmentId: order._id.toString()
        });
      } catch (tefeError) {
        console.error('TefePuan kazandırma hatası:', tefeError);
        // TefePuan hatası siparişi engellemez
      }

      return {
        success: true,
        data: order,
        message: 'Sipariş başarıyla oluşturuldu',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Siparişi kabul et (provider)
   */
  static async acceptOrder(orderId: string, providerId: string) {
    try {
      const order = await WashOrder.findOne({
        _id: orderId,
        providerId: new mongoose.Types.ObjectId(providerId),
        status: 'DRIVER_CONFIRMED',
      });

      if (!order) {
        throw new CustomError('Sipariş bulunamadı veya kabul edilemez', 404);
      }

      order.status = 'PROVIDER_ACCEPTED';
      await order.save();

      return {
        success: true,
        data: order,
        message: 'Sipariş kabul edildi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check-in (giriş yapma)
   */
  static async checkIn(orderId: string, providerId: string) {
    try {
      const order = await WashOrder.findOne({
        _id: orderId,
        providerId: new mongoose.Types.ObjectId(providerId),
        status: { $in: ['PROVIDER_ACCEPTED', 'EN_ROUTE'] },
      });

      if (!order) {
        throw new CustomError('Sipariş bulunamadı veya check-in yapılamaz', 404);
      }

      order.status = 'CHECK_IN';
      order.scheduling.actualStartTime = new Date();
      await order.save();

      return {
        success: true,
        data: order,
        message: 'Check-in başarılı',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * İşlemi başlat
   */
  static async startWork(orderId: string, providerId: string) {
    try {
      const order = await WashOrder.findOne({
        _id: orderId,
        providerId: new mongoose.Types.ObjectId(providerId),
        status: 'CHECK_IN',
      });

      if (!order) {
        throw new CustomError('Sipariş bulunamadı veya başlatılamaz', 404);
      }

      order.status = 'IN_PROGRESS';
      
      // İlk adımı başlat
      if (order.workSteps.length > 0) {
        order.workSteps[0].status = 'in_progress';
        order.workSteps[0].startedAt = new Date();
      }

      await order.save();

      return {
        success: true,
        data: order,
        message: 'İşlem başlatıldı',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * İlerleme güncelle
   */
  static async updateProgress(data: {
    orderId: string;
    providerId: string;
    stepIndex: number;
    photos?: string[];
    notes?: string;
    completed?: boolean;
  }) {
    try {
      const order = await WashOrder.findOne({
        _id: data.orderId,
        providerId: new mongoose.Types.ObjectId(data.providerId),
        status: 'IN_PROGRESS',
      });

      if (!order) {
        throw new CustomError('Sipariş bulunamadı', 404);
      }

      if (data.stepIndex < 0 || data.stepIndex >= order.workSteps.length) {
        throw new CustomError('Geçersiz adım indeksi', 400);
      }

      const step = order.workSteps[data.stepIndex];

      // Fotoğraf ekle
      if (data.photos && data.photos.length > 0) {
        step.photos.push(...data.photos);
      }

      // Not ekle
      if (data.notes) {
        step.notes = data.notes;
      }

      // Adımı tamamla
      if (data.completed) {
        step.status = 'completed';
        step.completedAt = new Date();

        // Sonraki adımı başlat
        const nextStep = order.workSteps[data.stepIndex + 1];
        if (nextStep) {
          nextStep.status = 'in_progress';
          nextStep.startedAt = new Date();
        }
      }

      await order.save();

      return {
        success: true,
        data: order,
        message: 'İlerleme güncellendi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * QA gönder (kalite kontrol)
   */
  static async submitQA(data: {
    orderId: string;
    providerId: string;
    photosBefore: string[];
    photosAfter: string[];
  }) {
    try {
      const order = await WashOrder.findOne({
        _id: data.orderId,
        providerId: new mongoose.Types.ObjectId(data.providerId),
        status: 'IN_PROGRESS',
      });

      if (!order) {
        throw new CustomError('Sipariş bulunamadı', 404);
      }

      // Tüm adımların tamamlandığını kontrol et
      const allCompleted = order.workSteps.every(step => step.status === 'completed');
      if (!allCompleted) {
        throw new CustomError('Tüm adımlar tamamlanmadan QA gönderilemez', 400);
      }

      // QA bilgilerini güncelle
      order.qa.photosBefore = data.photosBefore;
      order.qa.photosAfter = data.photosAfter;
      order.qa.submittedAt = new Date();
      order.qa.approvalStatus = 'pending';
      
      // 15 dakika sonra otomatik onay
      order.qa.autoApproveAt = new Date(Date.now() + 15 * 60 * 1000);

      order.status = 'QA_PENDING';
      order.scheduling.actualEndTime = new Date();
      
      // Gerçek süreyi hesapla
      if (order.scheduling.actualStartTime) {
        const duration = Math.floor(
          (order.scheduling.actualEndTime.getTime() - order.scheduling.actualStartTime.getTime()) / (1000 * 60)
        );
        order.scheduling.actualDuration = duration;
      }

      await order.save();

      return {
        success: true,
        data: order,
        message: 'QA gönderildi, müşteri onayı bekleniyor',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * QA onayla (driver)
   */
  static async approveQA(data: {
    orderId: string;
    driverId: string;
    approved: boolean;
    feedback?: string;
  }) {
    try {
      const order = await WashOrder.findOne({
        _id: data.orderId,
        driverId: new mongoose.Types.ObjectId(data.driverId),
        status: 'QA_PENDING',
      });

      if (!order) {
        throw new CustomError('Sipariş bulunamadı', 404);
      }

      if (data.approved) {
        order.qa.approvalStatus = 'approved';
        order.qa.approvedAt = new Date();
        order.status = 'COMPLETED';

        // Escrow'dan ödeme çek
        const captureResult = await EscrowService.mockCapture({
          transactionId: order.escrow.transactionId,
          amount: order.pricing.finalPrice,
        });

        if (captureResult.success) {
          order.escrow.status = 'captured';
          order.escrow.capturedAt = new Date();
          order.status = 'PAID';
        }

        // Provider metriklerini güncelle
        const provider = await WashProvider.findOne({ userId: order.providerId });
        if (provider) {
          provider.metrics.completedJobs += 1;
          provider.metrics.qaPassRate = 
            (provider.metrics.qaPassRate * (provider.metrics.completedJobs - 1) + 100) / 
            provider.metrics.completedJobs;
          await provider.save();
        }

      } else {
        order.qa.approvalStatus = 'rework_required';
        order.qa.driverFeedback = data.feedback;
        order.status = 'IN_PROGRESS';
      }

      await order.save();

      return {
        success: true,
        data: order,
        message: data.approved ? 'İşlem onaylandı ve ödeme yapıldı' : 'Düzeltme istendi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Siparişi iptal et
   */
  static async cancelOrder(data: {
    orderId: string;
    userId: string;
    cancelledBy: 'driver' | 'provider';
    reason: string;
  }) {
    try {
      const order = await WashOrder.findById(data.orderId);
      if (!order) {
        throw new CustomError('Sipariş bulunamadı', 404);
      }

      // İptal edilebilir durumda mı kontrol et
      const cancellableStatuses = [
        'CREATED',
        'PRICED',
        'DRIVER_CONFIRMED',
        'PROVIDER_ACCEPTED',
        'EN_ROUTE',
      ];

      if (!cancellableStatuses.includes(order.status)) {
        throw new CustomError('Bu aşamada sipariş iptal edilemez', 400);
      }

      // İade tutarını hesapla
      let refundAmount = order.pricing.finalPrice;
      let penaltyAmount = 0;

      // Provider kabul ettikten sonra iptal ediyorsa ceza
      if (['PROVIDER_ACCEPTED', 'EN_ROUTE'].includes(order.status)) {
        if (data.cancelledBy === 'driver') {
          penaltyAmount = order.pricing.finalPrice * 0.3; // %30 ceza
          refundAmount = order.pricing.finalPrice - penaltyAmount;
        }
      }

      // Escrow'dan iade
      const refundResult = await EscrowService.mockRefund({
        transactionId: order.escrow.transactionId,
        amount: refundAmount,
        reason: data.reason,
      });

      if (refundResult.success) {
        order.escrow.status = 'refunded';
        order.escrow.refundedAt = new Date();
      }

      order.status = data.cancelledBy === 'driver' ? 'CANCELLED_BY_DRIVER' : 'CANCELLED_BY_PROVIDER';
      order.cancellation = {
        cancelledBy: data.cancelledBy,
        reason: data.reason,
        cancelledAt: new Date(),
        refundAmount,
        penaltyAmount,
      };

      await order.save();

      // Provider metriklerini güncelle
      if (data.cancelledBy === 'provider') {
        const provider = await WashProvider.findOne({ userId: order.providerId });
        if (provider) {
          provider.metrics.cancelledJobs += 1;
          provider.reputation.consecutiveCancellations += 1;
          provider.reputation.lastCancellationDate = new Date();
          
          // İtibar skorunu düşür
          provider.reputation.score = Math.max(0, provider.reputation.score - 5);
          
          await provider.save();
        }
      }

      return {
        success: true,
        data: order,
        message: 'Sipariş iptal edildi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Yoğunluk katsayısı hesapla
   */
  static async calculateDensity(providerId: string, date: Date): Promise<number> {
    try {
      const provider = await WashProvider.findOne({ userId: providerId });
      if (!provider || !provider.shop) {
        return 0;
      }

      // Aynı gün için toplam rezervasyon sayısını al
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const bookingCount = await WashOrder.countDocuments({
        providerId: new mongoose.Types.ObjectId(providerId),
        'scheduling.slotStart': {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: { $nin: ['CANCELLED_BY_DRIVER', 'CANCELLED_BY_PROVIDER'] },
      });

      // Toplam kapasite
      const totalCapacity = provider.shop.totalCapacity || 10;
      
      // Doluluk oranı
      const occupancyRate = (bookingCount / totalCapacity) * 100;

      // Yoğunluk eşiği (varsayılan %70)
      const threshold = 70;

      if (occupancyRate < threshold) {
        return 0;
      }

      // Lineer artış
      const coefficient = Math.min(0.5, (occupancyRate - threshold) / 100);
      
      return coefficient;
    } catch (error) {
      console.error('Yoğunluk hesaplama hatası:', error);
      return 0;
    }
  }

  /**
   * Mesafe hesapla (km)
   */
  static calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) * 
      Math.cos(this.toRad(point2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Sipariş detayını getir
   */
  static async getOrder(orderId: string, userId: string) {
    try {
      const order = await WashOrder.findOne({
        _id: orderId,
        $or: [
          { driverId: new mongoose.Types.ObjectId(userId) },
          { providerId: new mongoose.Types.ObjectId(userId) },
        ],
      })
        .populate('driverId', 'name surname phone')
        .populate('providerId', 'name surname phone')
        .populate('packageId');

      if (!order) {
        throw new CustomError('Sipariş bulunamadı', 404);
      }

      return {
        success: true,
        data: order,
        message: 'Sipariş detayı getirildi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sürücü siparişlerini listele
   */
  static async getDriverOrders(driverId: string, status?: string) {
    try {
      const query: any = { driverId: new mongoose.Types.ObjectId(driverId) };
      
      if (status) {
        query.status = status;
      }

      const orders = await WashOrder.find(query)
        .populate('providerId', 'name surname phone')
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: orders,
        message: 'Siparişler getirildi',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * İşletme siparişlerini listele
   */
  static async getProviderOrders(providerId: string, status?: string) {
    try {
      const query: any = { providerId: new mongoose.Types.ObjectId(providerId) };
      
      if (status) {
        query.status = status;
      }

      const orders = await WashOrder.find(query)
        .populate('driverId', 'name surname phone')
        .sort({ 'scheduling.slotStart': 1 });

      return {
        success: true,
        data: orders,
        message: 'Siparişler getirildi',
      };
    } catch (error) {
      throw error;
    }
  }
}

