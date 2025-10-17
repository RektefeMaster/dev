import mongoose, { Schema, Document } from 'mongoose';

export interface IWashInventory extends Document {
  // İlişkiler
  providerId: mongoose.Types.ObjectId;
  
  // Malzeme bilgileri
  itemName: string;
  itemCode?: string;
  category: 'shampoo' | 'wax' | 'polish' | 'cleaner' | 'microfiber' | 'chemical' | 'accessory' | 'other';
  
  // Stok bilgileri
  stock: {
    currentQuantity: number;
    unit: 'litre' | 'kg' | 'adet' | 'paket' | 'ml';
    lowThreshold: number; // Kritik eşik
    reorderThreshold: number; // Yeniden sipariş eşiği
    maxCapacity: number;
  };
  
  // Tedarikçi bilgileri
  supplier?: {
    name: string;
    contactPhone?: string;
    lastOrderDate?: Date;
    averageDeliveryTime?: number; // gün
  };
  
  // Maliyet bilgileri
  cost: {
    unitCost: number; // Birim maliyet
    lastPurchasePrice: number;
    lastPurchaseDate?: Date;
  };
  
  // Tüketim istatistikleri
  consumption: {
    averagePerJob: number; // İş başına ortalama tüketim
    totalConsumed: number; // Toplam tüketim
    lastConsumedDate?: Date;
  };
  
  // Uyarı durumu
  alerts: {
    isLowStock: boolean;
    needsReorder: boolean;
    lastAlertSent?: Date;
  };
  
  // Ürün detayları
  details: {
    brand?: string;
    model?: string;
    expiryDate?: Date;
    batchNumber?: string;
    notes?: string;
  };
  
  // Durum
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const WashInventorySchema = new Schema<IWashInventory>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'WashProvider',
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemCode: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['shampoo', 'wax', 'polish', 'cleaner', 'microfiber', 'chemical', 'accessory', 'other'],
      required: true,
    },
    stock: {
      currentQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      unit: {
        type: String,
        enum: ['litre', 'kg', 'adet', 'paket', 'ml'],
        required: true,
      },
      lowThreshold: {
        type: Number,
        required: true,
        default: 10,
      },
      reorderThreshold: {
        type: Number,
        required: true,
        default: 20,
      },
      maxCapacity: {
        type: Number,
        required: true,
        default: 100,
      },
    },
    supplier: {
      name: String,
      contactPhone: String,
      lastOrderDate: Date,
      averageDeliveryTime: Number,
    },
    cost: {
      unitCost: {
        type: Number,
        default: 0,
      },
      lastPurchasePrice: {
        type: Number,
        default: 0,
      },
      lastPurchaseDate: Date,
    },
    consumption: {
      averagePerJob: {
        type: Number,
        default: 0,
      },
      totalConsumed: {
        type: Number,
        default: 0,
      },
      lastConsumedDate: Date,
    },
    alerts: {
      isLowStock: {
        type: Boolean,
        default: false,
      },
      needsReorder: {
        type: Boolean,
        default: false,
      },
      lastAlertSent: Date,
    },
    details: {
      brand: String,
      model: String,
      expiryDate: Date,
      batchNumber: String,
      notes: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
WashInventorySchema.index({ providerId: 1, isActive: 1 });
WashInventorySchema.index({ providerId: 1, category: 1 });
WashInventorySchema.index({ 'alerts.isLowStock': 1, 'alerts.needsReorder': 1 });

// Stok uyarıları için middleware
WashInventorySchema.pre('save', function(next) {
  const item = this as IWashInventory;
  
  // Düşük stok kontrolü
  item.alerts.isLowStock = item.stock.currentQuantity <= item.stock.lowThreshold;
  
  // Yeniden sipariş kontrolü
  item.alerts.needsReorder = item.stock.currentQuantity <= item.stock.reorderThreshold;
  
  next();
});

export const WashInventory = mongoose.model<IWashInventory>('WashInventory', WashInventorySchema);

