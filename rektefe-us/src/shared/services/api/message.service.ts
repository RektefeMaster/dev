import axios from 'axios';
import { MessageData, ApiResponse } from '@/shared/types/common';
import { createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const MessageService = {
  async getMessages(conversationId: string): Promise<ApiResponse<{ messages: MessageData[] }>> {
    try {
      const response = await apiClient.get(`/message/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error: unknown) {
      console.error('Get messages error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj listesi alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<MessageData[]>> {
    try {
      const response = await apiClient.get(`/message/conversations/${conversationId}/messages`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Get conversation messages error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Konuşma mesajları alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async sendMessage(conversationId: string, recipientId: string, text: string, metadata?: unknown): Promise<ApiResponse<MessageData>> {
    try {
      const response = await apiClient.post('/message/send', {
        receiverId: recipientId,
        content: text,
        messageType: 'text',
        metadata
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Send message error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj gönderilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getConversations(): Promise<ApiResponse<{ conversations: unknown[] }>> {
    try {
      console.log('🌐 API: Getting conversations...');
      const response = await apiClient.get('/message/conversations');
      console.log('🌐 API Response:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Get conversations error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Konuşma listesi alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/message/conversations/${conversationId}`);
      return response.data;
    } catch (error: unknown) {
      console.error('Delete conversation error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Konuşma silinemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getUnreadMessageCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await apiClient.get('/message/unread-count');
      return response.data;
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('Get unread message count error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Okunmamış mesaj sayısı alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async pollMessages(lastMessageId?: string): Promise<ApiResponse<MessageData[]>> {
    try {
      const params = lastMessageId ? { lastMessageId } : {};
      const response = await apiClient.get('/message/poll-messages', { params });
      return response.data;
    } catch (error: unknown) {
      console.error('Poll messages error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Mesaj polling başarısız',
        err.response?.data?.error?.details
      );
    }
  }
};

