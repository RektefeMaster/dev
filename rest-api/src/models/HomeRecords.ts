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

export const MaintenanceRecordModel =
  mongoose.models.MaintenanceRecord || mongoose.model('MaintenanceRecord', maintenanceSchema);

export const InsurancePolicyModel =
  mongoose.models.InsurancePolicy || mongoose.model('InsurancePolicy', insuranceSchema);

export const VehicleStatusRecordModel =
  mongoose.models.VehicleStatusRecord || mongoose.model('VehicleStatusRecord', vehicleStatusSchema);

export const TireStatusRecordModel =
  mongoose.models.TireStatusRecord || mongoose.model('TireStatusRecord', tireStatusSchema);


