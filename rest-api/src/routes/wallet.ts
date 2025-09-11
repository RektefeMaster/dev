import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Wallet } from '../models/Wallet';
import { WalletController } from '../controllers/wallet.controller';

const router = Router();

// ===== WALLET ENDPOINTS =====
router.get('/balance', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    // Wallet balance'ı getir
    const wallet = await Wallet.findOne({ userId });
    const balance = wallet ? wallet.balance : 0;
    
    res.json({
      success: true,
      data: { balance },
      message: 'Wallet balance başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Wallet balance hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Wallet balance getirilirken hata oluştu',
      error: error.message
    });
  }
});

router.get('/transactions', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
 message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Son işlemleri getir
    const wallet = await Wallet.findOne({ userId });
    const transactions = wallet ? wallet.transactions.slice(-limit) : [];
    
    res.json({
      success: true,
      data: transactions,
      message: 'Wallet transactions başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('Wallet transactions hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Wallet transactions getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Para ekleme endpoint'i
router.post('/add-money', auth, WalletController.addMoney);

export default router;
