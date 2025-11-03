import mongoose, { Document, Schema } from 'mongoose';

export interface IBodyworkJob extends Document {
  // Temel bilgiler
  customerId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  mechanicId: mongoose.Types.ObjectId;
  
  // Hasar bilgileri
  damageInfo: {
    description: string;
    photos: string[]; // Hasar fotoğrafları
    videos?: string[]; // Hasar videoları
    damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
    severity: 'minor' | 'moderate' | 'major' | 'severe';
    affectedAreas: string[]; // ['front_bumper', 'left_door', 'rear_panel']
    estimatedRepairTime: number; // saat
  };
  
  // Teklif bilgileri
  quote: {
    totalAmount: number;
    breakdown: {
      partsToReplace: Array<{
        partName: string;
        partNumber?: string;
        brand: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        notes?: string;
      }>;
      partsToRepair: Array<{
        partName: string;
        laborHours: number;
        laborRate: number;
        totalPrice: number;
        notes?: string;
      }>;
      paintMaterials: Array<{
        materialName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        notes?: string;
      }>;
      laborCost: number;
      materialCost: number;
      totalCost: number;
    };
    validityDays: number;
    createdAt: Date;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  };
  
  // İş akışı
  workflow: {
    currentStage: 'quote_preparation' | 'disassembly' | 'repair' | 'putty' | 'primer' | 'paint' | 'assembly' | 'quality_check' | 'completed';
    stages: Array<{
      stage: string;
      status: 'pending' | 'in_progress' | 'completed' | 'skipped';
      startDate?: Date;
      endDate?: Date;
      photos: string[]; // Aşama fotoğrafları
      notes?: string;
      assignedTo?: mongoose.Types.ObjectId; // Hangi teknisyen
    }>;
    estimatedCompletionDate: Date;
    actualCompletionDate?: Date;
  };
  
  // Durum
  status: 'quote_preparation' | 'quote_sent' | 'quote_accepted' | 'work_started' | 'in_progress' | 'completed' | 'cancelled' | 'pending_mechanic';
  
  // Ödeme bilgileri
  payment: {
    totalAmount: number;
    paidAmount: number;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
    paymentMethod?: 'cash' | 'card' | 'bank_transfer';
    paymentDate?: Date;
  };
  
  // Müşteri onayları
  customerApprovals: Array<{
    stage: string;
    approved: boolean;
    approvedAt?: Date;
    notes?: string;
    photos?: string[]; // Onay fotoğrafları
  }>;
  
  // Kalite kontrol
  qualityCheck: {
    passed: boolean;
    checkedBy: mongoose.Types.ObjectId;
    checkedAt?: Date;
    issues: string[];
    photos: string[];
    notes?: string;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const bodyworkJobSchema = new Schema<IBodyworkJob>({
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
    required: false // Müşteri işi oluştururken opsiyonel olabilir
  },
  
  damageInfo: {
    description: {
      type: String,
      required: true
    },
    photos: [String],
    videos: [String],
    damageType: {
      type: String,
      enum: ['collision', 'scratch', 'dent', 'rust', 'paint_damage', 'other'],
      required: true
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major', 'severe'],
      required: true
    },
    affectedAreas: [String],
    estimatedRepairTime: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  quote: {
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    breakdown: {
      partsToReplace: [{
        partName: { type: String, required: true },
        partNumber: String,
        brand: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        notes: String
      }],
      partsToRepair: [{
        partName: { type: String, required: true },
        laborHours: { type: Number, required: true, min: 0 },
        laborRate: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        notes: String
      }],
      paintMaterials: [{
        materialName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        notes: String
      }],
      laborCost: { type: Number, required: true, min: 0 },
      materialCost: { type: Number, required: true, min: 0 },
      totalCost: { type: Number, required: true, min: 0 }
    },
    validityDays: {
      type: Number,
      default: 30
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'draft'
    }
  },
  
  workflow: {
    currentStage: {
      type: String,
      enum: ['quote_preparation', 'disassembly', 'repair', 'putty', 'primer', 'paint', 'assembly', 'quality_check', 'completed'],
      default: 'quote_preparation'
    },
    stages: [{
      stage: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'skipped'],
        default: 'pending'
      },
      startDate: Date,
      endDate: Date,
      photos: [String],
      notes: String,
      assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    estimatedCompletionDate: {
      type: Date,
      required: true
    },
    actualCompletionDate: Date
  },
  
  status: {
    type: String,
    enum: ['quote_preparation', 'quote_sent', 'quote_accepted', 'work_started', 'in_progress', 'completed', 'cancelled', 'pending_mechanic'],
    default: 'quote_preparation'
  },
  
  payment: {
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer']
    },
    paymentDate: Date
  },
  
  customerApprovals: [{
    stage: { type: String, required: true },
    approved: { type: Boolean, required: true },
    approvedAt: Date,
    notes: String,
    photos: [String]
  }],
  
  qualityCheck: {
    passed: { type: Boolean, default: false },
    checkedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedAt: Date,
    issues: [String],
    photos: [String],
    notes: String
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
bodyworkJobSchema.index({ mechanicId: 1, status: 1 });
bodyworkJobSchema.index({ customerId: 1 });
bodyworkJobSchema.index({ 'workflow.currentStage': 1 });
bodyworkJobSchema.index({ createdAt: -1 });

// Pre-save middleware
bodyworkJobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Toplam maliyeti hesapla
  if (this.quote.breakdown) {
    this.quote.breakdown.totalCost = 
      this.quote.breakdown.laborCost + 
      this.quote.breakdown.materialCost;
    this.quote.totalAmount = this.quote.breakdown.totalCost;
  }
  
  // Ödeme durumunu güncelle
  // Hassas karşılaştırma için tolerance ekle (float precision sorunları için)
  const tolerance = 0.01; // 1 kuruş tolerans
  const remaining = this.payment.totalAmount - this.payment.paidAmount;
  
  if (remaining <= tolerance) {
    this.payment.paymentStatus = 'paid';
  } else if (this.payment.paidAmount > 0) {
    this.payment.paymentStatus = 'partial';
  } else {
    this.payment.paymentStatus = 'pending';
  }
  
  // Fazla ödeme kontrolü
  if (this.payment.paidAmount > this.payment.totalAmount + tolerance) {
    // Fazla ödeme uyarısı (ama engelleme - bazı durumlarda kabul edilebilir)
    console.warn(`Warning: Job ${this._id} has overpayment. Paid: ${this.payment.paidAmount}, Total: ${this.payment.totalAmount}`);
  }
  
  next();
});

export const BodyworkJob = mongoose.model<IBodyworkJob>('BodyworkJob', bodyworkJobSchema);
