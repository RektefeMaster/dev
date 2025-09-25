// Mesajlaşma sistemi için ortak type'lar

export interface User {
  _id: string;
  name: string;
  surname: string;
  avatar?: string;
  userType: 'mechanic' | 'driver';
}

export interface Message {
  _id: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  createdAt: string;
  senderId: User;
  receiverId: User;
  conversationId: string;
  isRead: boolean;
  read?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  _id: string;
  conversationId: string;
  otherParticipant: User;
  lastMessage?: {
    content: string;
    messageType: string;
    createdAt: string;
  };
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface SendMessageData {
  receiverId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  conversationId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

export interface MessagePollingResponse {
  success: boolean;
  data: Message[];
  hasNewMessages: boolean;
  message: string;
}
