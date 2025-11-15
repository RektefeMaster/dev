/**
 * REKTEFE PROJESİ - DATABASE PERFORMANCE OPTIMIZATION
 * 
 * Bu dosya, MongoDB performansını optimize etmek için
 * index'ler, query optimizasyonları ve performans
 * monitoring araçlarını içerir.
 */

import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { Mechanic } from '../models/Mechanic';
import { Vehicle } from '../models/Vehicle';
import { Notification } from '../models/Notification';
import { Message } from '../models/Message';
import Logger from '../utils/logger';

// ===== INDEX CREATION SERVICE =====

export class DatabaseOptimizationService {
  /**
   * Tüm koleksiyonlar için optimize edilmiş index'leri oluşturur
   */
  static async createOptimizedIndexes(): Promise<void> {
    Logger.info('Database optimization başlatılıyor...');

    // Her koleksiyon için index'leri ayrı ayrı oluştur
    // Hata olursa devam et (idempotent operation)
    
    try {
      // ===== USER COLLECTION INDEXES =====
      await this.createIndexesSafe(User.collection, 'users', [
        { key: { email: 1 }, unique: true, background: true },
        { key: { userType: 1 }, background: true },
        { key: { isActive: 1, userType: 1 }, background: true },
        { key: { phone: 1 }, name: 'phone_sparse_1', background: true, sparse: true },
        { key: { createdAt: -1 }, background: true }
      ]);
    } catch (error) {
      Logger.warn('User index hatası (devam ediliyor)');
    }

    try {
      // ===== MECHANIC COLLECTION INDEXES =====
      await this.createIndexesSafe(Mechanic.collection, 'mechanics', [
        { key: { 'location.coordinates': '2dsphere' }, background: true },
        { key: { availability: 1, rating: -1 }, background: true },
        { key: { serviceCategories: 1 }, background: true },
        { key: { experience: -1 }, background: true },
        { key: { 'location.coordinates': '2dsphere', availability: 1 }, name: 'location_availability_idx', background: true },
        { key: { rating: -1 }, background: true }
      ]);
    } catch (error) {
      Logger.warn('Mechanic index hatası (devam ediliyor)');
    }

    try {
      // ===== APPOINTMENT COLLECTION INDEXES =====
      await this.createIndexesSafe(Appointment.collection, 'appointments', [
        { key: { userId: 1 }, background: true },
        { key: { mechanicId: 1 }, background: true },
        { key: { status: 1 }, background: true },
        { key: { appointmentDate: 1 }, background: true },
        { key: { userId: 1, status: 1 }, background: true },
        { key: { mechanicId: 1, status: 1 }, background: true },
        { key: { appointmentDate: 1, status: 1 }, background: true },
        { key: { serviceType: 1 }, background: true },
        { key: { vehicleId: 1 }, name: 'vehicleId_sparse_1', background: true, sparse: true },
        { key: { paymentStatus: 1 }, background: true },
        { key: { createdAt: -1 }, background: true },
        { key: { userId: 1, appointmentDate: -1, status: 1 }, background: true },
        { key: { mechanicId: 1, appointmentDate: -1, status: 1 }, background: true }
      ]);
    } catch (error) {
      Logger.warn('Appointment index hatası (devam ediliyor)');
    }

    try {
      // ===== VEHICLE COLLECTION INDEXES =====
      await this.createIndexesSafe(Vehicle.collection, 'vehicles', [
        { key: { userId: 1 }, background: true },
        {
          key: { userId: 1, plateNumber: 1 },
          name: 'user_plate_unique',
          unique: true,
          background: true,
          collation: { locale: 'tr', strength: 2 }
        },
        { key: { brand: 1, model: 1 }, background: true },
        { key: { year: -1 }, background: true },
        { key: { isActive: 1 }, background: true },
        { key: { userId: 1, isActive: 1 }, background: true }
      ]);
    } catch (error) {
      Logger.warn('Vehicle index hatası (devam ediliyor)');
    }

    try {
      // ===== NOTIFICATION COLLECTION INDEXES =====
      await this.createIndexesSafe(Notification.collection, 'notifications', [
        { key: { recipientId: 1 }, background: true },
        { key: { recipientType: 1 }, background: true },
        { key: { isRead: 1 }, background: true },
        { key: { type: 1 }, background: true },
        { key: { priority: 1 }, background: true },
        { key: { recipientId: 1, isRead: 1 }, background: true },
        { key: { createdAt: -1 }, background: true },
        { key: { recipientId: 1, type: 1, isRead: 1 }, background: true }
      ]);
    } catch (error) {
      Logger.warn('Notification index hatası (devam ediliyor)');
    }

    try {
      // ===== MESSAGE COLLECTION INDEXES =====
      await this.createIndexesSafe(Message.collection, 'messages', [
        { key: { senderId: 1 }, background: true },
        { key: { receiverId: 1 }, background: true },
        { key: { conversationId: 1 }, background: true },
        { key: { isRead: 1 }, background: true },
        { key: { messageType: 1 }, background: true },
        { key: { conversationId: 1, createdAt: -1 }, background: true },
        { key: { senderId: 1, receiverId: 1 }, background: true },
        { key: { createdAt: -1 }, background: true }
      ]);
    } catch (error) {
      Logger.warn('Message index hatası (devam ediliyor)');
    }

    Logger.info('Index oluşturma işlemi tamamlandı');
  }

