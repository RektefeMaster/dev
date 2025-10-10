import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Document {
  userId: mongoose.Types.ObjectId;
  brand: string;
  modelName: string;
  year: number;
  plateNumber: string;
  fuelType?: 'Benzin' | 'Dizel' | 'Elektrik' | 'Benzin/Tüp' | 'Hibrit' | 'Hybrid' | 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  engineType?: string;
  transmission?: string;
  package?: string;
  color?: string;
  mileage?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceHistory: Array<{
    date: Date;
    type: string;
    description: string;
    cost?: number;
    mileage?: number;
  }>;
  isFavorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  brand: { type: String, required: true },
  modelName: { type: String, required: true },
  year: { type: Number, required: true },
  plateNumber: { type: String, required: true, unique: true },
  fuelType: {
    type: String,
    required: false,
    enum: ['Benzin', 'Dizel', 'Elektrik', 'Benzin/Tüp', 'Hibrit', 'Hybrid', 'gasoline', 'diesel', 'electric', 'hybrid']
  },
  engineType: { type: String, required: false },
  transmission: { type: String, required: false },
  package: { type: String, required: false },
  color: { type: String },
  mileage: { type: Number },
  lastMaintenanceDate: { type: Date },
  nextMaintenanceDate: { type: Date },
  maintenanceHistory: [{
    date: { type: Date, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    cost: { type: Number },
    mileage: { type: Number }
  }],
  isFavorite: { type: Boolean, default: false }
}, {
  timestamps: true
});

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema); 