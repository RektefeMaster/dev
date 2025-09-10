import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types/auth.d';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';

const router = express.Router();

// Çekici talebi oluştur - Acil çağrı sistemi
router.post('/towing', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const { 
      vehicleType, 
      reason, 
      pickupLocation, 
      dropoffLocation, 
      estimatedPrice,
      description,
      emergencyLevel = 'medium',
      towingType = 'flatbed'
    } = req.body;

    // Gerekli alanları kontrol et
    if (!vehicleType || !reason || !pickupLocation) {
      return res.status(400).json({
        success: false,
        message: 'Araç tipi, sebep ve alış konumu gerekli.'
      });
    }

    // Çekici talebi oluştur
    const towingRequest = new Appointment({
      userId,
      serviceType: 'towing',
      vehicleType,
      reason,
      pickupLocation,
      dropoffLocation,
      estimatedPrice,
      description,
      emergencyLevel,
      towingType,
      status: 'TALEP_EDILDI',
      requestType: 'immediate',
      appointmentDate: new Date(),
      timeSlot: 'Acil'
    });

    await towingRequest.save();

    res.status(201).json({
      success: true,
      message: 'Acil çekici talebi başarıyla oluşturuldu',
      data: towingRequest
    });
  } catch (error) {
    console.error('Çekici talebi oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Çekici talebi oluşturulurken hata oluştu'
    });
  }
});

// Yıkama randevusu oluştur
router.post('/wash', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const { 
      packageType, 
      options, 
      appointmentDate, 
      timeSlot, 
      totalPrice,
      description,
      vehicleType = 'binek',
      vehicleBrand = '',
      vehicleModel = '',
      vehicleYear = '',
      specialRequests = ''
    } = req.body;

    // Gerekli alanları kontrol et
    if (!packageType || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Paket tipi, tarih ve saat gerekli.'
      });
    }

    // Yıkama randevusu oluştur - Usta verilerine entegre
    const washBooking = new Appointment({
      userId,
      serviceType: 'wash',
      packageType,
      options: options || [],
      appointmentDate: new Date(appointmentDate),
      timeSlot,
      totalPrice,
      description,
      vehicleType,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      specialRequests,
      status: 'TALEP_EDILDI',
      requestType: 'scheduled'
    });

    await washBooking.save();

    res.status(201).json({
      success: true,
      message: 'Yıkama randevusu başarıyla oluşturuldu',
      data: washBooking
    });
  } catch (error) {
    console.error('Yıkama randevusu oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yıkama randevusu oluşturulurken hata oluştu'
    });
  }
});

// Lastik & Parça talebi oluştur
router.post('/tire-parts', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı doğrulanamadı.' 
      });
    }

    const { 
      partType, 
      vehicleInfo, 
      tireSize, 
      tireBrand = '',
      tireModel = '',
      season = 'all-season',
      quantity, 
      estimatedPrice,
      description,
      specialRequests = ''
    } = req.body;

    // Gerekli alanları kontrol et
    if (!partType) {
      return res.status(400).json({
        success: false,
        message: 'Parça tipi gerekli.'
      });
    }

    // Lastik & Parça talebi oluştur - Usta verilerine entegre
    const tirePartsRequest = new Appointment({
      userId,
      serviceType: 'tire_parts',
      partType,
      vehicleInfo: vehicleInfo || {},
      tireSize,
      tireBrand,
      tireModel,
      season,
      quantity: quantity || 1,
      estimatedPrice,
      description,
      specialRequests,
      status: 'TALEP_EDILDI',
      requestType: 'quoted'
    });

    await tirePartsRequest.save();

    res.status(201).json({
      success: true,
      message: 'Lastik & Parça talebi başarıyla oluşturuldu',
      data: tirePartsRequest
    });
  } catch (error) {
    console.error('Lastik & Parça talebi oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Lastik & Parça talebi oluşturulurken hata oluştu'
    });
  }
});

// Usta yeteneklerine göre talepleri getir
router.get('/mechanic-requests', auth, async (req: AuthRequest, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    if (!mechanicId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usta doğrulanamadı.' 
      });
    }

    // Ustanın yeteneklerini al
    const mechanic = await User.findById(mechanicId);
    if (!mechanic) {
      return res.status(404).json({
        success: false,
        message: 'Usta bulunamadı.'
      });
    }

    const capabilities = mechanic.serviceCategories || [];
    
    // Ustanın yeteneklerine göre talepleri getir
    const requests = await Appointment.find({
      serviceType: { $in: capabilities },
      status: 'TALEP_EDILDI'
    })
    .populate('userId', 'name surname phone')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Usta talepleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Usta talepleri getirilirken hata oluştu'
    });
  }
});

// Belirli hizmet türüne göre ustaları getir
router.get('/mechanics-by-service/:serviceType', async (req: Request, res: Response) => {
  try {
    const { serviceType } = req.params;
    
    // Geçerli hizmet türlerini kontrol et
    const validServiceTypes = ['towing', 'repair', 'wash', 'tire'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz hizmet türü.'
      });
    }

    // Bu hizmet türünde çalışan ustaları getir
    const mechanics = await User.find({
      userType: 'mechanic',
      serviceCategories: serviceType,
      isAvailable: true
    })
    .select('name surname shopName rating ratingCount experience city serviceCategories location avatar')
    .sort({ rating: -1 });

    // Eğer usta yoksa mock data döndür
    let formattedMechanics;
    if (mechanics.length === 0) {
      formattedMechanics = [
        {
          id: 'mock1',
          name: 'Ahmet Yıkama Servisi',
          rating: 4.8,
          address: 'Kadıköy, İstanbul',
          distance: '1.2 km',
          image: null,
          serviceCategories: [serviceType]
        },
        {
          id: 'mock2',
          name: 'Mehmet Detay Yıkama',
          rating: 4.6,
          address: 'Beşiktaş, İstanbul',
          distance: '2.5 km',
          image: null,
          serviceCategories: [serviceType]
        },
        {
          id: 'mock3',
          name: 'Seramik Yıkama Merkezi',
          rating: 4.9,
          address: 'Şişli, İstanbul',
          distance: '3.1 km',
          image: null,
          serviceCategories: [serviceType]
        }
      ];
    } else {
      // Frontend için uygun formata çevir
      formattedMechanics = mechanics.map(mechanic => ({
        id: mechanic._id,
        name: mechanic.shopName || `${mechanic.name} ${mechanic.surname}`,
        rating: mechanic.rating || 0,
        address: `${mechanic.location?.neighborhood || ''} ${mechanic.location?.street || ''}`.trim() || `${mechanic.city || 'Şehir belirtilmemiş'}`,
        distance: '2.5 km', // TODO: Gerçek mesafe hesaplama
        image: mechanic.avatar,
        serviceCategories: mechanic.serviceCategories
      }));
    }

    res.status(200).json({
      success: true,
      data: formattedMechanics
    });
  } catch (error) {
    console.error('Usta getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ustalar getirilirken hata oluştu'
    });
  }
});

export default router;
