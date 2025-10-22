import mongoose, { Schema, Document } from 'mongoose';

export interface IWashOrder extends Document {
  // Temel bilgiler
  orderNumber: string;
  driverId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  vehicleId?: mongoose.Types.ObjectId;
  packageId: mongoose.Types.ObjectId;

  // Sipariş tipi
  type: 'shop' | 'mobile';

  // Araç bilgileri
  vehicle: {
    brand: string;
    model: string;
    year?: number;
    plateNumber?: string;
    segment: 'A' | 'B' | 'C' | 'SUV' | 'Commercial';
  };

  // Paket bilgileri
  package: {
    name: string;
    basePrice: number;
    duration: number; // dakika
    extras: Array<{
      name: string;
      price: number;
      duration: number;
    }>;
  };

  // Konum bilgileri
  location: {
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    // Mobil için özel
    requiresPower?: boolean;
    requiresWater?: boolean;
    isIndoorParking?: boolean;
  };

  // Zamanlama
  scheduling: {
    slotStart?: Date;
    slotEnd?: Date;
    timeWindow?: {
      start: Date;
      end: Date;
    };
    estimatedDuration: number;
    actualStartTime?: Date;
    actualEndTime?: Date;
    actualDuration?: number;
  };

  // Lane bilgisi (sadece shop için)
  laneId?: mongoose.Types.ObjectId;

  // Fiyatlandırma
  pricing: {
    basePrice: number;
    segmentMultiplier: number;
    densityCoefficient: number;
    locationMultiplier: number;
    distanceFee: number;
    subtotal: number;
    tefePuanUsed: number;
    tefePuanDiscount: number;
    finalPrice: number;
  };

  // Durum
  status: 
    | 'CREATED' 
    | 'PRICED' 
    | 'DRIVER_CONFIRMED'
    | 'PROVIDER_ACCEPTED'
    | 'EN_ROUTE'
    | 'CHECK_IN'
    | 'IN_PROGRESS'
    | 'QA_PENDING'
    | 'COMPLETED'
    | 'PAID'
    | 'REVIEWED'
    | 'CANCELLED_BY_DRIVER'
    | 'CANCELLED_BY_PROVIDER'
    | 'DISPUTED';

  // İş adımları
  workSteps: Array<{
    step: string;
    name: string;
    order: number;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    startedAt?: Date;
    completedAt?: Date;
    photos: string[];
    notes?: string;
  }>;

  // QA - Kalite Kontrol
  qa: {
    photosBeforeRequired: string[];
    photosAfterRequired: string[];
    photosBefore: string[];
    photosAfter: string[];
    checklist: Array<{
      item: string;
      checked: boolean;
    }>;
    submittedAt?: Date;
    approvedAt?: Date;
    approvalStatus?: 'pending' | 'approved' | 'rework_required' | 'disputed';
    driverFeedback?: string;
    autoApproveAt?: Date; // 15 dk sonra otomatik onay
  };

  // Escrow ödeme bilgileri (MOCK)
  escrow: {
    transactionId: string;
    status: 'pending' | 'held' | 'captured' | 'refunded' | 'frozen';
    amount: number;
    cardLast4?: string; // Test için
    paymentMethod?: 'wallet' | 'card'; // Ödeme yöntemi
    heldAt?: Date;
    capturedAt?: Date;
    refundedAt?: Date;
    frozenAt?: Date;
    mockCard: boolean; // Test modu işareti
  };

  // Sürücü notu
  driverNote?: string;

  // İptal bilgileri
  cancellation?: {
    cancelledBy: 'driver' | 'provider';
    reason: string;
    cancelledAt: Date;
    refundAmount: number;
    penaltyAmount: number;
  };

  // Değerlendirme
  review?: {
    rating: number;
    tags: string[];
    comment?: string;
    photos: string[];
    tip?: number;
    reviewedAt: Date;
  };

  // İtiraz
  disputeId?: mongoose.Types.ObjectId;

