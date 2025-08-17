import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IMechanic extends IUser {
  // Ustaya özel alanlar
  vehicleBrands: string[]; // Bakabileceği/tamir edebileceği araç markaları
  serviceCategories: string[]; // Uzmanlık alanları (ağır bakım, alt takım, üst takım, kaporta vs.)
  experience: number;
  rating: number;
  ratingCount: number; // Toplam puan sayısı
  totalServices: number; // Toplam yapılan iş sayısı
  isAvailable: boolean;
  currentLocation?: {
    type: string;
    coordinates: number[];
  };
  documents: {
    insurance: string;
  };
  workingHours?: any;
  pushToken?: string;
  shopName: string;
  location: {
    city: string;
    district: string;
    neighborhood: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
  };
  phone: string;
}

const mechanicSchema = new Schema<IMechanic>({
  // User modelinden gelen alanlar
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  profileImage: { type: String, default: null },
  avatar: { type: String, default: null },
  cover: { type: String, default: null },
  bio: { type: String, default: '' },
  city: { type: String, default: null },
  userType: { type: String, enum: ['user', 'mechanic', 'driver'], default: 'mechanic' },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  favoriteVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  emailHidden: { type: Boolean, default: false },
  phoneHidden: { type: Boolean, default: false },
  notifications: [{
    type: { type: String, enum: ['follow', 'like', 'comment', 'maintenance', 'campaign', 'insurance'], required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    title: String,
    message: String,
    data: Schema.Types.Mixed,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },

  // Ustaya özel alanlar
  vehicleBrands: [{ type: String, required: true }], // Bakabileceği/tamir edebileceği araç markaları
  serviceCategories: [{ type: String, required: true }], // Uzmanlık alanları
  experience: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }, // Toplam puan sayısı
  totalServices: { type: Number, default: 0 }, // Toplam yapılan iş sayısı
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  documents: {
    insurance: { type: String, required: true }
  },
  workingHours: { type: Schema.Types.Mixed, default: {} },
  pushToken: { type: String, default: null },
  shopName: { type: String, default: '' },
  location: {
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    neighborhood: { type: String, default: '' },
    street: { type: String, default: '' },
    building: { type: String, default: '' },
    floor: { type: String, default: '' },
    apartment: { type: String, default: '' },
  },
  phone: { type: String, default: '' },
});

// Konum için geospatial index
mechanicSchema.index({ currentLocation: '2dsphere' });

export const Mechanic = mongoose.model<IMechanic>('Mechanic', mechanicSchema); 