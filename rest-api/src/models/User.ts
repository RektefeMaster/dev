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
  phoneVerified?: boolean;
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
    type: 'Point';
    coordinates: [number, number];
  };
  workingHours?: string; // JSON string olarak çalışma saatleri
  documents?: {
    insurance?: string;
    license?: string;
    certificate?: string;
  };
  shopName?: string;
  // location: Sadece mechanic (usta) için kullanılır
  // Driver (şöför) için bu alan kullanılmaz
  location?: {
    city?: string;
    district?: string;
    neighborhood?: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    description?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  carBrands?: string[];
  engineTypes?: string[];
  transmissionTypes?: string[];
  customBrands?: string[];
  vehicleBrands?: string[];
  supportedBrands?: string[];
  washPackages?: any[];
  washOptions?: any[];
  notificationSettings?: {
    pushNotifications: boolean;
    emailUpdates: boolean;
    appointmentNotifications: boolean;
    paymentNotifications: boolean;
    messageNotifications: boolean;
    systemNotifications: boolean;
    marketingNotifications: boolean;
    soundAlerts: boolean;
    vibrationAlerts: boolean;
  };
  privacySettings?: {
    locationSharing: boolean;
    profileVisibility: boolean;
    emailHidden: boolean;
    phoneHidden: boolean;
  };
  jobSettings?: {
    autoAcceptJobs: boolean;
    isAvailable: boolean;
    workingHours: string;
  };
  appSettings?: {
    darkMode: boolean;
    language: string;
    theme: string;
  };
  securitySettings?: {
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    sessionTimeout: number;
  };
  // Yeni özellikler için eklenen alanlar
  customerNotes?: Array<{
    customerId: string;
    note: string;
    createdAt: Date;
  }>;
  serviceCatalog?: Array<{
    name: string;
    category: string;
    description: string;
    price: number;
    duration: number;
    isActive: boolean;
    createdAt: Date;
  }>;
  suppliers?: Array<{
    _id?: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    specialties: string[];
    notes?: string;
    createdAt: Date;
  }>;
  vehicleHistory?: Array<{
    vehicleId: string;
    serviceType: string;
    description: string;
    price: number;
    mileage: number;
    date: Date;
  }>;
  maintenanceReminders?: Array<{
    _id?: mongoose.Types.ObjectId;
    vehicleId: string;
    type: 'mileage' | 'date' | 'both';
    targetMileage?: number;
    targetDate?: Date;
    description: string;
    isActive: boolean;
    createdAt: Date;
  }>;
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
  phoneVerified: {
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
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  workingHours: {
    type: String,
    default: ''
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
  // location: Sadece mechanic (usta) için kullanılır
  // Driver (şöför) için bu alan kullanılmaz
  location: {
    city: {
      type: String,
      default: ''
    },
    district: {
      type: String,
      default: ''
    },
    neighborhood: {
      type: String,
      default: ''
    },
    street: {
      type: String,
      default: ''
    },
    building: {
      type: String,
      default: ''
    },
    floor: {
      type: String,
      default: ''
    },
    apartment: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    coordinates: {
      latitude: {
        type: Number,
        default: 0
      },
      longitude: {
        type: Number,
        default: 0
      }
    }
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
    pushNotifications: {
      type: Boolean,
      default: true
    },
    emailUpdates: {
      type: Boolean,
      default: true
    },
    appointmentNotifications: {
      type: Boolean,
      default: true
    },
    paymentNotifications: {
      type: Boolean,
      default: true
    },
    messageNotifications: {
      type: Boolean,
      default: true
    },
    systemNotifications: {
      type: Boolean,
      default: true
    },
    marketingNotifications: {
      type: Boolean,
      default: false
    },
    soundAlerts: {
      type: Boolean,
      default: true
    },
    vibrationAlerts: {
      type: Boolean,
      default: true
    }
  },
  privacySettings: {
    locationSharing: {
      type: Boolean,
      default: false
    },
    profileVisibility: {
      type: Boolean,
      default: true
    },
    emailHidden: {
      type: Boolean,
      default: false
    },
    phoneHidden: {
      type: Boolean,
      default: false
    }
  },
  jobSettings: {
    autoAcceptJobs: {
      type: Boolean,
      default: false
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    workingHours: {
      type: String,
      default: ''
    }
  },
  appSettings: {
    darkMode: {
      type: Boolean,
      default: false
    },
    language: {
      type: String,
      default: 'tr'
    },
    theme: {
      type: String,
      default: 'light'
    }
  },
  securitySettings: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    biometricEnabled: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 30
    }
  },
  // Yeni özellikler için eklenen alanlar
  customerNotes: [{
    customerId: {
      type: String,
      required: true
    },
    note: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  serviceCatalog: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Motor Bakımı',
        'Fren Sistemi',
        'Süspansiyon',
        'Elektrik',
        'Klima',
        'Lastik',
        'Egzoz',
        'Kaportaj',
        'Boyama',
        'Genel Bakım',
        'Diğer'
      ]
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  suppliers: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      trim: true
    },
    specialties: [{
      type: String,
      trim: true
    }],
    notes: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  vehicleHistory: [{
    vehicleId: {
      type: String,
      required: true
    },
    serviceType: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    mileage: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      required: true
    }
  }],
  maintenanceReminders: [{
    vehicleId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['mileage', 'date', 'both']
    },
    targetMileage: {
      type: Number,
      min: 0
    },
    targetDate: {
      type: Date
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Performance optimization: Add indexes for common queries
userSchema.index({ userType: 1, isAvailable: 1 }); // Available mechanics/drivers
userSchema.index({ userType: 1, city: 1 }); // Users by type and location
// userSchema.index({ currentLocation: '2dsphere' }); // Geospatial queries - sadece mechanic için
userSchema.index({ createdAt: -1 }); // Recent users
userSchema.index({ rating: -1 }); // Top rated users
userSchema.index({ phone: 1 }); // Phone lookups

export const User = mongoose.model<IUser>('User', userSchema); 