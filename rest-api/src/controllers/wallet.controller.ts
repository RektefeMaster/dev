import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/auth.d';
import { Wallet } from '../models/Wallet';
import { TefePointService } from '../services/tefePoint.service';
import mongoose from 'mongoose';

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

    // Amount validation - daha detaylı kontrol
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 999999999) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli miktar giriniz (1-999,999,999 TL arası)',
        error: {
          details: {
            amount: amount,
            type: typeof amount,
            valid: amount > 0 && amount <= 999999999
          }
        }
      });
    }

    try {
      // MongoDB transaction ile atomik işlem
      const session = await mongoose.startSession();
      let wallet: any = null;
      
      try {
        await session.startTransaction();
        
        // Wallet'ı bul veya oluştur
        wallet = await Wallet.findOne({ userId }).session(session);
        
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
        await wallet.save({ session });
        
        await session.commitTransaction();

        // TefePuan kazandır (transaction dışında)
        try {
          const tefePointResult = await TefePointService.processPaymentTefePoints({
            userId,
            amount,
            paymentType: 'wallet_topup',
            serviceCategory: 'maintenance',
            description: 'Cüzdan bakiye yükleme',
            serviceId: (wallet._id as any).toString()
          });

          if (tefePointResult.success && tefePointResult.earnedPoints) {
            // TefePuan başarılı
          }
        } catch (tefeError) {
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
        
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }

    } catch (error: any) {
      if (error.message.includes('Balance cannot be negative')) {
        return res.status(400).json({
          success: false,
          message: 'Bakiye negatif olamaz',
          error: {
            details: {
              currentBalance: 0, // wallet variable'ı burada erişilebilir değil
              requestedAmount: amount,
              operation: 'add_money'
            }
          }
        });
      }
      
      if (error.message.includes('Balance cannot exceed')) {
        return res.status(400).json({
          success: false,
          message: 'Bakiye maksimum limiti aştı',
          error: {
            details: {
              currentBalance: 0, // wallet variable'ı burada erişilebilir değil
              requestedAmount: amount,
              maxLimit: 999999999
            }
          }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Bakiye yüklenirken hata oluştu',
        error: {
          message: error.message,
          details: {
            userId,
            amount,
            operation: 'add_money'
          }
        }
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
