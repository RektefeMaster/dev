import { Mechanic, IMechanic } from '../models/Mechanic';
import { User } from '../models/User';
import { AppointmentRating } from '../models/AppointmentRating';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';

export class MechanicService {
  /**
   * Mekanik profili oluştur veya güncelle
   */
  static async createOrUpdateProfile(profileData: Partial<IMechanic>, userId: string): Promise<IMechanic> {
    try {
      // Kullanıcının var olduğunu ve mechanic olduğunu kontrol et
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı', 404);
      }
      if (user.userType !== 'mechanic') {
        throw new CustomError('Sadece mekanik kullanıcılar profil oluşturabilir', 403);
      }

      // Mevcut profili bul (Mechanic model'inde _id = userId)
      let mechanic = await Mechanic.findById(userId);
      
      if (mechanic) {
        // Mevcut profili güncelle - sadece gönderilen alanları güncelle
        const updateData: any = {};
        
        // Temel bilgiler
        if (profileData.name) updateData.name = profileData.name;
        if (profileData.surname) updateData.surname = profileData.surname;
        if (profileData.phone) updateData.phone = profileData.phone;
        if (profileData.city) updateData.city = profileData.city;
        if (profileData.bio !== undefined) updateData.bio = profileData.bio;
        if (profileData.experience !== undefined) updateData.experience = profileData.experience;
        if (profileData.serviceCategories) updateData.serviceCategories = profileData.serviceCategories;
        if (profileData.carBrands) updateData.carBrands = profileData.carBrands;
        if (profileData.engineTypes) updateData.engineTypes = profileData.engineTypes;
        if (profileData.transmissionTypes) updateData.transmissionTypes = profileData.transmissionTypes;
        if (profileData.customBrands) updateData.customBrands = profileData.customBrands;
        if (profileData.workingHours) updateData.workingHours = profileData.workingHours;
        if (profileData.isAvailable !== undefined) updateData.isAvailable = profileData.isAvailable;
        
        // Gizlilik ayarları
        if (profileData.phoneHidden !== undefined) updateData.phoneHidden = profileData.phoneHidden;
        if (profileData.emailHidden !== undefined) updateData.emailHidden = profileData.emailHidden;
        if (profileData.cityHidden !== undefined) updateData.cityHidden = profileData.cityHidden;
        
        console.log('🔒 Gizlilik ayarları güncelleniyor:', {
          phoneHidden: profileData.phoneHidden,
          emailHidden: profileData.emailHidden,
          cityHidden: profileData.cityHidden,
          updateData
        });
        
        // Konum bilgileri
        if (profileData.location) {
          if (profileData.location.city) updateData['location.city'] = profileData.location.city;
          if (profileData.location.district) updateData['location.district'] = profileData.location.district;
          if (profileData.location.neighborhood) updateData['location.neighborhood'] = profileData.location.neighborhood;
          if (profileData.location.street) updateData['location.street'] = profileData.location.street;
          if (profileData.location.building) updateData['location.building'] = profileData.location.building;
          if (profileData.location.floor) updateData['location.floor'] = profileData.location.floor;
          if (profileData.location.apartment) updateData['location.apartment'] = profileData.location.apartment;
        }
        
        console.log('Güncellenecek veriler:', updateData);
        
        const updatedMechanic = await Mechanic.findByIdAndUpdate(
          userId,
          { $set: updateData },
          { new: true, runValidators: true }
        );
        
        if (!updatedMechanic) {
          throw new CustomError('Mekanik profili güncellenirken hata oluştu', 500);
        }
        
        console.log('Profil başarıyla güncellendi:', updatedMechanic._id);
        return updatedMechanic;
      } else {
        // Yeni profil oluştur (Mechanic model'inde _id = userId)
        const newMechanicData = {
          _id: userId,
          name: profileData.name || user.name,
          surname: profileData.surname || user.surname,
          email: user.email,
          password: user.password,
          userType: 'mechanic',
          username: `${user.email.split('@')[0]}_${Date.now()}`,
          phone: profileData.phone || '',
          city: profileData.city || '',
          bio: profileData.bio || '',
          experience: profileData.experience || 0,
          specialties: profileData.serviceCategories || ['Genel Bakım'],
          phoneHidden: profileData.phoneHidden || false,
          emailHidden: profileData.emailHidden || false,
          cityHidden: profileData.cityHidden || false,
          serviceCategories: profileData.serviceCategories || ['Genel Bakım'],
          carBrands: profileData.carBrands || [],
          engineTypes: profileData.engineTypes || [],
          transmissionTypes: profileData.transmissionTypes || [],
          customBrands: profileData.customBrands || [],
          workingHours: profileData.workingHours || []
        };
        
        console.log('Yeni profil oluşturuluyor:', newMechanicData);
        
        mechanic = new Mechanic(newMechanicData);
        await mechanic.save();
        
        console.log('Yeni profil oluşturuldu:', mechanic._id);
        return mechanic;
      }
    } catch (error) {
      console.error('createOrUpdateProfile hatası:', error);
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mekanik profili oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Mekanik profilini getir
   */
  static async getProfile(userId: string): Promise<IMechanic> {
    try {
      const mechanic = await Mechanic.findById(userId);

      if (!mechanic) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      return mechanic;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mekanik profili getirilirken hata oluştu', 500);
    }
  }

  /**
   * Tüm mekanikleri getir
   */
  static async getAllMechanics(): Promise<IMechanic[]> {
    try {
      const mechanics = await Mechanic.find()
        .sort({ rating: -1, createdAt: -1 });
      
      console.log(`✅ ${mechanics.length} mekanik bulundu`);
      return mechanics;
    } catch (error) {
      console.error('getAllMechanics error:', error);
      throw new CustomError('Mekanikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik arama
   */
  static async searchMechanics(searchTerm: string, city?: string): Promise<IMechanic[]> {
    try {
      const searchQuery: any = {
        $or: [
          { 'userId.name': { $regex: searchTerm, $options: 'i' } },
          { 'userId.surname': { $regex: searchTerm, $options: 'i' } },
          { specialization: { $regex: searchTerm, $options: 'i' } },
          { city: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (city) {
        searchQuery.city = { $regex: city, $options: 'i' };
      }

      const mechanics = await Mechanic.find(searchQuery)
        .sort({ rating: -1, createdAt: -1 });

      return mechanics;
    } catch (error) {
      throw new CustomError('Mekanik arama yapılırken hata oluştu', 500);
    }
  }

  /**
   * Mekanik müsaitlik durumunu güncelle
   */
  static async updateAvailability(userId: string, isAvailable: boolean): Promise<IMechanic> {
    try {
      const mechanic = await Mechanic.findByIdAndUpdate(
        userId,
        { isAvailable },
        { new: true, runValidators: true }
      );

      if (!mechanic) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      return mechanic;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Müsaitlik durumu güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik puanını güncelle
   */
  static async updateRating(userId: string, newRating: number): Promise<IMechanic> {
    try {
      if (newRating < 1 || newRating > 5) {
        throw new CustomError('Puan 1-5 arasında olmalıdır', 400);
      }

      const mechanic = await Mechanic.findById(userId);
      if (!mechanic) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      // Yeni puanı hesapla
      const totalRating = (mechanic.rating * mechanic.ratingCount) + newRating;
      const newRatingCount = mechanic.ratingCount + 1;
      const averageRating = totalRating / newRatingCount;

      const updatedMechanic = await Mechanic.findByIdAndUpdate(
        userId,
        { 
          rating: averageRating,
          ratingCount: newRatingCount
        },
        { new: true, runValidators: true }
      );

      if (!updatedMechanic) {
        throw new CustomError('Mekanik profili güncellenirken hata oluştu', 500);
      }

      return updatedMechanic;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Puan güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Şehir bazında mekanikleri getir
   */
  static async getMechanicsByCity(city: string): Promise<IMechanic[]> {
    try {
      const mechanics = await Mechanic.find({ city: { $regex: city, $options: 'i' } })
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, isAvailable: -1 });
      
      return mechanics;
    } catch (error) {
      throw new CustomError('Şehir bazında mekanikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Uzmanlık alanına göre mekanikleri getir
   */
  static async getMechanicsBySpecialization(specialization: string): Promise<IMechanic[]> {
    try {
      const mechanics = await Mechanic.find({ 
        specialization: { $regex: specialization, $options: 'i' } 
      })
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, isAvailable: -1 });
      
      return mechanics;
    } catch (error) {
      throw new CustomError('Uzmanlık alanına göre mekanikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik detaylarını getir (rating, yorumlar, iş sayısı dahil)
   */
  static async getMechanicDetails(mechanicId: string): Promise<any> {
    try {
      const mechanic = await Mechanic.findById(mechanicId);
      
      if (!mechanic) {
        throw new CustomError('Mekanik bulunamadı', 404);
      }

      // Gerçek rating dağılımını hesapla
      const ratingDistribution = await AppointmentRating.aggregate([
        { $match: { mechanicId: new mongoose.Types.ObjectId(mechanicId) } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } }
      ]);

      // Rating dağılımını hazırla
      const ratingStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingDistribution.forEach((item: any) => {
        ratingStats[item._id as keyof typeof ratingStats] = item.count;
      });

      // Son yorumları getir (en son 5 yorum)
      const recentReviews = await AppointmentRating.aggregate([
        { $match: { mechanicId: new mongoose.Types.ObjectId(mechanicId) } },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            createdAt: 1,
            userName: { $concat: ['$user.name', ' ', '$user.surname'] }
          }
        }
      ]);

      // Tamamlanan iş sayısını hesapla
      const completedJobsCount = await AppointmentRating.countDocuments({ 
        mechanicId: new mongoose.Types.ObjectId(mechanicId) 
      });

      // Mekanik detaylarını hazırla
      const mechanicDetails = {
        _id: mechanic._id,
        name: mechanic.name,
        surname: mechanic.surname,
        email: mechanic.email,
        avatar: mechanic.avatar,
        cover: mechanic.cover,
        bio: mechanic.bio,
        city: mechanic.city,
        location: mechanic.location,
        experience: mechanic.experience,
        rating: mechanic.rating,
        ratingCount: mechanic.ratingCount,
        totalServices: mechanic.totalServices,
        completedJobs: completedJobsCount,
        isAvailable: mechanic.isAvailable,
        serviceCategories: mechanic.serviceCategories,
        carBrands: mechanic.carBrands,
        engineTypes: mechanic.engineTypes,
        transmissionTypes: mechanic.transmissionTypes,
        customBrands: mechanic.customBrands,
        workingHours: mechanic.workingHours,
        shopName: mechanic.shopName,
        phone: mechanic.phone,
        createdAt: mechanic.createdAt,
        // Rating istatistikleri
        ratingStats: {
          average: mechanic.rating,
          total: mechanic.ratingCount,
          distribution: ratingStats
        },
        // Son yorumlar
        recentReviews: recentReviews
      };


      
      return mechanicDetails;
    } catch (error) {
      console.error('getMechanicDetails error:', error);
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mekanik detayları getirilirken hata oluştu', 500);
    }
  }
}
