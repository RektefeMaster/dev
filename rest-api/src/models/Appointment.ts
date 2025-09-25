import mongoose, { Document, Schema } from 'mongoose';

interface INotificationSettings {
  oneHourBefore: boolean;
  twoHoursBefore: boolean;
  oneDayBefore: boolean;
  customTime?: number;
}

export interface IAppointment extends Document {
  userId: mongoose.Types.ObjectId; // Şöför/Müşteri ID'si
  mechanicId?: mongoose.Types.ObjectId; // Usta/Dükkan ID'si (opsiyonel - talep aşamasında)
  serviceType: string; // Hizmet tipi
  appointmentDate: Date; // Randevu tarihi
  timeSlot: string; // Randevu saati
  status: 'TALEP_EDILDI' | 'PLANLANDI' | 'SERVISTE' | 'ODEME_BEKLIYOR' | 'TAMAMLANDI' | 'IPTAL' | 'NO_SHOW';
  description: string; // Randevu açıklaması
  mechanicNotes?: string; // Usta notları
  rejectionReason?: string; // Red gerekçesi
  vehicleId?: mongoose.Types.ObjectId; // Araç ID'si (opsiyonel - yeni hizmetler için)
  estimatedDuration?: number; // Tahmini süre (dakika)
  actualDuration?: number; // Gerçek süre (dakika)
  price?: number; // Belirlenen ücret
  quotedPrice?: number; // Arıza bildiriminden gelen fiyat
  finalPrice?: number; // Nihai fiyat (ek fiyatlar dahil)
  priceSource: 'mechanic_quoted' | 'fault_report_quoted' | 'to_be_determined'; // Fiyat kaynağı
  paymentStatus: 'pending' | 'paid' | 'completed'; // Ödeme durumu
  paymentDate?: Date; // Ödeme tarihi
  transactionId?: string; // İşlem ID'si
  completionDate?: Date; // İş tamamlanma tarihi
  notificationSettings: INotificationSettings;
  shareContactInfo: boolean; // İletişim bilgisi paylaşımı
  isShopAppointment?: boolean; // Ustanın kendi eklediği randevu mu?
  faultReportId?: mongoose.Types.ObjectId; // Arıza bildirimi ID'si (opsiyonel)
  
  // Yeni hizmet türleri için alanlar
  requestType?: 'immediate' | 'scheduled' | 'quoted'; // Talep türü
  vehicleType?: string; // Araç tipi (çekici için)
  reason?: string; // Sebep (çekici için)
  pickupLocation?: any; // Alış konumu
  dropoffLocation?: any; // Bırakış konumu
  packageType?: string; // Paket tipi (yıkama için)
  options?: string[]; // Ek hizmetler (yıkama için)
  partType?: string; // Parça tipi (lastik & parça için)
  vehicleInfo?: any; // Araç bilgileri (lastik & parça için)
  tireSize?: string; // Lastik ölçüsü
  quantity?: number; // Miktar
  estimatedPrice?: number; // Tahmini fiyat
  
