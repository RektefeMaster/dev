import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CreditCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  type: 'visa' | 'mastercard' | 'amex';
  balance: number;
  cardColor: string;
  gradient: string[];
  bankName: string;
  cardLimit: number;
  availableCredit: number;
  cvv: string;
  isDefault: boolean;
}

export interface CreditCardData {
  cards: CreditCard[];
  isLoading: boolean;
  error: string | null;
}

const MOCK_CARDS: CreditCard[] = [
  {
    id: '1',
    cardNumber: '1234 5678 9012 3456',
    cardHolder: 'John Doe',
    expiryDate: '12/25',
    type: 'visa',
    balance: 1250.75,
    cardColor: '#1A1F71',
    gradient: ['#1A1F71', '#2D4B8E'],
    bankName: 'Garanti BBVA',
    cardLimit: 15000,
    availableCredit: 13749.25,
    cvv: '123',
    isDefault: true,
  },
  {
    id: '2',
    cardNumber: '9876 5432 1098 7654',
    cardHolder: 'John Doe',
    expiryDate: '08/26',
    type: 'mastercard',
    balance: 890.30,
    cardColor: '#FF6B35',
    gradient: ['#FF6B35', '#F7931E'],
    bankName: 'İş Bankası',
    cardLimit: 8000,
    availableCredit: 7109.70,
    cvv: '456',
    isDefault: false,
  },
];

export const useCreditCards = () => {
  const [creditCardData, setCreditCardData] = useState<CreditCardData>({
    cards: [],
    isLoading: true,
    error: null,
  });

  const fetchCreditCards = useCallback(async () => {
    try {
      setCreditCardData(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Local storage'dan kartları getir
      const storedCards = await AsyncStorage.getItem('credit_cards');
      let cards: CreditCard[] = [];
      
      if (storedCards) {
        cards = JSON.parse(storedCards);
      } else {
        // İlk kez çalıştırılıyorsa mock data kullan
        cards = MOCK_CARDS;
        await AsyncStorage.setItem('credit_cards', JSON.stringify(cards));
      }
      
      setCreditCardData({
        cards,
        isLoading: false,
        error: null,
      });
      
    } catch (error: any) {
      setCreditCardData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Veri yüklenirken hata oluştu',
      }));
    }
  }, []);

  const addCreditCard = useCallback(async (cardData: Omit<CreditCard, 'id'>) => {
    try {
      const newCard: CreditCard = {
        ...cardData,
        id: Date.now().toString(),
      };
      
      const updatedCards = [...creditCardData.cards, newCard];
      await AsyncStorage.setItem('credit_cards', JSON.stringify(updatedCards));
      
      setCreditCardData(prev => ({
        ...prev,
        cards: updatedCards,
      }));
      
      return { success: true, data: newCard };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [creditCardData.cards]);

  const updateCreditCard = useCallback(async (cardId: string, updates: Partial<CreditCard>) => {
    try {
      const updatedCards = creditCardData.cards.map(card =>
        card.id === cardId ? { ...card, ...updates } : card
      );
      
      await AsyncStorage.setItem('credit_cards', JSON.stringify(updatedCards));
      
      setCreditCardData(prev => ({
        ...prev,
        cards: updatedCards,
      }));
      
      return { success: true, data: updatedCards.find(card => card.id === cardId) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [creditCardData.cards]);

  const deleteCreditCard = useCallback(async (cardId: string) => {
    try {
      const updatedCards = creditCardData.cards.filter(card => card.id !== cardId);
      await AsyncStorage.setItem('credit_cards', JSON.stringify(updatedCards));
      
      setCreditCardData(prev => ({
        ...prev,
        cards: updatedCards,
      }));
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [creditCardData.cards]);

  const refreshCreditCards = useCallback(() => {
    fetchCreditCards();
  }, [fetchCreditCards]);

  useEffect(() => {
    fetchCreditCards();
  }, [fetchCreditCards]);

  return {
    ...creditCardData,
    refreshCreditCards,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
  };
};
