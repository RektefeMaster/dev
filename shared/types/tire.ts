/**
 * Lastik Hizmeti Tipleri
 * Rektefe-dv ve Rektefe-us uygulamaları için ortak lastik hizmeti tipleri
 */

// Lastik Hizmet Türleri
export enum TireServiceType {
  CHANGE = 'tire_change',
  REPAIR = 'tire_repair',
  BALANCE = 'tire_balance',
  ALIGNMENT = 'tire_alignment',
  INSPECTION = 'tire_inspection',
  PURCHASE = 'tire_purchase',
  ROTATION = 'tire_rotation',
  PRESSURE_CHECK = 'tire_pressure_check'
}

// Lastik Durumu
export enum TireCondition {
  NEW = 'new',
  USED = 'used',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  DAMAGED = 'damaged',
  WORN = 'worn'
}

// Lastik İşi Durumu
export enum TireServiceStatus {
  REQUESTED = 'TALEP_EDILDI',
  PENDING = 'pending',
  PRICE_QUOTED = 'price_quoted',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Lastik Mevsimi
export enum TireSeason {
  SUMMER = 'summer',
  WINTER = 'winter',
  ALL_SEASON = 'all-season'
}

// Lastik Detayları
export interface TireDetails {
  size: string; // Örn: "205/55 R16"
  brand?: string;
  model?: string;
  season?: TireSeason;
  condition: TireCondition;
  quantity: number;
  productionYear?: number;
  notes?: string;
}

// Araç Bilgileri
export interface VehicleInfo {
  vehicleId?: string;
  brand: string;
  model: string;
  year: string;
  engine?: string;
  plateNumber?: string;
}

// Konum Bilgileri
export interface LocationInfo {
  address?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Fiyat Teklifi
export interface PriceQuote {
  amount: number;
  breakdown?: {
    labor?: number;
    parts?: number;
    tax?: number;
  };
  notes?: string;
  validUntil?: Date;
  createdAt: Date;
  createdBy: string;
}

// Garanti Bilgileri
export interface WarrantyInfo {
  duration: number; // ay cinsinden
  conditions: string[];
  startDate?: Date;
  endDate?: Date;
}

// Parça Bilgisi
export interface PartInfo {
  name: string;
  quantity: number;
  price: number;
  status: 'needed' | 'ordered' | 'received' | 'installed';
  brand?: string;
  model?: string;
}

// Lastik Hizmet Talebi
export interface TireServiceRequest {
  _id: string;
  userId: string;
  mechanicId?: string;
  serviceType: TireServiceType;
  vehicleInfo: VehicleInfo;
  tireDetails: TireDetails;
  status: TireServiceStatus;
  location: LocationInfo;
  isMobileService: boolean;
  isUrgent: boolean;
  requestedAt: Date;
  scheduledFor?: Date;
  estimatedTime?: string;
  estimatedDuration?: number; // dakika
  price?: number;
  priceQuote?: PriceQuote;
  quotedPrice?: number;
  finalPrice?: number;
  description?: string;
  specialRequests?: string;
  customerPhone?: string;
  customerName?: string;
  photos?: string[];
  parts?: PartInfo[];
  warrantyInfo?: WarrantyInfo;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Lastik Sağlık Kaydı
export interface TireHealthRecord {
  _id: string;
  vehicleId: string;
  userId: string;
  mechanicId: string;
  checkDate: Date;
  treadDepth: [number, number, number, number]; // FL, FR, RL, RR (mm)
  pressure: [number, number, number, number]; // FL, FR, RL, RR (PSI veya Bar)
  condition: [TireCondition, TireCondition, TireCondition, TireCondition];
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  photos?: string[];
  recommendations: string[];
  nextCheckDate?: Date;
  nextCheckKm?: number;
  issues?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Lastik İşi İstatistikleri
export interface TireServiceStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  todayJobs: number;
  weekJobs: number;
  monthJobs: number;
  revenue?: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  topServices: {
    serviceType: TireServiceType;
    count: number;
  }[];
  averageRating?: number;
  customerSatisfaction?: number;
}

// API Response Tipleri
export interface TireServiceResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
}

// Lastik Bakım Hatırlatıcısı
export interface TireMaintenanceReminder {
  _id: string;
  userId: string;
  vehicleId: string;
  reminderType: 'seasonal_change' | 'pressure_check' | 'rotation' | 'inspection';
  scheduledDate: Date;
  message: string;
  sent: boolean;
  sentAt?: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}

// Lastik Stok Bilgisi (Usta için)
export interface TireStock {
  _id: string;
  mechanicId: string;
  brand: string;
  model: string;
  size: string;
  season: TireSeason;
  quantity: number;
  price: number;
  condition: TireCondition;
  location?: string; // Depodaki konum
  supplier?: string;
  purchaseDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Fiyat Hesaplama Parametreleri
export interface PriceCalculationParams {
  serviceType: TireServiceType;
  tireSize: string;
  quantity: number;
  isMobileService: boolean;
  isUrgent: boolean;
  includesParts: boolean;
  distance?: number; // km (mobil hizmet için)
}

