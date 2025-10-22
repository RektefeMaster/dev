"use strict";
/**
 * REKTEFE PROJESİ - MERKEZİ ENUM TANIMLARI
 *
 * Bu dosya, tüm projelerde (backend, frontend) kullanılacak
 * ortak enum değerlerini içerir. Değişiklik yaparken tüm
 * projeleri güncellemeyi unutmayın.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidServiceCategory = exports.isValidServiceType = exports.isValidUserType = exports.isValidAppointmentStatus = exports.getRatingStars = exports.getPriorityDescription = exports.normalizeServiceCategories = exports.hasValidServiceCategory = exports.normalizeToServiceCategory = exports.getServiceTypeFromCategory = exports.getServiceCategoryFromType = exports.getServiceCategoryDescription = exports.getServiceTypeDescription = exports.getUserTypeDescription = exports.getAppointmentStatusDescription = exports.WorkingDay = exports.FuelType = exports.Priority = exports.Rating = exports.PaymentStatus = exports.MessageType = exports.NotificationType = exports.SERVICE_CATEGORY_TURKISH_NAMES = exports.FAULT_CATEGORY_TO_SERVICE_CATEGORY = exports.SERVICE_TYPE_TO_CATEGORY = exports.ServiceCategory = exports.ServiceType = exports.UserType = exports.AppointmentStatus = void 0;
// ===== APPOINTMENT STATUS ENUM =====
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["REQUESTED"] = "TALEP_EDILDI";
    AppointmentStatus["SCHEDULED"] = "PLANLANDI";
    AppointmentStatus["IN_SERVICE"] = "SERVISTE";
    AppointmentStatus["PAYMENT_PENDING"] = "ODEME_BEKLIYOR";
    AppointmentStatus["COMPLETED"] = "TAMAMLANDI";
    AppointmentStatus["CANCELLED"] = "IPTAL_EDILDI";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
// ===== USER TYPE ENUM =====
var UserType;
(function (UserType) {
    UserType["DRIVER"] = "driver";
    UserType["MECHANIC"] = "mechanic";
    UserType["ADMIN"] = "admin";
})(UserType || (exports.UserType = UserType = {}));
// ===== SERVICE TYPE ENUM =====
var ServiceType;
(function (ServiceType) {
    // Ana hizmet kategorileri (kod değerleri)
    ServiceType["GENERAL_MAINTENANCE"] = "genel-bakim";
    ServiceType["HEAVY_MAINTENANCE"] = "agir-bakim";
    ServiceType["ALIGNMENT"] = "alt-takim";
    ServiceType["SUSPENSION"] = "ust-takim";
    ServiceType["BODY_PAINT"] = "kaporta-boya";
    ServiceType["ELECTRICAL"] = "elektrik-elektronik";
    ServiceType["PARTS"] = "yedek-parca";
    ServiceType["TIRE_SERVICE"] = "lastik";
    ServiceType["EXHAUST"] = "egzoz-emisyon";
    ServiceType["CAR_WASH"] = "arac-yikama";
    ServiceType["TOWING"] = "cekici";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
// ===== SERVICE CATEGORY ENUM =====
/**
 * Ana hizmet kategorileri - Mechanic'lerin sunduğu hizmet türleri
 * Bu kategoriler, ServiceType enum'undaki detaylı hizmetleri gruplandırır
 */
var ServiceCategory;
(function (ServiceCategory) {
    ServiceCategory["REPAIR"] = "repair";
    ServiceCategory["TOWING"] = "towing";
    ServiceCategory["WASH"] = "wash";
    ServiceCategory["TIRE"] = "tire";
    ServiceCategory["BODYWORK"] = "bodywork"; // Kaporta & Boya
})(ServiceCategory || (exports.ServiceCategory = ServiceCategory = {}));
// ===== SERVICE TYPE TO CATEGORY MAPPING =====
/**
 * ServiceType'ı ilgili ServiceCategory'ye eşleştirir
 * Bu mapping, appointment'ların hangi kategori ustalarına gösterileceğini belirler
 */
