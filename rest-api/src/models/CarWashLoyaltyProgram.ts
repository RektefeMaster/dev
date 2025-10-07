import mongoose, { Document, Schema } from 'mongoose';
import { IMechanic } from './Mechanic';

export interface ICarWashLoyaltyProgram extends Document {
  // Program bilgileri
  mechanicId: mongoose.Types.ObjectId | IMechanic;
  programName: string;
  description: string;
  
  // Sadakat seviyeleri
  loyaltyLevels: Array<{
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    levelName: string;
    minVisits: number;
    minSpent: number;
    benefits: {
      discountPercentage: number;
      priorityService: boolean;
      freeUpgrades: boolean;
      specialOffers: boolean;
      birthdayDiscount: number;
    };
    color: string;
    icon: string;
  }>;
  
  // Kampanyalar
  campaigns: Array<{
    name: string;
    description: string;
    type: 'visit_based' | 'spending_based' | 'seasonal' | 'referral';
    conditions: {
      minVisits?: number;
      minSpent?: number;
      validFrom: Date;
      validTo: Date;
      targetLevels?: string[];
    };
    rewards: {
      discountPercentage?: number;
      freeService?: string;
      bonusPoints?: number;
      specialOffer?: string;
    };
    isActive: boolean;
  }>;
  
  // Referans sistemi
  referralProgram: {
    enabled: boolean;
    referrerReward: {
      type: 'discount' | 'points' | 'free_service';
      value: number;
      description: string;
    };
    refereeReward: {
      type: 'discount' | 'points' | 'free_service';
      value: number;
      description: string;
    };
    maxReferrals: number;
  };
  
  // Doğum günü kampanyası
  birthdayCampaign: {
    enabled: boolean;
    discountPercentage: number;
    validDays: number; // Doğum gününden önce/sonra kaç gün
    specialOffer?: string;
  };
  
  // Puan sistemi
  pointsSystem: {
    enabled: boolean;
    pointsPerVisit: number;
    pointsPerSpent: number; // Her 1 TL için kaç puan
    pointsToDiscount: number; // Kaç puan = 1 TL indirim
    maxDiscountPercentage: number;
    pointsExpiryDays: number;
  };
  
  // Durum
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const carWashLoyaltyProgramSchema = new Schema<ICarWashLoyaltyProgram>({
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  programName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  loyaltyLevels: [{
    level: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      required: true
    },
    levelName: { type: String, required: true },
    minVisits: { type: Number, required: true, min: 0 },
    minSpent: { type: Number, required: true, min: 0 },
    benefits: {
      discountPercentage: { type: Number, required: true, min: 0, max: 100 },
      priorityService: { type: Boolean, default: false },
      freeUpgrades: { type: Boolean, default: false },
      specialOffers: { type: Boolean, default: false },
      birthdayDiscount: { type: Number, default: 0, min: 0, max: 100 }
    },
    color: { type: String, required: true },
    icon: { type: String, required: true }
  }],
  
  campaigns: [{
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['visit_based', 'spending_based', 'seasonal', 'referral'],
      required: true
    },
    conditions: {
      minVisits: { type: Number, min: 0 },
      minSpent: { type: Number, min: 0 },
      validFrom: { type: Date, required: true },
      validTo: { type: Date, required: true },
      targetLevels: [String]
    },
    rewards: {
      discountPercentage: { type: Number, min: 0, max: 100 },
      freeService: String,
      bonusPoints: { type: Number, min: 0 },
      specialOffer: String
    },
    isActive: { type: Boolean, default: true }
  }],
  
  referralProgram: {
    enabled: { type: Boolean, default: false },
    referrerReward: {
      type: {
        type: String,
        enum: ['discount', 'points', 'free_service']
      },
      value: { type: Number, min: 0 },
      description: String
    },
    refereeReward: {
      type: {
        type: String,
        enum: ['discount', 'points', 'free_service']
      },
      value: { type: Number, min: 0 },
      description: String
    },
    maxReferrals: { type: Number, default: 10 }
  },
  
  birthdayCampaign: {
    enabled: { type: Boolean, default: false },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    validDays: { type: Number, default: 7 },
    specialOffer: String
  },
  
  pointsSystem: {
    enabled: { type: Boolean, default: false },
    pointsPerVisit: { type: Number, default: 10 },
    pointsPerSpent: { type: Number, default: 1 },
    pointsToDiscount: { type: Number, default: 100 },
    maxDiscountPercentage: { type: Number, default: 50 },
    pointsExpiryDays: { type: Number, default: 365 }
  },
  
  isActive: {
    type: Boolean,
    default: true
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
carWashLoyaltyProgramSchema.index({ mechanicId: 1 });
carWashLoyaltyProgramSchema.index({ isActive: 1 });

// Pre-save middleware
carWashLoyaltyProgramSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const CarWashLoyaltyProgram = mongoose.model<ICarWashLoyaltyProgram>('CarWashLoyaltyProgram', carWashLoyaltyProgramSchema);
