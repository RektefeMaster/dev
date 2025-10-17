import mongoose, { Schema, Document } from 'mongoose';

export interface IWashPricingRule extends Document {
  // Kural bilgileri
  name: string;
  description?: string;
  
  // Bölge
  city: string;
  district?: string;
  zone?: string; // Merkez, kenar mahalle, vb.
  
  // Segment çarpanları (bu kuralda override edilecekse)
  segmentMultipliers?: {
    A?: number;
    B?: number;
    C?: number;
    SUV?: number;
    Commercial?: number;
  };
  
  // Yoğunluk bazlı fiyatlandırma
  densityPricing: {
    enabled: boolean;
    threshold: number; // % doluluk eşiği (örn: 70)
    maxCoefficient: number; // Maksimum yoğunluk katsayısı (örn: 0.5)
    calculationMethod: 'linear' | 'exponential' | 'stepped';
  };
  
  // Zaman dilimi çarpanları
  timeBandMultipliers: Array<{
    name: string; // "Sabah", "Öğle", "Akşam", "Hafta Sonu"
    dayOfWeek?: number[]; // 0-6 (Pazar-Cumartesi)
    startTime: string; // "09:00"
    endTime: string; // "12:00"
    multiplier: number; // 1.2 (pik saatler için)
  }>;
  
  // Lokasyon çarpanı
  locationMultiplier: number;
  
  // Mesafe bazlı ücretlendirme (mobil için)
  distancePricing?: {
    baseDistance: number; // İlk X km ücretsiz
    perKmFee: number; // Sonraki her km için ücret
    maxDistance: number; // Maksimum servis mesafesi
  };
  
  // Mevsimsel çarpanlar
  seasonalMultipliers?: Array<{
    name: string; // "Kış", "Yaz", "İlkbahar", "Sonbahar"
    startMonth: number; // 1-12
    endMonth: number;
    multiplier: number;
    reason?: string; // "Kış kampanyası", "Yoğun sezon"
  }>;
  
  // Hava durumu bazlı dinamik fiyatlandırma
  weatherPricing?: {
    enabled: boolean;
    rainMultiplier?: number; // Yağmurlu havada indirim
    snowMultiplier?: number; // Karlı havada artış
    extremeHeatMultiplier?: number; // Aşırı sıcakta artış
  };
  
  // Geçerlilik
  validFrom: Date;
  validUntil?: Date;
  
  // Öncelik (çakışan kurallar için)
  priority: number;
  
  // Durum
  isActive: boolean;
  
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WashPricingRuleSchema = new Schema<IWashPricingRule>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    city: {
      type: String,
      required: true,
      index: true,
    },
    district: String,
    zone: String,
    segmentMultipliers: {
      A: Number,
      B: Number,
      C: Number,
      SUV: Number,
      Commercial: Number,
    },
    densityPricing: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 70, min: 0, max: 100 },
      maxCoefficient: { type: Number, default: 0.5, min: 0, max: 2 },
      calculationMethod: {
        type: String,
        enum: ['linear', 'exponential', 'stepped'],
        default: 'linear',
      },
    },
    timeBandMultipliers: [{
      name: { type: String, required: true },
      dayOfWeek: [{ type: Number, min: 0, max: 6 }],
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      multiplier: { type: Number, required: true, min: 0.1, max: 5 },
    }],
    locationMultiplier: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0,
    },
    distancePricing: {
      baseDistance: { type: Number, min: 0 },
      perKmFee: { type: Number, min: 0 },
      maxDistance: { type: Number, min: 1 },
    },
    seasonalMultipliers: [{
      name: { type: String, required: true },
      startMonth: { type: Number, required: true, min: 1, max: 12 },
      endMonth: { type: Number, required: true, min: 1, max: 12 },
      multiplier: { type: Number, required: true, min: 0.1, max: 5 },
      reason: String,
    }],
    weatherPricing: {
      enabled: { type: Boolean, default: false },
      rainMultiplier: Number,
      snowMultiplier: Number,
      extremeHeatMultiplier: Number,
    },
    validFrom: {
      type: Date,
      required: true,
      index: true,
    },
    validUntil: Date,
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
WashPricingRuleSchema.index({ city: 1, isActive: 1, validFrom: 1 });
WashPricingRuleSchema.index({ isActive: 1, priority: -1 });
WashPricingRuleSchema.index({ validFrom: 1, validUntil: 1 });

// Compound index for rule matching
WashPricingRuleSchema.index({ 
  city: 1, 
  district: 1, 
  isActive: 1, 
  validFrom: 1 
});

export const WashPricingRule = mongoose.model<IWashPricingRule>('WashPricingRule', WashPricingRuleSchema);

