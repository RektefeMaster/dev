// Shared Components
export * from './components';

// Shared API Services - sadece API service'leri
export { BaseApiService, DriverApiService, MechanicApiService } from './api';

// Shared Context
export { SharedAuthProvider, useSharedAuth, AuthProvider } from './context';

// Shared Types - sadece type'ları
export type {
  BaseApiResponse,
  SuccessApiResponse,
  ErrorApiResponse,
  ApiResponse,
  PaginationInfo,
  ResponseMeta,
  ErrorInfo,
  BaseEntity,
  Location,
  ContactInfo,
  WorkingHours,
  PriceRange,
  SharedUser,
  BaseUser,
  Driver,
  Mechanic,
  Vehicle,
  Appointment,
  AppointmentItem,
  ExtraApprovalRequest,
  Notification,
  Message,
  MessageAttachment,
  Conversation,
  Payment,
  AppointmentRating,
  EmergencyTowingRequest,
  FaultReport,
  SearchFilters,
  PaginationParams,
  LoginRequest,
  RegisterRequest,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  LoginResponse,
  RegisterResponse,
  AppointmentListResponse,
  MechanicListResponse,
  User,
  CreateEntity,
  UpdateEntity,
  RatingItem,
  CreateAppointmentItemRequest,
  UpdateAppointmentItemRequest,
  ExtraApprovalRequestData,
  WithdrawalRequestData,
  EarningsResponse,
  WalletResponse,
  FaultReportListResponse,
  ServicePricingFormData,
  DashboardStats,
  TodaySchedule
} from './types';

// Shared Enums
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
  WorkingDay,
  getAppointmentStatusDescription,
  getUserTypeDescription,
  getServiceTypeDescription,
  getPriorityDescription,
  getRatingStars,
  isValidAppointmentStatus,
  isValidUserType,
  isValidServiceType
} from './types';

// Shared Utils
export { default as Logger } from './utils/Logger';
export * from './utils/apiUtils';