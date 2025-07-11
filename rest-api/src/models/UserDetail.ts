import mongoose, { Document, Schema } from 'mongoose';

export interface IUserDetail extends Document {
  userType: 'user' | 'mechanic' | 'driver';
  canApproveAppointment: boolean;
  canEarnTefePoint: boolean;
  canComment: boolean;
  canCreateService: boolean;
  canBeRated: boolean;
  // İleride başka kural/özellikler eklenebilir
}

const userDetailSchema = new Schema<IUserDetail>({
  userType: { type: String, enum: ['user', 'mechanic', 'driver'], required: true },
  canApproveAppointment: { type: Boolean, required: true },
  canEarnTefePoint: { type: Boolean, required: true },
  canComment: { type: Boolean, required: true },
  canCreateService: { type: Boolean, required: true },
  canBeRated: { type: Boolean, required: true },
});

export const UserDetail = mongoose.model<IUserDetail>('UserDetail', userDetailSchema); 