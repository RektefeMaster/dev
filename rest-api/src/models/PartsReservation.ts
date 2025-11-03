import mongoose, { Schema, Document } from 'mongoose';

export interface IPartsReservation extends Document {
  // İlişkiler
  buyerId: mongoose.Types.ObjectId; // Şoför
  sellerId: mongoose.Types.ObjectId; // Usta
  partId: mongoose.Types.ObjectId;
  vehicleId?: mongoose.Types.ObjectId; // Hangi araç için
  
  // Parça bilgileri (snapshot)
  partInfo: {
    partName: string;
    brand: string;
    partNumber?: string;
    condition: string;
  };
  
  // Rezervasyon bilgileri
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  originalPrice?: number; // Pazarlık öncesi orijinal fiyat (ödeme işlemleri için)
  negotiatedPrice?: number; // Pazarlık sonucu fiyat
  
  // Teslimat
  delivery: {
    method: 'pickup' | 'standard' | 'express';
    address?: string;
    estimatedDelivery?: Date;
  };
  
  // Ödeme
  payment: {
    method: 'cash' | 'card' | 'transfer' | 'wallet';
    status: 'pending' | 'paid' | 'completed' | 'refunded';
    transactionId?: string;
    paidAt?: Date;
  };
  
  // Durum
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'delivered' | 'completed';
  
  // İptal/Teslim
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'seller' | 'system';
  cancelledAt?: Date;
  
  deliveredAt?: Date;
  receivedBy?: string; // Teslim alan kişi
  
  // Zaman aşımı
  expiresAt: Date;
  
  // Stok restore edildi mi
  stockRestored: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const PartsReservationSchema = new Schema<IPartsReservation>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    partId: {
      type: Schema.Types.ObjectId,
      ref: 'PartsInventory',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      index: true,
    },
    partInfo: {
      partName: {
        type: String,
        required: true,
      },
      brand: {
        type: String,
        required: true,
      },
      partNumber: {
        type: String,
      },
      condition: {
        type: String,
        required: true,
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    negotiatedPrice: {
      type: Number,
      min: 0,
    },
    delivery: {
      method: {
        type: String,
        enum: ['pickup', 'standard', 'express'],
        required: true,
      },
      address: {
        type: String,
      },
      estimatedDelivery: {
        type: Date,
      },
    },
    payment: {
      method: {
        type: String,
        enum: ['cash', 'card', 'transfer', 'wallet'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'completed', 'refunded'],
        default: 'pending',
      },
      transactionId: {
        type: String,
      },
      paidAt: {
        type: Date,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired', 'delivered', 'completed'],
      default: 'pending',
      index: true,
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: String,
      enum: ['buyer', 'seller', 'system'],
    },
    cancelledAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    receivedBy: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    stockRestored: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
PartsReservationSchema.index({ buyerId: 1, status: 1 });
PartsReservationSchema.index({ sellerId: 1, status: 1 });
PartsReservationSchema.index({ partId: 1, status: 1 });
PartsReservationSchema.index({ status: 1, expiresAt: 1 }); // Expiry cleanup için

export const PartsReservation = mongoose.model<IPartsReservation>('PartsReservation', PartsReservationSchema);

