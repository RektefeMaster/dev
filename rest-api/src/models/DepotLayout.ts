import mongoose, { Document, Schema } from 'mongoose';

export interface IDepotLayout extends Document {
  mechanicId: mongoose.Types.ObjectId;
  
  // Depo yapısı
  layout: {
    corridors: Array<{
      name: string; // A, B, C
      racks: number; // Raf sayısı
      slotsPerRack: number; // Her raftaki göz sayısı
      capacity: number; // Toplam kapasite
    }>;
  };
  
  // Mevcut durum
  currentStatus: {
    totalCapacity: number;
    occupiedSlots: number;
    availableSlots: number;
    occupancyRate: number; // Yüzde
  };
  
  // Konum durumları
  slotStatus: Map<string, {
    status: 'available' | 'occupied' | 'reserved' | 'maintenance';
    tireStorageId?: mongoose.Types.ObjectId;
    lastUpdated: Date;
  }>;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const depotLayoutSchema = new Schema<IDepotLayout>({
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  layout: {
    corridors: [{
      name: {
        type: String,
        required: true
      },
      racks: {
        type: Number,
        required: true,
        min: 1
      },
      slotsPerRack: {
        type: Number,
        required: true,
        min: 1
      },
      capacity: {
        type: Number,
        required: true,
        min: 1
      }
    }]
  },
  
  currentStatus: {
    totalCapacity: {
      type: Number,
      required: true,
      min: 0
    },
    occupiedSlots: {
      type: Number,
      default: 0,
      min: 0
    },
    availableSlots: {
      type: Number,
      required: true,
      min: 0
    },
    occupancyRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  slotStatus: {
    type: Map,
    of: {
      status: {
        type: String,
        enum: ['available', 'occupied', 'reserved', 'maintenance'],
        default: 'available'
      },
      tireStorageId: {
        type: Schema.Types.ObjectId,
        ref: 'TireStorage'
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }
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
depotLayoutSchema.index({ mechanicId: 1 });

// Pre-save middleware
depotLayoutSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Kapasite hesaplama
  this.currentStatus.totalCapacity = this.layout.corridors.reduce(
    (total, corridor) => total + corridor.capacity, 0
  );
  
  this.currentStatus.availableSlots = this.currentStatus.totalCapacity - this.currentStatus.occupiedSlots;
  
  // Doluluk oranı hesaplama
  if (this.currentStatus.totalCapacity > 0) {
    this.currentStatus.occupancyRate = (this.currentStatus.occupiedSlots / this.currentStatus.totalCapacity) * 100;
  }
  
  next();
});

export const DepotLayout = mongoose.model<IDepotLayout>('DepotLayout', depotLayoutSchema);
