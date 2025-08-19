import mongoose, { Document, Schema } from 'mongoose';

interface INotificationSettings {
  oneHourBefore: boolean;
  twoHoursBefore: boolean;
  oneDayBefore: boolean;
  customTime?: number;
}

export interface IAppointment extends Document {
  userId: mongoose.Types.ObjectId;
  mechanicId: mongoose.Types.ObjectId;
  serviceType: string;
  appointmentDate: Date;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'in-progress' | 'completed' | 'cancelled';
  description: string;
  mechanicNotes?: string;
  rejectionReason?: string;
  vehicleId?: mongoose.Types.ObjectId;
  estimatedDuration?: number; // dakika cinsinden
  actualDuration?: number; // dakika cinsinden
  price?: number;
  notificationSettings: INotificationSettings;
  shareContactInfo: boolean;
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
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'rejected', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  description: { 
    type: String, 
    required: true 
  },
  mechanicNotes: { 
    type: String 
  },
  rejectionReason: { 
    type: String 
  },
  vehicleId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vehicle' 
  },
  estimatedDuration: { 
    type: Number, 
    default: 60 // varsayılan 1 saat
  },
  actualDuration: { 
    type: Number 
  },
  price: { 
    type: Number 
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

// Tarih ve saat bazında çakışma kontrolü için index
AppointmentSchema.index({ 
  mechanicId: 1, 
  appointmentDate: 1, 
  timeSlot: 1, 
  status: 1 
});

// Kullanıcı bazında randevu arama için index
AppointmentSchema.index({ userId: 1, appointmentDate: -1 });

// Usta bazında randevu arama için index
AppointmentSchema.index({ mechanicId: 1, appointmentDate: -1 });

// Yaklaşan randevular için index
AppointmentSchema.index({ 
  appointmentDate: 1, 
  status: 1, 
  'notificationSettings.oneHourBefore': 1 
});

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
