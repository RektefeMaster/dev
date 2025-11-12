import mongoose, { Schema, Document } from 'mongoose';
import { OdometerUnit } from './OdometerEvent';

export interface IMileageModel extends Document {
  tenantId: string;
  vehicleId: mongoose.Types.ObjectId;
  seriesId: string;
  lastTrueKm: number;
  lastTrueTsUtc: Date;
  rateKmPerDay: number;
  confidence: number;
  rateWeekdayJson?: number[];
  updatedAtUtc: Date;
  createdAtUtc: Date;
  defaultUnit: OdometerUnit;
  shadowRateKmPerDay?: number;
  metadata?: Record<string, any>;
  hasBaseline: boolean;
}

const WeekdayValidator = {
  validator(value: number[]) {
    if (!Array.isArray(value)) {
      return false;
    }
    if (value.length !== 7) {
      return false;
    }
    return value.every((entry) => typeof entry === 'number' && entry >= 0 && entry <= 300);
  },
  message: 'rateWeekdayJson 7 elemanlı olmalı ve değerler 0–300 arasında olmalıdır.',
};

const MileageModelSchema = new Schema<IMileageModel>(
  {
    tenantId: { type: String, required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    seriesId: { type: String, required: true },
    lastTrueKm: { type: Number, required: true, min: 0 },
    lastTrueTsUtc: { type: Date, required: true },
    rateKmPerDay: { type: Number, required: true, min: 0, max: 300, default: 30 },
    confidence: { type: Number, required: true, min: 0, max: 1, default: 0.3 },
    rateWeekdayJson: { type: [Number], required: false, validate: WeekdayValidator },
    defaultUnit: { type: String, enum: ['km', 'mi'], required: true, default: 'km' },
    shadowRateKmPerDay: { type: Number, required: false },
    metadata: { type: Schema.Types.Mixed, required: false },
    hasBaseline: { type: Boolean, required: true, default: false },
  },
  {
    collection: 'mileage_model',
    timestamps: { createdAt: 'createdAtUtc', updatedAt: 'updatedAtUtc' },
  }
);

MileageModelSchema.index({ tenantId: 1, vehicleId: 1 }, { unique: true });
MileageModelSchema.index({ tenantId: 1, vehicleId: 1, updatedAtUtc: -1 });

export const MileageModel: mongoose.Model<IMileageModel> =
  (mongoose.models.MileageModel as mongoose.Model<IMileageModel>) ||
  mongoose.model<IMileageModel>('MileageModel', MileageModelSchema);


