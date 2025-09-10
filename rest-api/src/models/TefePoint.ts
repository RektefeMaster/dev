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

// Hizmet kategorileri ve kazanım oranları
export const SERVICE_CATEGORIES: IServiceCategory[] = [
  {
    category: 'towing',
    multiplier: 0.02, // %2 - Düşük kâr, düşük kazanım
    description: 'Çekici Hizmeti'
  },
  {
    category: 'tire_service',
    multiplier: 0.03, // %3 - Orta kâr
    description: 'Lastik Hizmeti'
  },
  {
    category: 'wash_service',
    multiplier: 0.04, // %4 - Orta kâr
    description: 'Araç Yıkama'
  },
  {
    category: 'maintenance',
    multiplier: 0.05, // %5 - Orta-yüksek kâr
    description: 'Genel Bakım'
  },
  {
    category: 'engine_repair',
    multiplier: 0.07, // %7 - Yüksek kâr, yüksek kazanım
    description: 'Motor Rektefiyesi'
  },
  {
    category: 'transmission_repair',
    multiplier: 0.08, // %8 - Çok yüksek kâr
    description: 'Şanzıman Rektefiyesi'
  },
  {
    category: 'electrical_repair',
    multiplier: 0.06, // %6 - Yüksek kâr
    description: 'Elektrik Rektefiyesi'
  },
  {
    category: 'body_repair',
    multiplier: 0.09, // %9 - En yüksek kâr, en yüksek kazanım
    description: 'Kaporta Rektefiyesi'
  }
];

// TefePuan hesaplama fonksiyonu
export const calculateTefePoints = (amount: number, serviceCategory: string): number => {
  const category = SERVICE_CATEGORIES.find(cat => cat.category === serviceCategory);
  if (!category) {
    // Varsayılan kategori - %5
    return Math.floor(amount * 0.05);
  }
  
  // 1000 TL'ye 50 TefePuan ortalama için ayarlama
  // Gerçek hesaplama: amount * multiplier
  return Math.floor(amount * category.multiplier);
};

export const TefePoint = mongoose.model<ITefePoint>('TefePoint', TefePointSchema);
