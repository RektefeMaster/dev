import mongoose, { Document, Schema } from 'mongoose';

interface ITransaction {
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Date;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
}

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  transactions: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  description: {
    type: String,
    required: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'cancelled'],
    default: 'completed'
  }
});

const WalletSchema = new Schema<IWallet>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative'],
    max: [999999999, 'Balance cannot exceed 999,999,999'],
    validate: {
      validator: function(value: number) {
        return value >= 0;
      },
      message: 'Balance cannot be negative'
    }
  },
  transactions: [TransactionSchema]
}, {
  timestamps: true
});

// Pre-save middleware ile balance kontrolü
WalletSchema.pre('save', function(next) {
  if (this.balance < 0) {
    const error = new Error('Balance cannot be negative');
    return next(error);
  }
  next();
});

// Pre-update middleware ile balance kontrolü
WalletSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  if (update.$inc && update.$inc.balance) {
    // Balance değişikliğini kontrol et
    this.findOne().then((doc: any) => {
      if (doc) {
        const newBalance = doc.balance + update.$inc.balance;
        if (newBalance < 0) {
          const error = new Error('Balance cannot be negative');
          return next(error);
        }
      }
      next();
    }).catch(next);
  } else {
    next();
  }
});

// Index'ler - userId zaten unique: true ile tanımlı
// WalletSchema.index({ userId: 1 }); // Bu satırı kaldırdım

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
