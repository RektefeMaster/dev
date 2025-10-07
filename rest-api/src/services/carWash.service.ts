import { CarWashPackage, ICarWashPackage } from '../models/CarWashPackage';
import { CarWashJob, ICarWashJob } from '../models/CarWashJob';
import { CarWashLoyaltyProgram, ICarWashLoyaltyProgram } from '../models/CarWashLoyaltyProgram';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

export class CarWashService {
  /**
   * Yeni yıkama paketi oluştur
   */
  static async createPackage(data: {
    mechanicId: string;
    name: string;
    description: string;
    packageType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom';
    services: Array<{
      serviceName: string;
      serviceType: 'exterior' | 'interior' | 'engine' | 'special';
      duration: number;
      price: number;
      description: string;
      isOptional: boolean;
      order: number;
    }>;
    basePrice: number;
    vehicleTypeMultipliers: {
      car: number;
      suv: number;
      truck: number;
      motorcycle: number;
      van: number;
    };
    features: {
      includesInterior: boolean;
      includesExterior: boolean;
      includesEngine: boolean;
      includesWaxing: boolean;
      includesPolishing: boolean;
      includesDetailing: boolean;
      ecoFriendly: boolean;
      premiumProducts: boolean;
    };
    images?: string[];
    thumbnail?: string;
  }) {
    try {
      const carWashPackage = new CarWashPackage({
        mechanicId: data.mechanicId,
        name: data.name,
        description: data.description,
        packageType: data.packageType,
        services: data.services,
        pricing: {
          basePrice: data.basePrice,
          vehicleTypeMultipliers: data.vehicleTypeMultipliers,
          duration: data.services.reduce((total, service) => total + service.duration, 0),
          maxDuration: data.services.reduce((total, service) => total + service.duration, 0) + 30 // +30 dakika buffer
        },
        features: data.features,
        images: data.images || [],
        thumbnail: data.thumbnail
      });

      await carWashPackage.save();

      return {
        success: true,
        data: carWashPackage,
        message: 'Yıkama paketi başarıyla oluşturuldu'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Yıkama işi oluştur
   */
  static async createJob(data: {
    customerId: string;
    vehicleId: string;
    mechanicId: string;
    packageId: string;
    vehicleInfo: {
      brand: string;
      model: string;
      year: number;
      plateNumber: string;
      vehicleType: 'car' | 'suv' | 'truck' | 'motorcycle' | 'van';
      color: string;
      size: 'small' | 'medium' | 'large' | 'extra_large';
    };
    location: {
      address: string;
      coordinates: { lat: number; lng: number };
      isMobile: boolean;
    };
    specialRequests?: string[];
    notes?: string;
    scheduledAt?: Date;
  }) {
    try {
      // Paketi getir
      const carWashPackage = await CarWashPackage.findById(data.packageId);
      if (!carWashPackage) {
        throw new CustomError('Paket bulunamadı', 404);
      }

      // Müşteri sadakat bilgilerini hesapla
      const loyaltyInfo = await this.calculateLoyaltyInfo(data.customerId, data.mechanicId);

      // Fiyat hesaplama
      const vehicleMultiplier = carWashPackage.pricing.vehicleTypeMultipliers[data.vehicleInfo.vehicleType] || 1.0;
      const basePrice = carWashPackage.pricing.basePrice * vehicleMultiplier;

      // Sadakat indirimi hesapla
      const loyaltyDiscount = await this.calculateLoyaltyDiscount(
        data.mechanicId,
        loyaltyInfo.customerLevel,
        basePrice
      );

      const finalPrice = Math.max(0, basePrice - loyaltyDiscount);

      // Yıkama işi oluştur
      const carWashJob = new CarWashJob({
        ...data,
        packageName: carWashPackage.name,
        packageType: carWashPackage.packageType,
        services: carWashPackage.services.map(service => ({
          serviceName: service.serviceName,
          serviceType: service.serviceType,
          duration: service.duration,
          price: service.price,
          completed: false
        })),
        pricing: {
          basePrice: carWashPackage.pricing.basePrice,
          vehicleMultiplier,
          loyaltyDiscount: loyaltyDiscount / basePrice * 100,
          loyaltyDiscountAmount: loyaltyDiscount,
          tefePointDiscount: 0,
          tefePointDiscountAmount: 0,
          totalDiscount: loyaltyDiscount,
          finalPrice,
          paidAmount: 0,
          paymentStatus: 'pending'
        },
        loyaltyInfo,
        scheduling: {
          requestedAt: new Date(),
          scheduledAt: data.scheduledAt,
          estimatedDuration: carWashPackage.pricing.duration
        },
        status: data.scheduledAt ? 'scheduled' : 'pending'
      });

      await carWashJob.save();

      return {
        success: true,
        data: carWashJob,
        message: 'Yıkama işi başarıyla oluşturuldu'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Yıkama işini başlat
   */
  static async startJob(jobId: string, mechanicId: string) {
    try {
      const job = await CarWashJob.findOneAndUpdate(
        { _id: jobId, mechanicId, status: { $in: ['pending', 'scheduled'] } },
        {
          $set: {
            status: 'in_progress',
            'scheduling.startedAt': new Date()
          }
        },
        { new: true }
      );

      if (!job) {
        throw new CustomError('İş bulunamadı veya başlatılamaz', 404);
      }

      return {
        success: true,
        data: job,
        message: 'Yıkama işi başlatıldı'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Hizmeti tamamla
   */
  static async completeService(jobId: string, serviceName: string, photos?: string[], notes?: string) {
    try {
      const job = await CarWashJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Hizmeti bul ve tamamla
      const serviceIndex = job.services.findIndex(s => s.serviceName === serviceName);
      if (serviceIndex === -1) {
        throw new CustomError('Hizmet bulunamadı', 404);
      }

      job.services[serviceIndex].completed = true;
      job.services[serviceIndex].completedAt = new Date();
      if (photos) job.services[serviceIndex].photos = photos;
      if (notes) job.services[serviceIndex].notes = notes;

      await job.save();

      return {
        success: true,
        data: job,
        message: 'Hizmet tamamlandı'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Yıkama işini tamamla
   */
  static async completeJob(jobId: string, qualityData: {
    passed: boolean;
    checkedBy: string;
    issues?: string[];
    photos?: string[];
    customerRating?: number;
    customerFeedback?: string;
  }) {
    try {
      const job = await CarWashJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Tüm hizmetlerin tamamlandığını kontrol et
      const allServicesCompleted = job.services.every(service => service.completed);
      if (!allServicesCompleted) {
        throw new CustomError('Tüm hizmetler tamamlanmadan iş bitirilemez', 400);
      }

      // Kalite kontrol bilgilerini güncelle
      job.qualityCheck = {
        passed: qualityData.passed,
        checkedBy: new mongoose.Types.ObjectId(qualityData.checkedBy),
        checkedAt: new Date(),
        issues: qualityData.issues || [],
        photos: qualityData.photos || [],
        customerRating: qualityData.customerRating,
        customerFeedback: qualityData.customerFeedback
      };

      // İşi tamamla
      job.status = 'completed';
      job.scheduling.completedAt = new Date();
      job.scheduling.actualDuration = Math.floor(
        (job.scheduling.completedAt.getTime() - job.scheduling.startedAt!.getTime()) / (1000 * 60)
      );

      await job.save();

      // Sadakat bilgilerini güncelle
      await this.updateCustomerLoyalty(job.customerId.toString(), job.mechanicId.toString());

      return {
        success: true,
        data: job,
        message: 'Yıkama işi tamamlandı'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Ustanın paketlerini getir
   */
  static async getMechanicPackages(mechanicId: string, packageType?: string) {
    try {
      const query: any = { mechanicId, isActive: true };
      if (packageType) {
        query.packageType = packageType;
      }

      const packages = await CarWashPackage.find(query)
        .sort({ sortOrder: 1, createdAt: -1 });

      return {
        success: true,
        data: packages,
        message: 'Paketler getirildi'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Ustanın yıkama işlerini getir
   */
  static async getMechanicJobs(mechanicId: string, status?: string, date?: string) {
    try {
      const query: any = { mechanicId };
      if (status) {
        query.status = status;
      }
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        query['scheduling.scheduledAt'] = { $gte: startDate, $lt: endDate };
      }

      const jobs = await CarWashJob.find(query)
        .populate('customerId', 'name surname phone email')
        .populate('vehicleId', 'brand modelName plateNumber year')
        .populate('packageId', 'name packageType')
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: jobs,
        message: 'Yıkama işleri getirildi'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Sadakat programını getir
   */
  static async getLoyaltyProgram(mechanicId: string) {
    try {
      return await CarWashLoyaltyProgram.findOne({ mechanicId, isActive: true });
    } catch (error: any) {
      throw new CustomError(error.message || 'Sadakat programı getirilemedi', 500);
    }
  }

  /**
   * Sadakat programını oluştur/güncelle
   */
  static async setupLoyaltyProgram(data: {
    mechanicId: string;
    programName: string;
    description: string;
    loyaltyLevels: Array<{
      level: 'bronze' | 'silver' | 'gold' | 'platinum';
      levelName: string;
      minVisits: number;
      minSpent: number;
      benefits: {
        discountPercentage: number;
        priorityService: boolean;
        freeUpgrades: boolean;
        specialOffers: boolean;
        birthdayDiscount: number;
      };
      color: string;
      icon: string;
    }>;
    campaigns?: Array<any>;
    referralProgram?: any;
    birthdayCampaign?: any;
    pointsSystem?: any;
  }) {
    try {
      const loyaltyProgram = await CarWashLoyaltyProgram.findOneAndUpdate(
        { mechanicId: data.mechanicId },
        {
          $set: {
            ...data,
            isActive: true
          }
        },
        { new: true, upsert: true }
      );

      return {
        success: true,
        data: loyaltyProgram,
        message: 'Sadakat programı başarıyla oluşturuldu/güncellendi'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Müşteri sadakat bilgilerini hesapla
   */
  private static async calculateLoyaltyInfo(customerId: string, mechanicId: string) {
    try {
      // Müşterinin bu usta ile yaptığı işleri getir
      const customerJobs = await CarWashJob.find({
        customerId,
        mechanicId,
        status: 'completed'
      });

      const visitCount = customerJobs.length;
      const totalSpent = customerJobs.reduce((sum, job) => sum + job.pricing.finalPrice, 0);

      // Sadakat seviyesini belirle
      let customerLevel: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
      let loyaltyScore = 0;

      if (visitCount >= 20 || totalSpent >= 5000) {
        customerLevel = 'platinum';
        loyaltyScore = 100;
      } else if (visitCount >= 10 || totalSpent >= 2500) {
        customerLevel = 'gold';
        loyaltyScore = 75;
      } else if (visitCount >= 5 || totalSpent >= 1000) {
        customerLevel = 'silver';
        loyaltyScore = 50;
      } else if (visitCount >= 2) {
        customerLevel = 'bronze';
        loyaltyScore = 25;
      }

      return {
        customerLevel,
        visitCount,
        totalSpent,
        loyaltyScore,
        appliedDiscount: 0
      };

    } catch (error) {
      return {
        customerLevel: 'bronze' as const,
        visitCount: 0,
        totalSpent: 0,
        loyaltyScore: 0,
        appliedDiscount: 0
      };
    }
  }

  /**
   * Sadakat indirimi hesapla
   */
  private static async calculateLoyaltyDiscount(
    mechanicId: string,
    customerLevel: string,
    basePrice: number
  ): Promise<number> {
    try {
      const loyaltyProgram = await CarWashLoyaltyProgram.findOne({ mechanicId, isActive: true });
      if (!loyaltyProgram) {
        return 0;
      }

      const level = loyaltyProgram.loyaltyLevels.find(l => l.level === customerLevel);
      if (!level) {
        return 0;
      }

      return (basePrice * level.benefits.discountPercentage) / 100;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Müşteri sadakat bilgilerini güncelle
   */
  private static async updateCustomerLoyalty(customerId: string, mechanicId: string) {
    try {
      // Bu fonksiyon müşteri sadakat bilgilerini güncellemek için kullanılabilir
      // Şu anda sadece placeholder
      console.log(`Updating loyalty for customer ${customerId} with mechanic ${mechanicId}`);
    } catch (error) {
      console.error('Error updating customer loyalty:', error);
    }
  }
}
