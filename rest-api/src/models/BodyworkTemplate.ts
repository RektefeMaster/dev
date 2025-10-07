import mongoose, { Document, Schema } from 'mongoose';

export interface IBodyworkTemplate extends Document {
  // Şablon bilgileri
  mechanicId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  
  // Hasar türüne göre şablonlar
  damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  
  // Standart iş akışı
  workflowTemplate: Array<{
    stage: string;
    stageName: string;
    estimatedHours: number;
    requiredPhotos: number;
    description: string;
    order: number;
  }>;
  
  // Standart parça listesi
  standardParts: Array<{
    partName: string;
    partNumber?: string;
    brand: string;
    estimatedPrice: number;
    notes?: string;
  }>;
  
  // Standart malzeme listesi
  standardMaterials: Array<{
    materialName: string;
    estimatedQuantity: number;
    estimatedPrice: number;
    notes?: string;
  }>;
  
  // Standart işçilik oranları
  laborRates: {
    hourlyRate: number;
    overtimeRate: number;
    weekendRate: number;
  };
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bodyworkTemplateSchema = new Schema<IBodyworkTemplate>({
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
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
  
  workflowTemplate: [{
    stage: { type: String, required: true },
    stageName: { type: String, required: true },
    estimatedHours: { type: Number, required: true, min: 0 },
    requiredPhotos: { type: Number, default: 1, min: 0 },
    description: { type: String, required: true },
    order: { type: Number, required: true }
  }],
  
  standardParts: [{
    partName: { type: String, required: true },
    partNumber: String,
    brand: { type: String, required: true },
    estimatedPrice: { type: Number, required: true, min: 0 },
    notes: String
  }],
  
  standardMaterials: [{
    materialName: { type: String, required: true },
    estimatedQuantity: { type: Number, required: true, min: 0 },
    estimatedPrice: { type: Number, required: true, min: 0 },
    notes: String
  }],
  
  laborRates: {
    hourlyRate: { type: Number, required: true, min: 0 },
    overtimeRate: { type: Number, required: true, min: 0 },
    weekendRate: { type: Number, required: true, min: 0 }
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
bodyworkTemplateSchema.index({ mechanicId: 1, damageType: 1, severity: 1 });
bodyworkTemplateSchema.index({ isActive: 1 });

// Pre-save middleware
bodyworkTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const BodyworkTemplate = mongoose.model<IBodyworkTemplate>('BodyworkTemplate', bodyworkTemplateSchema);