  /**
   * Index'leri güvenli bir şekilde oluşturur
   * Eğer index zaten varsa ve conflict varsa, hatayı yakalar ve devam eder
   */
  private static async createIndexesSafe(
    collection: any,
    collectionName: string,
    indexes: any[]
  ): Promise<void> {
    for (const indexSpec of indexes) {
      try {
        await collection.createIndex(indexSpec.key, {
          ...indexSpec,
          key: undefined // key'i options'tan çıkar
        });
      } catch (error: any) {
        // Index zaten varsa veya conflict varsa
        if (error.code === 85 || error.code === 86) {
          // 85: IndexOptionsConflict, 86: IndexKeySpecsConflict
          Logger.info(`Index conflict (${collectionName}), eski index drop ediliyor...`);
          try {
            // Eski index'i drop et
            const indexName = indexSpec.name || Object.keys(indexSpec.key).map(k => `${k}_1`).join('_');
            
            // Önce index'in var olup olmadığını kontrol et
            const existingIndexes = await collection.listIndexes().toArray();
            const indexExists = existingIndexes.some(idx => idx.name === indexName);
            
            if (indexExists) {
              await collection.dropIndex(indexName);
              Logger.info(`Eski index drop edildi: ${indexName}`);
            } else {
              Logger.info(`Index bulunamadı, drop edilmedi: ${indexName}`);
            }
            
            // Yeniden oluştur
            await collection.createIndex(indexSpec.key, {
              ...indexSpec,
              key: undefined
            });
            Logger.info(`Yeni index oluşturuldu: ${indexName}`);
          } catch (dropError: any) {
            Logger.warn(`Index drop/recreate hatası (${collectionName}):`, dropError.message);
          }
        } else if (error.code === 11000) {
          // E11000: Duplicate key error - veritabanında duplicate data var
          Logger.warn(`Duplicate key hatası (${collectionName}):`, error.message);
          Logger.warn(`Veritabanında duplicate değerler var, index oluşturulamadı`);
        } else {
          Logger.warn(`Index oluşturma hatası (${collectionName}):`, error.message);
        }
      }
    }
  }

