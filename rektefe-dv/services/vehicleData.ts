import { vehicleService, Vehicle } from './vehicles';

export interface VehicleData {
  id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  engineType: string;
  fuelType: string;
  transmission: string;
  mileage: number;
  tireSize?: string;
  tireBrand?: string;
  tireModel?: string;
  isFavorite: boolean;
}

export const vehicleDataService = {
  // Kullanıcının araçlarını getir
  async getVehicles(): Promise<VehicleData[]> {
    try {
      const response = await vehicleService.getVehicles();
      return response.data.map((vehicle: Vehicle) => ({
        id: vehicle._id,
        brand: vehicle.brand,
        model: vehicle.modelName,
        year: vehicle.year,
        plateNumber: vehicle.plateNumber,
        engineType: vehicle.engineType,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        mileage: vehicle.mileage,
        isFavorite: vehicle.isFavorite || false
      }));
    } catch (error) {
      console.error('Araç bilgileri alınamadı:', error);
      return [];
    }
  },

  // Favori araç bilgilerini getir
  async getFavoriteVehicle(): Promise<VehicleData | null> {
    try {
      const vehicles = await this.getVehicles();
      return vehicles.find(vehicle => vehicle.isFavorite) || vehicles[0] || null;
    } catch (error) {
      console.error('Favori araç bilgisi alınamadı:', error);
      return null;
    }
  },

  // Araç bilgilerini form için hazırla
  async getVehicleForForm(): Promise<{
    vehicleType: string;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: string;
    vehiclePlate: string;
    tireSize: string;
    tireBrand: string;
    tireModel: string;
  }> {
    try {
      const favoriteVehicle = await this.getFavoriteVehicle();
      
      if (favoriteVehicle) {
        return {
          vehicleType: this.getVehicleType(favoriteVehicle.engineType),
          vehicleBrand: favoriteVehicle.brand,
          vehicleModel: favoriteVehicle.model,
          vehicleYear: favoriteVehicle.year.toString(),
          vehiclePlate: favoriteVehicle.plateNumber,
          tireSize: favoriteVehicle.tireSize || '',
          tireBrand: favoriteVehicle.tireBrand || '',
          tireModel: favoriteVehicle.tireModel || ''
        };
      }

      // Varsayılan değerler
      return {
        vehicleType: 'binek',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleYear: '',
        vehiclePlate: '',
        tireSize: '',
        tireBrand: '',
        tireModel: ''
      };
    } catch (error) {
      console.error('Araç form verisi alınamadı:', error);
      return {
        vehicleType: 'binek',
        vehicleBrand: '',
        vehicleModel: '',
        vehicleYear: '',
        vehiclePlate: '',
        tireSize: '',
        tireBrand: '',
        tireModel: ''
      };
    }
  },

  // Motor tipine göre araç tipini belirle
  getVehicleType(engineType: string): string {
    const engine = engineType.toLowerCase();
    if (engine.includes('suv') || engine.includes('crossover')) return 'suv';
    if (engine.includes('truck') || engine.includes('van') || engine.includes('kamyon')) return 'ticari';
    return 'binek';
  },

  // Araç bilgilerini güncelle (lastik bilgileri için)
  async updateVehicleTireInfo(vehicleId: string, tireData: {
    tireSize?: string;
    tireBrand?: string;
    tireModel?: string;
  }): Promise<boolean> {
    try {
      // Bu API endpoint'i backend'de oluşturulmalı
      // Şimdilik sadece log
      console.log('Araç lastik bilgileri güncellendi:', vehicleId, tireData);
      return true;
    } catch (error) {
      console.error('Araç lastik bilgileri güncellenemedi:', error);
      return false;
    }
  }
};
