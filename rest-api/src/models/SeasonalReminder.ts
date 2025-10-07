import mongoose, { Document, Schema } from 'mongoose';

export interface ISeasonalReminder extends Document {
  mechanicId: mongoose.Types.ObjectId;
  
  // Hatırlatma ayarları
  settings: {
    summerReminder: {
      enabled: boolean;
      startDate: string; // "01-04" formatında (1 Nisan)
      endDate: string; // "15-04" formatında (15 Nisan)
      message: string;
    };
    winterReminder: {
      enabled: boolean;
      startDate: string; // "01-11" formatında (1 Kasım)
      endDate: string; // "15-11" formatında (15 Kasım)
      message: string;
    };
  };
  
  // Gönderilen hatırlatmalar
  sentReminders: Array<{
    tireStorageId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    season: 'summer' | 'winter';
    sentDate: Date;
    message: string;
    status: 'sent' | 'delivered' | 'failed';
    smsId?: string;
  }>;
  
  // İstatistikler
  stats: {
    totalRemindersSent: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    lastReminderDate?: Date;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const seasonalReminderSchema = new Schema<ISeasonalReminder>({
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  settings: {
    summerReminder: {
      enabled: {
        type: Boolean,
        default: true
      },
      startDate: {
        type: String,
        default: '01-04'
      },
      endDate: {
        type: String,
        default: '15-04'
      },
      message: {
        type: String,
        default: 'Değerli Müşterimiz, yazlık lastiklerinize geçme zamanı geldi. Randevu almak için tıklayınız.'
      }
    },
    winterReminder: {
      enabled: {
        type: Boolean,
        default: true
      },
      startDate: {
        type: String,
        default: '01-11'
      },
      endDate: {
        type: String,
        default: '15-11'
      },
      message: {
        type: String,
        default: 'Değerli Müşterimiz, kışlık lastiklerinize geçme zamanı geldi. Randevu almak için tıklayınız.'
      }
    }
  },
  
  sentReminders: [{
    tireStorageId: {
      type: Schema.Types.ObjectId,
      ref: 'TireStorage',
      required: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    season: {
      type: String,
      enum: ['summer', 'winter'],
      required: true
    },
    sentDate: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent'
    },
    smsId: String
  }],
  
  stats: {
    totalRemindersSent: {
      type: Number,
      default: 0
    },
    successfulDeliveries: {
      type: Number,
      default: 0
    },
    failedDeliveries: {
      type: Number,
      default: 0
    },
    lastReminderDate: Date
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
seasonalReminderSchema.index({ mechanicId: 1 });
seasonalReminderSchema.index({ 'sentReminders.sentDate': 1 });

// Pre-save middleware
seasonalReminderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // İstatistikleri güncelle
  this.stats.totalRemindersSent = this.sentReminders.length;
  this.stats.successfulDeliveries = this.sentReminders.filter(r => r.status === 'delivered').length;
  this.stats.failedDeliveries = this.sentReminders.filter(r => r.status === 'failed').length;
  
  if (this.sentReminders.length > 0) {
    this.stats.lastReminderDate = this.sentReminders.reduce((latest, reminder) => 
      reminder.sentDate > latest ? reminder.sentDate : latest, 
      this.sentReminders[0].sentDate
    );
  }
  
  next();
});

export const SeasonalReminder = mongoose.model<ISeasonalReminder>('SeasonalReminder', seasonalReminderSchema);
