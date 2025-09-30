import mongoose, { Document, Schema } from 'mongoose';

export interface IVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'email_verification' | 'password_reset' | 'email_change' | 'phone_verification';
  token: string; // Token veya kod
  code?: string; // 6 haneli doğrulama kodu
  email?: string; // Yeni e-posta (email_change için)
  phone?: string; // Yeni telefon (phone_verification için)
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  usedAt?: Date;
}

const verificationTokenSchema = new Schema<IVerificationToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset', 'email_change', 'phone_verification'],
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  code: {
    type: String,
    sparse: true // 6 haneli kod (opsiyonel)
  },
  email: {
    type: String,
    sparse: true // Yeni e-posta (email_change için)
  },
  phone: {
    type: String,
    sparse: true // Yeni telefon (phone_verification için)
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  usedAt: {
    type: Date
  }
});

// Kullanılmış veya süresi dolmuş token'ları otomatik temizle (30 gün sonra)
verificationTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 gün

// Token lookup için compound index
verificationTokenSchema.index({ token: 1, type: 1 });
verificationTokenSchema.index({ userId: 1, type: 1, used: 1 });

export const VerificationToken = mongoose.model<IVerificationToken>('VerificationToken', verificationTokenSchema);
