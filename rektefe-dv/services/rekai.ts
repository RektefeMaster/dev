import { api } from './api';
import { Vehicle } from './vehicles';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export interface ChatRequest {
  message: string;
  userId: string;
}

export const rekaiService = {
  chat: async (data: ChatRequest) => {
    const response = await api.post('/rekai/chat', data);
    return response.data;
  }
}; 