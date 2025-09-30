/**
 * Rektefe uygulamaları için temel tip tanımları
 */

// Kullanıcı tipleri - Rektefe terminolojisi
// "user" = genel kullanıcı (hem driver hem mechanic)
// "driver" = şöför, araç sahibi (rektefe-dv)
// "mechanic" = usta (rektefe-us)

export interface BaseUser {
  _id: string;
  email: string;
  name: string;
  surname: string;
  phone?: string;
  avatar?: string;
  userType: 'driver' | 'mechanic';
  createdAt: string;
  updatedAt: string;
}

export interface Driver extends BaseUser {
  userType: 'driver';
  vehicles: Vehicle[];
  favoriteMechanics?: string[]; // mechanic ID'leri
}

export interface Mechanic extends BaseUser {
  userType: 'mechanic';
  experience: number;
  rating: number;
  totalJobs: number;
  totalEarnings: number;
  specialties: string[];
  serviceCategories: string[];
  location: Location;
  isAvailable: boolean;
  shopName?: string;
  bio?: string;
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

// Arıza bildirimi yanıtları
export interface MechanicResponse {
  mechanicId: string;
  responseType: 'quote' | 'not_available' | 'check_tomorrow' | 'contact_me';
  message?: string;
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

// Kullanıcı kayıt verileri
export interface RegisterData {
  name: string;
  surname: string;
  email: string;
  phone: string;
  password: string;
  userType: 'driver' | 'mechanic';
  experience?: number;
  city?: string;
  specialties?: string[];
  serviceCategories?: string[];
  location?: {
    address?: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
}

// Araç verileri
export interface VehicleData {
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  mileage?: number;
  color?: string;
  fuelType?: string;
  engineSize?: string;
}

// Randevu verileri
export interface AppointmentData {
  mechanicId: string;
  vehicleId: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  description?: string;
  location?: Location;
  estimatedCost?: number;
}

// Mesaj verileri
export interface MessageData {
  receiverId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  conversationId?: string;
}

// Bildirim verileri
export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

// API Response tipleri
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Navigasyon tipleri
export interface NavigationProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
    reset: (state: unknown) => void;
    setParams: (params: Record<string, unknown>) => void;
  };
  route: {
    params?: Record<string, unknown>;
    name: string;
    key: string;
  };
}

// Bildirim tipleri
export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'rating' | 'system' | 'payment' | 'emergency';
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Kampanya ve reklam tipleri
export interface Campaign {
  id: number;
  title: string;
  description: string;
  image: string;
  shortText: string;
  detailText: string;
  company: string;
  companyLogo?: string;
  validUntil?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

// TefePuan tipleri
export interface TefePointBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
}

export interface TefePointTransaction {
  _id: string;
  userId: string;
  type: 'earn' | 'spend' | 'transfer';
  amount: number;
  description: string;
  serviceCategory?: string;
  relatedId?: string;
  createdAt: string;
}

export interface TefePointHistoryResponse {
  data: TefePointTransaction[];
  total: number;
  hasMore: boolean;
}

// Usta arama ve detay tipleri
export interface MechanicSearchResult {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone?: string;
  avatar?: string;
  city: string;
  bio?: string;
  experience: number;
  rating: number;
  ratingCount: number;
  totalJobs: number;
  isAvailable: boolean;
  serviceCategories: string[];
  workingHours?: string; // JSON string olarak çalışma saatleri
  location?: {
    coordinates: [number, number];
    address?: string;
  };
  distance?: number;
  formattedDistance?: string;
  shopName?: string;
  ratingStats?: {
    average: number;
    total: number;
    breakdown: Record<number, number>;
  };
}

// Form tipleri
export interface EmergencyTowingFormData {
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePlate: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  userInfo: {
    name: string;
    surname: string;
    phone: string;
  };
  emergencyDetails: {
    reason: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
  };
}
