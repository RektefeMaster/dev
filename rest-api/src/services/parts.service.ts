import { PartsInventory, IPartsInventory } from '../models/PartsInventory';
import { PartsReservation, IPartsReservation } from '../models/PartsReservation';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import Logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

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
      const part = await PartsInventory.findOne({ _id: partId, mechanicId });
      
      if (!part) {
        throw new CustomError('Parça bulunamadı veya güncelleme yetkiniz yok', 404);
      }

      // Stock güncellemesi - mevcut reserved değerini koru
      if (updateData.stock) {
        const currentReserved = Number(part.stock?.reserved || 0);
        const newQuantity = Number(updateData.stock.quantity);
        const newLowThreshold = Number(updateData.stock.lowThreshold || 5);

        // Validasyon
        if (isNaN(newQuantity) || newQuantity < 0) {
          throw new CustomError('Geçersiz stok miktarı', 400);
        }
        if (isNaN(newLowThreshold) || newLowThreshold < 0) {
          throw new CustomError('Geçersiz eşik değeri', 400);
        }

        // Rezerve edilmiş stoktan fazla miktarda azaltma yapılamaz
        if (newQuantity < currentReserved) {
          Logger.error('[PARTS UPDATE] ❌ Yetersiz stok: quantity < reserved', {
            newQuantity,
            currentReserved,
            partId: part._id.toString(),
            partName: part.partName,
          });
          throw new CustomError(
            `Rezerve edilmiş stok (${currentReserved}) yeni miktardan (${newQuantity}) fazla. Stok güncellemesi yapılamıyor.`,
            409
          );
        }

        // Reserved değerini koru, sadece quantity ve lowThreshold'u güncelle
        part.stock.quantity = newQuantity;
        part.stock.lowThreshold = newLowThreshold;
      
        // Reserved değerini koru (rezervasyonlar için ayrılmış stok)
        part.stock.reserved = currentReserved;
        
        // Available'ı yeniden hesapla
        part.stock.available = Math.max(0, newQuantity - currentReserved);

        Logger.devOnly('[PARTS UPDATE] Stock güncellemesi sonrası:', {
          quantity: part.stock.quantity,
          reserved: part.stock.reserved,
          available: part.stock.available,
          lowThreshold: part.stock.lowThreshold,
        });
        
        // Stock objesini updateData'dan çıkar (tekrar atanmasın)
        delete updateData.stock;
      }

      // Diğer alanları güncelle (stock hariç)
      Object.keys(updateData).forEach(key => {
        if (key !== 'stock' && updateData[key] !== undefined) {
          (part as any)[key] = updateData[key];
      }
      });

      await part.save();

      return {
        success: true,
        data: part,
        message: 'Parça başarıyla güncellendi'
      };
    } catch (error: any) {
      if (error instanceof CustomError) {
      throw error;
    }
      throw new CustomError(error.message || 'Parça güncellenemedi', 500);
    }
  }

  /**
   * Parçaları ara
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
        isActive: true,
        isPublished: true,
        // Stok kontrolü gevşetildi - kullanıcı tüm parçaları görebilmeli
        // 'stock.available': { $gt: 0 },
        // 'moderation.status': 'approved'
      };

      // Text search
      if (filters?.query) {
        query.$or = [
          { partName: { $regex: filters.query, $options: 'i' } },
          { brand: { $regex: filters.query, $options: 'i' } },
          { partNumber: { $regex: filters.query, $options: 'i' } },
          { description: { $regex: filters.query, $options: 'i' } }
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
      cardInfo?: {
        cardNumber: string;
        cardHolderName: string;
        expiryMonth: string;
        expiryYear: string;
        cvv: string;
      };
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

      // Toplam fiyatı hesapla
      const totalPrice = part.pricing.unitPrice * data.quantity;

      // Ödeme işlemleri (escrow hold veya wallet bloke)
      let escrowTransactionId: string | undefined;
      
      // Wallet modellerini import et
      const { Wallet } = require('../models/Wallet');
      const { EscrowService } = require('./escrow.service');

      if (data.payment.method === 'wallet') {
        // Wallet ödeme - bakiye kontrolü ve bloke
        Logger.info('[PARTS CREATE RESERVATION] Wallet ödeme:', {
          buyerId: data.buyerId,
          totalPrice,
        });

        const buyerWallet = await Wallet.findOne({ userId: data.buyerId }).session(session);
        if (!buyerWallet || buyerWallet.balance < totalPrice) {
          throw new CustomError('Cüzdan bakiyeniz yetersiz', 400);
        }

        // Escrow tarzı transaction ID oluştur (wallet için - benzersiz UUID)
        escrowTransactionId = `WALLET_ESCROW_${uuidv4()}`;

        // Bakiyeyi bloke et (kes ve transaction kaydı ekle - status: pending)
        await Wallet.findOneAndUpdate(
          { userId: data.buyerId },
          {
            $inc: { balance: -totalPrice },
            $push: {
              transactions: {
                type: 'debit' as const,
                amount: totalPrice,
                description: `Yedek parça rezervasyonu (Beklemede) - ${part.partName} [${escrowTransactionId}]`,
                date: new Date(),
                status: 'pending' as const, // İptal durumunda iade edilebilir
              }
            }
          },
          { session }
        );

      } else if (data.payment.method === 'card' || data.payment.method === 'transfer') {
        // Card/Transfer ödeme - escrow hold
        if (!data.payment.cardInfo) {
          throw new CustomError('Kart bilgileri zorunludur', 400);
        }

        Logger.info('[PARTS CREATE RESERVATION] Card/Transfer ödeme:', {
          buyerId: data.buyerId,
          totalPrice,
          paymentMethod: data.payment.method,
        });

        const holdResult = await EscrowService.mockHold({
          orderId: `PART_RES_${Date.now()}`,
          amount: totalPrice,
          cardInfo: data.payment.cardInfo
        });

        if (!holdResult.success) {
          throw new CustomError('Ödeme tutulamadı. Lütfen kart bilgilerinizi kontrol edin.', 400);
        }

        escrowTransactionId = holdResult.transactionId;
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
        totalPrice: totalPrice,
        delivery: data.delivery,
        payment: {
          ...data.payment,
          status: 'pending',
          transactionId: escrowTransactionId, // Escrow transaction ID veya wallet escrow ID
        },
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

      // Yetki kontrolü
      if (reservation.sellerId.toString() !== sellerId) {
        Logger.error('[PARTS APPROVE] Yetki hatası:', {
          reservationSellerId: reservation.sellerId.toString(),
          requestedSellerId: sellerId,
        });
        throw new CustomError('Bu rezervasyonu onaylama yetkiniz yok', 403);
      }

      // Status kontrolü
      if (reservation.status !== 'pending') {
        Logger.error('[PARTS APPROVE] Geçersiz status:', {
          currentStatus: reservation.status,
          expectedStatus: 'pending',
        });
        throw new CustomError('Sadece bekleyen rezervasyonlar onaylanabilir', 400);
      }

      // Part'ı kontrol et
      const part = await PartsInventory.findById(reservation.partId).session(session);
      if (!part) {
        throw new CustomError('Parça bulunamadı', 404);
      }

      // Stok kontrolü ve güncelleme
      const currentReserved = Number(part.stock.reserved || 0);
      const currentAvailable = Number(part.stock.available || 0);
      const currentQuantity = Number(part.stock.quantity || 0);
      const reservationQuantity = reservation.quantity;
      
      // Toplam stok = quantity (gerçek toplam stok)
      // available + reserved = quantity olmalı (tutarlılık kontrolü)
      const calculatedAvailable = Math.max(0, currentQuantity - currentReserved);
      const actualAvailable = currentAvailable;
      const totalStock = currentReserved + actualAvailable;
      
      // DETAYLI LOG - Her zaman göster (sorun tespiti için)
      Logger.info('[PARTS APPROVE] Stok durumu detaylı:', {
        reservationId: reservation._id.toString(),
        partId: part._id.toString(),
        partName: part.partName,
        quantity: currentQuantity,
        reserved: currentReserved,
        available: actualAvailable,
        calculatedAvailable,
        totalStock,
        reservationQuantity,
        stockRestored: reservation.stockRestored,
        reservationStatus: reservation.status,
        hasNegotiation: !!reservation.negotiatedPrice,
      });
      
      // Eğer stockRestored false ise, rezervasyon oluşturulurken stok zaten reserved edilmiş
      // Eğer stockRestored true ise, rezervasyon iptal edilmişti ve stok geri eklenmiş
      if (!reservation.stockRestored) {
        // ÖNEMLİ: stockRestored = false ise, rezervasyon oluşturulurken stok zaten ayrılmıştı
        // Bu durumda, quantity veya reserved değerlerine bakmadan rezervasyonu onaylayabiliriz
        // Çünkü stok zaten bu rezervasyon için ayrılmış durumda
        // Middleware reserved'i quantity'ye göre düzeltebilir ama bu rezervasyonun stoğu hala ayrılmış durumda
        
        // Rezervasyon oluşturulurken stok ayrılmıştı - doğrudan onaylanabilir
        Logger.info('[PARTS APPROVE] ✅ Rezervasyon oluşturulurken stok ayrılmıştı (stockRestored=false), onaylanıyor:', {
          reserved: currentReserved,
          reservationQuantity,
          quantity: currentQuantity,
          available: actualAvailable,
          note: 'Stok zaten ayrılmış durumda, middleware reserved değerini düzeltebilir ama rezervasyon geçerli',
        });
        
        // Stok kontrolüne gerek yok, çünkü rezervasyon oluşturulurken stok ayrılmıştı
        // Sadece status'ü güncelle, stok değişikliği yapma
      } else {
        // stockRestored true: Rezervasyon daha önce iptal edilmişti, stok geri eklenmiş
        // Onaylanırken tekrar stok güncellemesi yapmamız gerekiyor
        // Available'dan al, reserved'e ekle
        
        Logger.info('[PARTS APPROVE] 📋 Rezervasyon daha önce iptal edilmiş (stockRestored=true)');
        
        // Quantity kontrolü
        if (currentQuantity === 0 || currentQuantity < reservationQuantity) {
          Logger.error('[PARTS APPROVE] ❌ Parça toplam stok yetersiz veya 0 (stockRestored=true):', {
            quantity: currentQuantity,
            reservationQuantity,
            available: actualAvailable,
            reservationId: reservation._id.toString(),
          });
          throw new CustomError(
            `Yetersiz stok. Parça toplam stok: ${currentQuantity}, Gerekli: ${reservationQuantity}`,
            409
          );
        }
        
        // Available stok kontrolü
        if (actualAvailable < reservationQuantity) {
          Logger.error('[PARTS APPROVE] ❌ Available stok yetersiz (stockRestored=true):', {
            available: actualAvailable,
            requested: reservationQuantity,
            quantity: currentQuantity,
            reservationId: reservation._id.toString(),
          });
          throw new CustomError(
            `Yetersiz stok. Müsait stok: ${actualAvailable}, Gerekli: ${reservationQuantity}`,
            409
          );
        }
        
        // Stok güncelle - available'dan düş, reserved'e ekle
        const newAvailable = actualAvailable - reservationQuantity;
        const newReserved = currentReserved + reservationQuantity;
        
        // Quantity ile tutarlılığı kontrol et
        if (newReserved + newAvailable > currentQuantity) {
          Logger.error('[PARTS APPROVE] ⚠️ Stok tutarsızlığı (stockRestored=true) - quantity aşılıyor, düzeltiliyor');
          part.stock.reserved = Math.min(newReserved, currentQuantity);
          part.stock.available = Math.max(0, currentQuantity - part.stock.reserved);
        } else {
          part.stock.available = newAvailable;
          part.stock.reserved = newReserved;
        }
        
        reservation.stockRestored = false;
        await part.save({ session });
        
        Logger.info('[PARTS APPROVE] ✅ Stok güncellendi (stockRestored=true):', {
          newAvailable: part.stock.available,
          newReserved: part.stock.reserved,
        });
      }

      // Status'ü güncelle
      reservation.status = 'confirmed';
      await reservation.save({ session });

      await session.commitTransaction();

      Logger.devOnly('[PARTS APPROVE] Rezervasyon onaylandı:', {
        reservationId: reservation._id.toString(),
        newStatus: reservation.status,
      });

      // Güncellenmiş reservation'ı populate ile getir
      const updatedReservation = await PartsReservation.findById(reservationId)
        .populate('buyerId', 'name surname phone avatar')
        .populate('partId', 'partName brand partNumber condition photos')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .lean();
      
      // Status'ün confirmed olduğundan kesinlikle emin ol
      if (updatedReservation) {
        updatedReservation.status = 'confirmed';
      }

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

      // Yetki kontrolü
      if (reservation.buyerId.toString() !== userId && reservation.sellerId.toString() !== userId) {
        throw new CustomError('Bu rezervasyonu iptal etme yetkiniz yok', 403);
      }

      // Status kontrolü
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

      // Ödeme iadesi (eğer ödeme yapıldıysa)
      const { Wallet } = require('../models/Wallet');
      const { EscrowService } = require('./escrow.service');

      if (reservation.payment.transactionId && reservation.payment.status === 'pending') {
        const paymentMethod = reservation.payment.method;
        // İade için: Orijinal bloke edilen tutarı iade et
        // originalPrice varsa (pazarlık kabul edilmişse) onu kullan, yoksa totalPrice (orijinal fiyat)
        const refundAmount = reservation.originalPrice || reservation.totalPrice;

        if (paymentMethod === 'wallet') {
          // Wallet iadesi - bekleyen transaction'ı iptal et ve bakiyeyi geri ekle
          Logger.info('[PARTS CANCEL] Wallet iadesi yapılıyor:', {
            reservationId: reservation._id.toString(),
            transactionId: reservation.payment.transactionId,
            amount: refundAmount,
          });

          // Bekleyen transaction'ı bul ve status'ünü 'cancelled' yap
          const buyerWallet = await Wallet.findOne({ userId: reservation.buyerId }).session(session);
          if (buyerWallet) {
            // Rezervasyonda transactionId varsa ona göre bul, yoksa amount ile bul
            let pendingTransaction;
            if (reservation.payment.transactionId) {
              // TransactionId ile eşleştirme (daha güvenli)
              pendingTransaction = buyerWallet.transactions.find(
                (t: any) => t.status === 'pending' && 
                           t.description && 
                           t.description.includes(reservation.payment.transactionId!)
              );
            }
            
            // TransactionId ile bulunamadıysa amount ile bul (backward compatibility)
            // Orijinal tutarı bulmak için originalPrice varsa onu kullan
            if (!pendingTransaction) {
              const searchAmount = reservation.originalPrice || refundAmount;
              pendingTransaction = buyerWallet.transactions.find(
                (t: any) => t.status === 'pending' && t.amount === searchAmount
              );
            }

            if (pendingTransaction) {
              // Bakiye geri ekle
              await Wallet.findOneAndUpdate(
                { userId: reservation.buyerId },
                {
                  $inc: { balance: refundAmount },
                  $set: {
                    'transactions.$[elem].status': 'cancelled'
                  }
                },
                {
                  session,
                  arrayFilters: [{ 'elem._id': pendingTransaction._id }]
                }
              );
            } else {
              // Transaction bulunamadıysa direkt bakiye ekle
              await Wallet.findOneAndUpdate(
                { userId: reservation.buyerId },
                {
                  $inc: { balance: refundAmount },
                  $push: {
                    transactions: {
                      type: 'credit' as const,
                      amount: refundAmount,
                      description: `Yedek parça rezervasyon iadesi - ${reservation.partInfo.partName}`,
                      date: new Date(),
                      status: 'completed' as const,
                    }
                  }
                },
                { session }
              );
            }
          }

          reservation.payment.status = 'refunded';

        } else if (paymentMethod === 'card' || paymentMethod === 'transfer') {
          // Escrow iadesi
          Logger.info('[PARTS CANCEL] Escrow iadesi yapılıyor:', {
            reservationId: reservation._id.toString(),
            transactionId: reservation.payment.transactionId,
            amount: refundAmount,
          });

          const refundResult = await EscrowService.mockRefund({
            transactionId: reservation.payment.transactionId,
            amount: refundAmount
          });

          if (refundResult.success) {
            reservation.payment.status = 'refunded';
          } else {
            Logger.error('[PARTS CANCEL] Escrow iadesi başarısız:', refundResult);
            // İade başarısız olursa transaction'ı abort et ve hata fırlat
            throw new CustomError(
              'Ödeme iadesi yapılamadı. Lütfen daha sonra tekrar deneyin veya destek ekibiyle iletişime geçin.',
              500
            );
          }
        }
      }

      // Rezervasyonu iptal et
      reservation.status = 'cancelled';
      reservation.cancellationReason = reason;
      reservation.cancelledBy = cancelledBy as any;
      reservation.cancelledAt = new Date();

      await reservation.save({ session });

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
        .populate('partId', 'partName brand partNumber condition photos')
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

      // Yetki kontrolü
      if (reservation.sellerId.toString() !== sellerId) {
        throw new CustomError('Bu pazarlık teklifini yanıtlama yetkiniz yok', 403);
      }

      // Pazarlık teklifi kontrolü
      if (!reservation.negotiatedPrice) {
        throw new CustomError('Bu rezervasyon için pazarlık teklifi bulunmuyor', 400);
      }

      // Status kontrolü
      if (reservation.status !== 'pending') {
        throw new CustomError('Sadece bekleyen rezervasyonlar için pazarlık yanıtı verilebilir', 400);
      }

      if (action === 'accept') {
        // Pazarlık kabul edildi - stok kontrolü yap
        // NOT: Rezervasyon zaten oluşturulmuş ve stok zaten reserved edilmiş olmalı
        // (stockRestored = false ise)
        const part = await PartsInventory.findById(reservation.partId);
        if (!part) {
          throw new CustomError('Parça bulunamadı', 404);
        }

        const currentReserved = Number(part.stock.reserved || 0);
        const currentQuantity = Number(part.stock.quantity || 0);
        const reservationQuantity = reservation.quantity;

        // ÖNEMLİ: Rezervasyon oluşturulurken stok zaten reserved edilmiş
        // Eğer stockRestored = false ise, stok zaten bu rezervasyon için ayrılmış
        // Bu durumda, quantity veya reserved değerlerine bakmadan pazarlığı kabul edebiliriz
        // Çünkü stok zaten bu rezervasyon için ayrılmış durumda
        // Middleware reserved'i quantity'ye göre düzeltebilir ama bu rezervasyonun stoğu hala ayrılmış durumda
        if (!reservation.stockRestored) {
          // Normal durum: Stok zaten reserved edilmiş
          // Stok kontrolüne gerek yok, çünkü rezervasyon oluşturulurken stok ayrılmıştı
          Logger.info('[PARTS NEGOTIATION] ✅ Rezervasyon oluşturulurken stok ayrılmıştı (stockRestored=false), pazarlık kabul ediliyor:', {
            reserved: currentReserved,
            reservationQuantity,
            quantity: currentQuantity,
            note: 'Stok zaten ayrılmış durumda, middleware reserved değerini düzeltebilir ama rezervasyon geçerli',
          });
          // Pazarlık kabul edilebilir - stok kontrolüne gerek yok
        } else {
          // stockRestored = true: Rezervasyon daha önce iptal edilmişti
          // Bu durumda quantity kontrolü yapalım
          if (currentQuantity === 0 || currentQuantity < reservationQuantity) {
            Logger.error('[PARTS NEGOTIATION] Stok yetersiz - pazarlık kabul edilemiyor (stockRestored=true):', {
              quantity: currentQuantity,
              reservationQuantity,
              reserved: currentReserved,
              reservationId: reservation._id.toString(),
            });
            throw new CustomError(
              `Pazarlık teklifi kabul edilemiyor: Yetersiz stok. Mevcut stok: ${currentQuantity}`,
              409
            );
          }
        }

        // Pazarlık kabul edildi - orijinal fiyatı sakla, totalPrice'ı güncelle
        if (!reservation.originalPrice) {
          reservation.originalPrice = reservation.totalPrice; // Orijinal fiyatı sakla (ödeme işlemleri için)
        }
        reservation.totalPrice = reservation.negotiatedPrice;
        reservation.negotiatedPrice = undefined;
        await reservation.save();
        
        Logger.devOnly('[PARTS NEGOTIATION] Pazarlık kabul edildi:', {
          reservationId: reservation._id.toString(),
          newTotalPrice: reservation.totalPrice,
        });
        
        // Güncellenmiş rezervasyonu populate ile getir
        const updatedReservation = await PartsReservation.findById(reservationId)
          .populate('buyerId', 'name surname phone avatar')
          .populate('partId', 'partName brand partNumber condition photos')
          .populate('vehicleId', 'brand modelName year plateNumber')
          .lean();
        
        // Status ve negotiatedPrice'ı kesin olarak ayarla
        if (updatedReservation) {
          updatedReservation.status = 'pending' as any;
          updatedReservation.negotiatedPrice = undefined as any;
        }
        
        return {
          success: true,
          data: updatedReservation,
          message: 'Pazarlık teklifi kabul edildi'
        };
      } else if (action === 'reject' && counterPrice) {
        // Karşı teklif gönder
        const counterTotalPrice = counterPrice * reservation.quantity;
        
        // Validasyonlar
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
          counterTotalPrice: counterTotalPrice,
        });
        
        // Güncellenmiş rezervasyonu populate ile getir
        const updatedReservation = await PartsReservation.findById(reservationId)
          .populate('buyerId', 'name surname phone avatar')
          .populate('partId', 'partName brand partNumber condition photos')
          .populate('vehicleId', 'brand modelName year plateNumber')
          .lean();
        
        return {
          success: true,
          data: updatedReservation,
          message: 'Karşı teklif gönderildi'
        };
      } else {
        // Reddet - pazarlık fiyatını temizle
        reservation.negotiatedPrice = undefined;
        await reservation.save();
        
        // Güncellenmiş rezervasyonu populate ile getir
        const updatedReservation = await PartsReservation.findById(reservationId)
          .populate('buyerId', 'name surname phone avatar')
          .populate('partId', 'partName brand partNumber condition photos')
          .populate('vehicleId', 'brand modelName year plateNumber')
          .lean();
        
        return {
          success: true,
          data: updatedReservation,
          message: 'Pazarlık teklifi reddedildi'
        };
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Usta teslim etti olarak işaretle
   */
  static async markAsDelivered(reservationId: string, sellerId: string) {
    try {
      const reservation = await PartsReservation.findById(reservationId);
      
      if (!reservation) {
        throw new CustomError('Rezervasyon bulunamadı', 404);
      }

      // Yetki kontrolü
      if (reservation.sellerId.toString() !== sellerId) {
        throw new CustomError('Bu rezervasyonu teslim etme yetkiniz yok', 403);
      }

      // Status kontrolü - sadece confirmed rezervasyonlar teslim edilebilir
      if (reservation.status !== 'confirmed') {
        throw new CustomError('Sadece onaylanmış rezervasyonlar teslim edilebilir', 400);
      }

      // Teslim et
      reservation.status = 'delivered';
      reservation.deliveredAt = new Date();
      await reservation.save();

      // Güncellenmiş rezervasyonu populate ile getir
      const updatedReservation = await PartsReservation.findById(reservationId)
        .populate('buyerId', 'name surname phone avatar')
        .populate('partId', 'partName brand partNumber condition photos')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .lean();

      return {
        success: true,
        data: updatedReservation,
        message: 'Rezervasyon teslim edildi olarak işaretlendi'
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Şoför teslim aldığını onayla ve ödemeyi tamamla
   */
  static async confirmDelivery(
    reservationId: string,
    buyerId: string,
    paymentData?: {
      paymentMethod?: 'cash' | 'wallet' | 'card';
      cardInfo?: {
        cardNumber: string;
        cardHolderName: string;
        expiryMonth: string;
        expiryYear: string;
        cvv: string;
      };
    }
  ) {
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();

      const reservation = await PartsReservation.findById(reservationId).session(session);
      
      if (!reservation) {
        throw new CustomError('Rezervasyon bulunamadı', 404);
      }

      // Yetki kontrolü
      if (reservation.buyerId.toString() !== buyerId) {
        throw new CustomError('Bu rezervasyonu onaylama yetkiniz yok', 403);
      }

      // Status kontrolü - sadece delivered rezervasyonlar onaylanabilir
      if (reservation.status !== 'delivered') {
        throw new CustomError('Sadece teslim edilmiş rezervasyonlar onaylanabilir', 400);
      }

      // Ödeme bilgilerini belirle
      // NOT: Rezervasyon oluşturulurken seçilen ödeme yöntemi değiştirilemez
      // (transactionId zaten oluşturulmuş olabilir)
      const finalPaymentMethod = reservation.payment.method;
      const totalPrice = reservation.negotiatedPrice || reservation.totalPrice;
      
      // Eğer farklı bir payment method gönderilmişse uyarı ver (ama işlemi devam ettir)
      if (paymentData?.paymentMethod && paymentData.paymentMethod !== finalPaymentMethod) {
        Logger.warn('[PARTS CONFIRM DELIVERY] Payment method değiştirilmeye çalışıldı:', {
          reservationId: reservation._id.toString(),
          originalMethod: finalPaymentMethod,
          requestedMethod: paymentData.paymentMethod,
        });
        // İşlemi orijinal method ile devam ettir
      }

      // Wallet modellerini import et
      const { Wallet } = require('../models/Wallet');
      const { EscrowService } = require('./escrow.service');
      const { TefePointService } = require('./tefePoint.service');

      // Ödeme işlemi
      if (finalPaymentMethod === 'cash') {
        // Cash ödeme - fiziksel nakit ödeme
        // Şoförden balance düşülmez, sadece transaction kaydı tutulur
        // Usta'ya kazanç eklenir
        Logger.info('[PARTS CONFIRM DELIVERY] Cash ödeme yapılıyor:', {
          reservationId: reservation._id.toString(),
          totalPrice,
        });

        // Şoför wallet'ına sadece transaction kaydı ekle (balance değişmez)
        const buyerWallet = await Wallet.findOne({ userId: reservation.buyerId }).session(session);
        if (!buyerWallet) {
          // Wallet oluştur
          const newBuyerWallet = new Wallet({
            userId: reservation.buyerId,
            balance: 0,
            transactions: []
          });
          await newBuyerWallet.save({ session });
        }

        await Wallet.findOneAndUpdate(
          { userId: reservation.buyerId },
          {
            $push: {
              transactions: {
                type: 'debit' as const,
                amount: totalPrice,
                description: `Yedek parça satın alma (Nakit) - ${reservation.partInfo.partName}`,
                date: new Date(),
                status: 'completed' as const,
              }
            }
          },
          { session, upsert: true }
        );

        // Usta wallet'ına kazanç ekle (credit)
        const sellerWallet = await Wallet.findOne({ userId: reservation.sellerId }).session(session);
        if (!sellerWallet) {
          const newSellerWallet = new Wallet({
            userId: reservation.sellerId,
            balance: 0,
            transactions: []
          });
          await newSellerWallet.save({ session });
        }

        await Wallet.findOneAndUpdate(
          { userId: reservation.sellerId },
          {
            $inc: { balance: totalPrice },
            $push: {
              transactions: {
                type: 'credit' as const,
                amount: totalPrice,
                description: `Yedek parça satışı (Nakit) - ${reservation.partInfo.partName}`,
                date: new Date(),
                status: 'completed' as const,
              }
            }
          },
          { session, upsert: true }
        );

        // Payment status güncelle
        reservation.payment.status = 'completed';
        reservation.payment.paidAt = new Date();

      } else if (finalPaymentMethod === 'wallet') {
        // Wallet ödeme - rezervasyon oluşturulurken zaten bloke edilmiş
        Logger.info('[PARTS CONFIRM DELIVERY] Wallet ödeme tamamlanıyor:', {
          reservationId: reservation._id.toString(),
          totalPrice,
          transactionId: reservation.payment.transactionId,
        });

        // Bekleyen transaction'ı bul ve status'ünü 'completed' yap
        const buyerWallet = await Wallet.findOne({ userId: reservation.buyerId }).session(session);
        if (!buyerWallet) {
          throw new CustomError('Cüzdan bulunamadı', 400);
        }

        // Pazarlık sonucu fiyat değişmişse farkı iade et
        // originalPrice varsa (pazarlık yapıldıysa) onu kullan, yoksa totalPrice'ı kullan
        const originalPrice = reservation.originalPrice || reservation.totalPrice; // Rezervasyon oluşturulurken bloke edilen tutar
        const priceDifference = originalPrice - totalPrice; // Eğer pazarlık kabul edildiyse fark pozitif olur
        
        if (priceDifference > 0) {
          Logger.info('[PARTS CONFIRM DELIVERY] Pazarlık sonucu fiyat düştü, fark iade ediliyor:', {
            reservationId: reservation._id.toString(),
            originalPrice,
            totalPrice,
            priceDifference,
          });
          
          // Farkı iade et (pending transaction'ı bulmadan önce)
          await Wallet.findOneAndUpdate(
            { userId: reservation.buyerId },
            {
              $inc: { balance: priceDifference },
              $push: {
                transactions: {
                  type: 'credit' as const,
                  amount: priceDifference,
                  description: `Yedek parça pazarlık farkı iadesi - ${reservation.partInfo.partName}`,
                  date: new Date(),
                  status: 'completed' as const,
                }
              }
            },
            { session }
          );
        }

        // Rezervasyonda transactionId varsa ona göre bul, yoksa amount ile bul
        let pendingTransaction;
        if (reservation.payment.transactionId) {
          // TransactionId ile eşleştirme (daha güvenli - UUID kontrolü)
          // Wallet transaction description'ında [WALLET_ESCROW_UUID] formatında saklanıyor
          const escrowId = reservation.payment.transactionId;
          pendingTransaction = buyerWallet.transactions.find(
            (t: any) => t.status === 'pending' && 
                       t.description && 
                       t.description.includes(escrowId)
          );
        }
        
        // TransactionId ile bulunamadıysa amount ile bul (backward compatibility)
        // Ama bu durumda birden fazla aynı miktarda pending transaction olabilir - risk!
        if (!pendingTransaction) {
          Logger.warn('[PARTS CONFIRM DELIVERY] TransactionId ile bulunamadı, amount ile aranıyor:', {
            reservationId: reservation._id.toString(),
            transactionId: reservation.payment.transactionId,
            totalPrice,
          });
          // En son pending transaction'ı al (riski minimize etmek için)
          const pendingTransactions = buyerWallet.transactions
            .filter((t: any) => t.status === 'pending' && t.amount === totalPrice)
            .sort((a: any, b: any) => b.date.getTime() - a.date.getTime()); // En yeni olanı al
          pendingTransaction = pendingTransactions[0];
        }

        if (pendingTransaction) {
          // Transaction status'ünü completed yap
          await Wallet.findOneAndUpdate(
            { userId: reservation.buyerId },
            {
              $set: {
                'transactions.$[elem].status': 'completed',
                'transactions.$[elem].description': `Yedek parça satın alma - ${reservation.partInfo.partName}`
              }
            },
            {
              session,
              arrayFilters: [{ 'elem._id': pendingTransaction._id }]
            }
          );
        } else {
          // Eğer pending transaction bulunamazsa (garanti için) direkt kes
          Logger.warn('[PARTS CONFIRM DELIVERY] Pending transaction bulunamadı, direkt kesiliyor');
          await Wallet.findOneAndUpdate(
            { userId: reservation.buyerId },
            {
              $inc: { balance: -totalPrice },
              $push: {
                transactions: {
                  type: 'debit' as const,
                  amount: totalPrice,
                  description: `Yedek parça satın alma - ${reservation.partInfo.partName}`,
                  date: new Date(),
                  status: 'completed' as const,
                }
              }
            },
            { session }
          );
        }

        // Usta wallet'ına ekle
        await Wallet.findOneAndUpdate(
          { userId: reservation.sellerId },
          {
            $inc: { balance: totalPrice },
            $push: {
              transactions: {
                type: 'credit' as const,
                amount: totalPrice,
                description: `Yedek parça satışı - ${reservation.partInfo.partName}`,
                date: new Date(),
                status: 'completed' as const,
              }
            }
          },
          { session, upsert: true }
        );

        // Payment status güncelle
        reservation.payment.status = 'completed';
        reservation.payment.paidAt = new Date();

      } else if (finalPaymentMethod === 'card' || finalPaymentMethod === 'transfer') {
        // Card/Transfer ödeme - rezervasyon oluşturulurken zaten escrow hold yapılmış
        Logger.info('[PARTS CONFIRM DELIVERY] Card/Transfer ödeme tamamlanıyor:', {
          reservationId: reservation._id.toString(),
          totalPrice,
          transactionId: reservation.payment.transactionId,
        });

        // Rezervasyonda escrow transactionId olmalı (rezervasyon oluşturulurken hold yapılmış)
        if (!reservation.payment.transactionId) {
          throw new CustomError('Ödeme bilgisi bulunamadı. Lütfen rezervasyonu kontrol edin.', 400);
        }

        // Pazarlık sonucu fiyat değişmişse farkı iade et
        // originalPrice varsa (pazarlık yapıldıysa) onu kullan, yoksa totalPrice'ı kullan
        const originalPrice = reservation.originalPrice || reservation.totalPrice; // Rezervasyon oluşturulurken escrow hold yapılan tutar
        const priceDifference = originalPrice - totalPrice; // Eğer pazarlık kabul edildiyse fark pozitif olur
        
        if (priceDifference > 0) {
          Logger.info('[PARTS CONFIRM DELIVERY] Pazarlık sonucu fiyat düştü, escrow fark iadesi yapılıyor:', {
            reservationId: reservation._id.toString(),
            originalPrice,
            totalPrice,
            priceDifference,
          });
          
          // Escrow'dan farkı iade et
          const refundResult = await EscrowService.mockRefund({
            transactionId: reservation.payment.transactionId,
            amount: priceDifference,
            reason: 'Pazarlık sonucu fiyat farkı iadesi'
          });
          
          if (!refundResult.success) {
            Logger.warn('[PARTS CONFIRM DELIVERY] Escrow fark iadesi başarısız, devam ediliyor:', refundResult);
            // İade başarısız olsa bile işleme devam et (ana ödeme capture edilecek)
          }
        }

        // Mevcut escrow'dan capture yap (yeni tutarla)
        const captureResult = await EscrowService.mockCapture({
          transactionId: reservation.payment.transactionId,
          amount: totalPrice
        });

        if (!captureResult.success) {
          throw new CustomError('Ödeme alınamadı. Lütfen tekrar deneyin veya rezervasyonu iptal edin.', 400);
        }

        // Usta wallet'ına ekle
        await Wallet.findOneAndUpdate(
          { userId: reservation.sellerId },
          {
            $inc: { balance: totalPrice },
            $push: {
              transactions: {
                type: 'credit' as const,
                amount: totalPrice,
                description: `Yedek parça satışı - ${reservation.partInfo.partName}`,
                date: new Date(),
                status: 'completed' as const,
              }
            }
          },
          { session, upsert: true }
        );

        // Payment status güncelle
        reservation.payment.status = 'completed';
        reservation.payment.paidAt = new Date();
      }

      // Stok güncelleme - quantity ve reserved'den düş
      await PartsInventory.findByIdAndUpdate(
        reservation.partId,
        {
          $inc: {
            'stock.quantity': -reservation.quantity,
            'stock.reserved': -reservation.quantity
          }
        },
        { session }
      );

      // Rezervasyonu completed yap
      reservation.status = 'completed';
      reservation.receivedBy = buyerId;
      await reservation.save({ session });

      await session.commitTransaction();

      // TefePuan - şoför harcama yaptığı için puan kazanır
      try {
        await TefePointService.processPaymentTefePoints({
          userId: reservation.buyerId.toString(),
          amount: totalPrice,
          paymentType: 'other',
          serviceCategory: 'parts',
          description: `Yedek parça satın alma - ${reservation.partInfo.partName}`,
          serviceId: reservation._id.toString()
        });
      } catch (tefeError) {
        // TefePuan hatası ödemeyi engellemesin
        Logger.error('[PARTS CONFIRM DELIVERY] TefePuan hatası:', tefeError);
      }

      // Güncellenmiş rezervasyonu populate ile getir
      const updatedReservation = await PartsReservation.findById(reservationId)
        .populate('buyerId', 'name surname phone avatar')
        .populate('partId', 'partName brand partNumber condition photos')
        .populate('vehicleId', 'brand modelName year plateNumber')
        .lean();

      return {
        success: true,
        data: updatedReservation,
        message: 'Teslim onaylandı ve ödeme tamamlandı'
      };
    } catch (error: any) {
      await session.abortTransaction();
      Logger.error('[PARTS CONFIRM DELIVERY] Hata:', error);
      throw error;
    } finally {
      session.endSession();
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

      // Wallet ve Escrow servislerini import et
      const { Wallet } = require('../models/Wallet');
      const { EscrowService } = require('./escrow.service');

      // Her birini işle
      for (const reservation of expiredReservations) {
        // Ödeme iadesi yap (eğer ödeme yapılmışsa)
        if (reservation.payment.transactionId && reservation.payment.status === 'pending') {
          const paymentMethod = reservation.payment.method;
          // İade için: Orijinal bloke edilen tutarı iade et
          // originalPrice varsa (pazarlık kabul edilmişse) onu kullan, yoksa totalPrice (orijinal fiyat)
          const refundAmount = reservation.originalPrice || reservation.totalPrice;

          if (paymentMethod === 'wallet') {
            // Wallet iadesi
            Logger.info('[PARTS EXPIRY] Wallet iadesi yapılıyor:', {
              reservationId: reservation._id.toString(),
              transactionId: reservation.payment.transactionId,
              amount: refundAmount,
            });

            const buyerWallet = await Wallet.findOne({ userId: reservation.buyerId }).session(session);
            if (buyerWallet) {
              // TransactionId ile eşleştirme
              let pendingTransaction;
              if (reservation.payment.transactionId) {
                pendingTransaction = buyerWallet.transactions.find(
                  (t: any) => t.status === 'pending' && 
                             t.description && 
                             t.description.includes(reservation.payment.transactionId!)
                );
              }
              
              if (!pendingTransaction) {
                // Orijinal tutarı bulmak için originalPrice varsa onu kullan, yoksa refundAmount
                const searchAmount = reservation.originalPrice || refundAmount;
                pendingTransaction = buyerWallet.transactions.find(
                  (t: any) => t.status === 'pending' && t.amount === searchAmount
                );
              }

              if (pendingTransaction) {
                await Wallet.findOneAndUpdate(
                  { userId: reservation.buyerId },
                  {
                    $inc: { balance: refundAmount },
                    $set: {
                      'transactions.$[elem].status': 'cancelled'
                    }
                  },
                  {
                    session,
                    arrayFilters: [{ 'elem._id': pendingTransaction._id }]
                  }
                );
              } else {
                // Transaction bulunamadıysa direkt bakiye ekle
                await Wallet.findOneAndUpdate(
                  { userId: reservation.buyerId },
                  {
                    $inc: { balance: refundAmount },
                    $push: {
                      transactions: {
                        type: 'credit' as const,
                        amount: refundAmount,
                        description: `Yedek parça rezervasyon iadesi (Süresi doldu) - ${reservation.partInfo.partName}`,
                        date: new Date(),
                        status: 'completed' as const,
                      }
                    }
                  },
                  { session }
                );
              }
            }

            reservation.payment.status = 'refunded';

          } else if (paymentMethod === 'card' || paymentMethod === 'transfer') {
            // Escrow iadesi
            Logger.info('[PARTS EXPIRY] Escrow iadesi yapılıyor:', {
              reservationId: reservation._id.toString(),
              transactionId: reservation.payment.transactionId,
              amount: refundAmount,
            });

            const refundResult = await EscrowService.mockRefund({
              transactionId: reservation.payment.transactionId,
              amount: refundAmount,
              reason: 'Rezervasyon süresi doldu'
            });

            if (refundResult.success) {
              reservation.payment.status = 'refunded';
            } else {
              Logger.error('[PARTS EXPIRY] Escrow iadesi başarısız:', {
                reservationId: reservation._id.toString(),
                refundResult
              });
              // İade başarısız olsa bile stoku geri ekle ve rezervasyonu expire et
            }
          }
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

        // Rezervasyonu expire et
        reservation.status = 'expired';
        reservation.stockRestored = true;
        await reservation.save({ session });
      }

      await session.commitTransaction();

      if (expiredReservations.length > 0) {
        Logger.devOnly(`[PARTS EXPIRY] ${expiredReservations.length} rezervasyon süresi doldu ve iptal edildi`);
      }

      return {
        success: true,
        expiredCount: expiredReservations.length
      };
    } catch (error: any) {
      await session.abortTransaction();
      Logger.error('[PARTS EXPIRY] Hata:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Ustanın parçalarını getir
   */
  static async getMechanicParts(mechanicId: string) {
    try {
      const parts = await PartsInventory.find({ mechanicId })
        .populate('mechanicId', 'name surname shopName')
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
   * Parça detayı getir
   */
  static async getPartDetail(partId: string) {
    try {
      const part = await PartsInventory.findById(partId)
        .populate('mechanicId', 'name surname shopName rating ratingCount phone')
        .lean();

      if (!part) {
        throw new CustomError('Parça bulunamadı', 404);
      }

      // View sayısını artır
      await PartsInventory.findByIdAndUpdate(partId, {
        $inc: { 'stats.views': 1 }
      });

      return {
        success: true,
        data: part,
        message: 'Parça detayı'
      };
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(error.message || 'Parça detayı yüklenemedi', 500);
    }
  }

  /**
   * Parça sil (pasifleştir)
   */
  static async deletePart(partId: string, mechanicId: string) {
    try {
      const part = await PartsInventory.findOne({ _id: partId, mechanicId });
      
      if (!part) {
        throw new CustomError('Parça bulunamadı veya silme yetkiniz yok', 404);
      }

      // Soft delete - sadece pasifleştir
      part.isActive = false;
      part.isPublished = false;
      await part.save();

      return {
        success: true,
        message: 'Parça pasifleştirildi'
      };
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(error.message || 'Parça silinemedi', 500);
    }
  }
}
