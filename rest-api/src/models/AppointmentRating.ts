import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointmentRating extends Document {
  appointmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  mechanicId: mongoose.Types.ObjectId;
  rating: number; // 1-5 arası
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  canRate: boolean; // 3 gün içinde değerlendirme yapılabilir mi?
}

const appointmentRatingSchema = new Schema<IAppointmentRating>({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  },
  canRate: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index'ler
appointmentRatingSchema.index({ appointmentId: 1, userId: 1 }, { unique: true });
appointmentRatingSchema.index({ mechanicId: 1 });
appointmentRatingSchema.index({ createdAt: -1 });

export const AppointmentRating = mongoose.model<IAppointmentRating>('AppointmentRating', appointmentRatingSchema);
export default AppointmentRating;
