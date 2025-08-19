import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  recipientType: 'mechanic' | 'driver';
  title: string;
  message: string;
  type: 'appointment_request' | 'appointment_confirmed' | 'appointment_rejected' | 'reminder' | 'system';
  isRead: boolean;
  appointmentId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  data?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipientId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientType'
  },
  recipientType: {
    type: String,
    required: true,
    enum: ['mechanic', 'driver']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['appointment_request', 'appointment_confirmed', 'appointment_rejected', 'reminder', 'system']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  appointmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  data: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index'ler
notificationSchema.index({ recipientId: 1, recipientType: 1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
