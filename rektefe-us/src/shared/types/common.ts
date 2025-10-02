// Kullanıcı tipleri
export interface User {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  userType: 'mechanic' | 'driver';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Usta özel bilgileri
export interface MechanicProfile extends User {
  userType: 'mechanic';
  experience: number; // yıl
  specialties: string[];
  city: string;
  address: string;
  isAvailable: boolean;
  rating: number;
  totalJobs: number;
  totalEarnings: number;
  bio?: string;
  workingHours?: string;
  services: ServiceCategory[];
  shopName?: string;
  vehicleBrands?: string[];
  serviceCategories?: string[];
  location?: {
    city: string;
    district: string;
    neighborhood: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    description: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

// ===== SERVİS KATEGORİLERİ VE HİZMETLER =====

export interface ServiceCategory {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  parentCategory?: string;
  subCategories?: ServiceCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  duration: number; // dakika cinsinden
  isActive: boolean;
  mechanicId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePackage {
  _id: string;
  name: string;
  description: string;
  services: string[]; // service ID'leri
  totalPrice: number;
  discount: number;
  isActive: boolean;
  mechanicId: string;
  createdAt: string;
  updatedAt: string;
}

// ===== MÜŞTERİ YÖNETİMİ =====

export interface Customer {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  avatar?: string;
  vehicles: string[]; // vehicle ID'leri
  totalSpent: number;
  lastVisit: string;
  notes: CustomerNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  _id: string;
  content: string;
  mechanicId: string;
  createdAt: string;
}

// ===== RANDEVU YÖNETİMİ =====

export interface Appointment {
  _id: string;
  serviceType: string;
  appointmentDate: string | Date;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'in-progress' | 'completed' | 'cancelled';
  price?: number;
  mechanicId: string;
  userId: string;
  vehicleId?: string;
  description: string;
  estimatedDuration?: number;
  actualDuration?: number;
  mechanicNotes?: string;
  rejectionReason?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Populated fields
  customer?: {
    _id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
  };
  
  vehicle?: {
    _id: string;
    brand: string;
    modelName: string;
    year: number;
    plateNumber: string;
    fuelType: string;
    engineType: string;
    transmission: string;
    package: string;
    color?: string;
    mileage?: number;
    lastMaintenanceDate?: string | Date;
    nextMaintenanceDate?: string | Date;
  };
  
  // Additional fields for API responses
  completionDate?: string | Date;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  customerName?: string;
  vehicleInfo?: string;
}

export interface ServicedVehicle {
  _id: string;
  brand: string;
  model: string;
  plateNumber: string;
  customerId: string;
  customerName: string;
  lastServiceDate: string;
  lastServiceType: string;
  totalServices: number;
  totalSpent: number;
}

// ===== DETAYLI FİNANSAL YÖNETİM =====

export interface DetailedEarnings {
  totalEarnings: number;
  totalServices: number;
  averageServicePrice: number;
  earningsByCategory: {
    category: string;
    amount: number;
    count: number;
  }[];
  earningsByDate: {
    date: string;
    amount: number;
    count: number;
  }[];
  topCustomers: {
    customerId: string;
    customerName: string;
    amount: number;
    count: number;
  }[];
}

export interface MonthlyEarnings {
  month: number;
  year: number;
  totalEarnings: number;
  totalServices: number;
  averageServicePrice: number;
  earningsByDay: {
    day: number;
    amount: number;
    count: number;
  }[];
}

export interface YearlyEarnings {
  year: number;
  totalEarnings: number;
  totalServices: number;
  averageServicePrice: number;
  earningsByMonth: {
    month: number;
    amount: number;
    count: number;
  }[];
}

export interface WithdrawalRequest {
  _id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

// ===== İSTATİSTİKLER VE RAPORLAR =====

export interface DashboardStats {
  todayEarnings: number;
  todayServices: number;
  monthlyEarnings: number;
  monthlyServices: number;
  totalCustomers: number;
  averageRating: number;
  pendingAppointments: number;
  activeJobs: number;
  recentActivity: {
    type: string;
    description: string;
    amount?: number;
    timestamp: string;
  }[];
}

export interface CustomerSatisfactionStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  recentReviews: {
    customerName: string;
    rating: number;
    comment: string;
    date: string;
  }[];
}

export interface ServicePerformanceStats {
  totalServices: number;
  averageServiceTime: number;
  servicesByCategory: {
    category: string;
    count: number;
    averagePrice: number;
    averageRating: number;
  }[];
  topPerformingServices: {
    serviceName: string;
    count: number;
    totalRevenue: number;
    averageRating: number;
  }[];
}

export interface RevenueAnalysis {
  totalRevenue: number;
  revenueGrowth: number; // yüzde
  revenueByPeriod: {
    period: string;
    amount: number;
    growth: number;
  }[];
  revenueByService: {
    serviceName: string;
    amount: number;
    percentage: number;
  }[];
  revenueByCustomer: {
    customerName: string;
    amount: number;
    percentage: number;
  }[];
}

// ===== GELİŞMİŞ ÖZELLİKLER =====

export interface WorkCalendar {
  date: string;
  appointments: Appointment[];
  availableSlots: {
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
  totalBookedHours: number;
  totalAvailableHours: number;
}

export interface AvailabilitySchedule {
  _id: string;
  mechanicId: string;
  dayOfWeek: number; // 0-6 (Pazar-Cumartesi)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  breakTimes: {
    startTime: string;
    endTime: string;
  }[];
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  paymentNotifications: boolean;
  marketingNotifications: boolean;
  reminderTime: number; // dakika cinsinden
}

// ===== RAPORLAMA =====

export interface Report {
  _id: string;
  type: string;
  title: string;
  dateRange: {
    start: string;
    end: string;
  };
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

// Araç bilgileri
export interface Vehicle {
  _id: string;
  driverId: string;
  brand: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  engineSize: string;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  mileage: number;
  lastMaintenance?: string;
  transmission?: 'manual' | 'automatic';
  bodyType?: string;
}

// Mesajlaşma
export interface Message {
  _id: string;
  conversationId: string;
  senderId: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
  receiverId: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
  content: string;
  messageType: 'text' | 'image' | 'file';
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  otherParticipant: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
    userType: string;
  };
  lastMessage?: {
    content: string;
    messageType: string;
    createdAt: string;
  };
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

// Değerlendirme ve yorumlar
export interface Rating {
  _id: string;
  id?: string; // Backend'den gelen alternatif id
  appointmentId: string;
  driverId: string;
  mechanicId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
  // Backend'den gelen populate edilmiş veriler
  customer?: {
    name: string;
    surname: string;
  };
  appointment?: {
    serviceType: string;
    date: string | Date;
  };
}

// Bildirimler
export interface Notification {
  _id: string;
  recipientId: string;
  recipientType: 'mechanic' | 'driver';
  title: string;
  message: string;
  type: string;
  read: boolean;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// Ödeme bilgileri
export interface Payment {
  _id: string;
  appointmentId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'wallet';
  transactionId?: string;
  createdAt: string;
}

// İş bilgileri
export interface MechanicJob {
  _id: string;
  mechanicId: string;
  appointmentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  description?: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

// Kazanç bilgileri
export interface MechanicEarning {
  _id: string;
  mechanicId: string;
  appointmentId: string;
  amount: number;
  type: 'appointment' | 'tip' | 'bonus';
  status: 'pending' | 'completed' | 'withdrawn';
  createdAt: string;
}

// API Response tipleri
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Navigasyon parametreleri
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  EmailVerification: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  Chat: { conversationId: string; otherParticipant: MechanicProfile };
  NewMessage: undefined;
  AppointmentDetail: { appointmentId: string };
  Appointments: undefined;
  Notifications: undefined;
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
  EmergencyNotification: undefined;
  TireService: undefined;
  // Yeni eklenen ekranlar
  QuickQuote: undefined;
  Customers: undefined;
  Reports: undefined;
  EndOfDay: undefined;
  Suppliers: undefined;
  [key: string]: undefined | { conversationId: string; otherParticipant: MechanicProfile } | { appointmentId: string } | { faultReportId: string } | { email: string } | { token: string };
};

export type DrawerParamList = {
  MainTabs: undefined;
  Messages: undefined;
  Calendar: undefined;
  FaultReports: undefined;
  Wallet: undefined;
  FinancialTracking: undefined;
  Profile: undefined;
  WorkingHours: undefined;
  Support: undefined;
  Settings: undefined;
  [key: string]: undefined;
};

export type TabParamList = {
  Home: undefined;
  TowingService: undefined;
  RepairService: undefined;
  WashService: undefined;
  TireService: undefined;
  Messages: undefined;
  Reports: undefined;
  Wallet: undefined;
  Profile: undefined;
  [key: string]: undefined;
};

// ===== GENEL TİP TANIMLARI =====

export interface DateRange {
  start: string;
  end: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
