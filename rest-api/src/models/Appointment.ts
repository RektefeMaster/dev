import mongoose, { Document, Schema } from 'mongoose';

interface INotificationSettings {
  oneHourBefore: boolean;
  twoHoursBefore: boolean;
  oneDayBefore: boolean;
  customTime?: number;
}

export interface IAppointment extends Document {
  userId: mongoose.Types.ObjectId; // Şöför/Müşteri ID'si
  mechanicId: mongoose.Types.ObjectId; // Usta/Dükkan ID'si
  serviceType: string; // Hizmet tipi
  appointmentDate: Date; // Randevu tarihi
  timeSlot: string; // Randevu saati
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'rejected';
  description: string; // Randevu açıklaması
  mechanicNotes?: string; // Usta notları
  rejectionReason?: string; // Red gerekçesi
  vehicleId: mongoose.Types.ObjectId; // Araç ID'si (required)
  estimatedDuration?: number; // Tahmini süre (dakika)
  actualDuration?: number; // Gerçek süre (dakika)
  price?: number; // Belirlenen ücret
  paymentStatus: 'pending' | 'paid' | 'completed'; // Ödeme durumu
  paymentDate?: Date; // Ödeme tarihi
  completionDate?: Date; // İş tamamlanma tarihi
  notificationSettings: INotificationSettings;
  shareContactInfo: boolean; // İletişim bilgisi paylaşımı
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  mechanicId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Mechanic', 
    required: true 
  },
  serviceType: { 
    type: String, 
    required: true 
  },
  appointmentDate: { 
    type: Date, 
    required: true 
  },
  timeSlot: { 
    type: String, 
    required: true,
    default: '09:00'
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  description: { 
    type: String, 
    required: false,
    default: ''
  },
  mechanicNotes: { 
    type: String 
  },
  rejectionReason: { 
    type: String 
  },
  vehicleId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vehicle',
    required: true 
  },
  estimatedDuration: { 
    type: Number 
  },
  actualDuration: { 
    type: Number 
  },
  price: { 
    type: Number 
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'completed'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  completionDate: {
    type: Date
  },
  notificationSettings: {
    oneHourBefore: {
      type: Boolean,
      default: true
    },
    twoHoursBefore: {
      type: Boolean,
      default: false
    },
    oneDayBefore: {
      type: Boolean,
      default: false
    },
    customTime: {
      type: Number
    }
  },
  shareContactInfo: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Index'ler
AppointmentSchema.index({ 
  mechanicId: 1, 
  appointmentDate: 1, 
  timeSlot: 1, 
  status: 1 
});

AppointmentSchema.index({ userId: 1, appointmentDate: -1 });
AppointmentSchema.index({ mechanicId: 1, appointmentDate: -1 });
AppointmentSchema.index({ 
  appointmentDate: 1, 
  status: 1, 
  'notificationSettings.oneHourBefore': 1 
});

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
