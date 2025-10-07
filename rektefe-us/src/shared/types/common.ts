/**
 * REKTEFE MECHANIC APP - SHARED TYPES
 * 
 * Bu dosya, mechanic uygulaması için gerekli tüm type tanımlarını içerir.
 * Shared types'ları import eder ve mechanic app'e özel type'ları ekler.
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
  Conversation as SharedConversation,
  Rating as RatingEnum,
  RatingItem,
  FaultReport as SharedFaultReport,
  User,
  CreateAppointmentItemRequest,
  UpdateAppointmentItemRequest,
  ExtraApprovalRequestData,
  WithdrawalRequestData,
  EarningsResponse,
  WalletResponse,
  FaultReportListResponse,
  ServicePricingFormData as SharedServicePricingFormData,
  DashboardStats,
  TodaySchedule,
  AppointmentItem,
  ExtraApprovalRequest
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
  SharedConversation as Conversation,
  SharedFaultReport as FaultReport,
  User,
  RatingItem,
  CreateAppointmentItemRequest,
  UpdateAppointmentItemRequest,
  ExtraApprovalRequestData,
  WithdrawalRequestData,
  EarningsResponse,
  WalletResponse,
  FaultReportListResponse,
  DashboardStats,
  TodaySchedule,
  AppointmentItem,
  ExtraApprovalRequest
};

// Re-export enums as values
export { UserType, AppointmentStatus, ServiceType };
export { RatingEnum as Rating };

// Export ServicePricingFormData with alias
export type ServicePricingFormData = SharedServicePricingFormData;

// ===== MECHANIC APP SPECIFIC TYPES =====

export interface MechanicProfile extends Omit<SharedMechanic, 'availability'> {
  // Mechanic app'e özel alanlar
  businessHours: BusinessHours[];
  serviceCategories: ServiceType[];
  certifications: Certification[];
  equipment: Equipment[];
  workingAreas: WorkingArea[];
  pricing: ServicePricing[];
  availability: AvailabilityStatus;
  notificationSettings: MechanicNotificationSettings;
  earnings: EarningsSummary;
  performance: PerformanceMetrics;
}

export interface BusinessHours {
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isWorking: boolean;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: Date;
  expiryDate?: Date;
  certificateNumber: string;
  isVerified: boolean;
  documentUrl?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'DIAGNOSTIC' | 'REPAIR' | 'MAINTENANCE' | 'TOWING' | 'OTHER';
  brand?: string;
  model?: string;
  isPortable: boolean;
  isAvailable: boolean;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
}

export interface WorkingArea {
  id: string;
  name: string;
  center: Location;
  radius: number; // km
  isActive: boolean;
  serviceTypes: ServiceType[];
}

export interface ServicePricing {
  serviceType: ServiceType;
  basePrice: number;
  hourlyRate?: number;
  minimumPrice: number;
  maximumPrice?: number;
  currency: string;
  isNegotiable: boolean;
  discounts?: PricingDiscount[];
}

export interface PricingDiscount {
  type: 'QUANTITY' | 'LOYALTY' | 'SEASONAL' | 'EMERGENCY';
  percentage?: number;
  fixedAmount?: number;
  conditions: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface AvailabilityStatus {
  isOnline: boolean;
  isAvailable: boolean;
  currentLocation?: Location;
  estimatedArrivalTime?: Date;
  maxDistance: number; // km
  workingHours: BusinessHours[];
  breakTime?: {
    startTime: Date;
    endTime: Date;
    reason: string;
  };
}

export interface MechanicNotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentRequests: boolean;
  appointmentUpdates: boolean;
  paymentNotifications: boolean;
  ratingNotifications: boolean;
  systemUpdates: boolean;
  promotionalOffers: boolean;
}

export interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  totalEarnings: number;
  pendingPayments: number;
  currency: string;
  lastPaymentDate?: Date;
  averagePerService: number;
  topEarningService: ServiceType;
}

export interface PerformanceMetrics {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  averageRating: number;
  totalRatings: number;
  responseTime: number; // minutes
  completionRate: number; // percentage
  customerSatisfaction: number; // percentage
  repeatCustomers: number;
  newCustomers: number;
  lastUpdated: Date;
}

export interface MechanicAppointment extends SharedAppointment {
  // Mechanic app'e özel appointment alanları
  estimatedDuration: number; // dakika
  actualDuration?: number; // dakika
  serviceNotes?: string;
  partsUsed: ServicePart[];
  laborCost: number;
  partsCost: number;
  totalCost: number;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED';
  customerRating?: number;
  customerFeedback?: string;
  followUpRequired: boolean;
  followUpDate?: Date;
}

export interface ServicePart {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier?: string;
  warranty?: {
    duration: number; // months
    startDate: Date;
  };
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
  mechanicId: string;
  type: 'BANK_ACCOUNT' | 'DIGITAL_WALLET' | 'CASH' | 'CHECK';
  provider: string;
  accountNumber?: string;
  routingNumber?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface PaymentHistory {
  id: string;
  mechanicId: string;
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
    user: MechanicProfile;
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
  message: string;
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user: MechanicProfile;
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
  message: string;
}

export interface AppointmentListResponse {
  success: boolean;
  data: {
    appointments: MechanicAppointment[];
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

export interface MechanicProfileFormData {
  name: string;
  surname: string;
  email: string;
  phone: string;
  profilePicture?: string;
  businessHours: Omit<BusinessHours, 'id'>[];
  serviceCategories: ServiceType[];
  certifications: Omit<Certification, 'id'>[];
  equipment: Omit<Equipment, 'id'>[];
  workingAreas: Omit<WorkingArea, 'id'>[];
  pricing: Omit<ServicePricing, 'id'>[];
  notificationSettings: MechanicNotificationSettings;
}

export interface ServiceFormData {
  serviceType: ServiceType;
  description: string;
  estimatedDuration: number;
  basePrice: number;
  hourlyRate?: number;
  minimumPrice: number;
  maximumPrice?: number;
  isNegotiable: boolean;
  requiredEquipment: string[];
  requiredCertifications: string[];
}

// ===== UTILITY TYPES =====

export interface CreateEntity<T> {
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateEntity<T> {
  id: string;
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
}

// ===== NAVIGATION TYPES =====

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  EmailVerification: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  Main: undefined;
  ChatScreen: {
    conversationId: string;
    otherParticipant: {
      _id: string;
      name: string;
      surname: string;
      avatar?: string;
      userType: string;
    };
  };
  NewMessage: undefined;
  AppointmentDetail: { appointmentId: string };
  Appointments: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Messages: undefined;
  Wallet: undefined;
  Support: undefined;
  FinancialTracking: undefined;
  Calendar: undefined;
  Profile: undefined;
  EditProfile: undefined;
  WorkingHours: undefined;
  Settings: undefined;
  Security: undefined;
  ServiceAreas: undefined;
  HelpCenter: undefined;
  About: undefined;
  FaultReports: undefined;
  FaultReportDetail: { faultReportId: string };
  TowingService: undefined;
  RepairService: undefined;
  WashService: undefined;
  TireService: undefined;
  EmergencyNotification: undefined;
  Reports: undefined;
  EndOfDay: undefined;
  Customer: undefined;
  QuickQuote: undefined;
  Suppliers: undefined;
  VehicleHistory: undefined;
  ServiceCatalog: undefined;
};

// ===== LEGACY TYPE ALIASES =====
export type RegisterData = RegisterRequest;
export type VehicleData = MechanicProfileFormData;
export type AppointmentData = CreateAppointmentRequest;
export type MessageData = SharedMessage;
export type NotificationData = SharedNotification;