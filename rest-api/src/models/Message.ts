import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
  read: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  content: {
    type: String,
    required: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters'],
    minlength: [1, 'Message content cannot be empty']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Performance optimization: Add indexes for common queries
MessageSchema.index({ conversationId: 1, createdAt: -1 }); // Messages in conversation by date
MessageSchema.index({ senderId: 1, receiverId: 1 }); // Direct messages between users
MessageSchema.index({ receiverId: 1, read: 1 }); // Unread messages for user
MessageSchema.index({ createdAt: -1 }); // Recent messages
MessageSchema.index({ messageType: 1 }); // Messages by type

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
