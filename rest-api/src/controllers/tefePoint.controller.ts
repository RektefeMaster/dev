import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../types/auth.d';
import { TefePoint, calculateTefePoints, SERVICE_CATEGORIES } from '../models/TefePoint';

export class TefePointController {
  // Kullanıcının TefePuan bakiyesini getir
  static getBalance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    try {
      let tefePoint = await TefePoint.findOne({ userId });
      
      // Eğer kullanıcının TefePuan kaydı yoksa oluştur
      if (!tefePoint) {
        tefePoint = new TefePoint({
          userId,
          totalPoints: 0,
          availablePoints: 0,
          usedPoints: 0,
          expiredPoints: 0,
          transactions: []
        });
        await tefePoint.save();
        }

      // Süresi dolan puanları kontrol et ve güncelle
      await TefePointController.updateExpiredPoints(tefePoint);

      res.json({
        success: true,
        message: 'TefePuan bakiyesi getirildi',
        data: {
          totalPoints: tefePoint.totalPoints,
          availablePoints: tefePoint.availablePoints,
          usedPoints: tefePoint.usedPoints,
          expiredPoints: tefePoint.expiredPoints
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'TefePuan bakiyesi getirilirken hata oluştu',
        error: error.message
      });
    }
  });

  // TefePuan geçmişini getir
  static getHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, type } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    try {
      const tefePoint = await TefePoint.findOne({ userId });
      
      if (!tefePoint) {
        return res.json({
          success: true,
          message: 'TefePuan geçmişi bulunamadı',
          data: {
            transactions: [],
            pagination: {
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              total: 0,
              pages: 0
            }
          }
        });
      }

      // Filtreleme
      let transactions = tefePoint.transactions;
      if (type) {
        transactions = transactions.filter(t => t.type === type);
      }

      // Sıralama (en yeni önce)
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Sayfalama
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedTransactions = transactions.slice(startIndex, endIndex);

      res.json({
        success: true,
        message: 'TefePuan geçmişi getirildi',
        data: {
          transactions: paginatedTransactions,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: transactions.length,
            pages: Math.ceil(transactions.length / parseInt(limit as string))
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'TefePuan geçmişi getirilirken hata oluştu',
        error: error.message
      });
    }
  });

  // Hizmet satın alımından TefePuan kazan
  static earnPoints = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { 
      amount, 
      serviceCategory, 
      serviceId, 
      appointmentId, 
      description 
    } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli harcama tutarı giriniz'
      });
    }

    if (!serviceCategory) {
      return res.status(400).json({
        success: false,
        message: 'Hizmet kategorisi belirtilmelidir'
      });
    }

    try {
      // TefePuan hesapla
      const earnedPoints = calculateTefePoints(amount, serviceCategory);
      const category = SERVICE_CATEGORIES.find(cat => cat.category === serviceCategory);
      const multiplier = category ? category.multiplier : 0.05;

      // Kullanıcının TefePuan kaydını bul veya oluştur
      let tefePoint = await TefePoint.findOne({ userId });
      
      if (!tefePoint) {
        tefePoint = new TefePoint({
          userId,
          totalPoints: 0,
          availablePoints: 0,
          usedPoints: 0,
          expiredPoints: 0,
          transactions: []
        });
      }

      // Yeni işlem ekle
      const newTransaction = {
        type: 'service_purchase' as const,
        amount: earnedPoints,
        serviceCategory,
        serviceId,
        appointmentId,
        description: description || `${category?.description || 'Hizmet'} satın alımı`,
        multiplier,
        baseAmount: amount,
        date: new Date(),
        status: 'earned' as const
      };

      tefePoint.transactions.push(newTransaction);
      tefePoint.totalPoints += earnedPoints;
      tefePoint.availablePoints += earnedPoints;

      await tefePoint.save();

      res.json({
        success: true,
        message: 'TefePuan başarıyla kazanıldı',
        data: {
          earnedPoints,
          totalPoints: tefePoint.totalPoints,
          availablePoints: tefePoint.availablePoints,
          transaction: newTransaction
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'TefePuan kazanılırken hata oluştu',
        error: error.message
      });
    }
  });

  // TefePuan kullan
  static usePoints = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { points, description, serviceId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli puan miktarı giriniz'
      });
    }

    try {
      const tefePoint = await TefePoint.findOne({ userId });
      
      if (!tefePoint) {
        return res.status(404).json({
          success: false,
          message: 'TefePuan kaydı bulunamadı'
        });
      }

      if (tefePoint.availablePoints < points) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz TefePuan bakiyesi'
        });
      }

      // Kullanım işlemi ekle
      const useTransaction = {
        type: 'use' as const,
        amount: -points, // Negatif değer
        serviceId,
        description: description || 'TefePuan kullanımı',
        multiplier: 0.01, // Minimum değer
        baseAmount: 0,
        date: new Date(),
        status: 'used' as const
      };

      tefePoint.transactions.push(useTransaction);
      tefePoint.availablePoints -= points;
      tefePoint.usedPoints += points;

      await tefePoint.save();

      res.json({
        success: true,
        message: 'TefePuan başarıyla kullanıldı',
        data: {
          usedPoints: points,
          remainingPoints: tefePoint.availablePoints,
          transaction: useTransaction
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'TefePuan kullanılırken hata oluştu',
        error: error.message
      });
    }
  });

  // Hizmet kategorilerini getir
  static getServiceCategories = asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Hizmet kategorileri getirildi',
      data: {
        categories: SERVICE_CATEGORIES
      }
    });
  });

  // Süresi dolan puanları güncelle (internal method)
  static updateExpiredPoints = async (tefePoint: any): Promise<void> => {
    const now = new Date();
    let expiredCount = 0;

    // Süresi dolan işlemleri bul
    const expiredTransactions = tefePoint.transactions.filter((transaction: any) => {
      return transaction.status === 'earned' && 
             transaction.expiresAt && 
             new Date(transaction.expiresAt) < now;
    });

    // Süresi dolan puanları güncelle
    for (const transaction of expiredTransactions) {
      transaction.status = 'expired';
      expiredCount += transaction.amount;
    }

    if (expiredCount > 0) {
      tefePoint.availablePoints = Math.max(0, tefePoint.availablePoints - expiredCount);
      tefePoint.expiredPoints += expiredCount;
      await tefePoint.save();
    }
  };

  // TefePuan istatistikleri
  static getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { period = 'month' } = req.query; // week, month, year
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimliği bulunamadı'
      });
    }

    try {
      const tefePoint = await TefePoint.findOne({ userId });
      
      if (!tefePoint) {
        return res.json({
          success: true,
          message: 'TefePuan istatistikleri bulunamadı',
          data: {
            totalEarned: 0,
            totalUsed: 0,
            totalExpired: 0,
            categoryBreakdown: [],
            monthlyEarnings: []
          }
        });
      }

      // Dönem filtresi
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Dönem içindeki işlemleri filtrele
      const periodTransactions = tefePoint.transactions.filter((transaction: any) => 
        new Date(transaction.date) >= startDate
      );

      // İstatistikleri hesapla
      const totalEarned = periodTransactions
        .filter((t: any) => t.status === 'earned')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const totalUsed = periodTransactions
        .filter((t: any) => t.status === 'used')
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

      const totalExpired = periodTransactions
        .filter((t: any) => t.status === 'expired')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Kategori bazında kazanım
      const categoryBreakdown = SERVICE_CATEGORIES.map(category => {
        const categoryTransactions = periodTransactions.filter((t: any) => 
          t.serviceCategory === category.category && t.status === 'earned'
        );
        const categoryEarnings = categoryTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
        
        return {
          category: category.category,
          description: category.description,
          multiplier: category.multiplier,
          earnings: categoryEarnings,
          transactionCount: categoryTransactions.length
        };
      });

      res.json({
        success: true,
        message: 'TefePuan istatistikleri getirildi',
        data: {
          totalEarned,
          totalUsed,
          totalExpired,
          categoryBreakdown,
          period
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'TefePuan istatistikleri getirilirken hata oluştu',
        error: error.message
      });
    }
  });
}