  /**
   * Mevcut index'leri analiz eder ve öneriler sunar
   */
  static async analyzeIndexes(): Promise<any> {
    const collections = ['users', 'mechanics', 'appointments', 'vehicles', 'notifications', 'messages'];
    const analysis = {};

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.indexes();
        
        analysis[collectionName] = {
          indexes: indexes.map(idx => ({
            name: idx.name,
            key: idx.key,
            unique: idx.unique || false,
            sparse: idx.sparse || false
          }))
        };
      } catch (error) {
        Logger.error(`Index analizi hatası (${collectionName}):`, error);
      }
    }

    return analysis;
  }

  /**
   * Kullanılmayan index'leri temizler
   */
  static async cleanupUnusedIndexes(): Promise<void> {
    Logger.info('Kullanılmayan index\'ler temizleniyor...');
    
    // Bu method production'da dikkatli kullanılmalı
    // Şimdilik sadece log yazıyoruz
    Logger.warn('Index temizleme işlemi production\'da manuel olarak yapılmalı');
  }
}

// ===== QUERY OPTIMIZATION SERVICE =====

export class QueryOptimizationService {
  /**
   * Appointment'ları optimize edilmiş şekilde getirir
   */
  static async getOptimizedAppointments(
    userId: string,
    userType: 'driver' | 'mechanic',
    filters: {
      status?: string;
      limit?: number;
      skip?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const {
      status,
      limit = 20,
      skip = 0,
      sortBy = 'appointmentDate',
      sortOrder = 'desc'
    } = filters;

    // Query builder
    const query: any = {};
    
    if (userType === 'driver') {
      query.userId = new mongoose.Types.ObjectId(userId);
    } else {
      query.mechanicId = new mongoose.Types.ObjectId(userId);
    }
    
    if (status) {
      query.status = status;
    }

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Optimize edilmiş query
    const appointments = await Appointment.find(query)
      .populate('userId', 'name surname email phone')
      .populate('mechanicId', 'name surname email phone experience rating')
      .populate('vehicleId', 'brand model year plateNumber')
      .select('-__v') // Version field'ını exclude et
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean() // Plain JavaScript object olarak döndür (memory optimization)
      .exec();

    // Total count (pagination için)
    const totalCount = await Appointment.countDocuments(query);

    return {
      appointments,
      totalCount,
      hasMore: skip + appointments.length < totalCount
    };
  }

  /**
   * Mechanic'leri location'a göre optimize edilmiş şekilde getirir
   */
  static async getNearbyMechanics(
    location: { latitude: number; longitude: number },
    filters: {
      maxDistance?: number; // km
      serviceType?: string;
      minRating?: number;
      limit?: number;
    } = {}
  ) {
    const {
      maxDistance = 10, // 10 km default
      serviceType,
      minRating = 0,
      limit = 20
    } = filters;

    // Geospatial query
    const query: any = {
      availability: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    };

    if (serviceType) {
      query.serviceCategories = serviceType;
    }

    if (minRating > 0) {
      query.rating = { $gte: minRating };
    }

    const mechanics = await Mechanic.find(query)
      .select('-__v -password') // Sensitive data'ları exclude et
      .sort({ rating: -1 })
      .limit(limit)
      .lean()
      .exec();

    return mechanics;
  }

  /**
   * Dashboard istatistiklerini optimize edilmiş şekilde getirir
   */
  static async getDashboardStats(userId: string, userType: 'driver' | 'mechanic') {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    if (userType === 'driver') {
      // Driver dashboard stats
      const [
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        cancelledAppointments,
        totalSpent
      ] = await Promise.all([
        Appointment.countDocuments({ userId: userObjectId }),
        Appointment.countDocuments({ userId: userObjectId, status: 'TAMAMLANDI' }),
        Appointment.countDocuments({ userId: userObjectId, status: { $in: ['TALEP_EDILDI', 'PLANLANDI'] } }),
        Appointment.countDocuments({ userId: userObjectId, status: 'IPTAL_EDILDI' }),
        Appointment.aggregate([
          { $match: { userId: userObjectId, status: 'TAMAMLANDI' } },
          { $group: { _id: null, total: { $sum: '$finalPrice' } } }
        ])
      ]);

      return {
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        cancelledAppointments,
        totalSpent: totalSpent[0]?.total || 0
      };
    } else {
      // Mechanic dashboard stats
      const [
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        cancelledAppointments,
        totalEarnings,
        averageRating
      ] = await Promise.all([
        Appointment.countDocuments({ mechanicId: userObjectId }),
        Appointment.countDocuments({ mechanicId: userObjectId, status: 'TAMAMLANDI' }),
        Appointment.countDocuments({ mechanicId: userObjectId, status: { $in: ['TALEP_EDILDI', 'PLANLANDI'] } }),
        Appointment.countDocuments({ mechanicId: userObjectId, status: 'IPTAL_EDILDI' }),
        Appointment.aggregate([
          { $match: { mechanicId: userObjectId, status: 'TAMAMLANDI' } },
          { $group: { _id: null, total: { $sum: '$finalPrice' } } }
        ]),
        Mechanic.findById(userObjectId).select('rating')
      ]);

      return {
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        cancelledAppointments,
        totalEarnings: totalEarnings[0]?.total || 0,
        averageRating: averageRating?.rating || 0
      };
    }
  }

  /**
   * N+1 problemlerini çözmek için batch loading
   */
  static async batchLoadUsers(userIds: string[]) {
    const users = await User.find({ _id: { $in: userIds } })
      .select('-password -__v')
      .lean();
    
    // Map oluştur (O(1) lookup için)
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });
    
