import mongoose, { Document, Schema } from 'mongoose';

export interface ITireHealthRecord extends Document {
  vehicleId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  mechanicId: mongoose.Types.ObjectId;
  checkDate: Date;
  
  // Lastik ölçümleri (FL, FR, RL, RR)
  treadDepth: [number, number, number, number]; // mm cinsinden diş derinliği
  pressure: [number, number, number, number]; // Bar cinsinden basınç
  condition: [string, string, string, string]; // Her lastiğin durumu
  
  // Genel değerlendirme
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  
  // Fotoğraflar
  photos?: string[];
  
  // Tavsiyeler ve sorunlar
  recommendations: string[];
  issues?: string[];
  notes?: string;
  
  // Sonraki kontrol
  nextCheckDate?: Date;
  nextCheckKm?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const TireHealthRecordSchema: Schema = new Schema({
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  treadDepth: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v: number[]) {
        return v.length === 4 && v.every(d => d >= 0 && d <= 20);
      },
      message: 'Diş derinliği 4 lastik için geçerli olmalı (0-20mm arası)'
    }
  },
  pressure: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v: number[]) {
        return v.length === 4 && v.every(p => p >= 0 && p <= 5);
      },
      message: 'Basınç 4 lastik için geçerli olmalı (0-5 bar arası)'
    }
  },
  condition: {
    type: [String],
    required: true,
    validate: {
      validator: function(v: string[]) {
        const validConditions = ['new', 'used', 'good', 'fair', 'poor', 'damaged', 'worn'];
        return v.length === 4 && v.every(c => validConditions.includes(c));
      },
      message: 'Her lastik için geçerli bir durum belirtilmeli'
    }
  },
  overallCondition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
    required: true
  },
  photos: [{
    type: String
  }],
  recommendations: [{
    type: String,
    required: true
  }],
  issues: [{
    type: String
  }],
  notes: {
    type: String
  },
  nextCheckDate: {
    type: Date
  },
  nextCheckKm: {
    type: Number
  }
}, {
  timestamps: true
});

// İndeksler
TireHealthRecordSchema.index({ vehicleId: 1, checkDate: -1 });
TireHealthRecordSchema.index({ userId: 1, checkDate: -1 });
TireHealthRecordSchema.index({ mechanicId: 1, checkDate: -1 });

export const TireHealthRecord = mongoose.model<ITireHealthRecord>('TireHealthRecord', TireHealthRecordSchema);

