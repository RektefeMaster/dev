import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  surname: string;
  profileImage?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  phone?: string;
  city?: string;
  userType: 'user' | 'mechanic' | 'driver' | 'admin';
  // Google OAuth alanları
  googleId?: string;
  emailVerified?: boolean;
  // Diğer alanlar
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  favoriteVehicle?: mongoose.Types.ObjectId;
  emailHidden?: boolean;
  phoneHidden?: boolean;
  pushToken?: string;
  platform?: 'ios' | 'android' | 'web';
  lastTokenUpdate?: Date;
  notifications: Array<{
    _id: mongoose.Types.ObjectId;
    type: 'follow' | 'like' | 'comment' | 'maintenance' | 'campaign' | 'insurance' | 'appointment_status_update';
    from?: mongoose.Types.ObjectId;
    title: string;
    message: string;
    data?: any;
    read: boolean;
    createdAt: Date;
  }>;
  createdAt: Date;
  // Usta/Şöför özel alanları
  username?: string;
  serviceCategories?: string[];
  experience?: number;
  rating?: number;
  ratingCount?: number;
  totalServices?: number;
  isAvailable?: boolean;
  currentLocation?: {
    type: string;
    coordinates: number[];
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  documents?: {
    insurance?: string;
    license?: string;
    certificate?: string;
  };
  shopName?: string;
  location?: {
    city: string;
    district: string;
    neighborhood: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    description?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  workingHours?: string;
  carBrands?: string[];
  engineTypes?: string[];
  transmissionTypes?: string[];
  customBrands?: string[];
  vehicleBrands?: string[];
  supportedBrands?: string[];
  washPackages?: any[];
  washOptions?: any[];
  notificationSettings?: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  surname: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  cover: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  userType: {
    type: String,
    enum: ['user', 'mechanic', 'driver', 'admin'],
    default: 'user'
  },
  // Google OAuth alanları
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  favoriteVehicle: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  emailHidden: {
    type: Boolean,
    default: false
  },
  phoneHidden: {
    type: Boolean,
    default: false
  },
  pushToken: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    default: 'ios'
  },
  lastTokenUpdate: {
    type: Date,
    default: null
  },
  notifications: [{
    _id: {
      type: Schema.Types.ObjectId,
      auto: true
    },
    type: {
      type: String,
      enum: ['follow', 'like', 'comment', 'maintenance', 'campaign', 'insurance', 'appointment_status_update'],
      required: true
    },
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    title: String,
    message: String,
    data: Schema.Types.Mixed,
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Usta/Şöför özel alanları
  username: {
    type: String,
    required: function() {
      return this.userType === 'mechanic';
    },
    unique: true,
    sparse: true
  },
  serviceCategories: [{
    type: String,
    default: []
  }],
  experience: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  totalServices: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [Number],
    latitude: Number,
    longitude: Number,
    address: String
  },
  documents: {
    insurance: String,
    license: String,
    certificate: String
  },
  shopName: {
    type: String,
    default: ''
  },
  location: {
    city: String,
    district: String,
    neighborhood: String,
    street: String,
    building: String,
    floor: String,
    apartment: String,
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  workingHours: {
    type: String,
    default: ''
  },
  carBrands: [{
    type: String,
    default: []
  }],
  engineTypes: [{
    type: String,
    default: []
  }],
  transmissionTypes: [{
    type: String,
    default: []
  }],
  customBrands: [{
    type: String,
    default: []
  }],
  vehicleBrands: [{
    type: String,
    default: []
  }],
  supportedBrands: [{
    type: String,
    default: []
  }],
  washPackages: [{
    type: Schema.Types.Mixed,
    default: []
  }],
  washOptions: [{
    type: Schema.Types.Mixed,
    default: []
  }],
  notificationSettings: {
    push: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    }
  }
});

export const User = mongoose.model<IUser>('User', userSchema); 