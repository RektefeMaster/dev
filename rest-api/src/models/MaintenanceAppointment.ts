import mongoose, { Schema, Document } from 'mongoose';

interface INotificationSettings {
  twoHoursBefore: boolean;
  oneHourBefore: boolean;
  oneDayBefore: boolean;
  customTime?: number;
}

export interface IMaintenanceAppointment extends Document {
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  mechanicId?: mongoose.Types.ObjectId;
  serviceType: string;
  appointmentDate: Date;
  timeSlot?: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'rejected';
  notes?: string;
  mechanicNotes?: string;
  rejectionReason?: string;
  completionDate?: Date;
  cancellationDate?: Date;
  notificationSettings: INotificationSettings;
  sharePhoneNumber: boolean;
  createdAt: Date;
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
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  notes: { type: String },
  mechanicNotes: { type: String },
  rejectionReason: { type: String },
  completionDate: { type: Date },
  cancellationDate: { type: Date },
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
      type: Number
    }
  },
  sharePhoneNumber: { type: Boolean, default: false },
}, {
  timestamps: true
});

export default mongoose.model<IMaintenanceAppointment>('MaintenanceAppointment', MaintenanceAppointmentSchema); 