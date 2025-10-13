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
  // Ana hizmet kategorileri (kod değerleri)
  GENERAL_MAINTENANCE = 'genel-bakim',
  HEAVY_MAINTENANCE = 'agir-bakim', 
  ALIGNMENT = 'alt-takim',
  SUSPENSION = 'ust-takim',
  BODY_PAINT = 'kaporta-boya',
  ELECTRICAL = 'elektrik-elektronik',
  PARTS = 'yedek-parca',
  TIRE_SERVICE = 'lastik',
  EXHAUST = 'egzoz-emisyon',
  CAR_WASH = 'arac-yikama',
  TOWING = 'cekici'
}

// ===== SERVICE CATEGORY ENUM =====
/**
 * Ana hizmet kategorileri - Mechanic'lerin sunduğu hizmet türleri
 * Bu kategoriler, ServiceType enum'undaki detaylı hizmetleri gruplandırır
 */
export enum ServiceCategory {
  REPAIR = 'repair',           // Tamir ve Bakım (genel, ağır bakım, alt takım, üst takım, elektrik, parça, egzoz)
  TOWING = 'towing',           // Çekici Hizmeti
  WASH = 'wash',               // Araç Yıkama
  TIRE = 'tire',               // Lastik Hizmetleri
  BODYWORK = 'bodywork'        // Kaporta & Boya
}

// ===== SERVICE TYPE TO CATEGORY MAPPING =====
/**
 * ServiceType'ı ilgili ServiceCategory'ye eşleştirir
 * Bu mapping, appointment'ların hangi kategori ustalarına gösterileceğini belirler
 */
export const SERVICE_TYPE_TO_CATEGORY: Record<ServiceType, ServiceCategory> = {
  // Repair kategorisi
  [ServiceType.GENERAL_MAINTENANCE]: ServiceCategory.REPAIR,
  [ServiceType.HEAVY_MAINTENANCE]: ServiceCategory.REPAIR,
  [ServiceType.ALIGNMENT]: ServiceCategory.REPAIR,
  [ServiceType.SUSPENSION]: ServiceCategory.REPAIR,
  [ServiceType.ELECTRICAL]: ServiceCategory.REPAIR,
  [ServiceType.PARTS]: ServiceCategory.REPAIR,
  [ServiceType.EXHAUST]: ServiceCategory.REPAIR,
  
  // Bodywork kategorisi
  [ServiceType.BODY_PAINT]: ServiceCategory.BODYWORK,
  
  // Tire kategorisi
  [ServiceType.TIRE_SERVICE]: ServiceCategory.TIRE,
  
  // Wash kategorisi
  [ServiceType.CAR_WASH]: ServiceCategory.WASH,
  
  // Towing kategorisi
  [ServiceType.TOWING]: ServiceCategory.TOWING
};

// ===== FAULT REPORT CATEGORY TO SERVICE CATEGORY MAPPING =====
/**
 * Arıza bildirimi kategorilerini ServiceCategory'ye eşleştirir
 * Bu mapping, fault report'ların hangi kategori ustalarına gösterileceğini belirler
 */
export const FAULT_CATEGORY_TO_SERVICE_CATEGORY: Record<string, ServiceCategory> = {
  // Repair kategorisi
  'Tamir ve Bakım': ServiceCategory.REPAIR, // Frontend'den gelen ana kategori
  'Ağır Bakım': ServiceCategory.REPAIR,
  'Genel Bakım': ServiceCategory.REPAIR,
  'Üst Takım': ServiceCategory.REPAIR,
  'Alt Takım': ServiceCategory.REPAIR,
  'Elektrik-Elektronik': ServiceCategory.REPAIR,
  'Yedek Parça': ServiceCategory.REPAIR,
  'Egzoz & Emisyon': ServiceCategory.REPAIR,
  'Ekspertiz': ServiceCategory.REPAIR,
  'Sigorta & Kasko': ServiceCategory.REPAIR,
  'Motor Tamiri': ServiceCategory.REPAIR,
  'Fren Sistemi': ServiceCategory.REPAIR,
  
  // Bodywork kategorisi
  'Kaporta/Boya': ServiceCategory.BODYWORK,
  'Kaporta & Boya': ServiceCategory.BODYWORK,
  
  // Tire kategorisi
  'Lastik': ServiceCategory.TIRE,
  
  // Wash kategorisi
  'Araç Yıkama': ServiceCategory.WASH,
  
  // Towing kategorisi
  'Çekici': ServiceCategory.TOWING
};

// ===== TURKISH CATEGORY NAMES =====
/**
 * Mechanic'lerin kayıt sırasında kullanabileceği Türkçe kategori isimleri
 * Bu isimler backend'de serviceCategories array'ine kaydedilir
 */
export const SERVICE_CATEGORY_TURKISH_NAMES: Record<ServiceCategory, string[]> = {
  [ServiceCategory.REPAIR]: ['Tamir ve Bakım', 'Tamir & Bakım', 'Tamir', 'Bakım', 'repair'],
  [ServiceCategory.TOWING]: ['Çekici', 'Çekici Hizmeti', 'Kurtarma', 'towing'],
  [ServiceCategory.WASH]: ['Araç Yıkama', 'Yıkama', 'wash'],
  [ServiceCategory.TIRE]: ['Lastik', 'Lastik Servisi', 'Lastik & Parça', 'tire'],
  [ServiceCategory.BODYWORK]: ['Kaporta & Boya', 'Kaporta', 'Boya', 'bodywork']
};

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
    // Ana hizmet kategorileri
    [ServiceType.GENERAL_MAINTENANCE]: 'Genel Bakım',
    [ServiceType.HEAVY_MAINTENANCE]: 'Ağır Bakım',
    [ServiceType.ALIGNMENT]: 'Alt Takım',
    [ServiceType.SUSPENSION]: 'Üst Takım',
    [ServiceType.BODY_PAINT]: 'Kaporta & Boya',
    [ServiceType.ELECTRICAL]: 'Elektrik-Elektronik',
    [ServiceType.PARTS]: 'Yedek Parça',
    [ServiceType.TIRE_SERVICE]: 'Lastik Servisi',
    [ServiceType.EXHAUST]: 'Egzoz & Emisyon',
    [ServiceType.CAR_WASH]: 'Araç Yıkama',
    [ServiceType.TOWING]: 'Çekici'
  };
  return descriptions[serviceType] || serviceType;
};

