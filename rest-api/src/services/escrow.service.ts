import { v4 as uuidv4 } from 'uuid';

/**
 * ESCROW SERVİSİ
 * 
 * Güvenli ödeme yönetimi için escrow servisi.
 * Ödeme işlemi kalite kontrolü sonrası ustaya aktarılır.
 * 
 * NOT: Şu an backend'de simüle ediliyor, PayTR entegrasyonu eklenecek.
 */

export interface EscrowTransaction {
  transactionId: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'held' | 'captured' | 'refunded' | 'frozen';
  cardLast4?: string;
  createdAt: Date;
  updatedAt: Date;
  mockMode: boolean;
}

interface MockCardInfo {
  cardNumber: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export class EscrowService {
  private static transactions: Map<string, EscrowTransaction> = new Map();

  /**
   * Mock: Ödeme tutma (HOLD)
   * Gerçek entegrasyonda: PayTR HOLD API çağrısı yapılır
   */
  static async mockHold(params: {
    orderId: string;
    amount: number;
    cardInfo: MockCardInfo;
  }): Promise<{
    success: boolean;
    transactionId: string;
    status: string;
    message: string;
  }> {
    try {
      console.log('🔵 [ESCROW] HOLD işlemi başlatıldı:', {
        orderId: params.orderId,
        amount: params.amount,
        cardLast4: params.cardInfo.cardNumber.slice(-4),
      });

      // Simüle edilmiş işlem süresi
      await this.simulateDelay(500);

      // Mock transaction ID oluştur
      const transactionId = `MOCK_TXN_${uuidv4()}`;

      // Transaction kaydı oluştur
      const transaction: EscrowTransaction = {
        transactionId,
        orderId: params.orderId,
        amount: params.amount,
        status: 'held',
        cardLast4: params.cardInfo.cardNumber.slice(-4),
        createdAt: new Date(),
        updatedAt: new Date(),
        mockMode: true,
      };

      // Memory'de sakla (gerçekte veritabanına kaydedilir)
      this.transactions.set(transactionId, transaction);

      console.log('✅ [ESCROW] HOLD başarılı:', {
        transactionId,
        status: 'held',
      });

      return {
        success: true,
        transactionId,
        status: 'held',
        message: 'Ödeme başarıyla tutuldu',
      };
    } catch (error) {
      console.error('❌ [ESCROW] HOLD hatası:', error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        message: 'Ödeme tutulamadı',
      };
    }
  }

  /**
   * Mock: Ödeme çekme/capture (CAPTURE)
   * Gerçek entegrasyonda: PayTR CAPTURE API çağrısı yapılır
   */
  static async mockCapture(params: {
    transactionId: string;
    amount?: number; // Partial capture için
  }): Promise<{
    success: boolean;
    status: string;
    capturedAmount: number;
    message: string;
  }> {
    try {
      const transaction = this.transactions.get(params.transactionId);

      if (!transaction) {
        return {
          success: false,
          status: 'not_found',
          capturedAmount: 0,
          message: 'Transaction bulunamadı',
        };
      }

      if (transaction.status !== 'held' && transaction.status !== 'frozen') {
        return {
          success: false,
          status: transaction.status,
          capturedAmount: 0,
          message: `Transaction durumu uygun değil: ${transaction.status}`,
        };
      }

      console.log('🟢 [ESCROW] CAPTURE işlemi başlatıldı:', {
        transactionId: params.transactionId,
        amount: params.amount || transaction.amount,
      });

      // Simüle edilmiş işlem süresi
      await this.simulateDelay(300);

      const capturedAmount = params.amount || transaction.amount;

      // Transaction durumunu güncelle
      transaction.status = 'captured';
      transaction.updatedAt = new Date();

      console.log('✅ [ESCROW] CAPTURE başarılı:', {
        transactionId: params.transactionId,
        capturedAmount,
      });

      return {
        success: true,
        status: 'captured',
        capturedAmount,
        message: 'Ödeme başarıyla çekildi',
      };
    } catch (error) {
      console.error('❌ [ESCROW] CAPTURE hatası:', error);
      return {
        success: false,
        status: 'failed',
        capturedAmount: 0,
        message: 'Ödeme çekilemedi',
      };
    }
  }

  /**
   * Mock: İade (REFUND)
   * Gerçek entegrasyonda: PayTR REFUND API çağrısı yapılır
   */
  static async mockRefund(params: {
    transactionId: string;
    amount?: number; // Partial refund için
    reason?: string;
  }): Promise<{
    success: boolean;
    status: string;
    refundedAmount: number;
    message: string;
  }> {
    try {
      const transaction = this.transactions.get(params.transactionId);

      if (!transaction) {
        return {
          success: false,
          status: 'not_found',
          refundedAmount: 0,
          message: 'Transaction bulunamadı',
        };
      }

      if (transaction.status !== 'held' && transaction.status !== 'captured') {
        return {
          success: false,
          status: transaction.status,
          refundedAmount: 0,
          message: `Transaction durumu uygun değil: ${transaction.status}`,
        };
      }

      console.log('🔴 [ESCROW] REFUND işlemi başlatıldı:', {
        transactionId: params.transactionId,
        amount: params.amount || transaction.amount,
        reason: params.reason || 'İptal/İade',
      });

      // Simüle edilmiş işlem süresi
      await this.simulateDelay(400);

      const refundedAmount = params.amount || transaction.amount;

      // Partial refund ise (amount < transaction.amount) status'ü 'held' tut
      // Full refund ise status'ü 'refunded' yap
      if (params.amount && params.amount < transaction.amount) {
        // Partial refund - transaction hala held durumunda kalır, amount azalır
        transaction.amount = transaction.amount - refundedAmount;
        transaction.status = 'held'; // Status'ü held tut
        console.log('🟡 [ESCROW] Partial refund yapıldı, transaction hala held:', {
          transactionId: params.transactionId,
          refundedAmount,
          remainingAmount: transaction.amount,
        });
      } else {
        // Full refund
        transaction.status = 'refunded';
      }
      transaction.updatedAt = new Date();

      console.log('✅ [ESCROW] REFUND başarılı:', {
        transactionId: params.transactionId,
        refundedAmount,
      });

      return {
        success: true,
        status: 'refunded',
        refundedAmount,
        message: 'İade başarıyla yapıldı',
      };
    } catch (error) {
      console.error('❌ [ESCROW] REFUND hatası:', error);
      return {
        success: false,
        status: 'failed',
        refundedAmount: 0,
        message: 'İade yapılamadı',
      };
    }
  }

  /**
   * Mock: Ödemeyi dondurma (FREEZE)
   * İtiraz durumunda kullanılır
   */
  static async mockFreeze(params: {
    transactionId: string;
    reason: string;
  }): Promise<{
    success: boolean;
    status: string;
    message: string;
  }> {
    try {
      const transaction = this.transactions.get(params.transactionId);

      if (!transaction) {
        return {
          success: false,
          status: 'not_found',
          message: 'Transaction bulunamadı',
        };
      }

      if (transaction.status !== 'held') {
        return {
          success: false,
          status: transaction.status,
          message: `Transaction durumu uygun değil: ${transaction.status}`,
        };
      }

      console.log('🟡 [ESCROW] FREEZE işlemi başlatıldı:', {
        transactionId: params.transactionId,
        reason: params.reason,
      });

      // Simüle edilmiş işlem süresi
      await this.simulateDelay(200);

      // Transaction durumunu güncelle
      transaction.status = 'frozen';
      transaction.updatedAt = new Date();

      console.log('✅ [ESCROW] FREEZE başarılı:', {
        transactionId: params.transactionId,
      });

      return {
        success: true,
        status: 'frozen',
        message: 'Ödeme donduruldu',
      };
    } catch (error) {
      console.error('❌ [ESCROW] FREEZE hatası:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Ödeme dondurulamadı',
      };
    }
  }

  /**
   * Transaction durumunu sorgula
   */
  static async getTransactionStatus(transactionId: string): Promise<{
    success: boolean;
    transaction?: EscrowTransaction;
    message: string;
  }> {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      return {
        success: false,
        message: 'Transaction bulunamadı',
      };
    }

    return {
      success: true,
      transaction,
      message: 'Transaction bilgileri getirildi',
    };
  }

  /**
   * Kart bilgilerini valide et
   */
  static validateMockCard(cardInfo: MockCardInfo): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Temel validasyon
    if (!cardInfo.cardNumber || cardInfo.cardNumber.length < 13) {
      errors.push('Kart numarası geçersiz');
    }

    if (!cardInfo.cardHolderName || cardInfo.cardHolderName.trim().length < 3) {
      errors.push('Kart sahibi adı geçersiz');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * İşlem simülasyonu için gecikme
   */
  private static simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test amaçlı: Tüm transactionları temizle
   */
  static clearMockTransactions(): void {
    this.transactions.clear();
    console.log('🧹 [ESCROW] Tüm transactionlar temizlendi');
  }

  /**
   * Test amaçlı: Tüm transactionları listele
   */
  static getAllMockTransactions(): EscrowTransaction[] {
    return Array.from(this.transactions.values());
  }
}

