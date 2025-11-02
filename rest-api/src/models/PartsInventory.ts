import mongoose, { Schema, Document } from 'mongoose';

export interface IPartsInventory extends Document {
  // İlişkiler
  mechanicId: mongoose.Types.ObjectId;
  
  // Parça Bilgileri
  partName: string;
  brand: string;
  partNumber?: string;
  description?: string;
  photos: string[]; // Fotoğraf URL'leri
  
  // Kategori
  category: 'engine' | 'electrical' | 'suspension' | 'brake' | 'body' | 'interior' | 'exterior' | 'fuel' | 'cooling' | 'transmission' | 'exhaust' | 'other';
  
  // Araç Uyumluluğu
  compatibility: {
    makeModel: string[]; // ["Toyota", "Corolla"]
    years: {
      start: number;
      end: number;
    };
    engine?: string[]; // ["1.6L", "1.8L"]
    vinPrefix?: string[]; // Şase no prefix
    notes?: string;
  };
  
  // Stok & Fiyat
  stock: {
    quantity: number; // Toplam stok
    available: number; // Müsait adet (quantity - reserved)
    reserved: number; // Rezerve edilmiş
    lowThreshold: number;
  };
  
  pricing: {
    unitPrice: number;
    oldPrice?: number;
    currency: string;
    isNegotiable: boolean;
  };
  
  // Durum
  condition: 'new' | 'used' | 'refurbished' | 'oem' | 'aftermarket';
  warranty?: {
    months: number;
    description: string;
  };
  
  // İstatistikler
  stats: {
    views: number;
    reservations: number;
    sales: number;
    rating?: number;
  };
  
  // Moderation
  moderation: {
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    moderatedAt?: Date;
  };
  
  // Durum
  isActive: boolean;
  isPublished: boolean; // Market'te görünür mü?
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const PartsInventorySchema = new Schema<IPartsInventory>(
  {
    mechanicId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    partName: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    partNumber: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      enum: ['engine', 'electrical', 'suspension', 'brake', 'body', 'interior', 'exterior', 'fuel', 'cooling', 'transmission', 'exhaust', 'other'],
      required: true,
    },
    compatibility: {
      makeModel: {
        type: [String],
        required: true,
      },
      years: {
        start: {
          type: Number,
          required: true,
        },
        end: {
          type: Number,
          required: true,
        },
      },
      engine: {
        type: [String],
        default: [],
      },
      vinPrefix: {
        type: [String],
        default: [],
      },
      notes: {
        type: String,
      },
    },
    stock: {
      quantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      available: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      reserved: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      lowThreshold: {
        type: Number,
        required: true,
        default: 5,
      },
    },
    pricing: {
      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      oldPrice: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: 'TRY',
      },
      isNegotiable: {
        type: Boolean,
        default: false,
      },
    },
    condition: {
      type: String,
      enum: ['new', 'used', 'refurbished', 'oem', 'aftermarket'],
      required: true,
    },
    warranty: {
      months: {
        type: Number,
        min: 0,
      },
      description: {
        type: String,
      },
    },
    stats: {
      views: {
        type: Number,
        default: 0,
      },
      reservations: {
        type: Number,
        default: 0,
      },
      sales: {
        type: Number,
        default: 0,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
    },
    moderation: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      rejectionReason: {
        type: String,
      },
      moderatedAt: {
        type: Date,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler - Performans için kritik
PartsInventorySchema.index({ mechanicId: 1, isPublished: 1 });
PartsInventorySchema.index({ 'compatibility.makeModel': 1, 'compatibility.years.start': 1, 'compatibility.years.end': 1 });
PartsInventorySchema.index({ category: 1, isPublished: 1 });
PartsInventorySchema.index({ 'pricing.unitPrice': 1 });
PartsInventorySchema.index({ brand: 'text', partName: 'text', partNumber: 'text' });

// Middleware: Stock sync
PartsInventorySchema.pre('save', function(next) {
  const part = this as IPartsInventory;
  
  // Stock objesi var mı ve geçerli mi kontrol et
  if (!part.stock) {
    return next(new Error('Stock bilgisi bulunamadı'));
  }
  
  // NaN ve undefined kontrolleri
  const quantity = Number(part.stock.quantity);
  let reserved = Number(part.stock.reserved || 0);
  
  if (isNaN(quantity) || quantity < 0) {
    return next(new Error('Geçersiz stok miktarı (NaN veya negatif)'));
  }
  
  // Reserved NaN veya negatif ise 0 yap
  if (isNaN(reserved) || reserved < 0) {
    reserved = 0;
    part.stock.reserved = 0;
  }
  
  // Reserved değerini quantity'den fazla olamaz
  if (reserved > quantity) {
    reserved = quantity;
    part.stock.reserved = quantity;
  } else {
    // Reserved geçerliyse, part.stock.reserved'i güncelle
    part.stock.reserved = reserved;
  }
  
  // Available hesapla (garanti et ki sayı)
  part.stock.available = Math.max(0, quantity - reserved);
  
  // LowThreshold kontrolü
  const lowThreshold = Number(part.stock.lowThreshold);
  if (isNaN(lowThreshold) || lowThreshold < 0) {
    part.stock.lowThreshold = 5; // Default değer
  }
  
  next();
});

export const PartsInventory = mongoose.model<IPartsInventory>('PartsInventory', PartsInventorySchema);