  // Yeni alanlar
  parcaBekleniyor?: boolean;
  kdvDahil?: boolean;
  odemeLink?: string;
  odemeRef?: string;
  kapatmaZamani?: Date;
  kalemler?: Array<{
    id: string;
    ad: string;
    adet: number;
    birim: string;
    tutar: number;
    tur: 'ISCILIK' | 'PARCA';
  }>;
  araOnaylar?: Array<{
    aciklama: string;
    tutar: number;
    onay: 'BEKLIYOR' | 'KABUL' | 'RET';
    tarih: Date;
  }>;
  medya?: {
    foto: number;
    video: number;
    ses: number;
  };
  priceIncreaseHistory?: Array<{
    amount: number;
    reason: string;
    date: Date;
    mechanicId: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  mechanicId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Mechanic', 
    required: false 
  },
  serviceType: { 
    type: String, 
    required: true 
  },
  appointmentDate: { 
    type: Date, 
    required: true 
  },
  timeSlot: { 
    type: String, 
    required: true,
    default: '09:00'
  },
  status: { 
    type: String, 
    enum: ['TALEP_EDILDI', 'PLANLANDI', 'SERVISTE', 'ODEME_BEKLIYOR', 'TAMAMLANDI', 'IPTAL', 'NO_SHOW'],
    default: 'TALEP_EDILDI'
  },
  description: { 
    type: String, 
    required: false,
    default: ''
  },
  mechanicNotes: { 
    type: String 
  },
  rejectionReason: { 
    type: String 
  },
  vehicleId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vehicle',
    required: false 
  },
  estimatedDuration: { 
    type: Number 
  },
  actualDuration: { 
    type: Number 
  },
  price: { 
    type: Number 
  },
  quotedPrice: {
    type: Number
  },
  finalPrice: {
    type: Number
  },
  priceSource: {
    type: String,
    enum: ['mechanic_quoted', 'fault_report_quoted', 'to_be_determined'],
    default: 'to_be_determined'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'completed'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  transactionId: {
    type: String
  },
  completionDate: {
    type: Date
  },
  notificationSettings: {
    oneHourBefore: {
      type: Boolean,
      default: true
    },
    twoHoursBefore: {
      type: Boolean,
      default: false
    },
    oneDayBefore: {
      type: Boolean,
      default: false
    },
    customTime: {
      type: Number
    }
  },
  shareContactInfo: { 
    type: Boolean, 
    default: false 
  },
  isShopAppointment: {
    type: Boolean,
    default: false
  },
  faultReportId: { 
    type: Schema.Types.ObjectId, 
    ref: 'FaultReport',
    required: false 
  },
  location: {
    coordinates: { type: [Number] },
    address: String,
    city: String,
    district: String,
    neighborhood: String
  },
  
  // Yeni hizmet türleri için alanlar
  requestType: {
    type: String,
    enum: ['immediate', 'scheduled', 'quoted'],
    default: 'scheduled'
  },
  vehicleType: {
    type: String
  },
  reason: {
    type: String
  },
  pickupLocation: {
    type: Schema.Types.Mixed
  },
  dropoffLocation: {
    type: Schema.Types.Mixed
  },
  packageType: {
    type: String
  },
  options: [{
    type: String
  }],
  partType: {
    type: String
  },
  vehicleInfo: {
    type: Schema.Types.Mixed
  },
  tireSize: {
    type: String
  },
  quantity: {
    type: Number,
    default: 1
  },
  estimatedPrice: {
    type: Number
  },
  // Yeni alanlar
  parcaBekleniyor: {
    type: Boolean,
    default: false
  },
  kdvDahil: {
    type: Boolean,
    default: true
  },
  odemeLink: {
    type: String
  },
  odemeRef: {
    type: String
  },
  kapatmaZamani: {
    type: Date
  },
  // İş kalemleri için array
  kalemler: [{
    id: String,
    ad: String,
    adet: Number,
    birim: String,
    tutar: Number,
    tur: {
      type: String,
      enum: ['ISCILIK', 'PARCA'],
      default: 'ISCILIK'
    }
  }],
  // Ara onaylar için array
  araOnaylar: [{
    aciklama: String,
    tutar: Number,
    onay: {
      type: String,
      enum: ['BEKLIYOR', 'KABUL', 'RET'],
      default: 'BEKLIYOR'
    },
    tarih: {
      type: Date,
      default: Date.now
    }
  }],
  // Medya sayacı
  medya: {
    foto: { type: Number, default: 0 },
    video: { type: Number, default: 0 },
    ses: { type: Number, default: 0 }
  },
  // Fiyat artırma geçmişi
  priceIncreaseHistory: [{
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    date: { type: Date, default: Date.now },
    mechanicId: { type: String, required: true }
  }]
}, {
  timestamps: true
});

// Performance optimization: Add indexes for common queries
AppointmentSchema.index({ userId: 1, appointmentDate: -1 }); // User's appointments by date
AppointmentSchema.index({ mechanicId: 1, status: 1, appointmentDate: -1 }); // Mechanic's appointments by status and date
AppointmentSchema.index({ status: 1, appointmentDate: 1 }); // Appointments by status and date
AppointmentSchema.index({ faultReportId: 1 }, { sparse: true }); // Fault report appointments
AppointmentSchema.index({ createdAt: -1 }); // Recent appointments
AppointmentSchema.index({ serviceType: 1, status: 1 }); // Service type queries

// Additional composite index for appointment scheduling
AppointmentSchema.index({ 
  mechanicId: 1, 
  appointmentDate: 1, 
  timeSlot: 1, 
  status: 1 
});

// Duplicate indexes removed - already added above
// Legacy indexes (commented out to avoid duplicates)
// AppointmentSchema.index({ userId: 1, appointmentDate: -1 });
// AppointmentSchema.index({ mechanicId: 1, appointmentDate: -1 });
//   appointmentDate: 1, 
//   status: 1, 
//   'notificationSettings.oneHourBefore': 1 
// });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
