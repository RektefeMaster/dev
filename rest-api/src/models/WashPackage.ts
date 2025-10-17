import mongoose, { Schema, Document } from 'mongoose';

export interface IWashPackage extends Document {
  // Temel bilgiler
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  
  // Paket tipi
  packageType: 'quick_exterior' | 'standard' | 'detailed_interior' | 'ceramic_protection' | 'engine' | 'custom';
  
  // Fiyatlandırma
  basePrice: number; // A segmenti için taban fiyat
  
  // Segment çarpanları
  segmentMultipliers: {
    A: number;
    B: number;
    C: number;
    SUV: number;
    Commercial: number;
  };
  
  // Süre bilgileri
  duration: number; // dakika
  bufferTime: number; // geçiş süresi (dakika)
  
  // Gereksinimler
  requirements: {
    requiresPower: boolean;
    requiresWater: boolean;
    requiresCoveredArea: boolean;
    minTemperature?: number; // Minimum çalışma sıcaklığı
  };
  
  // Dahil olan hizmetler
  services: Array<{
    name: string;
    nameEn?: string;
    category: 'exterior' | 'interior' | 'engine' | 'special';
    order: number;
  }>;
  
  // Ekstra hizmetler (opsiyonel, ek ücretli)
  extras: Array<{
    name: string;
    nameEn?: string;
    description: string;
    price: number;
    duration: number; // ek süre
  }>;
  
  // İş adımları (provider için checklist)
  workSteps: Array<{
    step: string;
    name: string;
    nameEn?: string;
    order: number;
    requiresPhoto: boolean;
  }>;
  
  // QA gereksinimleri
  qaRequirements: {
    photosBefore: string[]; // Gerekli foto açıları (ön, arka, sol, sağ, iç_ön, iç_arka)
    photosAfter: string[];
    checklist: string[]; // Kontrol edilmesi gereken noktalar
  };
  
  // Görsel içerik
  images: string[];
  thumbnail?: string;
  
  // Upsell önerileri
  recommendedExtras: string[]; // Extra ID'leri
  
  // Durum
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  
  // Provider bilgisi
  providerId?: mongoose.Types.ObjectId; // Belirli bir provider'a özel ise (null = genel paket)
  availableFor: 'shop' | 'mobile' | 'both';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const WashPackageSchema = new Schema<IWashPackage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameEn: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    descriptionEn: String,
    packageType: {
      type: String,
      enum: ['quick_exterior', 'standard', 'detailed_interior', 'ceramic_protection', 'engine', 'custom'],
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    segmentMultipliers: {
      A: { type: Number, default: 1.0 },
      B: { type: Number, default: 1.15 },
      C: { type: Number, default: 1.3 },
      SUV: { type: Number, default: 1.4 },
      Commercial: { type: Number, default: 1.6 },
    },
    duration: {
      type: Number,
      required: true,
      min: 5,
    },
    bufferTime: {
      type: Number,
      default: 5,
    },
    requirements: {
      requiresPower: { type: Boolean, default: false },
      requiresWater: { type: Boolean, default: true },
      requiresCoveredArea: { type: Boolean, default: false },
      minTemperature: Number,
    },
    services: [{
      name: { type: String, required: true },
      nameEn: String,
      category: {
        type: String,
        enum: ['exterior', 'interior', 'engine', 'special'],
        required: true,
      },
      order: { type: Number, required: true },
    }],
    extras: [{
      name: { type: String, required: true },
      nameEn: String,
      description: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      duration: { type: Number, required: true, min: 0 },
    }],
    workSteps: [{
      step: { type: String, required: true },
      name: { type: String, required: true },
      nameEn: String,
      order: { type: Number, required: true },
      requiresPhoto: { type: Boolean, default: false },
    }],
    qaRequirements: {
      photosBefore: {
        type: [String],
        default: ['front', 'back', 'left', 'right', 'interior_front', 'interior_back'],
      },
      photosAfter: {
        type: [String],
        default: ['front', 'back', 'left', 'right', 'interior_front', 'interior_back'],
      },
      checklist: {
        type: [String],
        default: [
          'Cam temizliği',
          'Jant temizliği',
          'Paspas temizliği',
          'Su lekesi kontrolü',
          'Koltuk/kumaş kontrolü',
        ],
      },
    },
    images: [String],
    thumbnail: String,
    recommendedExtras: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    availableFor: {
      type: String,
      enum: ['shop', 'mobile', 'both'],
      default: 'both',
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
WashPackageSchema.index({ isActive: 1, sortOrder: 1 });
WashPackageSchema.index({ providerId: 1, isActive: 1 });
WashPackageSchema.index({ packageType: 1 });

export const WashPackage = mongoose.model<IWashPackage>('WashPackage', WashPackageSchema);

