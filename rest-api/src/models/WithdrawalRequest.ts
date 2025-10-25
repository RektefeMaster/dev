import mongoose, { Document, Schema } from 'mongoose';

export interface IWithdrawalRequest extends Document {
  mechanicId: mongoose.Types.ObjectId;
  amount: number;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    iban?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'TAMAMLANDI';
  requestDate: Date;
  completedDate?: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>({
  mechanicId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  bankAccount: {
    bankName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    iban: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'TAMAMLANDI'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes
WithdrawalRequestSchema.index({ mechanicId: 1, status: 1 });
WithdrawalRequestSchema.index({ requestDate: -1 });

const WithdrawalRequest = mongoose.model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema);

export default WithdrawalRequest;