    return userMap;
  }

  /**
   * N+1 problemlerini çözmek için batch loading (mechanics)
   */
  static async batchLoadMechanics(mechanicIds: string[]) {
    const mechanics = await Mechanic.find({ _id: { $in: mechanicIds } })
      .select('-__v')
      .lean();
    
    const mechanicMap = new Map();
    mechanics.forEach(mechanic => {
      mechanicMap.set(mechanic._id.toString(), mechanic);
    });
    
    return mechanicMap;
  }
}

// ===== PERFORMANCE MONITORING SERVICE =====

export class PerformanceMonitoringService {
  private static queryTimes = new Map<string, number[]>();
  private static slowQueries = new Map<string, { count: number; avgTime: number }>();

  /**
   * Query performansını izler
   */
  static async monitorQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFunction();
      const executionTime = Date.now() - startTime;
      
      // Query time'ı kaydet
      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }
      this.queryTimes.get(queryName)!.push(executionTime);
      
      // Slow query detection
      if (executionTime > 1000) { // 1 saniyeden uzun
        const slowQueryData = this.slowQueries.get(queryName) || { count: 0, avgTime: 0 };
        slowQueryData.count++;
        slowQueryData.avgTime = (slowQueryData.avgTime + executionTime) / 2;
        this.slowQueries.set(queryName, slowQueryData);
        
        Logger.warn(`Slow query detected: ${queryName} took ${executionTime}ms`);
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      Logger.error(`Query failed: ${queryName} took ${executionTime}ms`, error);
      throw error;
    }
  }

  /**
   * Performans istatistiklerini getirir
   */
  static getPerformanceStats() {
    const stats: any = {};
    
    for (const [queryName, times] of this.queryTimes.entries()) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      stats[queryName] = {
        count: times.length,
        avgTime: Math.round(avgTime),
        maxTime,
        minTime,
        isSlow: this.slowQueries.has(queryName)
      };
    }
    
    return stats;
  }

  /**
   * Slow query'leri getirir
   */
  static getSlowQueries() {
    return Array.from(this.slowQueries.entries()).map(([name, data]) => ({
      queryName: name,
      ...data
    }));
  }

  /**
   * Performans verilerini temizler
   */
  static clearPerformanceData() {
    this.queryTimes.clear();
    this.slowQueries.clear();
  }
}

// ===== EXPORT ALL =====
export default {
  DatabaseOptimizationService,
  QueryOptimizationService,
  PerformanceMonitoringService
};