import { api } from './api';

export interface Vehicle {
  id: string;
  userId: string;
  brand: string;
  model: string;
  year: number;
  fuelType: string;
  mileage: number;
  engineSize?: string;
  transmission?: string;
  lastMaintenance?: string;
  insuranceStatus?: string;
  condition?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddVehicleData {
  userId: string;
  brand: string;
  model: string;
  year: number;
  fuelType: string;
  mileage: number;
  engineSize?: string;
  transmission?: string;
}

export const vehicleService = {
  getVehicles: async (userId: string) => {
    const response = await api.get(`/vehicles/${userId}`);
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

  getFavoriteVehicle: async (userId: string) => {
    const response = await api.get(`/vehicles/${userId}`);
    return response.data.find((v: Vehicle) => v.isFavorite) || null;
  }
}; 