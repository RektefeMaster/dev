import mongoose, { Document, Schema } from 'mongoose';
import { IMechanic } from './Mechanic';

export interface ICarWashPackage extends Document {
  // Paket bilgileri
  mechanicId: mongoose.Types.ObjectId | IMechanic;
  name: string;
  description: string;
  packageType: 'basic' | 'premium' | 'deluxe' | 'detailing' | 'custom';
  
  // Paket içeriği
  services: Array<{
    serviceName: string;
    serviceType: 'exterior' | 'interior' | 'engine' | 'special';
    duration: number; // dakika
    price: number;
    description: string;
    isOptional: boolean;
    order: number;
  }>;
  
  // Fiyatlandırma
  pricing: {
    basePrice: number;
    vehicleTypeMultipliers: {
      car: number;
      suv: number;
      truck: number;
      motorcycle: number;
      van: number;
    };
    duration: number; // toplam dakika
    maxDuration: number; // maksimum dakika
  };
  
  // Sadakat indirimleri
  loyaltyDiscounts: Array<{
    loyaltyLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
    discountPercentage: number;
    minVisits: number;
  }>;
  
  // Paket özellikleri
  features: {
    includesInterior: boolean;
    includesExterior: boolean;
    includesEngine: boolean;
    includesWaxing: boolean;
    includesPolishing: boolean;
    includesDetailing: boolean;
    ecoFriendly: boolean;
    premiumProducts: boolean;
  };
  
  // Görsel içerik
  images: string[];
  thumbnail: string;
  
  // Durum
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const carWashPackageSchema = new Schema<ICarWashPackage>({
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  packageType: {
    type: String,
    enum: ['basic', 'premium', 'deluxe', 'detailing', 'custom'],
    required: true
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
    description: { type: String, required: true },
    isOptional: { type: Boolean, default: false },
    order: { type: Number, required: true }
  }],
  
  pricing: {
    basePrice: { type: Number, required: true, min: 0 },
    vehicleTypeMultipliers: {
      car: { type: Number, default: 1.0 },
      suv: { type: Number, default: 1.2 },
      truck: { type: Number, default: 1.5 },
      motorcycle: { type: Number, default: 0.6 },
      van: { type: Number, default: 1.3 }
    },
    duration: { type: Number, required: true, min: 0 },
    maxDuration: { type: Number, required: true, min: 0 }
  },
  
  loyaltyDiscounts: [{
    loyaltyLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum']
    },
    discountPercentage: { type: Number, min: 0, max: 100 },
    minVisits: { type: Number, min: 0 }
  }],
  
  features: {
    includesInterior: { type: Boolean, default: false },
    includesExterior: { type: Boolean, default: true },
    includesEngine: { type: Boolean, default: false },
    includesWaxing: { type: Boolean, default: false },
    includesPolishing: { type: Boolean, default: false },
    includesDetailing: { type: Boolean, default: false },
    ecoFriendly: { type: Boolean, default: false },
    premiumProducts: { type: Boolean, default: false }
  },
  
  images: [String],
  thumbnail: String,
  
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
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
carWashPackageSchema.index({ mechanicId: 1, isActive: 1 });
carWashPackageSchema.index({ packageType: 1 });
carWashPackageSchema.index({ isPopular: 1, sortOrder: 1 });

// Pre-save middleware
carWashPackageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Toplam süreyi hesapla
  this.pricing.duration = this.services.reduce((total, service) => total + service.duration, 0);
  
  next();
});

export const CarWashPackage = mongoose.model<ICarWashPackage>('CarWashPackage', carWashPackageSchema);
