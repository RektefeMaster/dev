import mongoose, { Schema, Document } from 'mongoose';

export interface IWashProvider extends Document {
  // İşletme bilgileri
  userId: mongoose.Types.ObjectId; // User (mechanic) referansı
  businessName: string;
  
  // İşletme tipi
  type: 'shop' | 'mobile' | 'both';
  
  // Konum bilgileri
  location: {
    address: string;
    city: string;
    district: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Shop özellikleri
  shop?: {
    hasLanes: boolean;
    laneCount: number;
    totalCapacity: number; // Saat başına maksimum araç
    workingHours: Array<{
      day: number; // 0-6 (Pazar-Cumartesi)
      isOpen: boolean;
      openTime?: string; // "09:00"
      closeTime?: string; // "18:00"
      breaks?: Array<{
        startTime: string;
        endTime: string;
      }>;
    }>;
  };
  
  // Mobil hizmet özellikleri
  mobile?: {
    serviceArea: {
      type: 'Point' | 'Polygon';
      coordinates: number[][] | number[]; // GeoJSON format
      radius?: number; // km - Point için
      polygonName?: string; // Polygon için isim
    };
    maxDistance: number; // km
    equipment: {
      hasWaterTank: boolean;
      waterCapacity?: number; // litre
      hasGenerator: boolean;
      generatorPower?: number; // watt
      hasVacuum: boolean;
      hasCompressor: boolean;
    };
    pricing: {
      baseDistanceFee: number; // İlk X km ücretsiz
      perKmFee: number; // Sonraki her km için ücret
    };
  };
  
  // Sunulan paketler
  packages: mongoose.Types.ObjectId[]; // WashPackage referansları
  
  // Performans metrikleri
  metrics: {
    totalJobs: number;
    completedJobs: number;
    cancelledJobs: number;
    averageRating: number;
    totalReviews: number;
    qaPassRate: number; // İlk denemede geçme oranı
    averageCompletionTime: number; // dakika
    disputeRate: number; // İtiraz oranı
    onTimeRate: number; // Zamanında tamamlama oranı
  };
  
  // Ceza/teşvik durumu
  reputation: {
    score: number; // 0-100
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    consecutiveCancellations: number;
    lastCancellationDate?: Date;
    isBlocked: boolean;
    blockReason?: string;
    blockUntil?: Date;
  };
  
  // Komisyon oranı
  commissionRate: number; // % cinsinden
  
  // Özel komisyon (yüksek performans indirimi)
  specialCommissionRate?: number;
  
  // Durum
  isActive: boolean;
  isVerified: boolean;
  isPremium: boolean;
  
  // Öne çıkan özellikler
  features: string[]; // "Çevre Dostu", "Premium Ürünler", "Hızlı Servis", vb.
  
  // Sertifikalar/belgeler
  certifications: Array<{
    name: string;
    issuer: string;
    issuedDate: Date;
    expiryDate?: Date;
    documentUrl?: string;
  }>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const WashProviderSchema = new Schema<IWashProvider>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['shop', 'mobile', 'both'],
      required: true,
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      district: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    },
    shop: {
      hasLanes: { type: Boolean, default: false },
      laneCount: { type: Number, min: 1, max: 10 },
      totalCapacity: { type: Number, min: 1 },
      workingHours: [{
        day: { type: Number, min: 0, max: 6 },
        isOpen: { type: Boolean, default: false },
        openTime: String,
        closeTime: String,
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      }],
    },
    mobile: {
      serviceArea: {
        type: { type: String, enum: ['Point', 'Polygon'] },
        coordinates: Schema.Types.Mixed,
        radius: Number,
        polygonName: String,
      },
      maxDistance: { type: Number, min: 1, max: 100 },
      equipment: {
        hasWaterTank: { type: Boolean, default: false },
        waterCapacity: Number,
        hasGenerator: { type: Boolean, default: false },
        generatorPower: Number,
        hasVacuum: { type: Boolean, default: false },
        hasCompressor: { type: Boolean, default: false },
      },
      pricing: {
        baseDistanceFee: { type: Number, default: 0 },
        perKmFee: { type: Number, default: 0 },
      },
    },
    packages: [{
      type: Schema.Types.ObjectId,
      ref: 'WashPackage',
    }],
    metrics: {
      totalJobs: { type: Number, default: 0 },
      completedJobs: { type: Number, default: 0 },
      cancelledJobs: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0 },
      qaPassRate: { type: Number, default: 100, min: 0, max: 100 },
      averageCompletionTime: { type: Number, default: 0 },
      disputeRate: { type: Number, default: 0, min: 0, max: 100 },
      onTimeRate: { type: Number, default: 100, min: 0, max: 100 },
    },
    reputation: {
      score: { type: Number, default: 100, min: 0, max: 100 },
      tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum'],
        default: 'bronze',
      },
      consecutiveCancellations: { type: Number, default: 0 },
      lastCancellationDate: Date,
      isBlocked: { type: Boolean, default: false },
      blockReason: String,
      blockUntil: Date,
    },
    commissionRate: {
      type: Number,
      default: 15, // %15 varsayılan
      min: 0,
      max: 50,
    },
    specialCommissionRate: {
      type: Number,
      min: 0,
      max: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    features: [String],
    certifications: [{
      name: { type: String, required: true },
      issuer: { type: String, required: true },
      issuedDate: { type: Date, required: true },
      expiryDate: Date,
      documentUrl: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Coğrafi indeks (mobil hizmet için)
WashProviderSchema.index({ 'location.coordinates': '2dsphere' });

// Diğer indeksler
WashProviderSchema.index({ userId: 1 });
WashProviderSchema.index({ type: 1, isActive: 1 });
WashProviderSchema.index({ 'metrics.averageRating': -1 });
WashProviderSchema.index({ isVerified: 1, isActive: 1 });

export const WashProvider = mongoose.model<IWashProvider>('WashProvider', WashProviderSchema);

