import mongoose, { Document, Schema } from 'mongoose';

// TefePuan kazanım türleri
export type TefePointType = 'service_purchase' | 'bonus' | 'referral' | 'promotion' | 'refund' | 'use';

// Hizmet kategorileri ve kazanım oranları
export interface IServiceCategory {
  category: string;
  multiplier: number; // 0.01 - 0.09 arası (1% - 9%)
  description: string;
}

// TefePuan işlem detayları
interface ITefePointTransaction {
  type: TefePointType;
  amount: number; // Kazanılan puan miktarı
  serviceCategory?: string; // Hizmet kategorisi
  serviceId?: string; // Hizmet ID'si
  appointmentId?: string; // Randevu ID'si
  description: string;
  multiplier: number; // Uygulanan çarpan
  baseAmount: number; // Harcama tutarı
  date: Date;
  status: 'earned' | 'used' | 'expired' | 'cancelled';
  expiresAt?: Date; // Puanın son kullanma tarihi
}

export interface ITefePoint extends Document {
  userId: mongoose.Types.ObjectId;
  totalPoints: number; // Toplam puan
  availablePoints: number; // Kullanılabilir puan
  usedPoints: number; // Kullanılan puan
  expiredPoints: number; // Süresi dolan puan
  transactions: ITefePointTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const TefePointTransactionSchema = new Schema<ITefePointTransaction>({
  type: {
    type: String,
    enum: ['service_purchase', 'bonus', 'referral', 'promotion', 'refund', 'use'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  serviceCategory: {
    type: String,
    required: function(this: ITefePointTransaction) {
      return this.type === 'service_purchase';
    }
  },
  serviceId: {
    type: String
  },
  appointmentId: {
    type: String
  },
  description: {
    type: String,
    required: true,
    maxlength: [200, 'Açıklama 200 karakterden fazla olamaz']
  },
  multiplier: {
    type: Number,
    required: true,
    min: [0.01, 'Çarpan en az %1 olmalı'],
    max: [0.09, 'Çarpan en fazla %9 olabilir']
  },
  baseAmount: {
    type: Number,
    required: true,
    min: [0, 'Harcama tutarı negatif olamaz']
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['earned', 'used', 'expired', 'cancelled'],
    default: 'earned'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // TefePuanlar 1 yıl geçerli
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      return oneYearFromNow;
    }
  }
});

const TefePointSchema = new Schema<ITefePoint>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: [0, 'Toplam puan negatif olamaz']
  },
  availablePoints: {
    type: Number,
    default: 0,
    min: [0, 'Kullanılabilir puan negatif olamaz']
  },
  usedPoints: {
    type: Number,
    default: 0,
    min: [0, 'Kullanılan puan negatif olamaz']
  },
  expiredPoints: {
    type: Number,
    default: 0,
    min: [0, 'Süresi dolan puan negatif olamaz']
  },
  transactions: [TefePointTransactionSchema]
}, {
  timestamps: true
});

// Index'ler
TefePointSchema.index({ 'transactions.date': -1 });
TefePointSchema.index({ 'transactions.status': 1 });

// Hizmet kategorileri ve kazanım oranları - ServiceCategory enum'una uygun
export const SERVICE_CATEGORIES: IServiceCategory[] = [
  {
    category: 'towing',
    multiplier: 0.01, // %1 - Optimize edilmiş sabit oran
    description: 'Çekici Hizmeti'
  },
  {
    category: 'tire',
    multiplier: 0.01, // %1 - Optimize edilmiş sabit oran
    description: 'Lastik Servisi'
  },
  {
    category: 'wash',
    multiplier: 0.01, // %1 - Optimize edilmiş sabit oran
    description: 'Araç Yıkama'
  },
  {
    category: 'repair',
    multiplier: 0.01, // %1 - Optimize edilmiş sabit oran
    description: 'Tamir ve Bakım'
  },
  {
    category: 'bodywork',
    multiplier: 0.01, // %1 - Optimize edilmiş sabit oran
    description: 'Kaporta & Boya'
  }
];

// TefePuan hesaplama fonksiyonu - ServiceCategory enum'una uygun
export const calculateTefePoints = (amount: number, serviceCategory: string): number => {
  // ServiceCategory enum değerine normalize et
  // serviceCategory direkt enum değeri ('repair', 'towing', etc.) veya Türkçe isim olabilir
  let normalizedCategory = serviceCategory.toLowerCase();
  
  // Türkçe isimlerden enum değerine çevir
  if (serviceCategory.includes('Tamir') || serviceCategory.includes('Bakım') || serviceCategory.includes('repair')) {
    normalizedCategory = 'repair';
  } else if (serviceCategory.includes('Çekici') || serviceCategory.includes('towing')) {
    normalizedCategory = 'towing';
  } else if (serviceCategory.includes('Yıkama') || serviceCategory.includes('wash')) {
    normalizedCategory = 'wash';
  } else if (serviceCategory.includes('Lastik') || serviceCategory.includes('tire')) {
    normalizedCategory = 'tire';
  } else if (serviceCategory.includes('Kaporta') || serviceCategory.includes('Boya') || serviceCategory.includes('bodywork')) {
    normalizedCategory = 'bodywork';
  }
  
  const category = SERVICE_CATEGORIES.find(cat => cat.category === normalizedCategory);
  if (!category) {
    // Varsayılan kategori - %1
    return Math.floor(amount * 0.01);
  }
  
  // Tüm hizmetler için %1 TefePuan kazanımı
  return Math.floor(amount * category.multiplier);
};

export const TefePoint = mongoose.model<ITefePoint>('TefePoint', TefePointSchema);
