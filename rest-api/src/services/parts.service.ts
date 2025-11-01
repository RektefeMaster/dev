import { PartsInventory, IPartsInventory } from '../models/PartsInventory';
import { PartsReservation, IPartsReservation } from '../models/PartsReservation';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

export class PartsService {
  /**
   * Parça oluştur
   */
  static async createPart(data: {
    mechanicId: string;
    partName: string;
    brand: string;
    partNumber?: string;
    description?: string;
    photos: string[];
    category: string;
    compatibility: {
      makeModel: string[];
      years: { start: number; end: number };
      engine?: string[];
      vinPrefix?: string[];
      notes?: string;
    };
    stock: {
      quantity: number;
      lowThreshold: number;
    };
    pricing: {
      unitPrice: number;
      oldPrice?: number;
      currency: string;
      isNegotiable: boolean;
    };
    condition: string;
    warranty?: {
      months: number;
      description: string;
    };
    isPublished?: boolean;
  }) {
    try {
      const part = new PartsInventory({
        mechanicId: data.mechanicId,
        partName: data.partName,
        brand: data.brand,
        partNumber: data.partNumber,
        description: data.description,
        photos: data.photos || [],
        category: data.category,
        compatibility: data.compatibility,
        stock: {
          quantity: data.stock.quantity,
          available: data.stock.quantity, // İlk durumda tüm stok müsait
          reserved: 0,
          lowThreshold: data.stock.lowThreshold
        },
        pricing: data.pricing,
        condition: data.condition,
        warranty: data.warranty,
        moderation: {
          status: 'pending'
        },
        isActive: true,
        isPublished: data.isPublished || false,
        stats: {
          views: 0,
          reservations: 0,
          sales: 0,
          rating: 0
        }
      });

      await part.save();

      return {
        success: true,
        data: part,
        message: 'Parça başarıyla oluşturuldu'
      };
    } catch (error: any) {
      throw new CustomError(error.message || 'Parça oluşturulamadı', 500);
    }
  }

