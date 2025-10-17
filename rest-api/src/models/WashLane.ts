import mongoose, { Schema, Document } from 'mongoose';

export interface IWashLane extends Document {
  // İlişkiler
  providerId: mongoose.Types.ObjectId;
  
  // Hat bilgileri
  name: string;
  displayName: string;
  laneNumber: number;
  
  // Kapasite
  capacity: {
    parallelJobs: number; // Aynı anda kaç araç alabilir
    averageJobDuration: number; // Ortalama iş süresi (dakika)
    bufferTime: number; // İşler arası geçiş süresi (dakika)
  };
  
  // Hat tipi
  laneType: 'manual' | 'automatic' | 'hybrid';
  
  // Ekipman
  equipment: {
    hasHighPressureWasher: boolean;
    hasVacuum: boolean;
    hasFoamCannon: boolean;
    hasDryingSystem: boolean;
    hasWaxingSystem: boolean;
  };
  
  // Slot durumu (günlük)
  slots: Array<{
    date: Date;
    timeSlots: Array<{
      startTime: string; // "09:00"
      endTime: string; // "10:00"
      isAvailable: boolean;
      orderId?: mongoose.Types.ObjectId;
      status: 'available' | 'reserved' | 'in_progress' | 'completed' | 'blocked';
      reservedAt?: Date;
      releasedAt?: Date;
    }>;
  }>;
  
  // Performans metrikleri
  metrics: {
    totalJobsCompleted: number;
    averageActualDuration: number;
    utilizationRate: number; // Kullanım oranı %
    p90Duration: number; // P90 gerçek süre
    downtime: number; // Toplam arıza/bakım süresi (dakika)
  };
  
  // Bakım durumu
  maintenance: {
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
    isUnderMaintenance: boolean;
    maintenanceNotes?: string;
  };
  
  // Durum
  isActive: boolean;
  isOperational: boolean;
  
  // Sıralama
  sortOrder: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const WashLaneSchema = new Schema<IWashLane>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'WashProvider',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    laneNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    capacity: {
      parallelJobs: {
        type: Number,
        required: true,
        default: 1,
        min: 1,
        max: 5,
      },
      averageJobDuration: {
        type: Number,
        required: true,
        default: 30,
      },
      bufferTime: {
        type: Number,
        default: 5,
      },
    },
    laneType: {
      type: String,
      enum: ['manual', 'automatic', 'hybrid'],
      default: 'manual',
    },
    equipment: {
      hasHighPressureWasher: { type: Boolean, default: true },
      hasVacuum: { type: Boolean, default: true },
      hasFoamCannon: { type: Boolean, default: false },
      hasDryingSystem: { type: Boolean, default: false },
      hasWaxingSystem: { type: Boolean, default: false },
    },
    slots: [{
      date: { type: Date, required: true },
      timeSlots: [{
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        isAvailable: { type: Boolean, default: true },
        orderId: {
          type: Schema.Types.ObjectId,
          ref: 'WashOrder',
        },
        status: {
          type: String,
          enum: ['available', 'reserved', 'in_progress', 'completed', 'blocked'],
          default: 'available',
        },
        reservedAt: Date,
        releasedAt: Date,
      }],
    }],
    metrics: {
      totalJobsCompleted: { type: Number, default: 0 },
      averageActualDuration: { type: Number, default: 0 },
      utilizationRate: { type: Number, default: 0, min: 0, max: 100 },
      p90Duration: { type: Number, default: 0 },
      downtime: { type: Number, default: 0 },
    },
    maintenance: {
      lastMaintenanceDate: Date,
      nextMaintenanceDate: Date,
      isUnderMaintenance: { type: Boolean, default: false },
      maintenanceNotes: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOperational: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
WashLaneSchema.index({ providerId: 1, laneNumber: 1 }, { unique: true });
WashLaneSchema.index({ providerId: 1, isActive: 1, isOperational: 1 });
WashLaneSchema.index({ 'slots.date': 1 });

// Compound index for slot queries
WashLaneSchema.index({ 
  providerId: 1, 
  'slots.date': 1, 
  'slots.timeSlots.isAvailable': 1 
});

export const WashLane = mongoose.model<IWashLane>('WashLane', WashLaneSchema);

