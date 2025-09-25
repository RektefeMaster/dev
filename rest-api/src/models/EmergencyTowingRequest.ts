import mongoose, { Document, Schema } from 'mongoose';

export interface IEmergencyTowingRequest extends Document {
  requestId: string;
  userId: string;
  vehicleInfo: {
    type: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
  };
  location: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
    accuracy: number;
  };
  userInfo: {
    name: string;
    surname: string;
    phone: string;
  };
  emergencyType: 'accident' | 'breakdown';
  emergencyDetails: {
    reason: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
  };
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  acceptedBy?: string;
  rejectedBy: string[];
  estimatedArrival?: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  accept(mechanicId: string, estimatedArrival?: Date): Promise<this>;
  reject(mechanicId: string): Promise<this>;
  complete(): Promise<this>;
  cancel(): Promise<this>;
}

const EmergencyTowingRequestSchema = new Schema<IEmergencyTowingRequest>({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  vehicleInfo: {
    type: {
      type: String,
      required: true,
      enum: ['binek', 'ticari', 'motorsiklet', 'kamyon', 'otobüs']
    },
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1
    },
    plate: {
      type: String,
      required: true,
      uppercase: true
    }
  },
  location: {
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },
    address: {
      type: String,
      required: true
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0
    }
  },
  userInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    surname: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      match: /^[0-9+\-\s()]+$/
    }
  },
  emergencyType: {
    type: String,
    required: true,
    enum: ['accident', 'breakdown']
  },
  emergencyDetails: {
    reason: {
      type: String,
      required: true,
      enum: ['accident', 'breakdown', 'battery', 'tire', 'fuel', 'other']
    },
    description: {
      type: String,
      required: true,
      maxlength: 500
    },
    severity: {
      type: String,
      required: true,
      enum: ['critical', 'high', 'medium'],
      default: 'high'
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  acceptedBy: {
    type: String,
    ref: 'User',
    index: true
  },
  rejectedBy: [{
    type: String,
    ref: 'User'
  }],
  estimatedArrival: {
    type: Date
  },
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'emergency_towing_requests'
});

// Indexes for better performance
EmergencyTowingRequestSchema.index({ userId: 1, status: 1 });
EmergencyTowingRequestSchema.index({ acceptedBy: 1, status: 1 });
EmergencyTowingRequestSchema.index({ 'location.coordinates': '2dsphere' });
EmergencyTowingRequestSchema.index({ createdAt: -1 });
EmergencyTowingRequestSchema.index({ status: 1, createdAt: -1 });

// Virtual for full name
EmergencyTowingRequestSchema.virtual('userInfo.fullName').get(function() {
  return `${this.userInfo.name} ${this.userInfo.surname}`;
});

// Virtual for vehicle display name
EmergencyTowingRequestSchema.virtual('vehicleInfo.displayName').get(function() {
  return `${this.vehicleInfo.brand} ${this.vehicleInfo.model} (${this.vehicleInfo.plate})`;
});

// Pre-save middleware
EmergencyTowingRequestSchema.pre('save', function(next) {
  // Generate unique request ID if not exists
  if (!this.requestId) {
    this.requestId = `EMR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  next();
});

// Instance methods
EmergencyTowingRequestSchema.methods.accept = function(mechanicId: string, estimatedArrival?: number) {
  this.status = 'accepted';
  this.acceptedBy = mechanicId;
  this.acceptedAt = new Date();
  if (estimatedArrival) {
    this.estimatedArrival = new Date(Date.now() + estimatedArrival * 60 * 1000);
  }
  return this.save();
};

EmergencyTowingRequestSchema.methods.reject = function(mechanicId: string) {
  if (!this.rejectedBy.includes(mechanicId)) {
    this.rejectedBy.push(mechanicId);
  }
  return this.save();
};

EmergencyTowingRequestSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

EmergencyTowingRequestSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  return this.save();
};

// Static methods
EmergencyTowingRequestSchema.statics.findActiveRequests = function() {
  return this.find({
    status: { $in: ['pending', 'accepted'] }
  }).sort({ createdAt: -1 });
};

EmergencyTowingRequestSchema.statics.findByMechanic = function(mechanicId: string) {
  return this.find({
    $or: [
      { acceptedBy: mechanicId },
      { rejectedBy: mechanicId }
    ]
  }).sort({ createdAt: -1 });
};

EmergencyTowingRequestSchema.statics.findNearby = function(coordinates: { latitude: number; longitude: number }, maxDistance: number = 50) {
  return this.find({
    status: 'pending',
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    }
  });
};

// Instance methods
EmergencyTowingRequestSchema.methods.accept = function(mechanicId: string, estimatedArrival?: Date) {
  this.status = 'accepted';
  this.acceptedBy = mechanicId;
  this.acceptedAt = new Date();
  if (estimatedArrival) {
    this.estimatedArrival = estimatedArrival;
  }
  return this.save();
};

EmergencyTowingRequestSchema.methods.reject = function(mechanicId: string) {
  if (!this.rejectedBy.includes(mechanicId)) {
    this.rejectedBy.push(mechanicId);
  }
  return this.save();
};

EmergencyTowingRequestSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

EmergencyTowingRequestSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  return this.save();
};

export const EmergencyTowingRequest = mongoose.model<IEmergencyTowingRequest>('EmergencyTowingRequest', EmergencyTowingRequestSchema);