  /**
   * Parça güncelle
   */
  static async updatePart(partId: string, mechanicId: string, updateData: any) {
    try {
      const part = await PartsInventory.findById(partId);
      
      if (!part) {
        throw new CustomError('Parça bulunamadı', 404);
      }

      // Ownership check
      if (part.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu parçayı düzenleme yetkiniz yok', 403);
      }

      // Güncelle
      Object.assign(part, updateData);
      
      // Stock sync
      if (updateData.stock?.quantity !== undefined) {
        part.stock.quantity = updateData.stock.quantity;
        part.stock.available = updateData.stock.quantity - part.stock.reserved;
      }

      await part.save();

      return {
        success: true,
        data: part,
        message: 'Parça başarıyla güncellendi'
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Ustanın parçalarını listele
   */
  static async getMechanicParts(mechanicId: string, filters?: {
    isPublished?: boolean;
    isActive?: boolean;
    category?: string;
  }) {
    try {
      const query: any = { mechanicId };
      
      if (filters?.isPublished !== undefined) {
        query.isPublished = filters.isPublished;
      }
      if (filters?.isActive !== undefined) {
        query.isActive = filters.isActive;
      }
      if (filters?.category) {
        query.category = filters.category;
      }

      const parts = await PartsInventory.find(query)
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: parts,
        message: 'Parçalar listelendi'
      };
    } catch (error: any) {
      throw new CustomError(error.message || 'Parçalar yüklenemedi', 500);
    }
  }

  /**
   * Market'te parça ara
   */
  static async searchParts(filters?: {
    query?: string;
    category?: string;
    makeModel?: string;
    year?: number;
    vin?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {
        isPublished: true,
        isActive: true,
        'stock.available': { $gt: 0 }
      };

      // Text search
      if (filters?.query) {
        query.$or = [
          { partName: { $regex: filters.query, $options: 'i' } },
          { brand: { $regex: filters.query, $options: 'i' } },
          { partNumber: { $regex: filters.query, $options: 'i' } }
        ];
      }

      // Category filter
      if (filters?.category) {
        query.category = filters.category;
      }

      // Make/Model filter
      if (filters?.makeModel) {
        query['compatibility.makeModel'] = { $in: [filters.makeModel] };
      }

      // Year filter
      if (filters?.year) {
        query['compatibility.years.start'] = { $lte: filters.year };
        query['compatibility.years.end'] = { $gte: filters.year };
      }

      // VIN filter
      if (filters?.vin && filters.vin.length >= 3) {
        const vinPrefix = filters.vin.substring(0, 3);
        query['compatibility.vinPrefix'] = { $in: [vinPrefix] };
      }

      // Price filter
      if (filters?.minPrice || filters?.maxPrice) {
        query['pricing.unitPrice'] = {};
        if (filters.minPrice) query['pricing.unitPrice'].$gte = filters.minPrice;
        if (filters.maxPrice) query['pricing.unitPrice'].$lte = filters.maxPrice;
      }

      // Condition filter
      if (filters?.condition) {
        query.condition = filters.condition;
      }

      const [parts, total] = await Promise.all([
        PartsInventory.find(query)
          .populate('mechanicId', 'name surname shopName rating ratingCount')
          .sort({ 'stats.views': -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        PartsInventory.countDocuments(query)
      ]);

      return {
        success: true,
        data: {
          parts,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        message: 'Arama sonuçları'
      };
    } catch (error: any) {
      throw new CustomError(error.message || 'Arama yapılamadı', 500);
    }
  }

  /**
   * Rezervasyon oluştur
   */
  static async createReservation(data: {
    buyerId: string;
    partId: string;
    vehicleId?: string;
    quantity: number;
    delivery: {
      method: string;
      address?: string;
    };
    payment: {
      method: string;
    };
  }) {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();

      // Parça bilgilerini al
      const part = await PartsInventory.findById(data.partId).session(session);
      if (!part) {
        throw new CustomError('Parça bulunamadı', 404);
      }

      // Atomik stok güncelleme - query içinde kontrol
      const updatedPart = await PartsInventory.findOneAndUpdate(
        {
          _id: data.partId,
          'stock.available': { $gte: data.quantity } // Race condition koruması
        },
        {
          $inc: {
            'stock.available': -data.quantity,
            'stock.reserved': data.quantity
          }
        },
        { session, new: true }
      );

      if (!updatedPart) {
        throw new CustomError(
          `${part.partName} için yetersiz stok veya parça bulunamadı`,
          409
        );
      }

      // Rezervasyon oluştur
      const reservation = new PartsReservation({
        buyerId: data.buyerId,
        sellerId: part.mechanicId,
        partId: data.partId,
        vehicleId: data.vehicleId,
        partInfo: {
          partName: part.partName,
          brand: part.brand,
          partNumber: part.partNumber,
          condition: part.condition
        },
        quantity: data.quantity,
        unitPrice: part.pricing.unitPrice,
        totalPrice: part.pricing.unitPrice * data.quantity,
        delivery: data.delivery,
        payment: data.payment,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
        stockRestored: false
      });

      await reservation.save({ session });

      // Stats güncelle - updatedPart kullan (transaction içinde tutarlı)
      await PartsInventory.findByIdAndUpdate(
        data.partId,
        { $inc: { 'stats.reservations': 1 } },
        { session }
      );

      await session.commitTransaction();

      return {
        success: true,
        data: reservation,
        message: 'Rezervasyon oluşturuldu'
      };
    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Rezervasyon onayla
   */
  static async approveReservation(reservationId: string, sellerId: string) {
    try {
      const reservation = await PartsReservation.findById(reservationId);
      
      if (!reservation) {
        throw new CustomError('Rezervasyon bulunamadı', 404);
      }

      if (reservation.sellerId.toString() !== sellerId) {
        throw new CustomError('Bu rezervasyonu onaylama yetkiniz yok', 403);
      }

      if (reservation.status !== 'pending') {
        throw new CustomError('Sadece bekleyen rezervasyonlar onaylanabilir', 400);
      }

      reservation.status = 'confirmed';
      await reservation.save();

      return {
        success: true,
        data: reservation,
        message: 'Rezervasyon onaylandı'
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Rezervasyon iptal et
   */
  static async cancelReservation(reservationId: string, userId: string, reason?: string, cancelledBy: string = 'buyer') {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();

      const reservation = await PartsReservation.findById(reservationId).session(session);
      
      if (!reservation) {
        throw new CustomError('Rezervasyon bulunamadı', 404);
      }

      // Permission check
      if (reservation.buyerId.toString() !== userId && reservation.sellerId.toString() !== userId) {
        throw new CustomError('Bu rezervasyonu iptal etme yetkiniz yok', 403);
      }

      if (!['pending', 'confirmed'].includes(reservation.status)) {
        throw new CustomError('Bu rezervasyon iptal edilemez', 400);
      }

      // Stoku geri ekle (eğer henüz geri eklenmediyse)
      if (!reservation.stockRestored) {
        await PartsInventory.findByIdAndUpdate(
          reservation.partId,
          {
            $inc: {
              'stock.available': reservation.quantity,
              'stock.reserved': -reservation.quantity
            }
          },
          { session }
        );

        reservation.stockRestored = true;
      }

      // Rezervasyonu iptal et
      reservation.status = 'cancelled';
      reservation.cancellationReason = reason;
      reservation.cancelledBy = cancelledBy as any;
      reservation.cancelledAt = new Date();

      await reservation.save({ session });

      // Ödeme varsa iade et
      if (reservation.payment.status === 'paid') {
        // TODO: Escrow refund
        reservation.payment.status = 'refunded';
        await reservation.save({ session });
      }

      await session.commitTransaction();

      return {
        success: true,
        data: reservation,
        message: 'Rezervasyon iptal edildi'
      };
    } catch (error: any) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Usta rezervasyonlarını getir
   */
  static async getMechanicReservations(mechanicId: string, filters?: { status?: string }) {
    try {
      const query: any = { sellerId: mechanicId };
      
      if (filters?.status) {
        query.status = filters.status;
      }

      const reservations = await PartsReservation.find(query)
        .populate('buyerId', 'name surname phone avatar')
        .populate('partId', 'partName brand partNumber condition')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: reservations,
        message: 'Rezervasyonlar listelendi'
      };
    } catch (error: any) {
      throw new CustomError(error.message || 'Rezervasyonlar yüklenemedi', 500);
    }
  }

  /**
   * Kullanıcı rezervasyonlarını getir
   */
  static async getMyReservations(userId: string, filters?: { status?: string }) {
    try {
      const query: any = { buyerId: userId };
      
      if (filters?.status) {
        query.status = filters.status;
      }

      const reservations = await PartsReservation.find(query)
        .populate('sellerId', 'name surname shopName rating ratingCount phone')
        .populate('partId', 'partName brand partNumber photos')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: reservations,
        message: 'Rezervasyonlar listelendi'
      };
    } catch (error: any) {
      throw new CustomError(error.message || 'Rezervasyonlar yüklenemedi', 500);
    }
  }

  /**
   * Süresi dolmuş rezervasyonları temizle (cron job)
   * Her 5 dakikada çalışır
   */
  static async expireReservations() {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();

      const now = new Date();

      // Süresi dolmuş pending rezervasyonları bul
      const expiredReservations = await PartsReservation.find({
        status: 'pending',
        expiresAt: { $lt: now },
        stockRestored: false
      }).session(session);

      console.log(`🕐 [PARTS EXPIRY] ${expiredReservations.length} süresi dolmuş rezervasyon bulundu`);

      if (expiredReservations.length === 0) {
        await session.commitTransaction();
        session.endSession();
        return { success: true, expired: 0, message: 'Süresi dolmuş rezervasyon yok' };
      }

      // Her rezervasyon için stoku geri ekle
      for (const reservation of expiredReservations) {
        try {
          const part = await PartsInventory.findById(reservation.partId).session(session);
          
          if (!part) {
            console.error(`❌ [PARTS EXPIRY] Parça bulunamadı: ${reservation.partId}`);
            continue;
          }

          // Stoku geri ekle
          await PartsInventory.findByIdAndUpdate(
            reservation.partId,
            {
              $inc: {
                'stock.available': reservation.quantity,
                'stock.reserved': -reservation.quantity
              }
            },
            { session }
          );

          // Rezervasyonu expired olarak işaretle
          await PartsReservation.findByIdAndUpdate(
            reservation._id,
            {
              status: 'expired',
              cancelledBy: 'system',
              cancelledAt: new Date(),
              stockRestored: true
            },
            { session }
          );

          console.log(`✅ [PARTS EXPIRY] Rezervasyon expired: ${reservation._id}, Stok geri eklendi: ${reservation.quantity}`);
        } catch (error: any) {
          console.error(`❌ [PARTS EXPIRY] Rezervasyon işlenirken hata: ${error.message}`);
          // Tek bir rezervasyon hatası tüm işlemi durdurmasın
          continue;
        }
      }

      await session.commitTransaction();
      session.endSession();

      console.log(`✅ [PARTS EXPIRY] ${expiredReservations.length} rezervasyon başarıyla expire edildi`);

      return {
        success: true,
        expired: expiredReservations.length,
        message: `${expiredReservations.length} rezervasyon süresi doldu ve stok geri eklendi`
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ [PARTS EXPIRY] Kron job hatası:', error);
      throw new CustomError(error.message || 'Rezervasyon süresi dolmuş temizlenemedi', 500);
    }
  }
}

