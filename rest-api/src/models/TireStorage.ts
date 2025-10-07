import mongoose, { Document, Schema } from 'mongoose';

export interface ITireStorage extends Document {
  // Temel bilgiler
  customerId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  mechanicId: mongoose.Types.ObjectId;
  
  // Lastik seti bilgileri
  tireSet: {
    season: 'summer' | 'winter';
    brand: string;
    model: string;
    size: string; // 225/45/R17 formatında
    condition: 'new' | 'used' | 'good' | 'fair' | 'poor';
    treadDepth: number[]; // 4 lastik için ayrı ayrı diş derinliği (mm)
    productionYear?: number;
    notes?: string;
  };
  
  // Depo konumu
  location: {
    corridor: string; // A, B, C koridorları
    rack: number; // Raf numarası
    slot: number; // Göz numarası
    fullLocation: string; // A-4-2 formatında
  };
  
  // Barkod/QR kod
  barcode: string; // Benzersiz barkod
  qrCode: string; // QR kod URL'i
  
  // Tarihler
  storageDate: Date;
  expiryDate: Date; // Saklama süresi sonu
  lastAccessedDate?: Date;
  
  // Durum
  status: 'stored' | 'retrieved' | 'expired' | 'damaged';
  
  // Ücret bilgileri
  storageFee: number;
  totalPaid: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  
  // Fotoğraflar
  photos: string[]; // Lastiklerin fotoğrafları
  
  // Otomatik hatırlatma
  reminderSent: boolean;
  reminderDate?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const tireStorageSchema = new Schema<ITireStorage>({
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
  
  tireSet: {
    season: {
      type: String,
      enum: ['summer', 'winter'],
      required: true
    },
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    size: {
      type: String,
      required: true
    },
    condition: {
      type: String,
      enum: ['new', 'used', 'good', 'fair', 'poor'],
      default: 'good'
    },
    treadDepth: [{
      type: Number,
      min: 0,
      max: 20
    }],
    productionYear: Number,
    notes: String
  },
  
  location: {
    corridor: {
      type: String,
      required: true
    },
    rack: {
      type: Number,
      required: true,
      min: 1
    },
    slot: {
      type: Number,
      required: true,
      min: 1
    },
    fullLocation: {
      type: String,
      required: true
    }
  },
  
  barcode: {
    type: String,
    required: true,
    unique: true
  },
  qrCode: {
    type: String,
    required: true
  },
  
  storageDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  lastAccessedDate: Date,
  
  status: {
    type: String,
    enum: ['stored', 'retrieved', 'expired', 'damaged'],
    default: 'stored'
  },
  
  storageFee: {
    type: Number,
    required: true,
    min: 0
  },
  totalPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  
  photos: [String],
  
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderDate: Date,
  
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
tireStorageSchema.index({ mechanicId: 1, status: 1 });
tireStorageSchema.index({ location: 1 });
tireStorageSchema.index({ barcode: 1 });
tireStorageSchema.index({ customerId: 1 });
tireStorageSchema.index({ expiryDate: 1 });

// Pre-save middleware
tireStorageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const TireStorage = mongoose.model<ITireStorage>('TireStorage', tireStorageSchema);
