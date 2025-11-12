import { Vehicle, IVehicle } from '../models/Vehicle';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import mongoose from 'mongoose';
import { CustomError } from '../middleware/errorHandler';
import { MileageModel } from '../models/MileageModel';
import { OdometerEvent, OdometerEventEvidenceType, OdometerEventSource } from '../models/OdometerEvent';
import {
  DEFAULT_CONFIDENCE,
  DEFAULT_RATE_KM_PER_DAY,
} from '../config/mileage';

export class VehicleService {
  private static readonly DEFAULT_TENANT_ID = 'default';
  private static readonly DEFAULT_ODOMETER_SOURCE: OdometerEventSource = 'system_import';
  private static readonly DEFAULT_ODOMETER_EVIDENCE: OdometerEventEvidenceType = 'none';

  /**
   * Yeni araç oluştur
   */
  static async createVehicle(vehicleData: Partial<IVehicle>, userId: string): Promise<IVehicle> {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new CustomError('Geçersiz kullanıcı ID', 400);
      }

      // Kullanıcının var olduğunu kontrol et
      const user = await User.findById(userId);
      if (!user) {
        throw new CustomError('Kullanıcı bulunamadı', 404);
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Araç verilerini hazırla
        const vehicle = new Vehicle({
          ...vehicleData,
          userId: new mongoose.Types.ObjectId(userId),
        });

        const savedVehicle = await vehicle.save({ session });

        const tenantId = VehicleService.DEFAULT_TENANT_ID;
        const initialKm =
          typeof vehicleData.mileage === 'number' && !Number.isNaN(vehicleData.mileage)
            ? vehicleData.mileage
            : null;
        const now = new Date();

        const mileageModel = await MileageModel.findOneAndUpdate(
          { tenantId, vehicleId: savedVehicle._id },
          {
            $setOnInsert: {
              seriesId: `series-${savedVehicle._id.toString()}`,
              lastTrueKm: initialKm ?? 0,
              lastTrueTsUtc: now,
              rateKmPerDay: DEFAULT_RATE_KM_PER_DAY,
              confidence: DEFAULT_CONFIDENCE,
              defaultUnit: 'km',
              hasBaseline: initialKm !== null,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            session,
          }
        );

        if (initialKm !== null && !mileageModel.hasBaseline) {
          mileageModel.hasBaseline = true;
          mileageModel.lastTrueKm = initialKm;
          mileageModel.lastTrueTsUtc = now;
          await mileageModel.save({ session });
        }

        if (initialKm !== null) {
          const existingInitialEvent = await OdometerEvent.findOne({
            tenantId,
            vehicleId: savedVehicle._id,
            source: VehicleService.DEFAULT_ODOMETER_SOURCE,
          }).session(session);

          if (!existingInitialEvent) {
            await OdometerEvent.create(
              [
                {
                  tenantId,
                  vehicleId: savedVehicle._id,
                  seriesId: mileageModel.seriesId,
                  km: initialKm,
                  unit: mileageModel.defaultUnit,
                  timestampUtc: now,
                 source: VehicleService.DEFAULT_ODOMETER_SOURCE,
                 evidenceType: VehicleService.DEFAULT_ODOMETER_EVIDENCE,
                  createdByUserId: new mongoose.Types.ObjectId(userId),
                  createdAtUtc: now,
                  updatedAtUtc: now,
                  pendingReview: false,
                  odometerReset: false,
                },
              ],
              { session }
            );
          }
        }

        await session.commitTransaction();
        return savedVehicle;
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç oluşturulurken hata oluştu', 500);
    }
  }

  /**
   * Kullanıcının araçlarını getir
   */
  static async getUserVehicles(userId: string): Promise<any[]> {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new CustomError('Geçersiz kullanıcı ID', 400);
      }

      const vehicles = await Vehicle.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate('userId', 'name surname email')
        .sort({ createdAt: -1 })
        .lean(); // 🚀 OPTIMIZE: Memory optimization
      
