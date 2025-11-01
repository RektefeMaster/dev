import { api } from './api';

export interface Vehicle {
  _id: string;
  userId: string;
  brand: string;
  modelName: string;
  package: string;
  year: number;
  engineType: string;
  fuelType: 'Benzin' | 'Dizel' | 'Elektrik' | 'Benzin/Tüp' | 'Hibrit';
  transmission: string;
  mileage: number;
  plateNumber: string;
  image?: string;
  createdAt: string;
}

export interface AddVehicleData {
  userId: string;
  brand: string;
  modelName: string;
  package: string;
  year: number;
  engineType: string;
  fuelType: 'Benzin' | 'Dizel' | 'Elektrik' | 'Benzin/Tüp' | 'Hibrit';
  transmission: string;
  mileage: number;
  plateNumber: string;
  image?: string;
}

export const vehicleService = {
  getVehicles: async () => {
    const response = await api.get('/vehicles');
    return response.data;
  },
  
  addVehicle: async (data: AddVehicleData) => {
    const response = await api.post('/vehicles', data);
    return response.data;
  },
  
  deleteVehicle: async (vehicleId: string) => {
    return api.delete(`/vehicles/${vehicleId}`);
  },
  
  setFavorite: async (vehicleId: string, userId: string, isFavorite: boolean) => {
    return api.patch(`/vehicles/${vehicleId}/favorite`, { userId, isFavorite });
  },

  getFavoriteVehicle: async (): Promise<any> => {
    const response = await api.get('/vehicles');
    return null;
  }
}; 