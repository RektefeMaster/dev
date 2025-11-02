import { PartsInventory, IPartsInventory } from '../models/PartsInventory';
import { PartsReservation, IPartsReservation } from '../models/PartsReservation';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import Logger from '../utils/logger';

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
    photos?: string[];
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
      Logger.devOnly('[PARTS CREATE] Creating part:', data.partName);
      
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

      // Stock güncellemesi - özel işlem gerekiyor
      if (updateData.stock) {
        Logger.devOnly('[PARTS UPDATE] Stock güncelleme:', {
          partId,
          currentStock: part.stock,
          updateStock: updateData.stock,
        });
        
        // Mevcut değerleri al ve garanti et
        const currentReserved = Number(part.stock?.reserved || 0);
        const currentQuantity = Number(part.stock?.quantity || 0);
        const currentAvailable = Number(part.stock?.available || 0);
        const currentLowThreshold = Number(part.stock?.lowThreshold || 5);
        
        // NaN kontrolü
        if (isNaN(currentReserved) || currentReserved < 0) {
          part.stock.reserved = 0;
        } else {
          part.stock.reserved = currentReserved;
        }
        
        // Sadece quantity ve lowThreshold güncelle
        if (updateData.stock.quantity !== undefined) {
          const newQuantity = Number(updateData.stock.quantity);
          if (isNaN(newQuantity) || newQuantity < 0) {
            throw new CustomError('Geçersiz stok miktarı', 400);
          }
          part.stock.quantity = newQuantity;
        } else {
          // Quantity gönderilmemişse mevcut değeri koru
          part.stock.quantity = isNaN(currentQuantity) ? 0 : currentQuantity;
        }
        
        if (updateData.stock.lowThreshold !== undefined) {
          const newThreshold = Number(updateData.stock.lowThreshold);
          if (isNaN(newThreshold) || newThreshold < 0) {
            throw new CustomError('Geçersiz düşük stok eşiği', 400);
          }
          part.stock.lowThreshold = newThreshold;
        } else {
          // LowThreshold gönderilmemişse mevcut değeri koru
          part.stock.lowThreshold = isNaN(currentLowThreshold) ? 5 : currentLowThreshold;
        }
        
        // Reserved değerini koru (rezervasyonlar varsa)
        // Zaten yukarıda set ettik ama tekrar garanti ediyoruz
        if (isNaN(currentReserved) || currentReserved < 0) {
          part.stock.reserved = 0;
        } else {
          part.stock.reserved = currentReserved;
        }
        
        // Available'ı hesapla (pre-save middleware de yapacak ama burada da yapıyoruz)
        const calculatedAvailable = part.stock.quantity - part.stock.reserved;
        part.stock.available = Math.max(0, calculatedAvailable);
        
        Logger.devOnly('[PARTS UPDATE] Stock güncellemesi sonrası:', {
          quantity: part.stock.quantity,
          reserved: part.stock.reserved,
          available: part.stock.available,
          lowThreshold: part.stock.lowThreshold,
        });
        
        // Stock objesini updateData'dan çıkar (tekrar atanmasın)
        delete updateData.stock;
      } else {
        // Stock güncellemesi yoksa mevcut stock değerlerinin geçerli olduğundan emin ol
        Logger.devOnly('[PARTS UPDATE] Stock güncellemesi yok, mevcut değerleri kontrol et:', {
          partId,
          currentStock: part.stock,
        });
        
        // Mevcut stock değerlerini garanti et (NaN veya undefined olabilir)
        if (!part.stock) {
          throw new CustomError('Stock bilgisi bulunamadı', 400);
        }
        
        // Tüm stock değerlerini sayıya çevir ve garanti et
        part.stock.quantity = Number(part.stock.quantity || 0);
        part.stock.reserved = Number(part.stock.reserved || 0);
        part.stock.available = Number(part.stock.available || 0);
        part.stock.lowThreshold = Number(part.stock.lowThreshold || 5);
        
        // NaN kontrolü
        if (isNaN(part.stock.quantity)) part.stock.quantity = 0;
        if (isNaN(part.stock.reserved)) part.stock.reserved = 0;
        if (isNaN(part.stock.available)) part.stock.available = 0;
        if (isNaN(part.stock.lowThreshold)) part.stock.lowThreshold = 5;
        
        // Negatif değer kontrolü
        if (part.stock.quantity < 0) part.stock.quantity = 0;
        if (part.stock.reserved < 0) part.stock.reserved = 0;
        if (part.stock.available < 0) part.stock.available = 0;
        if (part.stock.lowThreshold < 0) part.stock.lowThreshold = 5;
        
        // Reserved quantity'den fazla olamaz
        if (part.stock.reserved > part.stock.quantity) {
          part.stock.reserved = part.stock.quantity;
        }
        
        // Available'ı tekrar hesapla
        part.stock.available = Math.max(0, part.stock.quantity - part.stock.reserved);
        
        Logger.devOnly('[PARTS UPDATE] Stock değerleri garanti edildi:', {
          quantity: part.stock.quantity,
          reserved: part.stock.reserved,
          available: part.stock.available,
          lowThreshold: part.stock.lowThreshold,
        });
      }

      // Diğer alanları güncelle (stock hariç)
      Object.keys(updateData).forEach(key => {
        if (key !== 'stock' && updateData[key] !== undefined) {
          // Nested objeler için özel işlem (compatibility, pricing, warranty)
          if (typeof updateData[key] === 'object' && !Array.isArray(updateData[key]) && updateData[key] !== null) {
            // Mongoose subdocument'lar için merge yap
            const currentValue = part.get(key);
            if (currentValue && typeof currentValue === 'object') {
              // Mevcut değerleri koruyarak merge et
              Object.keys(updateData[key]).forEach(subKey => {
                if (updateData[key][subKey] !== undefined) {
                  currentValue[subKey] = updateData[key][subKey];
                }
              });
              part.set(key, currentValue);
            } else {
              // Yeni nested object ise direkt set et
              part.set(key, updateData[key]);
            }
          } else {
            // Normal alanlar için direkt set et
            part.set(key, updateData[key]);
          }
        }
      });

      await part.save();

      return {
        success: true,
        data: part,
        message: 'Parça başarıyla güncellendi'
      };
    } catch (error: any) {
      Logger.error('[PARTS UPDATE ERROR]', error);
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
        // Tüm filtreler şimdilik kaldırıldı - mock datalar için test
        // TODO: Production'da şu kontroller eklenebilir:
        // isActive: true,
        // isPublished: true,
        // 'stock.available': { $gt: 0 },
        // 'moderation.status': 'approved'
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

      const totalWithQuery = await PartsInventory.countDocuments(query);

      // Populate ile getir - hata olursa catch et
      let parts;
      let total = totalWithQuery;
      
      try {
        parts = await PartsInventory.find(query)
          .populate('mechanicId', 'name surname shopName rating ratingCount')
          .lean()
          .sort({ 'stats.views': -1, createdAt: -1 })
          .skip(skip)
          .limit(limit);
      } catch (populateError: any) {
        Logger.error('[PARTS SEARCH] Populate hatası:', populateError.message);
        // Populate hatası varsa, populate olmadan getir
        parts = await PartsInventory.find(query)
          .lean()
          .sort({ 'stats.views': -1, createdAt: -1 })
          .skip(skip)
          .limit(limit);
      }

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
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();

      Logger.devOnly('[PARTS APPROVE] Onaylama başlatılıyor:', {
        reservationId,
        sellerId,
      });

      const reservation = await PartsReservation.findById(reservationId).session(session);
      
      if (!reservation) {
        Logger.error('[PARTS APPROVE] Rezervasyon bulunamadı:', reservationId);
        throw new CustomError('Rezervasyon bulunamadı', 404);
      }

      Logger.devOnly('[PARTS APPROVE] Rezervasyon bulundu:', {
        id: reservation._id.toString(),
        status: reservation.status,
        sellerId: reservation.sellerId.toString(),
        requestedSellerId: sellerId,
        quantity: reservation.quantity,
      });

      if (reservation.sellerId.toString() !== sellerId) {
        Logger.error('[PARTS APPROVE] Yetki hatası:', {
          reservationSellerId: reservation.sellerId.toString(),
          requestedSellerId: sellerId,
        });
        throw new CustomError('Bu rezervasyonu onaylama yetkiniz yok', 403);
      }

      if (reservation.status !== 'pending') {
        Logger.error('[PARTS APPROVE] Geçersiz status:', {
          currentStatus: reservation.status,
          expectedStatus: 'pending',
        });
        throw new CustomError('Sadece bekleyen rezervasyonlar onaylanabilir', 400);
      }

      // Part'ı kontrol et ve stok durumunu güncelle
      const part = await PartsInventory.findById(reservation.partId).session(session);
      if (!part) {
        throw new CustomError('Parça bulunamadı', 404);
      }

      // Stok kontrolü - available yeterli mi?
      if (part.stock.available < reservation.quantity) {
        throw new CustomError('Yetersiz stok. Mevcut stok: ' + part.stock.available, 409);
      }

      // Stok güncelle - available'dan düş, reserved'e ekle
      // NOT: Rezervasyon oluşturulurken zaten reserved artmış ve available azalmış
      // Onaylandığında sadece status değişiyor, stok zaten rezerve edilmiş durumda
      // Ama emin olmak için kontrol edelim
      
      // Eğer stockRestored false ise, stok henüz rezerve edilmemiş demektir
      // Bu durumda rezervasyon oluşturulurken stok güncellemesi yapılmamış olabilir
      // Ancak normal akışta rezervasyon oluşturulurken stok güncellenir
      // Burada sadece kontrol edelim, gerekirse düzeltelim
      
      const expectedReserved = part.stock.reserved || 0;
      const expectedAvailable = part.stock.quantity - expectedReserved;
      
      Logger.devOnly('[PARTS APPROVE] Stok durumu:', {
        partId: part._id.toString(),
        quantity: part.stock.quantity,
        reserved: part.stock.reserved,
        available: part.stock.available,
        reservationQuantity: reservation.quantity,
        expectedAvailable: expectedAvailable,
      });

      // Status'ü güncelle
      reservation.status = 'confirmed';
      await reservation.save({ session });

      await session.commitTransaction();

      Logger.devOnly('[PARTS APPROVE] Rezervasyon onaylandı:', {
        reservationId: reservation._id.toString(),
        newStatus: reservation.status,
      });

      // Güncellenmiş reservation'ı tekrar çek (populate ile)
      const updatedReservation = await PartsReservation.findById(reservationId)
        .populate('buyerId', 'name surname phone')
        .populate('partId', 'partName brand photos')
        .lean();

      return {
        success: true,
        data: updatedReservation,
        message: 'Rezervasyon onaylandı'
      };
    } catch (error: any) {
      await session.abortTransaction();
      Logger.error('[PARTS APPROVE] Onaylama hatası:', error);
      throw error;
    } finally {
      session.endSession();
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
   * Rezervasyon için pazarlık teklifi gönder (Rezervasyon oluşturulduktan sonra)
   */
  static async negotiateReservationPrice(
    reservationId: string,
    userId: string,
    requestedPrice: number,
    message?: string
  ) {
    try {
      const reservation = await PartsReservation.findById(reservationId);
      
      if (!reservation) {
        throw new CustomError('Rezervasyon bulunamadı', 404);
      }

      // Sadece buyer pazarlık yapabilir
      if (reservation.buyerId.toString() !== userId) {
        throw new CustomError('Bu rezervasyon için pazarlık yapma yetkiniz yok', 403);
      }

      // Sadece pending rezervasyonlar için pazarlık yapılabilir
      if (reservation.status !== 'pending') {
        throw new CustomError('Sadece bekleyen rezervasyonlar için pazarlık yapılabilir', 400);
      }

      // Fiyat kontrolü - pazarlık fiyatı toplam fiyattan düşük olmalı
      const totalRequestedPrice = requestedPrice * reservation.quantity;
      if (totalRequestedPrice >= reservation.totalPrice) {
        throw new CustomError('Pazarlık fiyatı toplam fiyattan düşük olmalıdır', 400);
      }
      
      // Birim fiyat kontrolü - birim fiyat da toplam birim fiyattan düşük olmalı
      if (requestedPrice >= reservation.unitPrice) {
        throw new CustomError('Pazarlık birim fiyatı orijinal birim fiyattan düşük olmalıdır', 400);
      }

      // Pazarlık fiyatını kaydet
      reservation.negotiatedPrice = totalRequestedPrice;
      await reservation.save();

      // TODO: Bildirim gönder (usta'ya pazarlık teklifi bildirimi)

      return {
        success: true,
        data: reservation,
        message: 'Pazarlık teklifi gönderildi. Usta değerlendirecek.'
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Usta pazarlık teklifini kabul/reddet
   */
  static async respondToNegotiation(
    reservationId: string,
    sellerId: string,
    action: 'accept' | 'reject',
    counterPrice?: number
  ) {
    try {
      const reservation = await PartsReservation.findById(reservationId);
      
      if (!reservation) {
        throw new CustomError('Rezervasyon bulunamadı', 404);
      }

      if (reservation.sellerId.toString() !== sellerId) {
        throw new CustomError('Bu pazarlık teklifini yanıtlama yetkiniz yok', 403);
      }

      if (!reservation.negotiatedPrice) {
        throw new CustomError('Bu rezervasyon için pazarlık teklifi bulunmuyor', 400);
      }

      if (action === 'accept') {
        // Pazarlık fiyatını onayla - totalPrice'ı negotiatedPrice'a eşitle
        // Status pending kalır, buyer onay bekler
        reservation.totalPrice = reservation.negotiatedPrice;
        await reservation.save();
        
        Logger.devOnly('[PARTS NEGOTIATION] Pazarlık kabul edildi:', {
          reservationId: reservation._id.toString(),
          newTotalPrice: reservation.totalPrice,
          negotiatedPrice: reservation.negotiatedPrice,
        });
        
        return {
          success: true,
          data: reservation,
          message: 'Pazarlık teklifi kabul edildi'
        };
      } else if (action === 'reject' && counterPrice) {
        // Karşı teklif gönder
        // Karşı teklif: buyer'ın pazarlık teklifinden yüksek ama orijinal toplam fiyattan düşük olmalı
        const counterTotalPrice = counterPrice * reservation.quantity;
        
        if (counterTotalPrice >= reservation.totalPrice) {
          throw new CustomError('Karşı teklif toplam fiyattan düşük olmalıdır', 400);
        }
        
        if (reservation.negotiatedPrice && counterTotalPrice <= reservation.negotiatedPrice) {
          throw new CustomError('Karşı teklif, müşterinin pazarlık teklifinden yüksek olmalıdır', 400);
        }
        
        if (counterPrice >= reservation.unitPrice) {
          throw new CustomError('Karşı teklif birim fiyatı orijinal birim fiyattan düşük olmalıdır', 400);
        }
        
        reservation.negotiatedPrice = counterTotalPrice;
        await reservation.save();
        
        Logger.devOnly('[PARTS NEGOTIATION] Karşı teklif gönderildi:', {
          reservationId: reservation._id.toString(),
          originalTotalPrice: reservation.totalPrice,
          buyerNegotiatedPrice: reservation.negotiatedPrice,
          counterTotalPrice: counterTotalPrice,
          counterUnitPrice: counterPrice,
        });
        
        return {
          success: true,
          data: reservation,
          message: 'Karşı teklif gönderildi'
        };
      } else {
        // Reddet - pazarlık fiyatını temizle
        reservation.negotiatedPrice = undefined;
        await reservation.save();
        return {
          success: true,
          data: reservation,
          message: 'Pazarlık teklifi reddedildi'
        };
      }
    } catch (error: any) {
      throw error;
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

      Logger.info(`[PARTS EXPIRY] ${expiredReservations.length} süresi dolmuş rezervasyon bulundu`);

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
            Logger.error(`[PARTS EXPIRY] Parça bulunamadı: ${reservation.partId}`);
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

          Logger.devOnly(`[PARTS EXPIRY] Rezervasyon expired: ${reservation._id}, Stok geri eklendi: ${reservation.quantity}`);
        } catch (error: any) {
          Logger.error(`[PARTS EXPIRY] Rezervasyon işlenirken hata: ${error.message}`);
          // Tek bir rezervasyon hatası tüm işlemi durdurmasın
          continue;
        }
      }

      await session.commitTransaction();
      session.endSession();

      Logger.info(`[PARTS EXPIRY] ${expiredReservations.length} rezervasyon başarıyla expire edildi`);

      return {
        success: true,
        expired: expiredReservations.length,
        message: `${expiredReservations.length} rezervasyon süresi doldu ve stok geri eklendi`
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      Logger.error('[PARTS EXPIRY] Kron job hatası:', error);
      throw new CustomError(error.message || 'Rezervasyon süresi dolmuş temizlenemedi', 500);
    }
  }
}