      return vehicles;
    } catch (error) {
      console.error('VehicleService.getUserVehicles hata:', error);
      throw new CustomError('Araçlar getirilirken hata oluştu', 500);
    }
  }

  /**
   * Belirli bir aracı getir
   */
  static async getVehicleById(vehicleId: string, userId: string): Promise<IVehicle> {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        throw new CustomError('Geçersiz araç ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new CustomError('Geçersiz kullanıcı ID', 400);
      }

      const vehicle = await Vehicle.findOne({
        _id: new mongoose.Types.ObjectId(vehicleId),
        userId: new mongoose.Types.ObjectId(userId)
      }).populate('userId', 'name surname email');

      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }

      return vehicle;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç getirilirken hata oluştu', 500);
    }
  }

  /**
   * Aracı güncelle
   */
  static async updateVehicle(vehicleId: string, userId: string, updateData: Partial<IVehicle>): Promise<IVehicle> {
    try {
      const vehicle = await Vehicle.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(vehicleId),
          userId: new mongoose.Types.ObjectId(userId)
        },
        updateData,
        { new: true, runValidators: true }
      ).populate('userId', 'name surname email');

      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }

      return vehicle;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç güncellenirken hata oluştu', 500);
    }
  }

  /**
   * Aracı sil
   */
  static async deleteVehicle(vehicleId: string, userId: string): Promise<void> {
    try {
      const vehicle = await Vehicle.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(vehicleId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Araç silinirken hata oluştu', 500);
    }
  }

  /**
   * Tüm araçları getir (admin için)
   */
  static async getAllVehicles(): Promise<IVehicle[]> {
    try {
      const vehicles = await Vehicle.find()
        .populate('userId', 'name surname email')
        .sort({ createdAt: -1 });
      
      return vehicles;
    } catch (error) {
      throw new CustomError('Araçlar getirilirken hata oluştu', 500);
    }
  }

  /**
   * Araç arama
   */
  static async searchVehicles(searchTerm: string, userId?: string): Promise<IVehicle[]> {
    try {
      const searchQuery: any = {
        $or: [
          { brand: { $regex: searchTerm, $options: 'i' } },
          { model: { $regex: searchTerm, $options: 'i' } },
          { plateNumber: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (userId) {
        searchQuery.userId = new mongoose.Types.ObjectId(userId);
      }

      const vehicles = await Vehicle.find(searchQuery)
        .populate('userId', 'name surname email')
        .sort({ createdAt: -1 });

      return vehicles;
    } catch (error) {
      throw new CustomError('Araç arama yapılırken hata oluştu', 500);
    }
  }

  /**
   * Servis edilmiş araçları getir
   */
  static async getServicedVehicles(mechanicId: string): Promise<IVehicle[]> {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz mekanik ID', 400);
      }

      // Appointment'larda servis edilmiş araçları bul
      const servicedAppointments = await Appointment.find({
        mechanicId: new mongoose.Types.ObjectId(mechanicId),
        status: 'TAMAMLANDI'
      }).populate('vehicleId');

      // Araç ID'lerini çıkar
      const vehicleIds = servicedAppointments
        .map(appointment => appointment.vehicleId)
        .filter(vehicle => vehicle !== null);

      // Araçları getir
      const vehicles = await Vehicle.find({
        _id: { $in: vehicleIds }
      }).populate('userId', 'name surname email phone');

      return vehicles;
    } catch (error) {
      throw new CustomError('Servis edilmiş araçlar getirilirken hata oluştu', 500);
    }
  }

  /**
   * Aracı favorile/favoriden çıkar
   */
  static async toggleFavorite(vehicleId: string, userId: string): Promise<IVehicle> {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        throw new CustomError('Geçersiz araç ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new CustomError('Geçersiz kullanıcı ID', 400);
      }

      // Aracı bul
      const vehicle = await Vehicle.findOne({
        _id: new mongoose.Types.ObjectId(vehicleId),
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }

      // Kullanıcının diğer araçlarını favoriden çıkar (sadece bir araç favori olabilir)
      await Vehicle.updateMany(
        { 
          userId: new mongoose.Types.ObjectId(userId),
          _id: { $ne: new mongoose.Types.ObjectId(vehicleId) }
        },
        { isFavorite: false }
      );

      // Bu aracın favori durumunu toggle et
      vehicle.isFavorite = !vehicle.isFavorite;
      await vehicle.save();

      // User modelindeki favoriteVehicle field'ını güncelle
      if (vehicle.isFavorite) {
        // Aracı favori yap
        await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(userId),
          { favoriteVehicle: new mongoose.Types.ObjectId(vehicleId) }
        );
      } else {
        // Aracı favoriden çıkar
        await User.findByIdAndUpdate(
          new mongoose.Types.ObjectId(userId),
          { $unset: { favoriteVehicle: 1 } }
        );
      }

      return vehicle;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError('Favori durumu güncellenirken hata oluştu', 500);
    }
  }
}
