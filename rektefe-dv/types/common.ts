/**
 * Rektefe uygulamaları için temel tip tanımları
 */

// Kullanıcı tipleri
export interface BaseUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver extends BaseUser {
  type: 'driver';
  vehicles: Vehicle[];
}

export interface Mechanic extends BaseUser {
  type: 'mechanic';
  services: ServiceCategory[];
  experience: number;
  rating: number;
  location: Location;
}

// Araç tipleri
export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  mileage: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
}

// Servis tipleri
export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export interface ServiceRequest {
  id: string;
  driverId: string;
  mechanicId: string;
  vehicleId: string;
  serviceType: string;
  description: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  location: Location;
  scheduledDate?: string;
  cost?: number;
  createdAt: string;
}

// Konum tipleri
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
}

// Randevu tipleri
export interface Appointment {
  id: string;
  driverId: string;
  mechanicId: string;
  vehicleId: string;
  serviceType: string;
  scheduledDate: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  cost?: number;
  createdAt: string;
}

// API Response tipleri
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Navigasyon tipleri
export interface NavigationProps {
  navigation: any;
  route: any;
}
