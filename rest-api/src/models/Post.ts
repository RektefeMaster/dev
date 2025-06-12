import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  user: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const PostSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

// İndeksler
PostSchema.index({ createdAt: -1 }); // Tarihe göre sıralama için
PostSchema.index({ user: 1 }); // Kullanıcıya göre sorgulama için
PostSchema.index({ likes: 1 }); // Beğenilere göre sorgulama için

export default mongoose.model<IPost>('Post', PostSchema); 