exports.SERVICE_TYPE_TO_CATEGORY = {
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
exports.FAULT_CATEGORY_TO_SERVICE_CATEGORY = {
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
exports.SERVICE_CATEGORY_TURKISH_NAMES = {
    [ServiceCategory.REPAIR]: ['Tamir ve Bakım', 'Tamir & Bakım', 'Tamir', 'Bakım', 'repair'],
    [ServiceCategory.TOWING]: ['Çekici', 'Çekici Hizmeti', 'Kurtarma', 'towing'],
    [ServiceCategory.WASH]: ['Araç Yıkama', 'Yıkama', 'wash'],
    [ServiceCategory.TIRE]: ['Lastik', 'Lastik Servisi', 'Lastik & Parça', 'tire'],
    [ServiceCategory.BODYWORK]: ['Kaporta & Boya', 'Kaporta', 'Boya', 'bodywork']
};
// ===== NOTIFICATION TYPE ENUM =====
var NotificationType;
(function (NotificationType) {
    NotificationType["APPOINTMENT_REQUEST"] = "appointment_request";
    NotificationType["APPOINTMENT_CONFIRMED"] = "appointment_confirmed";
    NotificationType["APPOINTMENT_REJECTED"] = "appointment_rejected";
    NotificationType["APPOINTMENT_REMINDER"] = "appointment_reminder";
    NotificationType["PAYMENT_RECEIVED"] = "payment_received";
    NotificationType["SERVICE_COMPLETED"] = "service_completed";
    NotificationType["SYSTEM_NOTIFICATION"] = "system_notification";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// ===== MESSAGE TYPE ENUM =====
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["FILE"] = "file";
    MessageType["LOCATION"] = "location";
})(MessageType || (exports.MessageType = MessageType = {}));
// ===== PAYMENT STATUS ENUM =====
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PROCESSING"] = "PROCESSING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
// ===== RATING ENUM =====
var Rating;
(function (Rating) {
    Rating[Rating["ONE_STAR"] = 1] = "ONE_STAR";
    Rating[Rating["TWO_STARS"] = 2] = "TWO_STARS";
    Rating[Rating["THREE_STARS"] = 3] = "THREE_STARS";
    Rating[Rating["FOUR_STARS"] = 4] = "FOUR_STARS";
    Rating[Rating["FIVE_STARS"] = 5] = "FIVE_STARS";
})(Rating || (exports.Rating = Rating = {}));
// ===== PRIORITY ENUM =====
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["URGENT"] = "urgent";
})(Priority || (exports.Priority = Priority = {}));
// ===== VEHICLE FUEL TYPE ENUM =====
var FuelType;
(function (FuelType) {
    FuelType["GASOLINE"] = "gasoline";
    FuelType["DIESEL"] = "diesel";
    FuelType["ELECTRIC"] = "electric";
    FuelType["HYBRID"] = "hybrid";
})(FuelType || (exports.FuelType = FuelType = {}));
// ===== WORKING DAYS ENUM =====
var WorkingDay;
(function (WorkingDay) {
    WorkingDay["MONDAY"] = "monday";
    WorkingDay["TUESDAY"] = "tuesday";
    WorkingDay["WEDNESDAY"] = "wednesday";
    WorkingDay["THURSDAY"] = "thursday";
    WorkingDay["FRIDAY"] = "friday";
    WorkingDay["SATURDAY"] = "saturday";
    WorkingDay["SUNDAY"] = "sunday";
})(WorkingDay || (exports.WorkingDay = WorkingDay = {}));
// ===== HELPER FUNCTIONS =====
/**
 * Appointment status'u Türkçe açıklamaya çevirir
 */
