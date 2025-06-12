import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  username: String,
  bio: String,
  avatar: String,
  cover: String,
  tefePoints: { type: Number, default: 0 },
  tefeHidden: { type: Boolean, default: false },
  favoriteVehicleId: String,
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  posts: { type: Number, default: 0 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  notifications: [{
    type: {
      type: String,
      enum: ['follow', 'like', 'comment'],
      required: true
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User; 