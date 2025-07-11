import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceCategory extends Document {
  name: string;
  description: string;
  icon?: string;
  type: 'maintenance' | 'repair' | 'bodywork' | 'tire' | 'wash'; // Hizmet tipi
  subCategories?: string[]; // Alt kategoriler (örn: ağır bakım, alt takım, üst takım, kaporta vs.)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceCategorySchema = new Schema<IServiceCategory>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['maintenance', 'repair', 'bodywork', 'tire', 'wash'],
    required: true
  },
  subCategories: [{
    type: String,
    required: true
  }],
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

// Güncelleme zamanını otomatik güncelle
serviceCategorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const ServiceCategory = mongoose.model<IServiceCategory>('ServiceCategory', serviceCategorySchema); 