const getAppointmentStatusDescription = (status) => {
    const descriptions = {
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
exports.getAppointmentStatusDescription = getAppointmentStatusDescription;
/**
 * User type'ı Türkçe açıklamaya çevirir
 */
const getUserTypeDescription = (userType) => {
    const descriptions = {
        [UserType.DRIVER]: 'Şoför',
        [UserType.MECHANIC]: 'Usta',
        [UserType.ADMIN]: 'Yönetici'
    };
    return descriptions[userType];
};
exports.getUserTypeDescription = getUserTypeDescription;
/**
 * Service type'ı Türkçe açıklamaya çevirir
 */
const getServiceTypeDescription = (serviceType) => {
    const descriptions = {
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
exports.getServiceTypeDescription = getServiceTypeDescription;
/**
 * Service category'yi Türkçe açıklamaya çevirir
 */
const getServiceCategoryDescription = (category) => {
    const descriptions = {
        [ServiceCategory.REPAIR]: 'Tamir ve Bakım',
        [ServiceCategory.TOWING]: 'Çekici Hizmeti',
        [ServiceCategory.WASH]: 'Araç Yıkama',
        [ServiceCategory.TIRE]: 'Lastik Servisi',
        [ServiceCategory.BODYWORK]: 'Kaporta & Boya'
    };
    return descriptions[category];
};
exports.getServiceCategoryDescription = getServiceCategoryDescription;
/**
 * ServiceType'dan ServiceCategory'yi döndürür
 */
const getServiceCategoryFromType = (serviceType) => {
    return exports.SERVICE_TYPE_TO_CATEGORY[serviceType];
};
exports.getServiceCategoryFromType = getServiceCategoryFromType;
/**
 * ServiceCategory'den ServiceType'a çevirir
 * Bir ServiceCategory için varsayılan ServiceType'ı döndürür
 */
const getServiceTypeFromCategory = (category) => {
    const categoryToTypeMapping = {
        [ServiceCategory.REPAIR]: ServiceType.GENERAL_MAINTENANCE,
        [ServiceCategory.BODYWORK]: ServiceType.BODY_PAINT,
        [ServiceCategory.TIRE]: ServiceType.TIRE_SERVICE,
        [ServiceCategory.WASH]: ServiceType.CAR_WASH,
        [ServiceCategory.TOWING]: ServiceType.TOWING
    };
    return categoryToTypeMapping[category] || ServiceType.GENERAL_MAINTENANCE;
};
exports.getServiceTypeFromCategory = getServiceTypeFromCategory;
/**
 * Herhangi bir string'i (Türkçe/İngilizce) ServiceCategory'ye çevirir
 * Mechanic'lerin serviceCategories array'indeki değerleri normalize etmek için kullanılır
 */
const normalizeToServiceCategory = (value) => {
    const lowercaseValue = value.toLowerCase().trim();
    // Direkt enum değeri mi?
    if (Object.values(ServiceCategory).includes(lowercaseValue)) {
        return lowercaseValue;
    }
    // Türkçe isimlerden kontrol et
    for (const [category, names] of Object.entries(exports.SERVICE_CATEGORY_TURKISH_NAMES)) {
        if (names.some(name => name.toLowerCase() === lowercaseValue)) {
            return category;
        }
    }
    // Kısmi eşleşme (regex ile)
    if (/tamir|bakım|repair/.test(lowercaseValue))
        return ServiceCategory.REPAIR;
    if (/çekici|kurtarma|tow/.test(lowercaseValue))
        return ServiceCategory.TOWING;
    if (/yıkama|yikama|wash/.test(lowercaseValue))
        return ServiceCategory.WASH;
    if (/lastik|tire/.test(lowercaseValue))
        return ServiceCategory.TIRE;
    if (/kaporta|boya|bodywork/.test(lowercaseValue))
        return ServiceCategory.BODYWORK;
    return null;
};
exports.normalizeToServiceCategory = normalizeToServiceCategory;
/**
 * ServiceCategory array'ini kontrol eder ve en az bir geçerli kategori içerip içermediğini belirler
 */
const hasValidServiceCategory = (categories) => {
    return categories.some(cat => (0, exports.normalizeToServiceCategory)(cat) !== null);
};
exports.hasValidServiceCategory = hasValidServiceCategory;
/**
 * ServiceCategory array'ini normalize eder (Türkçe/İngilizce karışıklığını temizler)
 */
const normalizeServiceCategories = (categories) => {
    const normalized = categories
        .map(cat => (0, exports.normalizeToServiceCategory)(cat))
        .filter((cat) => cat !== null);
    // Tekrarları kaldır
    return Array.from(new Set(normalized));
};
exports.normalizeServiceCategories = normalizeServiceCategories;
/**
 * Priority'yi Türkçe açıklamaya çevirir
 */
const getPriorityDescription = (priority) => {
    const descriptions = {
        [Priority.LOW]: 'Düşük',
        [Priority.MEDIUM]: 'Orta',
        [Priority.HIGH]: 'Yüksek',
        [Priority.URGENT]: 'Acil'
    };
    return descriptions[priority];
};
exports.getPriorityDescription = getPriorityDescription;
/**
 * Rating'i yıldız sembolüne çevirir
 */
const getRatingStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
};
exports.getRatingStars = getRatingStars;
// ===== TYPE GUARDS =====
/**
 * String'in geçerli bir AppointmentStatus olup olmadığını kontrol eder
 */
const isValidAppointmentStatus = (status) => {
    return Object.values(AppointmentStatus).includes(status);
};
exports.isValidAppointmentStatus = isValidAppointmentStatus;
/**
 * String'in geçerli bir UserType olup olmadığını kontrol eder
 */
const isValidUserType = (userType) => {
    return ['driver', 'mechanic', 'admin'].includes(userType);
};
exports.isValidUserType = isValidUserType;
/**
 * String'in geçerli bir ServiceType olup olmadığını kontrol eder
 */
const isValidServiceType = (serviceType) => {
    return Object.values(ServiceType).includes(serviceType);
};
exports.isValidServiceType = isValidServiceType;
/**
 * String'in geçerli bir ServiceCategory olup olmadığını kontrol eder
 */
const isValidServiceCategory = (category) => {
    return Object.values(ServiceCategory).includes(category);
};
exports.isValidServiceCategory = isValidServiceCategory;
// ===== EXPORT ALL =====
exports.default = {
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
    getAppointmentStatusDescription: exports.getAppointmentStatusDescription,
    getUserTypeDescription: exports.getUserTypeDescription,
    getServiceTypeDescription: exports.getServiceTypeDescription,
    getServiceCategoryDescription: exports.getServiceCategoryDescription,
    getServiceCategoryFromType: exports.getServiceCategoryFromType,
    getServiceTypeFromCategory: exports.getServiceTypeFromCategory,
    normalizeToServiceCategory: exports.normalizeToServiceCategory,
    hasValidServiceCategory: exports.hasValidServiceCategory,
    normalizeServiceCategories: exports.normalizeServiceCategories,
    getPriorityDescription: exports.getPriorityDescription,
    getRatingStars: exports.getRatingStars,
    isValidAppointmentStatus: exports.isValidAppointmentStatus,
    isValidUserType: exports.isValidUserType,
    isValidServiceType: exports.isValidServiceType,
    isValidServiceCategory: exports.isValidServiceCategory,
    SERVICE_TYPE_TO_CATEGORY: exports.SERVICE_TYPE_TO_CATEGORY,
    FAULT_CATEGORY_TO_SERVICE_CATEGORY: exports.FAULT_CATEGORY_TO_SERVICE_CATEGORY,
    SERVICE_CATEGORY_TURKISH_NAMES: exports.SERVICE_CATEGORY_TURKISH_NAMES
};
