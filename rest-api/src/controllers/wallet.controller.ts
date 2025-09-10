import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/auth.d';
import { Wallet } from '../models/Wallet';
import { TefePointService } from '../services/tefePoint.service';

export class WalletController {
  static getBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    try {
      // Wallet'ı bul veya oluştur
      let wallet = await Wallet.findOne({ userId });
      
      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: 0,
          transactions: []
        });
        await wallet.save();
      }
      
      res.json({
        success: true,
        message: 'Cüzdan bakiyesi getirildi',
        data: { balance: wallet.balance }
      });
    } catch (error: any) {
      console.error('Wallet balance getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Cüzdan bakiyesi getirilirken hata oluştu',
        error: error.message
      });
    }
  });

  static getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    try {
      // Wallet'ı bul
      const wallet = await Wallet.findOne({ userId });
      
      if (!wallet) {
        return res.json({
          success: true,
          message: 'İşlemler getirildi',
          data: { transactions: [] }
        });
      }

      // Transactions'ları tarihe göre sırala (en yeni önce)
      const transactions = wallet.transactions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      res.json({
        success: true,
        message: 'İşlemler getirildi',
        data: { transactions }
      });
    } catch (error: any) {
      console.error('Wallet transactions getirme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'İşlemler getirilirken hata oluştu',
        error: error.message
      });
    }
  });

  static addMoney = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { amount } = req.body;
    
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

    try {
      // Wallet'ı bul veya oluştur
      let wallet = await Wallet.findOne({ userId });
      
      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: 0,
          transactions: []
        });
      }

      // Bakiye yükleme işlemi
      const transaction = {
        type: 'credit' as const,
        amount: amount,
        description: 'Cüzdan bakiye yükleme',
        date: new Date(),
        status: 'completed' as const
      };

      wallet.transactions.push(transaction);
      wallet.balance += amount;
      await wallet.save();

      // TefePuan kazandır
      try {
        const tefePointResult = await TefePointService.processPaymentTefePoints({
          userId,
          amount,
          paymentType: 'wallet_topup',
          serviceCategory: 'maintenance', // Bakiye yükleme için genel bakım kategorisi
          description: 'Cüzdan bakiye yükleme',
          serviceId: (wallet._id as any).toString()
        });

        if (tefePointResult.success && tefePointResult.earnedPoints) {
          console.log(`✅ Wallet bakiye yükleme TefePuan eklendi: ${tefePointResult.earnedPoints} puan, Kullanıcı: ${userId}`);
        }
      } catch (tefeError) {
        console.error('❌ Wallet bakiye yükleme TefePuan ekleme hatası:', tefeError);
        // TefePuan hatası ödeme işlemini durdurmaz
      }

      res.json({
        success: true,
        message: 'Para cüzdana eklendi',
        data: { 
          amount,
          newBalance: wallet.balance,
          transaction
        }
      });

    } catch (error: any) {
      console.error('Wallet bakiye yükleme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Bakiye yüklenirken hata oluştu',
        error: error.message
      });
    }
  });

  static withdrawMoney = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { amount } = req.body;
    
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

    // Mock data - gerçek uygulamada veritabanına kaydedilecek
    res.json({
      success: true,
      message: 'Para cüzdandan çekildi',
      data: { amount }
    });
  });
}
