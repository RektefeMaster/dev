import mongoose, { Schema } from 'mongoose';

/**
 * Home ekranında kullanılan temel kayıt modelleri.
 * Bu modeller birden fazla route tarafından paylaşıldığından
 * tekrar tanımlanmasını önlemek için tek bir dosyada tutulur.
 */

const maintenanceSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    vehicleId: { type: String },
    date: { type: Date, required: true },
    mileage: { type: Number },
    type: { type: String, required: true },
    details: [{ type: String }],
    serviceName: { type: String },
    cost: { type: Number },
    workshopName: { type: String },
  },
  { timestamps: true, collection: 'maintenance_records' }
);

const insuranceSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    company: { type: String, required: true },
    type: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    policyNumber: { type: String, required: true },
    coverage: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired'],
      default: 'active',
    },
  },
  { timestamps: true, collection: 'insurance_policies' }
);

const vehicleStatusSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    overallStatus: { type: String, required: true },
    lastCheck: { type: Date, required: true },
    issues: [{ type: String }],
    mileage: { type: Number },
    nextServiceDate: { type: Date },
  },
  { timestamps: true, collection: 'vehicle_status' }
);

const tireStatusSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['excellent', 'good', 'warning', 'critical'],
      required: true,
    },
    lastCheck: { type: Date, required: true },
    issues: [{ type: String }],
    recommendedActions: [{ type: String }],
    frontLeftDepth: { type: Number },
    frontRightDepth: { type: Number },
    rearLeftDepth: { type: Number },
    rearRightDepth: { type: Number },
  },
  { timestamps: true, collection: 'tire_status' }
);

type MaintenanceRecord = mongoose.InferSchemaType<typeof maintenanceSchema>;
type InsurancePolicy = mongoose.InferSchemaType<typeof insuranceSchema>;
type VehicleStatusRecord = mongoose.InferSchemaType<typeof vehicleStatusSchema>;
type TireStatusRecord = mongoose.InferSchemaType<typeof tireStatusSchema>;

export const MaintenanceRecordModel: mongoose.Model<MaintenanceRecord> =
  (mongoose.models.MaintenanceRecord as mongoose.Model<MaintenanceRecord>) ||
  mongoose.model<MaintenanceRecord>('MaintenanceRecord', maintenanceSchema);

export const InsurancePolicyModel: mongoose.Model<InsurancePolicy> =
  (mongoose.models.InsurancePolicy as mongoose.Model<InsurancePolicy>) ||
  mongoose.model<InsurancePolicy>('InsurancePolicy', insuranceSchema);

export const VehicleStatusRecordModel: mongoose.Model<VehicleStatusRecord> =
  (mongoose.models.VehicleStatusRecord as mongoose.Model<VehicleStatusRecord>) ||
  mongoose.model<VehicleStatusRecord>('VehicleStatusRecord', vehicleStatusSchema);

export const TireStatusRecordModel: mongoose.Model<TireStatusRecord> =
  (mongoose.models.TireStatusRecord as mongoose.Model<TireStatusRecord>) ||
  mongoose.model<TireStatusRecord>('TireStatusRecord', tireStatusSchema);


