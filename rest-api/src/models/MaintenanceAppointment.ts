import mongoose, { Schema, Document } from 'mongoose';

interface INotificationSettings {
  twoHoursBefore: boolean;
  oneHourBefore: boolean;
  oneDayBefore: boolean;
  customTime: boolean;
  customMinutes: number;
}

export interface IMaintenanceAppointment extends Document {
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  mechanicId?: mongoose.Types.ObjectId;
  serviceType: string;
  appointmentDate: Date;
  timeSlot?: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'rejected' | 'paid' | 'payment_pending';
  notes?: string;
  mechanicNotes?: string;
  rejectionReason?: string;
  
  // Tarih alanları
  createdAt: Date; // Randevu gönderme tarihi
  confirmedAt?: Date; // Onay tarihi
  inProgressAt?: Date; // İşlem başlama tarihi
  completionDate?: Date; // Tamamlanma tarihi
  cancellationDate?: Date; // İptal tarihi
  paymentDate?: Date; // Ödeme tarihi
  ratingDate?: Date; // Değerlendirme tarihi
  
  price?: number; // Mekaniğin belirlediği ücret
  estimatedDuration?: number; // Tahmini süre (dakika)
  notificationSettings: INotificationSettings;
  sharePhoneNumber: boolean;
  paymentStatus?: 'unpaid' | 'paid';
  updatedAt: Date;
}

const MaintenanceAppointmentSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  mechanicId: { type: Schema.Types.ObjectId, ref: 'Mechanic' },
  serviceType: { type: String, required: true },
  appointmentDate: { type: Date, required: true },
  timeSlot: { type: String, required: false },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected', 'paid', 'payment_pending'],
    default: 'pending'
  },
  notes: { type: String },
  mechanicNotes: { type: String },
  rejectionReason: { type: String },
  
  // Tarih alanları
  confirmedAt: { type: Date }, // Onay tarihi
  inProgressAt: { type: Date }, // İşlem başlama tarihi
  completionDate: { type: Date }, // Tamamlanma tarihi
  cancellationDate: { type: Date }, // İptal tarihi
  paymentDate: { type: Date }, // Ödeme tarihi
  ratingDate: { type: Date }, // Değerlendirme tarihi
  
  price: { type: Number }, // Mekaniğin belirlediği ücret
  estimatedDuration: { type: Number }, // Tahmini süre (dakika)
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  notificationSettings: {
    twoHoursBefore: {
      type: Boolean,
      default: true
    },
    oneHourBefore: {
      type: Boolean,
      default: true
    },
    oneDayBefore: {
      type: Boolean,
      default: false
    },
    customTime: {
      type: Boolean,
      default: false
    },
    customMinutes: {
      type: Number,
      default: 30
    }
  },
  sharePhoneNumber: { type: Boolean, default: false },
}, {
  timestamps: true
});

export default mongoose.model<IMaintenanceAppointment>('MaintenanceAppointment', MaintenanceAppointmentSchema); 