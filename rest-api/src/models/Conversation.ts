import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  type: 'private' | 'group' | 'support';
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  isActive: boolean;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
  participants: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    validate: {
      validator: function(participants: mongoose.Types.ObjectId[]) {
        return participants.length >= 2;
      },
      message: 'Conversation must have at least 2 participants'
    }
  },
  type: {
    type: String,
    enum: ['private', 'group', 'support'],
    default: 'private'
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, {
  timestamps: true
});

// Index'ler
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
