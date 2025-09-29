import mongoose, { Schema, Document } from 'mongoose';

export interface IFaultReport extends Document {
  userId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  serviceCategory: string; // Ağırbakım, üst takım, alt takım, kaporta/boya, elektrik, yedek parça, lastik, egzoz
  faultDescription: string;
  photos: string[]; // Cloudinary URL'leri
  videos: string[]; // Cloudinary URL'leri
  status: 'pending' | 'quoted' | 'accepted' | 'payment_pending' | 'paid' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  // location: Sadece çekici hizmeti için kullanılır
  // Diğer hizmetler için bu alan kullanılmaz
  quotes: Array<{
    mechanicId: mongoose.Types.ObjectId;
    mechanicName: string;
    mechanicPhone: string;
    quoteAmount: number;
    estimatedDuration: string; // "2-3 gün", "1 hafta" gibi
    notes: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
  }>;
  mechanicResponses: Array<{
    mechanicId: mongoose.Types.ObjectId;
    responseType: 'quote' | 'not_available' | 'check_tomorrow' | 'contact_me';
    message?: string;
    createdAt: Date;
  }>;
  selectedQuote?: {
    mechanicId: mongoose.Types.ObjectId;
    quoteAmount: number;
    selectedAt: Date;
  };
  payment?: {
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    paymentMethod: string;
    paymentDate?: Date;
    transactionId?: string;
  };
  appointmentId?: mongoose.Types.ObjectId; // Seçilen teklif için oluşturulan randevu
  createdAt: Date;
  updatedAt: Date;
}

const FaultReportSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  serviceCategory: { 
    type: String, 
    required: true,
    enum: ['Ağır Bakım', 'Üst Takım', 'Alt Takım', 'Kaporta/Boya', 'Elektrik-Elektronik', 'Yedek Parça', 'Lastik', 'Egzoz & Emisyon', 'Ekspertiz', 'Sigorta & Kasko', 'Araç Yıkama', 'Genel Bakım', 'Çekici', 'repair', 'tire', 'wash', 'towing']
  },
  faultDescription: { type: String, required: true, maxlength: 1000 },
  photos: [{ type: String }], // Cloudinary URL'leri
  videos: [{ type: String }], // Cloudinary URL'leri
  status: { 
    type: String, 
    enum: ['pending', 'quoted', 'accepted', 'payment_pending', 'paid', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // location: Sadece çekici hizmeti için kullanılır
  // Diğer hizmetler için bu alan kullanılmaz
  quotes: [{
    mechanicId: { type: Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    mechanicName: { type: String, required: true },
    mechanicPhone: { type: String, required: true },
    quoteAmount: { type: Number, required: true, min: 0 },
    estimatedDuration: { type: String, required: true },
    notes: { type: String, maxlength: 500 },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  mechanicResponses: [{
    mechanicId: { type: Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    responseType: { 
      type: String, 
      enum: ['quote', 'not_available', 'check_tomorrow', 'contact_me'],
      required: true 
    },
    message: { type: String, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }],
  selectedQuote: {
    mechanicId: { type: Schema.Types.ObjectId, ref: 'Mechanic' },
    quoteAmount: { type: Number },
    selectedAt: { type: Date }
  },
  payment: {
    amount: { type: Number, min: 0 },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: { type: String, default: 'credit_card' },
    paymentDate: { type: Date },
    transactionId: { type: String }
  },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' }
}, {
  timestamps: true
});

// Index'ler
FaultReportSchema.index({ userId: 1, createdAt: -1 });
FaultReportSchema.index({ serviceCategory: 1, status: 1 });
// FaultReportSchema.index({ 'location.coordinates': '2dsphere' }); // Sadece location olanlar için
FaultReportSchema.index({ status: 1, createdAt: -1 });

export const FaultReport = mongoose.model<IFaultReport>('FaultReport', FaultReportSchema);
