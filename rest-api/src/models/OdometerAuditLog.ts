import mongoose, { Schema, Document } from 'mongoose';
import { OdometerUnit } from './OdometerEvent';

export type OdometerAuditAction = 'create' | 'update' | 'reject' | 'outlier' | 'closed' | 'shadow';

export interface IOdometerAuditLog extends Document {
  tenantId: string;
  vehicleId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId | null;
  seriesId: string;
  action: OdometerAuditAction;
  detailsJson: Record<string, any>;
  actorUserId?: mongoose.Types.ObjectId | null;
  createdAtUtc: Date;
  unitSnapshot?: OdometerUnit;
}

const OdometerAuditLogSchema = new Schema<IOdometerAuditLog>(
  {
    tenantId: { type: String, required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'OdometerEvent', required: false },
    seriesId: { type: String, required: true },
    action: { type: String, required: true },
    detailsJson: { type: Schema.Types.Mixed, required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    unitSnapshot: { type: String, enum: ['km', 'mi'], required: false },
  },
  {
    collection: 'odometer_audit_log',
    timestamps: { createdAt: 'createdAtUtc', updatedAt: false },
  }
);

OdometerAuditLogSchema.index({ tenantId: 1, vehicleId: 1, createdAtUtc: -1 });
OdometerAuditLogSchema.index({ tenantId: 1, action: 1, createdAtUtc: -1 });

export const OdometerAuditLog: mongoose.Model<IOdometerAuditLog> =
  (mongoose.models.OdometerAuditLog as mongoose.Model<IOdometerAuditLog>) ||
  mongoose.model<IOdometerAuditLog>('OdometerAuditLog', OdometerAuditLogSchema);


