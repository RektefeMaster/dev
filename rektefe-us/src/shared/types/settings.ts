// Settings Types for Rektefe-US

export interface NotificationSettings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  appointmentNotifications: boolean;
  paymentNotifications: boolean;
  messageNotifications: boolean;
  systemNotifications: boolean;
  marketingNotifications: boolean;
  soundAlerts: boolean;
  vibrationAlerts: boolean;
}

export interface PrivacySettings {
  locationSharing: boolean;
  profileVisibility: boolean;
  emailHidden: boolean;
  phoneHidden: boolean;
}

export interface JobSettings {
  autoAcceptJobs: boolean;
  isAvailable: boolean;
  workingHours: string; // JSON string
}

export interface AppSettings {
  darkMode: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  sessionTimeout: number; // minutes
}

export interface UserSettings {
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  jobSettings: JobSettings;
  appSettings: AppSettings;
  securitySettings: SecuritySettings;
}

// API Response Types
export interface SettingsResponse {
  success: boolean;
  message: string;
  data: UserSettings;
}

export interface UpdateSettingsRequest {
  notificationSettings?: Partial<NotificationSettings>;
  privacySettings?: Partial<PrivacySettings>;
  jobSettings?: Partial<JobSettings>;
  appSettings?: Partial<AppSettings>;
  securitySettings?: Partial<SecuritySettings>;
}

// Default Settings
export const defaultNotificationSettings: NotificationSettings = {
  pushNotifications: true,
  emailUpdates: true,
  appointmentNotifications: true,
  paymentNotifications: true,
  messageNotifications: true,
  systemNotifications: true,
  marketingNotifications: false,
  soundAlerts: true,
  vibrationAlerts: true,
};

export const defaultPrivacySettings: PrivacySettings = {
  locationSharing: false,
  profileVisibility: true,
  emailHidden: false,
  phoneHidden: false,
};

export const defaultJobSettings: JobSettings = {
  autoAcceptJobs: false,
  isAvailable: true,
  workingHours: '',
};

export const defaultAppSettings: AppSettings = {
  darkMode: false,
  language: 'tr',
  theme: 'light',
};

export const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
  biometricEnabled: false,
  sessionTimeout: 30,
};

export const defaultUserSettings: UserSettings = {
  notificationSettings: defaultNotificationSettings,
  privacySettings: defaultPrivacySettings,
  jobSettings: defaultJobSettings,
  appSettings: defaultAppSettings,
  securitySettings: defaultSecuritySettings,
};

// Service Categories
export interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  isSelected: boolean;
}

// Help Center Types
export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  articles: HelpArticle[];
}

// Support Types
export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  sender: 'user' | 'support';
  message: string;
  attachments?: string[];
  createdAt: string;
}

// About App Types
export interface AppInfo {
  version: string;
  buildNumber: string;
  releaseDate: string;
  features: string[];
  changelog: string[];
}

// Language Options
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const supportedLanguages: LanguageOption[] = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

// Theme Options
export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  value: 'light' | 'dark' | 'auto';
}

export const themeOptions: ThemeOption[] = [
  { id: 'light', name: 'Açık Tema', description: 'Açık renk teması', value: 'light' },
  { id: 'dark', name: 'Karanlık Tema', description: 'Karanlık renk teması', value: 'dark' },
  { id: 'auto', name: 'Otomatik', description: 'Sistem ayarına göre', value: 'auto' },
];
