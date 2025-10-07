import mongoose, { Document, Schema } from 'mongoose';
import { IMechanic } from './Mechanic';
import { IUser } from './User';
import { IVehicle } from './Vehicle';

export interface ICarWashJob extends Document {
  // Temel bilgiler
  customerId: mongoose.Types.ObjectId | IUser;
  vehicleId: mongoose.Types.ObjectId | IVehicle;
  mechanicId: mongoose.Types.ObjectId | IMechanic;
  
  // Paket bilgileri
  packageId: mongoose.Types.ObjectId;
  packageName: string;
  packageType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom';
  
  // Araç bilgileri
  vehicleInfo: {
    brand: string;
    model: string;
    year: number;
    plateNumber: string;
    vehicleType: 'car' | 'suv' | 'truck' | 'motorcycle' | 'van';
    color: string;
    size: 'small' | 'medium' | 'large' | 'extra_large';
  };
  
  // Hizmet detayları
  services: Array<{
    serviceName: string;
    serviceType: 'exterior' | 'interior' | 'engine' | 'special';
    duration: number;
    price: number;
    completed: boolean;
    completedAt?: Date;
    notes?: string;
    photos?: string[];
  }>;
  
  // Fiyatlandırma
  pricing: {
    basePrice: number;
    vehicleMultiplier: number;
    loyaltyDiscount: number;
    loyaltyDiscountAmount: number;
    tefePointDiscount: number;
    tefePointDiscountAmount: number;
    totalDiscount: number;
    finalPrice: number;
    paidAmount: number;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  };
  
  // Sadakat bilgileri
  loyaltyInfo: {
    customerLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
    visitCount: number;
    totalSpent: number;
    loyaltyScore: number;
    appliedDiscount: number;
  };
  
  // Zaman yönetimi
  scheduling: {
    requestedAt: Date;
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    estimatedDuration: number;
    actualDuration?: number;
    timeSlot?: {
      startTime: string;
      endTime: string;
    };
  };
  
  // Lokasyon
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    isMobile: boolean; // Mobil hizmet mi?
  };
  
  // Durum
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  
  // Özel istekler
  specialRequests: string[];
  notes: string;
  
  // Kalite kontrol
  qualityCheck: {
    passed: boolean;
    checkedBy: mongoose.Types.ObjectId | IUser;
    checkedAt?: Date;
    issues: string[];
    photos: string[];
    customerRating?: number;
    customerFeedback?: string;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const carWashJobSchema = new Schema<ICarWashJob>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  packageId: {
    type: Schema.Types.ObjectId,
    ref: 'CarWashPackage',
    required: true
  },
  packageName: {
    type: String,
    required: true
  },
  packageType: {
    type: String,
    enum: ['basic', 'premium', 'deluxe', 'detailing', 'custom'],
    required: true
  },
  
  vehicleInfo: {
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    plateNumber: { type: String, required: true },
    vehicleType: {
      type: String,
      enum: ['car', 'suv', 'truck', 'motorcycle', 'van'],
      required: true
    },
    color: { type: String, required: true },
    size: {
      type: String,
      enum: ['small', 'medium', 'large', 'extra_large'],
      required: true
    }
  },
  
  services: [{
    serviceName: { type: String, required: true },
    serviceType: {
      type: String,
      enum: ['exterior', 'interior', 'engine', 'special'],
      required: true
    },
    duration: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    notes: String,
    photos: [String]
  }],
  
  pricing: {
    basePrice: { type: Number, required: true, min: 0 },
    vehicleMultiplier: { type: Number, required: true, min: 0 },
    loyaltyDiscount: { type: Number, default: 0, min: 0, max: 100 },
    loyaltyDiscountAmount: { type: Number, default: 0, min: 0 },
    tefePointDiscount: { type: Number, default: 0, min: 0 },
    tefePointDiscountAmount: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending'
    }
  },
  
  loyaltyInfo: {
    customerLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    visitCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    loyaltyScore: { type: Number, default: 0 },
    appliedDiscount: { type: Number, default: 0 }
  },
  
  scheduling: {
    requestedAt: { type: Date, default: Date.now },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    estimatedDuration: { type: Number, required: true, min: 0 },
    actualDuration: { type: Number, min: 0 },
    timeSlot: {
      startTime: String,
      endTime: String
    }
  },
  
  location: {
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    isMobile: { type: Boolean, default: false }
  },
  
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  
  specialRequests: [String],
  notes: String,
  
  qualityCheck: {
    passed: { type: Boolean, default: false },
    checkedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedAt: Date,
    issues: [String],
    photos: [String],
    customerRating: { type: Number, min: 1, max: 5 },
    customerFeedback: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index'ler
carWashJobSchema.index({ mechanicId: 1, status: 1 });
carWashJobSchema.index({ customerId: 1 });
carWashJobSchema.index({ 'scheduling.scheduledAt': 1 });
carWashJobSchema.index({ createdAt: -1 });

// Pre-save middleware
carWashJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Toplam indirimi hesapla
  this.pricing.totalDiscount = this.pricing.loyaltyDiscountAmount + this.pricing.tefePointDiscountAmount;
  
  // Final fiyatı hesapla
  this.pricing.finalPrice = Math.max(0, 
    (this.pricing.basePrice * this.pricing.vehicleMultiplier) - this.pricing.totalDiscount
  );
  
  // Ödeme durumunu güncelle
  if (this.pricing.paidAmount >= this.pricing.finalPrice) {
    this.pricing.paymentStatus = 'paid';
  } else if (this.pricing.paidAmount > 0) {
    this.pricing.paymentStatus = 'partial';
  }
  
  next();
});

export const CarWashJob = mongoose.model<ICarWashJob>('CarWashJob', carWashJobSchema);
