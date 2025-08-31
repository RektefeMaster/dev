import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/auth.d';

export class WalletController {
  static getBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    // Mock data - gerçek uygulamada veritabanından çekilecek
    const balance = 0;
    
    res.json({
      success: true,
      message: 'Cüzdan bakiyesi getirildi',
      data: { balance }
    });
  });

  static getTransactions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    // Mock data - gerçek uygulamada veritabanından çekilecek
    const transactions = [
      {
        id: '1',
        type: 'income',
        amount: 500,
        description: 'Motor bakımı ödemesi',
        date: new Date(),
        status: 'completed'
      },
      {
        id: '2',
        type: 'expense',
        amount: 150,
        description: 'Parça alımı',
        date: new Date(Date.now() - 86400000),
        status: 'completed'
      }
    ];
    
    res.json({
      success: true,
      message: 'İşlemler getirildi',
      data: { transactions }
    });
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

    // Mock data - gerçek uygulamada veritabanına kaydedilecek
    res.json({
      success: true,
      message: 'Para cüzdana eklendi',
      data: { amount }
    });
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
