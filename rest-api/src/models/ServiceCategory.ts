import mongoose, { Document, Schema } from 'mongoose';
import { ServiceCategory as ServiceCategoryEnum } from '../../../shared/types/enums';

export interface IServiceCategory extends Document {
  name: string;
  description: string;
  icon?: string;
  type: ServiceCategoryEnum; // Ana hizmet kategorisi (repair, towing, wash, tire, bodywork)
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
    enum: Object.values(ServiceCategoryEnum),
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