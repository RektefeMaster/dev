export interface IMessage {
  _id: string;
  conversationId?: string;
  receiverId?: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation {
  _id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}
