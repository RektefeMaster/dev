import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { Wallet } from '../models/Wallet';
import { WalletController } from '../controllers/wallet.controller';
import { Appointment } from '../models/Appointment';
import { Types } from 'mongoose';

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
    
    // Toplam kazançları hesapla (credit transactions)
    const totalEarnings = wallet 
      ? wallet.transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    // Bekleyen ödemeleri hesapla (pending transactions)
    const pendingAmount = wallet 
      ? wallet.transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    // Bu ayın kazançlarını hesapla
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEarnings = wallet 
      ? wallet.transactions
          .filter(t => t.type === 'credit' && new Date(t.date) >= firstDayOfMonth)
          .reduce((sum, t) => sum + t.amount, 0)
      : 0;
    
    res.json({
      success: true,
      data: { 
        balance,
        totalEarnings,
        pendingAmount,
        thisMonthEarnings
      },
      message: 'Wallet balance başarıyla getirildi'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Wallet balance getirilirken hata oluştu',
      error: error.message
    });
  }
});

// ===== YENİ: Gerçek appointment verilerine dayalı kazanç özeti =====
router.get('/earnings-summary', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const period = req.query.period as string || 'thisMonth'; // thisMonth, lastMonth, allTime
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı ID bulunamadı'
      });
    }
    
    // Tarih aralıklarını belirle
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    
    if (period === 'thisMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else { // allTime
      startDate = new Date(2020, 0, 1); // Çok eski bir tarih
    }
    
    // Tamamlanan randevuları getir
    const completedAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI',
      appointmentDate: { $gte: startDate, $lte: endDate }
    });
    
    // Bekleyen randevuları getir
    const pendingAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: { $in: ['ONAYLANDI', 'BEKLEMEDE'] }
    });
    
    // Tüm zamanlar için toplam kazanç
    const allTimeAppointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI'
    });
    
    // Hesaplamalar
    const totalEarnings = completedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const totalJobs = completedAppointments.length;
    const averageEarnings = totalJobs > 0 ? Math.round(totalEarnings / totalJobs) : 0;
    const pendingPayments = pendingAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const allTimeTotal = allTimeAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    
    res.json({
      success: true,
      data: {
        totalEarnings,
        totalJobs,
        averageEarnings,
        pendingPayments,
        allTimeTotal,
        period
      },
      message: 'Kazanç özeti başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('❌ Earnings summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Kazanç özeti alınamadı',
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
    
    // Gerçek randevu verilerinden işlemleri getir
    const appointments = await Appointment.find({
      mechanicId: new Types.ObjectId(userId),
      status: 'TAMAMLANDI'
    })
    .populate('userId', 'name surname')
    .populate('vehicleId', 'brand modelName plateNumber')
    .sort({ completionDate: -1 })
    .limit(limit);
    
    // Transaction formatına dönüştür
    const transactions = appointments.map((apt: any) => ({
      _id: apt._id.toString(),
      type: 'credit',
      amount: apt.price || 0,
      date: apt.completionDate || apt.appointmentDate,
      description: apt.serviceType || 'Hizmet',
      serviceType: apt.serviceType || 'Hizmet',
      customerName: apt.userId ? `${apt.userId.name || ''} ${apt.userId.surname || ''}`.trim() : 'Müşteri',
      vehicleInfo: apt.vehicleId 
        ? `${apt.vehicleId.brand || ''} ${apt.vehicleId.modelName || ''} (${apt.vehicleId.plateNumber || ''})`.trim()
        : 'Araç bilgisi yok',
      status: 'completed',
      appointmentId: apt._id.toString()
    }));
    
    res.json({
      success: true,
      data: transactions,
      message: 'Wallet transactions başarıyla getirildi'
    });
  } catch (error: any) {
    console.error('❌ Transactions error:', error);
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
