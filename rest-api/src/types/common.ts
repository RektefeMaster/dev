export interface IMessage {
  _id: string;
  conversationId?: string;
  receiverId?: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation {
  _id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

export enum FaultReportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface FaultQuote {
  _id: string;
  faultReportId: string;
  mechanicId: string;
  mechanicName: string;
  mechanicPhone: string;
  quoteAmount: number;
  price: number;
  description: string;
  estimatedDuration: number;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface MechanicResponse {
  _id: string;
  mechanicId: string;
  faultReportId: string;
  responseType: string;
  message: string;
  price?: number;
  estimatedDuration?: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface LocationDetails {
  address?: string;
  city: string;
  district: string;
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
}

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  userId: string;
  faultReportId?: string;
  vehicleId?: string;
  mechanicId?: string;
  quoteAmount?: number;
  type: 'fault_report' | 'appointment' | 'message' | 'payment';
}

// ServiceType artık shared/types/enums.ts'de merkezi olarak tanımlı
// Re-export for backward compatibility
export { ServiceType, ServiceCategory } from '../../../shared/types/enums';
