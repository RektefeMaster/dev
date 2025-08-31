import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IDriver extends IUser {
  // Sürücüye özel alanlar buraya eklenebilir
}

const driverSchema = new Schema<IDriver>({
  // User modelinden gelen alanlar
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  surname: { type: String, required: true },
  profileImage: { type: String, default: null },
  avatar: { type: String, default: null },
  cover: { type: String, default: null },
  bio: { type: String, default: '' },
  phone: { type: String, default: null },
  city: { type: String, default: null },
  userType: { type: String, enum: ['user', 'driver'], default: 'driver' },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  favoriteVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  emailHidden: { type: Boolean, default: false },
  phoneHidden: { type: Boolean, default: false },
  notifications: [{
    type: { type: String, enum: ['follow', 'like', 'comment', 'maintenance', 'campaign', 'insurance'], required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    title: String,
    message: String,
    data: Schema.Types.Mixed,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export const Driver = mongoose.model<IDriver>('Driver', driverSchema); 