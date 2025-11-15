import axios from 'axios';
import { ApiResponse } from '@/shared/types/common';
import { createSuccessResponse, createErrorResponse, ErrorCode } from '../../../../shared/types';
import { apiClient } from '../http/client';

export const WalletService = {
  async getMechanicWallet(): Promise<ApiResponse<{ balance: number; totalEarnings: number; pendingAmount: number; thisMonthEarnings: number; lastMonthEarnings?: number }>> {
    try {
      console.log('🔍 [API] getMechanicWallet çağrılıyor...');
      const response = await apiClient.get('/mechanic/wallet');
      console.log('📦 [API] Backend response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data) {
        const wallet = response.data.data;
        console.log('💰 [API] Wallet balance:', wallet.balance);
        console.log('📊 [API] Transactions sayısı:', wallet.transactions?.length || 0);
        
        const thisMonthEarnings = wallet.thisMonthEarnings || 0;
        const lastMonthEarnings = wallet.lastMonthEarnings || 0;
        const pendingAmount = wallet.pendingAmount || 0;
        const totalEarnings = wallet.totalEarnings || 0;

        const result = {
          balance: wallet.balance || 0,
          totalEarnings,
          pendingAmount,
          thisMonthEarnings,
          lastMonthEarnings
        };
        
        console.log('✅ [API] Dönüştürülen veri:', result);
        return createSuccessResponse(result);
      }
      
      console.log('⚠️ [API] Response data yok veya success false');
      return response.data;
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, 'Request cancelled', undefined);
      }
      console.error('❌ [API] Get mechanic wallet error:', error);
      const err = error as any;
      console.error('❌ [API] Error response:', err.response?.data);
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Cüzdan bilgileri alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async getWalletTransactions(limit: number = 10): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/wallet/transactions', {
        params: { limit }
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        const transactions = response.data.data.slice(0, limit);
        return {
          ...response.data,
          data: transactions
        } as ApiResponse<unknown>;
      }
      return response.data;
    } catch (error: unknown) {
      console.error('Get wallet transactions error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Cüzdan işlemleri alınamadı',
        err.response?.data?.error?.details
      );
    }
  },

  async requestWithdrawal(amount: number, accountInfo: unknown): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post('/wallet/withdraw', {
        amount,
        accountInfo
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Request withdrawal error:', error);
      const err = error as any;
      return createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Para çekme talebi gönderilemedi',
        err.response?.data?.error?.details
      );
    }
  },

  async getRecentTransactions(limit: number = 10): Promise<ApiResponse<{ transactions: unknown[] }>> {
    return this.getWalletTransactions(limit) as Promise<ApiResponse<{ transactions: unknown[] }>>;
  },

  async getWalletDebugInfo(): Promise<ApiResponse<unknown>> {
    try {
      const response = await apiClient.get('/mechanic/wallet/debug');
      return response.data;
    } catch (error: unknown) {
      console.log('Wallet debug info not available');
      return createSuccessResponse({ message: 'Debug endpoint not available' });
    }
  }
};

