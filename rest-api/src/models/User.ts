import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  surname: string;
  profileImage?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  phone?: string;
  city?: string;
  userType: 'user' | 'mechanic' | 'driver';
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  favoriteVehicle?: mongoose.Types.ObjectId;
  emailHidden: boolean;
  phoneHidden: boolean;
  notifications: Array<{
    _id: mongoose.Types.ObjectId;
    type: 'follow' | 'like' | 'comment' | 'maintenance' | 'campaign' | 'insurance' | 'appointment_status_update';
    from?: mongoose.Types.ObjectId;
    title: string;
    message: string;
    data?: any;
    read: boolean;
    createdAt: Date;
  }>;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  surname: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  cover: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  userType: {
    type: String,
    enum: ['user', 'mechanic', 'driver'],
    default: 'user'
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  favoriteVehicle: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  emailHidden: {
    type: Boolean,
    default: false
  },
  phoneHidden: {
    type: Boolean,
    default: false
  },
  notifications: [{
    _id: {
      type: Schema.Types.ObjectId,
      auto: true
    },
    type: {
      type: String,
      enum: ['follow', 'like', 'comment', 'maintenance', 'campaign', 'insurance', 'appointment_status_update'],
      required: true
    },
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    title: String,
    message: String,
    data: Schema.Types.Mixed,
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.model<IUser>('User', userSchema); 