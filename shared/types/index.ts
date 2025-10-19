/**
 * REKTEFE PROJESİ - SHARED TYPES INDEX
 * 
 * Bu dosya, shared modülündeki tüm tip tanımlarını
 * tek bir yerden export eder. Import işlemlerini
 * kolaylaştırmak için kullanılır.
 */

// ===== ENUMS =====
export {
  AppointmentStatus,
  UserType,
  ServiceType,
  NotificationType,
  MessageType,
  PaymentStatus,
  Rating,
  Priority,
  FuelType,
  WorkingDay
} from './enums';

export {
  getAppointmentStatusDescription,
  getUserTypeDescription,
  getServiceTypeDescription,
  getPriorityDescription,
  getRatingStars,
  isValidAppointmentStatus,
  isValidUserType,
  isValidServiceType
} from './enums';

// ===== API RESPONSE TYPES =====
export type {
  BaseApiResponse,
  SuccessApiResponse,
  ErrorApiResponse,
  ApiResponse,
  PaginationInfo,
  ResponseMeta,
  ErrorInfo
} from './apiResponse';

export {
  ErrorCode,
  ERROR_MESSAGES_TR,
  ERROR_STATUS_MAPPING,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  isSuccessResponse,
  isErrorResponse,
  getErrorCode,
  getErrorMessage
} from './apiResponse';

// ===== COMMON INTERFACES =====
export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  district?: string;
  neighborhood?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address?: string;
}

export interface WorkingHours {
  start: string;
  end: string;
  days: string[];
}

export interface PriceRange {
  min: number;
  max: number;
}

