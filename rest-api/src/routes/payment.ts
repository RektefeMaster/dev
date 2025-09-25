import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Wallet } from '../models/Wallet';
import { TefePointService } from '../services/tefePoint.service';

const router = Router();

// Ödeme simülasyonu endpoint'i
router.post('/simulate-payment', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount, serviceType, description, appointmentId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli miktar giriniz'
      });
    }

    // Wallet'ı bul
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Cüzdan bulunamadı'
      });
    }

    // Bakiye kontrolü
    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Yetersiz bakiye',
        data: {
          currentBalance: wallet.balance,
          requiredAmount: amount,
          shortfall: amount - wallet.balance
        }
      });
    }

    // Ödeme simülasyonu - gerçek gibi
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentStatus = Math.random() > 0.1 ? 'completed' : 'failed'; // %90 başarı oranı

    if (paymentStatus === 'completed') {
      // Başarılı ödeme - cüzdandan düş
      wallet.balance -= amount;
      
      // İşlem kaydı ekle
      const transaction = {
        type: 'debit' as const,
        amount: amount,
        description: description || `${serviceType} hizmet ödemesi`,
        date: new Date(),
        status: 'completed' as const,
        paymentId: paymentId,
        appointmentId: appointmentId
      };

      wallet.transactions.push(transaction);
      await wallet.save();

      // TEFE puan kazandır
      try {
        const tefePointResult = await TefePointService.processPaymentTefePoints({
          userId,
          amount,
          paymentType: 'other',
          serviceCategory: serviceType || 'maintenance',
          description: description || `${serviceType} hizmet ödemesi`,
          serviceId: paymentId,
          appointmentId: appointmentId
        });

        } catch (tefeError) {
        }

      res.json({
        success: true,
        message: 'Ödeme başarıyla tamamlandı',
        data: {
          paymentId: paymentId,
          amount: amount,
          status: 'completed',
          newBalance: wallet.balance,
          transaction: transaction,
          tefePointsEarned: true
        }
      });
    } else {
      // Başarısız ödeme
      res.json({
        success: false,
        message: 'Ödeme başarısız oldu',
        data: {
          paymentId: paymentId,
          amount: amount,
          status: 'failed',
          reason: 'Kart bilgileri geçersiz'
        }
      });
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Ödeme işlemi sırasında hata oluştu',
      error: error.message
    });
  }
});

// Ödeme geçmişi
router.get('/history', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Cüzdan bulunamadı'
      });
    }

    // Ödeme işlemlerini filtrele
    const paymentTransactions = wallet.transactions.filter(t => t.type === 'debit');
    
    res.json({
      success: true,
      message: 'Ödeme geçmişi getirildi',
      data: {
        transactions: paymentTransactions,
        totalPayments: paymentTransactions.length,
        totalAmount: paymentTransactions.reduce((sum, t) => sum + t.amount, 0)
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Ödeme geçmişi getirilirken hata oluştu',
      error: error.message
    });
  }
});

export default router;
