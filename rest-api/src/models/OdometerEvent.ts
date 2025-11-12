import mongoose, { Schema, Document } from 'mongoose';

export const ODOMETER_EVENT_SOURCE = ['service', 'inspection', 'user_manual', 'system_import'] as const;
export type OdometerEventSource = (typeof ODOMETER_EVENT_SOURCE)[number];

export const ODOMETER_EVENT_EVIDENCE = ['none', 'photo', 'document'] as const;
export type OdometerEventEvidenceType = (typeof ODOMETER_EVENT_EVIDENCE)[number];

export const ODOMETER_UNIT = ['km', 'mi'] as const;
export type OdometerUnit = (typeof ODOMETER_UNIT)[number];

export interface IOdometerEvent extends Document {
  tenantId: string;
  vehicleId: mongoose.Types.ObjectId;
  seriesId: string;
  km: number;
  unit: OdometerUnit;
  timestampUtc: Date;
  source: OdometerEventSource;
  evidenceType: OdometerEventEvidenceType;
  evidenceUrl?: string | null;
  notes?: string | null;
  createdByUserId?: mongoose.Types.ObjectId | null;
  createdAtUtc: Date;
  updatedAtUtc: Date;
  pendingReview: boolean;
  odometerReset: boolean;
  outlierClass?: 'soft' | 'hard';
  clientRequestId?: string;
  metadata?: Record<string, any>;
}

const OdometerEventSchema = new Schema<IOdometerEvent>(
  {
    tenantId: { type: String, required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    seriesId: { type: String, required: true },
    km: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ODOMETER_UNIT, required: true, default: 'km' },
    timestampUtc: { type: Date, required: true },
    source: { type: String, enum: ODOMETER_EVENT_SOURCE, required: true },
    evidenceType: { type: String, enum: ODOMETER_EVENT_EVIDENCE, required: true, default: 'none' },
    evidenceUrl: { type: String, required: false, sparse: true },
    notes: { type: String, required: false },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    createdAtUtc: { type: Date, required: true, default: () => new Date() },
    updatedAtUtc: { type: Date, required: true, default: () => new Date() },
    pendingReview: { type: Boolean, required: true, default: false },
    odometerReset: { type: Boolean, required: true, default: false },
    outlierClass: { type: String, enum: ['soft', 'hard'], required: false },
    clientRequestId: { type: String, required: false },
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  {
    collection: 'odometer_event',
    timestamps: { createdAt: 'createdAtUtc', updatedAt: 'updatedAtUtc' },
  }
);

OdometerEventSchema.index({ tenantId: 1, vehicleId: 1, timestampUtc: -1 });
OdometerEventSchema.index({ tenantId: 1, vehicleId: 1, createdAtUtc: -1 });
OdometerEventSchema.index({ tenantId: 1, pendingReview: 1, createdAtUtc: 1 });
OdometerEventSchema.index({ evidenceUrl: 1 }, { sparse: true });
OdometerEventSchema.index(
  { tenantId: 1, vehicleId: 1, clientRequestId: 1 },
  { unique: true, sparse: true }
);

export const OdometerEvent: mongoose.Model<IOdometerEvent> =
  (mongoose.models.OdometerEvent as mongoose.Model<IOdometerEvent>) ||
  mongoose.model<IOdometerEvent>('OdometerEvent', OdometerEventSchema);


