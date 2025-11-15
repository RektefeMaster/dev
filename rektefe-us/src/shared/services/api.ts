/**
 * REKTEFE MECHANIC APP - API SERVICE FACADE
 * 
 * Bu dosya, tüm modüler API servislerini birleştiren facade'dir.
 * Backward compatibility için tüm servis metodlarını top-level'da export eder.
 */

// Import all service modules
import { AuthService } from './api/auth.service';
import { AppointmentService } from './api/appointment.service';
import { ProfileService } from './api/profile.service';
import { EarningsService } from './api/earnings.service';
import { MessageService } from './api/message.service';
import { NotificationService } from './api/notification.service';
import { CustomerService } from './api/customer.service';
import { FaultReportService } from './api/fault-report.service';
import { EmergencyService } from './api/emergency.service';
import { SettingsService } from './api/settings.service';
import { WalletService } from './api/wallet.service';
import { TireHotelService } from './api/tire-hotel.service';
import { BodyworkService } from './api/bodywork.service';
import { ElectricalService } from './api/electrical.service';
import { CarWashService } from './api/wash.service';
import { ReportService } from './api/report.service';
import { PartsService } from './api/parts.service';
import { TireService } from './api/tire.service';

// ===== FACADE - BACKWARD COMPATIBILITY =====

const apiService = {
  // Export all services as objects
  AuthService,
  AppointmentService,
  ProfileService,
  EarningsService,
  MessageService,
  NotificationService,
  CustomerService,
  FaultReportService,
  EmergencyService,
  SettingsService,
  WalletService,
  TireHotelService,
  BodyworkService,
  ElectricalService,
  CarWashService,
  ReportService,
  PartsService,
  TireService,
  
  // Spread all service methods to top level for backward compatibility
  ...AuthService,
  ...AppointmentService,
  ...ProfileService,
  ...EarningsService,
  ...MessageService,
  ...CustomerService,
  ...NotificationService,
  ...FaultReportService,
  ...EmergencyService,
  ...WalletService,
  ...TireHotelService,
  ...BodyworkService,
  ...ElectricalService,
  ...CarWashService,
  ...ReportService,
  ...PartsService,
  ...TireService,
  
  // Special methods
  handleError: AppointmentService.handleError,
  
  // Backward compatibility aliases
  getWashJobs: CarWashService.getCarWashJobs,
};

export default apiService;

// Named exports for direct service access
export {
  AuthService,
  AppointmentService,
  ProfileService,
  EarningsService,
  MessageService,
  NotificationService,
  CustomerService,
  FaultReportService,
  EmergencyService,
  SettingsService,
  WalletService,
  TireHotelService,
  BodyworkService,
  ElectricalService,
  CarWashService,
  ReportService,
  PartsService,
  TireService,
};
