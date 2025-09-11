import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
}

export interface WalletData {
  balance: number;
  transactions: WalletTransaction[];
  totalSpent: number;
  monthlySavings: number;
  isLoading: boolean;
  error: string | null;
}

export const useWalletData = () => {
  const [walletData, setWalletData] = useState<WalletData>({
    balance: 0,
    transactions: [],
    totalSpent: 0,
    monthlySavings: 0,
    isLoading: true,
    error: null,
  });

  const fetchWalletData = useCallback(async () => {
    try {
      setWalletData(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('💰 Wallet verileri yükleniyor...');
      
      // Wallet balance'ı getir
      const balanceResponse = await apiService.getWalletBalance();
      const balance = balanceResponse.success ? balanceResponse.data.balance : 0;
      console.log('💰 Balance response:', balanceResponse, 'Balance:', balance);
      
      // Wallet transactions'ları getir
      const transactionsResponse = await apiService.getWalletTransactions();
      const transactions = transactionsResponse.success ? transactionsResponse.data : [];
      console.log('💰 Transactions response:', transactionsResponse, 'Transactions count:', transactions.length);
      
      // İstatistikleri hesapla
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthlyTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });
      
      const totalSpent = monthlyTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalIncome = monthlyTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthlySavings = totalIncome - totalSpent;
      
      setWalletData({
        balance,
        transactions,
        totalSpent,
        monthlySavings: Math.max(0, monthlySavings),
        isLoading: false,
        error: null,
      });
      
    } catch (error: any) {
      console.error('Wallet veri getirme hatası:', error);
      setWalletData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Veri yüklenirken hata oluştu',
      }));
    }
  }, []);

  const refreshWalletData = useCallback(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const addTransaction = useCallback(async (transactionData: {
    type: 'credit' | 'debit';
    amount: number;
    description: string;
  }) => {
    try {
      // Backend'e transaction ekleme endpoint'i yoksa local state'e ekle
      const newTransaction: WalletTransaction = {
        _id: Date.now().toString(),
        ...transactionData,
        date: new Date().toISOString(),
        status: 'completed',
      };
      
      setWalletData(prev => ({
        ...prev,
        transactions: [newTransaction, ...prev.transactions],
        balance: transactionData.type === 'credit' 
          ? prev.balance + transactionData.amount 
          : prev.balance - transactionData.amount,
      }));
      
      console.log('💰 Local transaction eklendi:', newTransaction);
      return { success: true, data: newTransaction };
    } catch (error: any) {
      console.error('Transaction ekleme hatası:', error);
      return { success: false, error: error.message };
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  return {
    ...walletData,
    refreshWalletData,
    addTransaction,
  };
};