  // TefePuan kazanımı
  tefePuanEarned: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const WashOrderSchema = new Schema<IWashOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
      // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
      // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
      // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'WashPackage',
      required: true,
    },
    type: {
      type: String,
      enum: ['shop', 'mobile'],
      required: true,
    },
    vehicle: {
      brand: { type: String, required: true },
      model: { type: String, required: true },
      year: Number,
      plateNumber: String,
      segment: {
        type: String,
        enum: ['A', 'B', 'C', 'SUV', 'Commercial'],
        required: true,
      },
    },
    package: {
      name: { type: String, required: true },
      basePrice: { type: Number, required: true },
      duration: { type: Number, required: true },
      extras: [{
        name: String,
        price: Number,
        duration: Number,
      }],
    },
    location: {
      address: { type: String, required: true },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      requiresPower: Boolean,
      requiresWater: Boolean,
      isIndoorParking: Boolean,
    },
    scheduling: {
      slotStart: Date,
      slotEnd: Date,
      timeWindow: {
        start: Date,
        end: Date,
      },
      estimatedDuration: { type: Number, required: true },
      actualStartTime: Date,
      actualEndTime: Date,
      actualDuration: Number,
    },
    laneId: {
      type: Schema.Types.ObjectId,
      ref: 'WashLane',
    },
    pricing: {
      basePrice: { type: Number, required: true },
      segmentMultiplier: { type: Number, required: true, default: 1.0 },
      densityCoefficient: { type: Number, required: true, default: 0 },
      locationMultiplier: { type: Number, required: true, default: 1.0 },
      distanceFee: { type: Number, required: true, default: 0 },
      subtotal: { type: Number, required: true },
      tefePuanUsed: { type: Number, default: 0 },
      tefePuanDiscount: { type: Number, default: 0 },
      finalPrice: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: [
        'CREATED',
        'PRICED',
        'DRIVER_CONFIRMED',
        'PROVIDER_ACCEPTED',
        'EN_ROUTE',
        'CHECK_IN',
        'IN_PROGRESS',
        'QA_PENDING',
        'COMPLETED',
        'PAID',
        'REVIEWED',
        'CANCELLED_BY_DRIVER',
        'CANCELLED_BY_PROVIDER',
        'DISPUTED',
      ],
      required: true,
      default: 'CREATED'
      // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
    },
    workSteps: [{
      step: { type: String, required: true },
      name: { type: String, required: true },
      order: { type: Number, required: true },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'skipped'],
        default: 'pending',
      },
      startedAt: Date,
      completedAt: Date,
      photos: [String],
      notes: String,
    }],
    qa: {
      photosBeforeRequired: [String],
      photosAfterRequired: [String],
      photosBefore: [String],
      photosAfter: [String],
      checklist: [{
        item: String,
        checked: { type: Boolean, default: false },
      }],
      submittedAt: Date,
      approvedAt: Date,
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rework_required', 'disputed'],
      },
      driverFeedback: String,
      autoApproveAt: Date,
    },
    escrow: {
      transactionId: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'held', 'captured', 'refunded', 'frozen'],
        default: 'pending',
      },
      amount: { type: Number, required: true },
      cardLast4: String,
      paymentMethod: {
        type: String,
        enum: ['wallet', 'card'],
        default: 'card',
      },
      heldAt: Date,
      capturedAt: Date,
      refundedAt: Date,
      frozenAt: Date,
      mockCard: { type: Boolean, default: true },
    },
    driverNote: String,
    cancellation: {
      cancelledBy: {
        type: String,
        enum: ['driver', 'provider'],
      },
      reason: String,
      cancelledAt: Date,
      refundAmount: Number,
      penaltyAmount: Number,
    },
    review: {
      rating: { type: Number, min: 1, max: 5 },
      tags: [String],
      comment: String,
      photos: [String],
      tip: Number,
      reviewedAt: Date,
    },
    disputeId: {
      type: Schema.Types.ObjectId,
      ref: 'WashDispute',
    },
    tefePuanEarned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
WashOrderSchema.index({ orderNumber: 1 });
WashOrderSchema.index({ driverId: 1, status: 1 });
WashOrderSchema.index({ providerId: 1, status: 1 });
WashOrderSchema.index({ 'scheduling.slotStart': 1 });
WashOrderSchema.index({ createdAt: -1 });

export const WashOrder = mongoose.model<IWashOrder>('WashOrder', WashOrderSchema);