/**
 * Service category'yi Türkçe açıklamaya çevirir
 */
export const getServiceCategoryDescription = (category: ServiceCategory): string => {
  const descriptions: Record<ServiceCategory, string> = {
    [ServiceCategory.REPAIR]: 'Tamir ve Bakım',
    [ServiceCategory.TOWING]: 'Çekici Hizmeti',
    [ServiceCategory.WASH]: 'Araç Yıkama',
    [ServiceCategory.TIRE]: 'Lastik Servisi',
    [ServiceCategory.BODYWORK]: 'Kaporta & Boya'
  };
  return descriptions[category];
};

/**
 * ServiceType'dan ServiceCategory'yi döndürür
 */
export const getServiceCategoryFromType = (serviceType: ServiceType): ServiceCategory => {
  return SERVICE_TYPE_TO_CATEGORY[serviceType];
};

/**
 * ServiceCategory'den ServiceType'a çevirir
 * Bir ServiceCategory için varsayılan ServiceType'ı döndürür
 */
export const getServiceTypeFromCategory = (category: ServiceCategory): ServiceType => {
  const categoryToTypeMapping: Record<ServiceCategory, ServiceType> = {
    [ServiceCategory.REPAIR]: ServiceType.GENERAL_MAINTENANCE,
    [ServiceCategory.BODYWORK]: ServiceType.BODY_PAINT,
    [ServiceCategory.TIRE]: ServiceType.TIRE_SERVICE,
    [ServiceCategory.WASH]: ServiceType.CAR_WASH,
    [ServiceCategory.TOWING]: ServiceType.TOWING
  };
  
  return categoryToTypeMapping[category] || ServiceType.GENERAL_MAINTENANCE;
};

/**
 * Herhangi bir string'i (Türkçe/İngilizce) ServiceCategory'ye çevirir
 * Mechanic'lerin serviceCategories array'indeki değerleri normalize etmek için kullanılır
 */
export const normalizeToServiceCategory = (value: string): ServiceCategory | null => {
  const lowercaseValue = value.toLowerCase().trim();
  
  // Direkt enum değeri mi?
  if (Object.values(ServiceCategory).includes(lowercaseValue as ServiceCategory)) {
    return lowercaseValue as ServiceCategory;
  }
  
  // Türkçe isimlerden kontrol et
  for (const [category, names] of Object.entries(SERVICE_CATEGORY_TURKISH_NAMES)) {
    if (names.some(name => name.toLowerCase() === lowercaseValue)) {
      return category as ServiceCategory;
    }
  }
  
  // Kısmi eşleşme (regex ile)
  if (/tamir|bakım|repair/.test(lowercaseValue)) return ServiceCategory.REPAIR;
  if (/çekici|kurtarma|tow/.test(lowercaseValue)) return ServiceCategory.TOWING;
  if (/yıkama|yikama|wash/.test(lowercaseValue)) return ServiceCategory.WASH;
  if (/lastik|tire/.test(lowercaseValue)) return ServiceCategory.TIRE;
  if (/kaporta|boya|bodywork/.test(lowercaseValue)) return ServiceCategory.BODYWORK;
  
  return null;
};

/**
 * ServiceCategory array'ini kontrol eder ve en az bir geçerli kategori içerip içermediğini belirler
 */
export const hasValidServiceCategory = (categories: string[]): boolean => {
  return categories.some(cat => normalizeToServiceCategory(cat) !== null);
};

/**
 * ServiceCategory array'ini normalize eder (Türkçe/İngilizce karışıklığını temizler)
 */
export const normalizeServiceCategories = (categories: string[]): ServiceCategory[] => {
  const normalized = categories
    .map(cat => normalizeToServiceCategory(cat))
    .filter((cat): cat is ServiceCategory => cat !== null);
  
  // Tekrarları kaldır
  return Array.from(new Set(normalized));
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

/**
 * String'in geçerli bir ServiceCategory olup olmadığını kontrol eder
 */
export const isValidServiceCategory = (category: string): category is ServiceCategory => {
  return Object.values(ServiceCategory).includes(category as ServiceCategory);
};

// ===== EXPORT ALL =====
export default {
  AppointmentStatus,
  UserType,
  ServiceType,
  ServiceCategory,
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
  getServiceCategoryDescription,
  getServiceCategoryFromType,
  getServiceTypeFromCategory,
  normalizeToServiceCategory,
  hasValidServiceCategory,
  normalizeServiceCategories,
  getPriorityDescription,
  getRatingStars,
  isValidAppointmentStatus,
  isValidUserType,
  isValidServiceType,
  isValidServiceCategory,
  SERVICE_TYPE_TO_CATEGORY,
  FAULT_CATEGORY_TO_SERVICE_CATEGORY,
  SERVICE_CATEGORY_TURKISH_NAMES
};