// ===== USER INTERFACES =====
export interface BaseUser extends BaseEntity {
  name: string;
  surname: string;
  email: string;
  phone: string;
  userType: 'driver' | 'mechanic';
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Driver extends BaseUser {
  userType: 'driver';
  vehicles: Vehicle[];
  emergencyContacts?: ContactInfo[];
}

export interface Mechanic extends BaseUser {
  userType: 'mechanic';
  isAdmin?: boolean;
  experience?: number;
  specialties?: string[];
  serviceCategories?: string[];
  location?: {
    city?: string;
    district?: string;
    neighborhood?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    description?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  rating?: number;
  totalRatings?: number;
  ratingCount?: number; // Alias for totalRatings
  availability?: boolean;
  isAvailable?: boolean; // Alias for availability
  workingHours?: string; // JSON string
  priceRange?: PriceRange;
  pushToken?: string;
  // Usta özel alanlar
  shopName?: string;
  bio?: string;
  avatar?: string;
  cover?: string;
  vehicleBrands?: string[];
  engineTypes?: string[];
  transmissionTypes?: string[];
  customBrands?: string[];
  washPackages?: any[];
  washOptions?: any[];
  totalServices?: number;
  city?: string;
}

// ===== VEHICLE INTERFACES =====
export interface Vehicle extends BaseEntity {
  userId: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  mileage?: number;
  engineCapacity?: number;
  transmission?: 'manual' | 'automatic';
  isActive: boolean;
}

// ===== APPOINTMENT INTERFACES =====
export interface Appointment extends BaseEntity {
  userId: string;
  mechanicId: string;
  vehicleId: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  description?: string;
  price?: number;
  estimatedDuration?: number;
  rejectionReason?: string;
  completionNotes?: string;
  rating?: number;
  ratingComment?: string;
  items?: AppointmentItem[];
  kdvDahil?: boolean;
  parcaBekleniyor?: boolean;
  extraApprovalRequests?: ExtraApprovalRequest[];
  // Populated fields (from backend)
  customer?: {
    _id?: string;
    name: string;
    surname: string;
    phone: string;
    email: string;
  };
  vehicle?: {
    _id?: string;
    brand: string;
    model: string;
    modelName?: string;
    year: number;
    plateNumber: string;
    fuelType?: string;
    engineType?: string;
    transmission?: string;
    color?: string;
  };
}

export interface AppointmentItem {
  _id: string;
  ad: string;
  adet: number;
  birim: string;
  tutar: number;
  tur: 'ISCILIK' | 'PARCA';
}

export interface ExtraApprovalRequest {
  _id: string;
  aciklama: string;
  tutar: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
  response?: string;
}

// ===== NOTIFICATION INTERFACES =====
export interface Notification extends BaseEntity {
  recipientId: string;
  recipientType: 'driver' | 'mechanic';
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt?: string;
  data?: any;
  appointmentId?: string;
  priority: string;
}

// ===== MESSAGE INTERFACES =====
export interface Message extends BaseEntity {
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  readAt?: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface Conversation extends BaseEntity {
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isActive: boolean;
}

// ===== PAYMENT INTERFACES =====
export interface Payment extends BaseEntity {
  appointmentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  paymentLink?: string;
  paymentRef?: string;
}

// ===== RATING INTERFACES =====
export interface AppointmentRating extends BaseEntity {
  appointmentId: string;
  mechanicId: string;
  userId: string;
  rating: number;
  comment?: string;
  response?: string;
  respondedAt?: string;
}

// ===== EMERGENCY INTERFACES =====
export interface EmergencyTowingRequest extends BaseEntity {
  userId: string;
  location: Location;
  description: string;
  vehicleInfo: string;
  contactPhone: string;
  status: string;
  priority: string;
  estimatedArrival?: string;
  assignedMechanic?: string;
  completedAt?: string;
}

// ===== FAULT REPORT INTERFACES =====
export interface FaultReport extends BaseEntity {
  userId: string;
  vehicleId: string;
  title: string;
  description: string;
  photos?: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'quoted';
  assignedMechanic?: string;
  estimatedPrice?: number;
  finalPrice?: number;
  completionNotes?: string;
  completedAt?: string;
  customerName?: string;
  location: Location;
}

// ===== SEARCH AND FILTER INTERFACES =====
export interface SearchFilters {
  location?: Location;
  serviceType?: string;
  availability?: boolean;
  rating?: number;
  priceRange?: PriceRange;
  workingHours?: WorkingHours;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ===== API REQUEST INTERFACES =====
export interface LoginRequest {
  email: string;
  password: string;
  userType: 'driver' | 'mechanic';
}

export interface RegisterRequest {
  name: string;
  surname: string;
  email: string;
  password: string;
  phone: string;
  userType: 'driver' | 'mechanic';
  // Driver specific
  vehicles?: Omit<Vehicle, '_id' | 'userId' | 'createdAt' | 'updatedAt'>[];
  // Mechanic specific
  experience?: number;
  specialties?: string[];
  serviceCategories?: string[];
  location?: Location;
  workingHours?: WorkingHours;
  priceRange?: PriceRange;
}

export interface CreateAppointmentRequest {
  mechanicId: string;
  vehicleId: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  description?: string;
}

export interface UpdateAppointmentRequest {
  status?: string;
  description?: string;
  price?: number;
  estimatedDuration?: number;
  completionNotes?: string;
  rejectionReason?: string;
}

// ===== RESPONSE INTERFACES =====
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: Driver | Mechanic;
  expiresIn: number;
}

export interface RegisterResponse {
  user: Driver | Mechanic;
  message: string;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface MechanicListResponse {
  mechanics: Mechanic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===== UTILITY TYPES =====
export type User = Driver | Mechanic;

export type CreateEntity<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateEntity<T> = Partial<Omit<T, '_id' | 'createdAt' | 'updatedAt'>>;

// ===== RATING TYPES =====
export interface RatingItem {
  _id?: string;
  rating: number;
  count?: number;
  comment?: string;
  createdAt?: string | Date;
  driverId?: string;
  customer?: {
    name: string;
    surname: string;
  };
  appointment?: {
    serviceType: string;
  };
  appointmentId?: string;
}

// ===== ADDITIONAL REQUEST/RESPONSE TYPES =====
export interface CreateAppointmentItemRequest {
  ad: string;
  adet: number;
  birim: string;
  tutar: number;
  tur: 'ISCILIK' | 'PARCA';
}

export interface UpdateAppointmentItemRequest extends Partial<CreateAppointmentItemRequest> {
  _id: string;
}

export interface ExtraApprovalRequestData {
  aciklama: string;
  tutar: number;
}

export interface WithdrawalRequestData {
  amount: number;
  bankAccount: string;
  notes?: string;
}

export interface EarningsResponse {
  totalEarnings: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  pendingPayments: number;
  completedJobs: number;
  averageJobValue: number;
  earningsByMonth: Array<{
    month: string;
    amount: number;
  }>;
}

export interface WalletResponse {
  balance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  transactions: Array<{
    _id: string;
    type: 'earning' | 'withdrawal';
    amount: number;
    date: string;
    status: string;
    description: string;
  }>;
}

export interface FaultReportListResponse {
  faultReports: FaultReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServicePricingFormData {
  serviceType: string;
  basePrice: number;
  unit: string;
  description?: string;
}

export interface DashboardStats {
  todayAppointments: number;
  pendingRequests: number;
  completedToday: number;
  totalEarnings: number;
  monthlyEarnings: number;
  activeCustomers: number;
  averageRating: number;
  totalJobs: number;
}

export interface TodaySchedule {
  appointments: Appointment[];
  nextAppointment?: Appointment;
  totalScheduled: number;
}

// ===== TIRE SERVICE TYPES =====
export {
  TireServiceType,
  TireCondition,
  TireServiceStatus,
  TireSeason
} from './tire';

export type {
  TireDetails,
  VehicleInfo as TireVehicleInfo,
  LocationInfo as TireLocationInfo,
  PriceQuote,
  WarrantyInfo,
  PartInfo,
  TireServiceRequest,
  TireHealthRecord,
  TireServiceStats,
  TireServiceResponse,
  TireMaintenanceReminder,
  TireStock,
  PriceCalculationParams
} from './tire';