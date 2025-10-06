import mongoose, { Document, Schema } from 'mongoose';
import { UserType } from '../../../shared/types/enums';
import { IUser } from './User';

export interface IMechanic extends IUser {
  // Ustaya özel alanlar
  username: string; // Unique username
  vehicleBrands: string[]; // Bakabileceği/tamir edebileceği araç markaları
  serviceCategories: string[]; // Uzmanlık alanları (ağır bakım, alt takım, üst takım, kaporta vs.)
  experience: number;
  rating: number;
  ratingCount: number; // Toplam puan sayısı
  totalServices: number; // Toplam yapılan iş sayısı
  isAvailable: boolean;
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  documents: {
    insurance: string;
  };
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
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  phone: string;
  // Gizlilik ayarları - User'dan gelen alanları override et
  emailHidden?: boolean;
  phoneHidden?: boolean;
  cityHidden?: boolean;

  // Araç markaları
  carBrands?: string[];
  
  // Motor türleri
  engineTypes?: string[];
  
  // Vites türleri
  transmissionTypes?: string[];
  
  // Özel markalar
  customBrands?: string[];
  
  // Çalışma saatleri
  workingHours?: string;
  
  // Arıza bildirimi için desteklenen markalar
  supportedBrands?: string[];
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
  userType: { type: String, enum: [UserType.MECHANIC], default: UserType.MECHANIC },
  // Google OAuth alanları
  googleId: { type: String, sparse: true, unique: true },
  emailVerified: { type: Boolean, default: false },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  favoriteVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  notifications: [{
    type: { type: String, enum: ['follow', 'like', 'comment', 'maintenance', 'campaign', 'insurance', 'appointment_status_update'], required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    title: String,
    message: String,
    data: Schema.Types.Mixed,
  read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },

  // Ustaya özel alanlar
  username: { type: String, required: true, unique: true },
  vehicleBrands: [{ type: String, default: ['Genel'] }], // Bakabileceği/tamir edebileceği araç markaları
  serviceCategories: [{ type: String, default: ['Genel Bakım'] }], // Uzmanlık alanları
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
    insurance: { type: String, default: 'Sigorta bilgisi eklenecek' }
  },
  workingHours: { type: String, default: '' },
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
    coordinates: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 }
    }
  },
  phone: { type: String, default: '' },
  // Gizlilik ayarları
  emailHidden: { type: Boolean, default: false },
  phoneHidden: { type: Boolean, default: false },
  cityHidden: { type: Boolean, default: false },
  
  // Araç markaları
  carBrands: [{ type: String, default: [] }],
  
  // Motor türleri
  engineTypes: [{ type: String, default: [] }],
  
  // Vites türleri
  transmissionTypes: [{ type: String, default: [] }],
  
  // Özel markalar
  customBrands: [{ type: String, default: [] }],
  
  // Arıza bildirimi için desteklenen markalar
  supportedBrands: [{ type: String, default: [] }],
});

// Konum için geospatial index
mechanicSchema.index({ currentLocation: '2dsphere' });

export const Mechanic = mongoose.model<IMechanic>('Mechanic', mechanicSchema); 