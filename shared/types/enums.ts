/**
 * REKTEFE PROJESİ - MERKEZİ ENUM TANIMLARI
 * 
 * Bu dosya, tüm projelerde (backend, frontend) kullanılacak
 * ortak enum değerlerini içerir. Değişiklik yaparken tüm
 * projeleri güncellemeyi unutmayın.
 */

// ===== APPOINTMENT STATUS ENUM =====
export enum AppointmentStatus {
  REQUESTED = 'TALEP_EDILDI',
  SCHEDULED = 'PLANLANDI', 
  IN_SERVICE = 'SERVISTE',
  PAYMENT_PENDING = 'ODEME_BEKLIYOR',
  COMPLETED = 'TAMAMLANDI',
  CANCELLED = 'IPTAL_EDILDI',
  NO_SHOW = 'NO_SHOW'
}

// ===== USER TYPE ENUM =====
export enum UserType {
  DRIVER = 'driver',
  MECHANIC = 'mechanic',
  ADMIN = 'admin'
}

export type UserTypeString = 'driver' | 'mechanic' | 'admin';

// ===== SERVICE TYPE ENUM =====
export enum ServiceType {
  OIL_CHANGE = 'OIL_CHANGE',
  BRAKE_SERVICE = 'BRAKE_SERVICE',
  ENGINE_REPAIR = 'ENGINE_REPAIR',
  TIRE_CHANGE = 'TIRE_CHANGE',
  BATTERY_SERVICE = 'BATTERY_SERVICE',
  EMERGENCY_TOWING = 'EMERGENCY_TOWING',
  GENERAL_MAINTENANCE = 'GENERAL_MAINTENANCE',
  // Additional service types (lowercase)
  TOWING = 'towing',
  REPAIR = 'repair',
  WASH = 'wash',
  CEKICI = 'cekici',
  CEKICI_CAPS = 'Çekici',
  TAMIR_BAKIM = 'tamir-bakim',
  ARAC_YIKAMA = 'arac-yikama',
  LASTIK = 'lastik'
}

// ===== NOTIFICATION TYPE ENUM =====
export enum NotificationType {
  APPOINTMENT_REQUEST = 'appointment_request',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_REJECTED = 'appointment_rejected',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  PAYMENT_RECEIVED = 'payment_received',
  SERVICE_COMPLETED = 'service_completed',
  SYSTEM_NOTIFICATION = 'system_notification'
}

// ===== MESSAGE TYPE ENUM =====
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  LOCATION = 'location'
}

// ===== PAYMENT STATUS ENUM =====
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// ===== RATING ENUM =====
export enum Rating {
  ONE_STAR = 1,
  TWO_STARS = 2,
  THREE_STARS = 3,
  FOUR_STARS = 4,
  FIVE_STARS = 5
}

// ===== PRIORITY ENUM =====
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// ===== VEHICLE FUEL TYPE ENUM =====
export enum FuelType {
  GASOLINE = 'gasoline',
  DIESEL = 'diesel',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid'
}

// ===== WORKING DAYS ENUM =====
export enum WorkingDay {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

// ===== HELPER FUNCTIONS =====

/**
 * Appointment status'u Türkçe açıklamaya çevirir
 */
export const getAppointmentStatusDescription = (status: AppointmentStatus): string => {
  const descriptions: Record<AppointmentStatus, string> = {
    [AppointmentStatus.REQUESTED]: 'Talep Edildi',
    [AppointmentStatus.SCHEDULED]: 'Planlandı',
    [AppointmentStatus.IN_SERVICE]: 'Serviste',
    [AppointmentStatus.PAYMENT_PENDING]: 'Ödeme Bekliyor',
    [AppointmentStatus.COMPLETED]: 'Tamamlandı',
    [AppointmentStatus.CANCELLED]: 'İptal Edildi',
    [AppointmentStatus.NO_SHOW]: 'Gelmedi'
  };
  return descriptions[status];
};

/**
 * User type'ı Türkçe açıklamaya çevirir
 */
export const getUserTypeDescription = (userType: UserType): string => {
  const descriptions: Record<UserType, string> = {
    [UserType.DRIVER]: 'Şoför',
    [UserType.MECHANIC]: 'Usta',
    [UserType.ADMIN]: 'Yönetici'
  };
  return descriptions[userType];
};

/**
 * Service type'ı Türkçe açıklamaya çevirir
 */
export const getServiceTypeDescription = (serviceType: ServiceType): string => {
  const descriptions: Partial<Record<ServiceType, string>> = {
    [ServiceType.OIL_CHANGE]: 'Yağ Değişimi',
    [ServiceType.BRAKE_SERVICE]: 'Fren Servisi',
    [ServiceType.ENGINE_REPAIR]: 'Motor Tamiri',
    [ServiceType.TIRE_CHANGE]: 'Lastik Değişimi',
    [ServiceType.BATTERY_SERVICE]: 'Akü Servisi',
    [ServiceType.EMERGENCY_TOWING]: 'Acil Çekici',
    [ServiceType.GENERAL_MAINTENANCE]: 'Genel Bakım',
    [ServiceType.TOWING]: 'Çekici',
    [ServiceType.REPAIR]: 'Tamir',
    [ServiceType.WASH]: 'Yıkama',
    [ServiceType.CEKICI]: 'Çekici',
    [ServiceType.CEKICI_CAPS]: 'Çekici',
    [ServiceType.TAMIR_BAKIM]: 'Tamir Bakım',
    [ServiceType.ARAC_YIKAMA]: 'Araç Yıkama',
    [ServiceType.LASTIK]: 'Lastik'
  };
  return descriptions[serviceType] || serviceType;
};

/**
 * Priority'yi Türkçe açıklamaya çevirir
 */
export const getPriorityDescription = (priority: Priority): string => {
  const descriptions: Record<Priority, string> = {
    [Priority.LOW]: 'Düşük',
    [Priority.MEDIUM]: 'Orta',
    [Priority.HIGH]: 'Yüksek',
    [Priority.URGENT]: 'Acil'
  };
  return descriptions[priority];
};

/**
 * Rating'i yıldız sembolüne çevirir
 */
export const getRatingStars = (rating: Rating): string => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
};

// ===== TYPE GUARDS =====

/**
 * String'in geçerli bir AppointmentStatus olup olmadığını kontrol eder
 */
export const isValidAppointmentStatus = (status: string): status is AppointmentStatus => {
  return Object.values(AppointmentStatus).includes(status as AppointmentStatus);
};

/**
 * String'in geçerli bir UserType olup olmadığını kontrol eder
 */
export const isValidUserType = (userType: string): userType is UserTypeString => {
  return ['driver', 'mechanic', 'admin'].includes(userType);
};

/**
 * String'in geçerli bir ServiceType olup olmadığını kontrol eder
 */
export const isValidServiceType = (serviceType: string): serviceType is ServiceType => {
  return Object.values(ServiceType).includes(serviceType as ServiceType);
};

// ===== EXPORT ALL =====
export default {
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
};
