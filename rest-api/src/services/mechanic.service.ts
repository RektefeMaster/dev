import { Mechanic, IMechanic } from '../models/Mechanic';
import { User } from '../models/User';
import { AppointmentRating } from '../models/AppointmentRating';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';
import { normalizeToServiceCategory, getCategoryQueryValues } from '../utils/serviceCategoryHelper';

export class MechanicService {
  /**
   * Mekanik profili oluştur veya güncelle
   */
  static async createOrUpdateProfile(profileData: Partial<IMechanic>, userId: string): Promise<any> {
    try {
      // Kullanıcının var olduğunu ve mechanic olduğunu kontrol et
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı', 404);
      }
      if (user.userType !== 'mechanic') {
        throw new CustomError('Sadece mekanik kullanıcılar profil oluşturabilir', 403);
      }

      // User modelini güncelle - sadece gönderilen alanları güncelle
      const updateData: any = {};
      
      // Temel bilgiler
      if (profileData.name) updateData.name = profileData.name;
      if (profileData.surname) updateData.surname = profileData.surname;
      if (profileData.phone) updateData.phone = profileData.phone;
      if (profileData.city) updateData.city = profileData.city;
      if (profileData.bio !== undefined) updateData.bio = profileData.bio;
      if (profileData.experience !== undefined) updateData.experience = profileData.experience;
      if (profileData.shopName !== undefined) updateData.shopName = profileData.shopName;
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
      
      // Konum bilgileri
      if (profileData.location) {
        updateData.location = {
          city: profileData.location.city || '',
          district: profileData.location.district || '',
          neighborhood: profileData.location.neighborhood || '',
          street: profileData.location.street || '',
          building: profileData.location.building || '',
          floor: profileData.location.floor || '',
          apartment: profileData.location.apartment || '',
          coordinates: profileData.location.coordinates || {
            latitude: 0,
            longitude: 0
          }
        };
      }
      
      // Şehir bilgisini ekle (koordinatlar kullanıcı tarafından girilmeli)
      if (profileData.city && !profileData.location) {
        updateData.location = {
          city: profileData.city,
          district: '',
          neighborhood: '',
          street: '',
          building: '',
          floor: '',
          apartment: '',
          description: '',
          coordinates: {
            latitude: 0,
            longitude: 0
          }
        };
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      if (!updatedUser) {
        throw new CustomError('Mekanik profili güncellenirken hata oluştu', 500);
      }
      
      return updatedUser;
    } catch (error) {
      // Error handled silently in production
      if (error instanceof CustomError) throw error;
      throw new CustomError(`Mekanik profili oluşturulurken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 500);
    }
  }

  /**
   * Mekanik profilini getir
   */
  // Not: Eğer Mechanic dokümanı yoksa User'dan türetilmiş bir profil döndürüyoruz.
  // Bu nedenle geri dönüş türünü geniş tutuyoruz.
  static async getProfile(userId: string): Promise<any> {
    try {
      // User modelinden mekanik profilini getir
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı', 404);
      }

      if (user.userType !== 'mechanic') {
        throw new CustomError('Bu kullanıcı mekanik değil', 403);
      }

      // Koordinat bilgilerini düzelt
      let fixedLocation: any = user.location || {};
      const coords = fixedLocation.coordinates;
      
      // Şehir koordinatları
      const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
        'İstanbul': { latitude: 41.0082, longitude: 28.9784 },
        'Ankara': { latitude: 39.9334, longitude: 32.8597 },
        'İzmir': { latitude: 38.4192, longitude: 27.1287 },
        'Malatya': { latitude: 38.3552, longitude: 38.3095 }
      };
      
      // Koordinatları geçersizse düzelt
      if (!coords || coords.latitude === 0 || coords.longitude === 0) {
        const city: string = fixedLocation.city || user.city || 'İstanbul';
        const newCoords = cityCoordinates[city] || cityCoordinates['İstanbul'];
        fixedLocation = {
          ...fixedLocation,
          coordinates: newCoords,
          city: city
        };
      } else {
        // Koordinatlar varsa ama city yoksa ekle
        if (!fixedLocation.city) {
          fixedLocation.city = user.city || 'İstanbul';
        }
      }

      // User'dan mekanik profili oluştur
      const mechanicProfile = {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        serviceCategories: user.serviceCategories || [],
        experience: user.experience || 0,
        rating: user.rating || 0,
        ratingCount: user.ratingCount || 0,
        totalServices: user.totalServices || 0,
        isAvailable: user.isAvailable || true,
        location: {
          city: fixedLocation.city || user.city || '',
          coordinates: fixedLocation.coordinates,
          ...fixedLocation
        },
        workingHours: user.workingHours || '',
        shopName: user.shopName || '',
        bio: user.bio || '',
        avatar: user.avatar,
        cover: user.cover,
        vehicleBrands: user.carBrands || [],
        engineTypes: user.engineTypes || [],
        transmissionTypes: user.transmissionTypes || [],
        customBrands: user.customBrands || [],
        washPackages: user.washPackages || [],
        washOptions: user.washOptions || [],
        createdAt: user.createdAt
      };
      
      return mechanicProfile;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mekanik profili getirilirken hata oluştu', 500);
    }
  }

  /**
   * Tüm mekanikleri getir
   */
  static async getAllMechanics(): Promise<any[]> {
    try {
      // Sadece User modelinden mechanic tipindeki kullanıcıları çek
      const userMechanics = await User.find({ userType: 'mechanic' })
        .select('-password')
        .sort({ rating: -1, createdAt: -1 });
      
      // User verilerini Mechanic formatına çevir
      const convertedUserMechanics = userMechanics.map((user: any) => {
        // Koordinatları düzelt
        let fixedLocation: any = user.location || {};
        const coords = fixedLocation.coordinates;
        
        // Koordinatları kontrol et - hardcoded konumlar kaldırıldı
        if (!coords || coords.latitude === 0 || coords.longitude === 0) {
          // Koordinat yoksa null olarak bırak, kullanıcı kendi konumunu girmeli
          fixedLocation = {
            ...fixedLocation,
            coordinates: null,
            city: fixedLocation.city || user.city || ''
          };
        } else {
          // Koordinatlar varsa ama city yoksa ekle
          if (!fixedLocation.city) {
            fixedLocation.city = user.city || '';
          }
        }
        
        return {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.email,
          phone: user.phone,
          city: fixedLocation.city || user.city || '',
          bio: user.bio || '',
          experience: user.experience || 0,
          rating: user.rating || 0,
          ratingCount: user.ratingCount || 0,
          totalServices: user.totalServices || 0,
          isAvailable: user.isAvailable || true,
          serviceCategories: user.serviceCategories || ['repair'],
          specialties: user.serviceCategories || ['repair'],
          location: {
            city: fixedLocation.city || user.city || '',
            coordinates: fixedLocation.coordinates,
            ...fixedLocation
          },
          workingHours: user.workingHours || '',
          shopName: user.shopName || '',
          avatar: user.avatar,
          cover: user.cover,
          carBrands: user.carBrands || [],
          engineTypes: user.engineTypes || [],
          transmissionTypes: user.transmissionTypes || [],
          customBrands: user.customBrands || [],
          washPackages: user.washPackages || [],
          washOptions: user.washOptions || [],
          createdAt: user.createdAt
        };
      });
      
      return convertedUserMechanics;
    } catch (error) {
      throw new CustomError('Mekanikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik arama
   */
  static async searchMechanics(searchTerm: string, city?: string): Promise<any[]> {
    try {
      // ServiceCategory'ye normalize etmeyi dene
      const normalizedCategory = normalizeToServiceCategory(searchTerm);
      
      const searchQuery: any = {
        userType: 'mechanic',
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { surname: { $regex: searchTerm, $options: 'i' } },
          { 'location.city': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      // Eğer searchTerm bir ServiceCategory ise, o kategorinin tüm varyasyonlarını ara
      if (normalizedCategory) {
        const categoryValues = getCategoryQueryValues(normalizedCategory);
        searchQuery.$or.push({ serviceCategories: { $in: categoryValues } });
      } else {
        // Normal string arama
        searchQuery.$or.push({ serviceCategories: { $regex: searchTerm, $options: 'i' } });
      }

      if (city) {
        searchQuery['location.city'] = { $regex: city, $options: 'i' };
      }

      const mechanics = await User.find(searchQuery)
        .select('-password')
        .sort({ rating: -1, createdAt: -1 });

      // Koordinat bilgilerini ekle
      const mechanicsWithCoordinates = mechanics.map((user: any) => {
        let fixedLocation: any = user.location || {};
        const coords = fixedLocation.coordinates;
        
        // Koordinatları kontrol et - hardcoded konumlar kaldırıldı
        if (!coords || coords.latitude === 0 || coords.longitude === 0) {
          // Koordinat yoksa null olarak bırak, kullanıcı kendi konumunu girmeli
          fixedLocation = {
            ...fixedLocation,
            coordinates: null,
            city: fixedLocation.city || user.city || ''
          };
        } else {
          // Koordinatlar varsa ama city yoksa ekle
          if (!fixedLocation.city) {
            fixedLocation.city = user.city || '';
          }
        }
        
        return {
          ...user.toObject(),
          location: {
            city: fixedLocation.city || user.city || '',
            coordinates: fixedLocation.coordinates,
            ...fixedLocation
          }
        };
      });

      return mechanicsWithCoordinates;
    } catch (error) {
      throw new CustomError('Mekanik arama yapılırken hata oluştu', 500);
    }
  }

  /**
   * Mekanik müsaitlik durumunu güncelle
   */
  static async updateAvailability(userId: string, isAvailable: boolean): Promise<any> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isAvailable },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      return user;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Müsaitlik durumu güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Mekanik puanını güncelle
   */
  static async updateRating(userId: string, newRating: number): Promise<any> {
    try {
      if (newRating < 1 || newRating > 5) {
        throw new CustomError('Puan 1-5 arasında olmalıdır', 400);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Mekanik profili bulunamadı', 404);
      }

      // Yeni puanı hesapla
      const currentRating = user.rating || 0;
      const currentRatingCount = user.ratingCount || 0;
      const totalRating = (currentRating * currentRatingCount) + newRating;
      const newRatingCount = currentRatingCount + 1;
      const averageRating = totalRating / newRatingCount;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          rating: averageRating,
          ratingCount: newRatingCount
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new CustomError('Mekanik profili güncellenirken hata oluştu', 500);
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Puan güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Şehir bazında mekanikleri getir
   */
  static async getMechanicsByCity(city: string): Promise<any[]> {
    try {
      const mechanics = await Mechanic.find({ city: { $regex: city, $options: 'i' } })
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, isAvailable: -1 })
        .lean(); // 🚀 OPTIMIZE: Memory optimization
      
      return mechanics;
    } catch (error) {
      throw new CustomError('Şehir bazında mekanikler getirilirken hata oluştu', 500);
    }
  }

  /**
   * Uzmanlık alanına göre mekanikleri getir
   */
  static async getMechanicsBySpecialization(specialization: string): Promise<any[]> {
    try {
      const mechanics = await Mechanic.find({ 
        specialization: { $regex: specialization, $options: 'i' } 
      })
        .populate('userId', 'name surname email avatar')
        .sort({ rating: -1, isAvailable: -1 })
        .lean(); // 🚀 OPTIMIZE: Memory optimization
      
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
      // Önce Mechanic modelinde ara
      let mechanic: any = await Mechanic.findById(mechanicId);
      
      // Mechanic modelinde yoksa User modelinde ara
      if (!mechanic) {
        const user = await User.findById(mechanicId);
        if (user && user.userType === 'mechanic') {
          // User verilerini Mechanic formatına çevir
          mechanic = {
            _id: user._id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            phone: user.phone || '',
            city: user.location?.city || user.city || '',
            bio: user.bio || '',
            experience: user.experience || 0,
            rating: user.rating || 0,
            ratingCount: user.ratingCount || 0,
            totalServices: user.totalServices || 0,
            isAvailable: user.isAvailable || true,
            serviceCategories: user.serviceCategories || ['repair'],
            location: user.location || {
              city: '',
              district: '',
              neighborhood: '',
              street: '',
              building: '',
              floor: '',
              apartment: ''
            },
            workingHours: user.workingHours || '',
            shopName: user.shopName || '',
            avatar: user.avatar,
            cover: user.cover,
            carBrands: user.carBrands || [],
            engineTypes: user.engineTypes || [],
            transmissionTypes: user.transmissionTypes || [],
            customBrands: user.customBrands || [],
            washPackages: user.washPackages || [],
            washOptions: user.washOptions || [],
            createdAt: user.createdAt
          };
        }
      }
      
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
      if (error instanceof CustomError) throw error;
      throw new CustomError('Mekanik detayları getirilirken hata oluştu', 500);
    }
  }
}
