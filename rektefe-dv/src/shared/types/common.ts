/**
 * REKTEFE DRIVER APP - SHARED TYPES
 * 
 * Bu dosya, driver uygulaması için gerekli tüm type tanımlarını içerir.
 * Shared types'ları import eder ve driver app'e özel type'ları ekler.
 */

import {
  UserType,
  AppointmentStatus,
  ServiceType,
  BaseUser,
  Driver as SharedDriver,
  Mechanic as SharedMechanic,
  Vehicle as SharedVehicle,
  Appointment as SharedAppointment,
  Location,
  ApiResponse,
  Notification as SharedNotification,
  Message as SharedMessage,
  Conversation as SharedConversation
} from '../../../../shared/types/index';

// ===== RE-EXPORT SHARED TYPES =====
export type {
  BaseUser,
  SharedDriver as Driver,
  SharedMechanic as Mechanic,
  SharedVehicle as Vehicle,
  SharedAppointment as Appointment,
  Location,
  ApiResponse,
  SharedNotification as Notification,
  SharedMessage as Message,
  SharedConversation as Conversation
};

// Re-export enums as values
export { UserType, AppointmentStatus, ServiceType };

// ===== DRIVER APP SPECIFIC TYPES =====

export interface DriverProfile extends Omit<SharedDriver, 'emergencyContacts'> {
  // Driver app'e özel alanlar
  emergencyContacts: EmergencyContact[];
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  preferredMechanics: string[]; // Mechanic ID'leri
  loyaltyPoints: number;
  membershipLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  lastServiceDate?: Date;
  totalServices: number;
  averageRating: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: 'SPOUSE' | 'PARENT' | 'SIBLING' | 'FRIEND' | 'OTHER';
  isPrimary: boolean;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  serviceUpdates: boolean;
  promotionalOffers: boolean;
  emergencyAlerts: boolean;
}

export interface PrivacySettings {
  shareLocation: boolean;
  shareVehicleInfo: boolean;
  shareServiceHistory: boolean;
  allowDataAnalytics: boolean;
  marketingConsent: boolean;
}

export interface DriverAppointment extends SharedAppointment {
  // Driver app'e özel appointment alanları
  estimatedDuration: number; // dakika
  specialInstructions?: string;
  isRecurring: boolean;
  recurringPattern?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  reminderSent: boolean;
  feedbackSubmitted: boolean;
}

export interface ServiceRequest {
  id: string;
  driverId: string;
  vehicleId: string;
  serviceType: ServiceType;
  description: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  preferredDate?: Date;
  preferredTime?: string;
  location: Location;
  estimatedCost?: number;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyTowingRequest {
  id: string;
  driverId: string;
  vehicleId: string;
  location: Location;
  description: string;
  urgency: 'HIGH' | 'EMERGENCY';
  estimatedArrival?: Date;
  towDestination?: Location;
  status: 'REQUESTED' | 'ACCEPTED' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  driverId: string;
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET';
  provider: string;
  lastFourDigits: string;
  expiryDate?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface PaymentHistory {
  id: string;
  driverId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  description: string;
  createdAt: Date;
}

export interface MechanicRating {
  id: string;
  driverId: string;
  mechanicId: string;
  appointmentId: string;
  rating: number; // 1-5
  comment?: string;
  categories: {
    professionalism: number;
    quality: number;
    timeliness: number;
    communication: number;
    cleanliness: number;
  };
  createdAt: Date;
}

export interface MechanicSearchFilters {
  location?: Location;
  maxDistance?: number; // km
  serviceTypes?: ServiceType[];
  minRating?: number;
  maxPrice?: number;
  availability?: 'NOW' | 'TODAY' | 'THIS_WEEK' | 'ANYTIME';
  sortBy?: 'RATING' | 'DISTANCE' | 'PRICE' | 'AVAILABILITY';
  sortOrder?: 'ASC' | 'DESC';
}

export interface MechanicSearchResult {
  mechanic: SharedMechanic;
  distance: number; // km
  estimatedArrival?: Date;
  averageRating: number;
  totalReviews: number;
  isAvailable: boolean;
  estimatedCost?: number;
  specialties: ServiceType[];
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface LoginRequest {
  email: string;
  password: string;
  userType: UserType;
  deviceInfo?: {
    platform: 'IOS' | 'ANDROID';
    version: string;
    deviceId: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  userType: UserType;
  phone: string;
  name: string;
  surname: string;
  deviceInfo?: {
    platform: 'IOS' | 'ANDROID';
    version: string;
    deviceId: string;
  };
}

export interface CreateAppointmentRequest {
  vehicleId: string;
  mechanicId: string;
  serviceType: ServiceType;
  appointmentDate: Date;
  timeSlot: string;
  description?: string;
  location: Location;
  estimatedDuration?: number;
  specialInstructions?: string;
}

export interface UpdateAppointmentRequest {
  appointmentId: string;
  status?: AppointmentStatus;
  appointmentDate?: Date;
  timeSlot?: string;
  description?: string;
  specialInstructions?: string;
}

export interface CreateEmergencyRequest {
  vehicleId: string;
  location: Location;
  description: string;
  urgency: 'HIGH' | 'EMERGENCY';
  towDestination?: Location;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: DriverProfile;
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
  message: string;
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user: DriverProfile;
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
  message: string;
}

export interface AppointmentListResponse {
  success: boolean;
  data: {
    appointments: DriverAppointment[];
    totalCount: number;
    hasMore: boolean;
  };
  message: string;
}

export interface MechanicListResponse {
  success: boolean;
  data: {
    mechanics: MechanicSearchResult[];
    totalCount: number;
    hasMore: boolean;
  };
  message: string;
}

export interface VehicleListResponse {
  success: boolean;
  data: {
    vehicles: SharedVehicle[];
    totalCount: number;
  };
  message: string;
}

// ===== FORM DATA TYPES =====

export interface VehicleFormData {
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  fuelType: 'BENZIN' | 'DIZEL' | 'ELEKTRIK' | 'HYBRID' | 'LPG';
  engineCapacity?: number;
  transmission: 'MANUAL' | 'AUTOMATIC';
  mileage?: number;
  lastServiceDate?: Date;
  notes?: string;
}

export interface ProfileFormData {
  name: string;
  surname: string;
  email: string;
  phone: string;
  profilePicture?: string;
  emergencyContacts: Omit<EmergencyContact, 'id'>[];
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
}

// ===== UTILITY TYPES =====

export interface CreateEntity<T> {
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateEntity<T> {
  id: string;
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
}

// ===== LEGACY TYPE ALIASES =====
export type RegisterData = RegisterRequest;
export type VehicleData = VehicleFormData;
export type AppointmentData = CreateAppointmentRequest;
export type MessageData = SharedMessage;
export type NotificationData = SharedNotification;