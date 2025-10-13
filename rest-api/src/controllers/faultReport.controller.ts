import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FaultReport } from '../models/FaultReport';
import { Vehicle } from '../models/Vehicle';
import { Mechanic } from '../models/Mechanic';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import { sendNotificationToUser } from '../utils/socketNotifications';
import { validateFaultReport, validateQuote, validateSelectQuote, validateMechanicResponse, validateTomorrowResponse, validateContact } from '../validators/faultReport.validation';
import { TefePointService } from '../services/tefePoint.service';
import { 
  getFaultReportServiceCategory,
  getCategoryQueryValues,
  getServiceTypeFromServiceCategory
} from '../utils/serviceCategoryHelper';
import { FAULT_CATEGORY_TO_SERVICE_CATEGORY } from '../../../shared/types/enums';

// Arıza bildirimi oluştur
export const createFaultReport = async (req: Request, res: Response) => {
  try {
    // Validation geçici olarak devre dışı
    // const { error } = validateFaultReport(req.body);
    // if (error) {
    //   return res.status(400).json({
    //     success: false,
    //     message: error.details[0].message
    //   });
    // }

    const {
      vehicleId,
      serviceCategory,
      mainServiceCategory,
      faultDescription,
      photos = [],
      videos = [],
      priority = 'medium',
      location
    } = req.body;

    // Frontend'den gelen ServiceType kod değerlerini Fault Report Türkçe kategorilerine çevir
    // Not: Fault Report model'i Türkçe kategori isimleri kullanıyor
    const categoryNameMapping: { [key: string]: string } = {
      'genel-bakim': 'Genel Bakım',
      'agir-bakim': 'Ağır Bakım',
      'alt-takim': 'Alt Takım',
      'ust-takim': 'Üst Takım',
      'kaporta-boya': 'Kaporta/Boya',
      'elektrik-elektronik': 'Elektrik-Elektronik',
      'yedek-parca': 'Yedek Parça',
      'egzoz-emisyon': 'Egzoz & Emisyon',
      'arac-yikama': 'Araç Yıkama',
      'lastik': 'Lastik',
      'wash': 'Araç Yıkama',
      'towing': 'Çekici',
      'repair': 'Genel Bakım',
      'tire': 'Lastik',
      // Frontend'teki static kategoriler
      'Genel Bakım': 'Genel Bakım',
      'Ağır Bakım': 'Ağır Bakım',
      'Üst Takım': 'Üst Takım',
      'Alt Takım': 'Alt Takım',
      'Kaporta/Boya': 'Kaporta/Boya',
      'Elektrik-Elektronik': 'Elektrik-Elektronik',
      'Yedek Parça': 'Yedek Parça',
      'Lastik': 'Lastik',
      'Egzoz & Emisyon': 'Egzoz & Emisyon',
      'Araç Yıkama': 'Araç Yıkama'
    };

    const normalizedServiceCategory = categoryNameMapping[serviceCategory] || serviceCategory;

    const userId = req.user?.userId;

    // Araç kontrolü
    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    // Konum bilgisini kontrol et - sadece çekici hizmeti için zorunlu
    let locationData = null;
    
    // Çekici hizmeti için konum zorunlu
    const isLocationRequired = normalizedServiceCategory === 'Çekici';
    
    if (location && location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      locationData = {
        type: 'Point',
        coordinates: location.coordinates, // [longitude, latitude]
        address: location.address || '',
        city: location.city || ''
      };
    } else if (isLocationRequired) {
      return res.status(400).json({
        success: false,
        message: 'Çekici hizmeti için konum bilgisi gereklidir'
      });
    }
    
    const faultReport = new FaultReport({
      userId,
      vehicleId,
      serviceCategory: normalizedServiceCategory,
      faultDescription,
      photos,
      videos,
      priority,
      location: locationData, // Sadece çekici hizmeti için
      status: 'pending'
    });

    await faultReport.save();

    // Kullanıcı bilgilerini al
    const user = await User.findById(userId).select('name surname phone');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Çevredeki uygun ustaları bul
    const nearbyMechanics = await findNearbyMechanics(
      null, // coordinates kaldırıldı
      normalizedServiceCategory,
      vehicle.brand,
      null // userCity kaldırıldı
    );

    console.log(`[FAULT REPORT] Arıza bildirimi oluşturuldu:`, {
      faultReportId: faultReport._id,
      serviceCategory,
      normalizedServiceCategory,
      vehicleBrand: vehicle.brand,
      nearbyMechanicsCount: nearbyMechanics.length
    });

    // Her ustaya bildirim gönder
    let notificationsSent = 0;
    let notificationsFailed = 0;

    for (const mechanic of nearbyMechanics) {
      try {
        // Usta bilgilerini al (hem Mechanic hem User tablosundan)
        let mechanicData = await Mechanic.findById(mechanic._id).select('name surname phone pushToken');
        if (!mechanicData) {
          // User tablosundan da kontrol et
          mechanicData = await User.findById(mechanic._id).select('name surname phone pushToken');
        }

        if (mechanicData) {
          // Bildirim oluştur
          const notification = {
            type: 'fault_report',
            title: 'Yeni Arıza Bildirimi',
            message: `${user.name} ${user.surname} aracında ${serviceCategory} arızası bildirdi`,
            data: {
              faultReportId: faultReport._id,
              vehicleBrand: vehicle.brand,
              vehicleModel: vehicle.modelName,
              serviceCategory,
              faultDescription,
              photos,
              videos,
              userPhone: user.phone,
              userName: `${user.name} ${user.surname}`
            }
          };

          // Real-time bildirim gönder (Socket.io)
          sendNotificationToUser(mechanic._id.toString(), notification);
          
          // Push notification gönder
          if (mechanicData.pushToken) {
            const { sendPushNotification } = await import('../utils/notifications');
            await sendPushNotification(
              mechanic._id.toString(),
              notification.title,
              notification.message,
              notification.data
            );
            console.log(`[FAULT REPORT] Push notification gönderildi - Usta: ${mechanicData.name} ${mechanicData.surname} (${mechanic._id})`);
          } else {
            console.log(`[FAULT REPORT] Push token yok - Usta: ${mechanicData.name} ${mechanicData.surname} (${mechanic._id})`);
          }

          // Veritabanına bildirim kaydı oluştur
          const { sendNotification } = await import('../utils/notifications');
          await sendNotification(
            new mongoose.Types.ObjectId(mechanic._id.toString()),
            'mechanic',
            notification.title,
            notification.message,
            'fault_report',
            notification.data
          );

          notificationsSent++;
          console.log(`[FAULT REPORT] Bildirim gönderildi - Usta: ${mechanicData.name} ${mechanicData.surname} (${mechanic._id})`);
        } else {
          console.log(`[FAULT REPORT] Usta bilgisi bulunamadı - ID: ${mechanic._id}`);
          notificationsFailed++;
        }
      } catch (error) {
        console.error(`[FAULT REPORT] Bildirim gönderme hatası - Usta ID: ${mechanic._id}`, error);
        notificationsFailed++;
      }
    }

    console.log(`[FAULT REPORT] Bildirim özeti:`, {
      totalMechanics: nearbyMechanics.length,
      notificationsSent,
      notificationsFailed
    });

    res.status(201).json({
      success: true,
      message: 'Arıza bildirimi başarıyla oluşturuldu',
      data: {
        faultReportId: faultReport._id,
        status: faultReport.status,
        quotesCount: 0
      }
    });

  } catch (error) {
    console.error('FaultReport creation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Arıza bildirimi oluşturulurken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Kullanıcının arıza bildirimlerini getir
export const getUserFaultReports = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const faultReports = await FaultReport.find(query)
      .populate('vehicleId', 'brand modelName plateNumber year')
      .populate('quotes.mechanicId', 'name surname shopName phone')
      .populate('selectedQuote.mechanicId', 'name surname shopName phone')
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit))
      .lean(); // 🚀 OPTIMIZE: Memory optimization

    const total = await FaultReport.countDocuments(query);

    res.json({
      success: true,
      data: faultReports,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Arıza bildirimleri getirilirken bir hata oluştu'
    });
  }
};

// Arıza bildirimi detayını getir
export const getFaultReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const faultReport = await FaultReport.findOne({ _id: id, userId })
      .populate('vehicleId', 'brand modelName plateNumber year color')
      .populate('quotes.mechanicId', 'name surname shopName phone rating experience')
      .populate('selectedQuote.mechanicId', 'name surname shopName phone rating experience')
      .populate('appointmentId')
      .lean(); // 🚀 OPTIMIZE: Memory optimization

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    res.json({
      success: true,
      data: faultReport
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Arıza bildirimi detayı getirilirken bir hata oluştu'
    });
  }
};

// Usta için arıza bildirimi detayını getir
export const getMechanicFaultReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mechanicId = req.user?.userId;

    const faultReport = await FaultReport.findById(id)
      .populate('userId', 'name surname phone')
      .populate('vehicleId', 'brand modelName plateNumber year color engineType transmissionType fuelType engineSize mileage vehicleCondition')
      .populate('quotes.mechanicId', 'name surname shopName phone rating experience')
      .populate('selectedQuote.mechanicId', 'name surname shopName phone rating experience')
      .populate('appointmentId');

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Usta için teklif detaylarını gizle
    const faultReportData = faultReport.toObject();
    
    // Tekliflerde sadece fiyat ve tarih göster, diğer detayları gizle
    if (faultReportData.quotes) {
      faultReportData.quotes = faultReportData.quotes.map((quote: any) => ({
        ...quote,
        mechanicName: 'Usta',
        mechanicPhone: '***',
        estimatedDuration: '***',
        notes: '***'
      }));
    }

    res.json({
      success: true,
      data: faultReportData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Arıza bildirimi detayı getirilirken bir hata oluştu'
    });
  }
};

// Usta yanıtı ver (teklif, müsait değilim, yarın bakarım, iletişime geç)
export const submitMechanicResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // URL'den faultReportId al
    const { responseType, message } = req.body;
    const mechanicId = req.user?.userId;

    // Validation
    const { error } = validateMechanicResponse(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Usta kontrolü
    let mechanic = await Mechanic.findById(mechanicId);
    let userMechanic = null;
    
    if (!mechanic) {
      userMechanic = await User.findById(mechanicId);
      if (!userMechanic || userMechanic.userType !== 'mechanic') {
        return res.status(404).json({
          success: false,
          message: 'Usta bulunamadı'
        });
      }
    }

    // Arıza bildirimi kontrolü
    const faultReport = await FaultReport.findById(id);
    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Zaten yanıt verilmiş mi kontrol et
    const existingResponse = faultReport.mechanicResponses.find(
      response => response.mechanicId.toString() === mechanicId
    );

    if (existingResponse) {
      return res.status(400).json({
        success: false,
        message: 'Bu arıza için zaten yanıt verdiniz',
        data: {
          existingResponse: {
            responseType: existingResponse.responseType,
            message: existingResponse.message,
            createdAt: existingResponse.createdAt
          }
        }
      });
    }

    // Yanıt ekle
    faultReport.mechanicResponses.push({
      mechanicId: mechanicId as any,
      responseType,
      message: message || '',
      createdAt: new Date()
    });

    // Eğer teklif veriyorsa, quotes array'ine de ekle ve status'u quoted yap
    if (responseType === 'quote') {
      const mechanicName = mechanic ? `${mechanic.name} ${mechanic.surname}` : `${userMechanic?.name} ${userMechanic?.surname}`;
      const mechanicPhone = mechanic ? mechanic.phone : userMechanic?.phone || '';
      
      faultReport.quotes.push({
        mechanicId: mechanicId as any,
        mechanicName: mechanicName || 'Bilinmeyen Usta',
        mechanicPhone: mechanicPhone || '',
        quoteAmount: req.body.quoteAmount || 0,
        estimatedDuration: req.body.estimatedDuration || '',
        notes: message || '',
        status: 'pending',
        createdAt: new Date()
      });
      
      faultReport.status = 'quoted';
    }

    await faultReport.save();

    // Kullanıcıya bildirim gönder
    const mechanicName = mechanic ? `${mechanic.name} ${mechanic.surname}` : `${userMechanic?.name} ${userMechanic?.surname}`;
    
    let notificationMessage = '';
    switch (responseType) {
      case 'quote':
        notificationMessage = `${mechanicName} Usta teklif verdi`;
        break;
      case 'not_available':
        notificationMessage = `${mechanicName} Usta şu anda müsait değil`;
        break;
      case 'check_tomorrow':
        notificationMessage = `${mechanicName} Usta yarın bakacağını belirtti`;
        break;
      case 'contact_me':
        notificationMessage = `${mechanicName} Usta iletişime geçmenizi istedi`;
        break;
    }

    if (notificationMessage) {
      const notification = {
        type: 'mechanic_response',
        title: 'Usta Yanıtı',
        message: notificationMessage,
        data: {
          faultReportId: faultReport._id,
          mechanicName,
          responseType,
          message
        }
      };

      sendNotificationToUser(faultReport.userId.toString(), notification);
    }

    // Eğer "yarın bakarım" seçildiyse, kullanıcıya özel bildirim gönder
    if (responseType === 'check_tomorrow') {
      const tomorrowNotification = {
        type: 'tomorrow_appointment_request',
        title: 'Yarın Randevu Talebi',
        message: `${mechanicName} Usta yarın bakacağını belirtti. Randevu oluşturmak ister misiniz?`,
        data: {
          faultReportId: faultReport._id,
          mechanicId: mechanicId,
          mechanicName,
          responseType: 'check_tomorrow',
          message,
          requiresAction: true
        }
      };

      sendNotificationToUser(faultReport.userId.toString(), tomorrowNotification);
    }

    res.json({
      success: true,
      message: 'Yanıt başarıyla gönderildi',
      data: {
        responseType,
        message
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yanıt gönderilirken bir hata oluştu'
    });
  }
};

// Yarın bakarım yanıtını onayla/reddet
export const handleTomorrowResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // faultReportId
    const { action } = req.body; // 'accept' veya 'reject'
    const userId = req.user?.userId;

    // Validation
    const { error } = validateTomorrowResponse(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Arıza bildirimi kontrolü
    const faultReport = await FaultReport.findById(id);
    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Kullanıcı kontrolü
    if (faultReport.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu arıza bildirimi size ait değil'
      });
    }

    // "Yarın bakarım" yanıtını bul
    const tomorrowResponse = faultReport.mechanicResponses.find(
      response => response.responseType === 'check_tomorrow'
    );

    if (!tomorrowResponse) {
      return res.status(404).json({
        success: false,
        message: 'Yarın bakarım yanıtı bulunamadı'
      });
    }

    if (action === 'accept') {
      // Kullanıcı onayladı - randevu oluşturma için gerekli bilgileri döndür
      const mechanic = await User.findById(tomorrowResponse.mechanicId);
      
      res.json({
        success: true,
        message: 'Yarın randevu talebi onaylandı',
        data: {
          faultReportId: faultReport._id,
          mechanicId: tomorrowResponse.mechanicId,
          mechanicName: mechanic ? `${mechanic.name} ${mechanic.surname}` : 'Bilinmeyen Usta',
          action: 'create_appointment',
          appointmentData: {
            faultReportId: faultReport._id,
            mechanicId: tomorrowResponse.mechanicId,
            serviceCategory: faultReport.serviceCategory,
            faultDescription: faultReport.faultDescription,
            location: faultReport.location,
            vehicleId: faultReport.vehicleId
          }
        }
      });
    } else if (action === 'reject') {
      // Kullanıcı reddetti - ustaya bildirim gönder
      const user = await User.findById(userId);
      const mechanic = await User.findById(tomorrowResponse.mechanicId);
      
      const rejectionNotification = {
        type: 'tomorrow_appointment_rejected',
        title: 'Randevu Talebi Reddedildi',
        message: `${user?.name} ${user?.surname} yarın randevu talebini reddetti`,
        data: {
          faultReportId: faultReport._id,
          userId: userId,
          userName: `${user?.name} ${user?.surname}`,
          action: 'rejected'
        }
      };

      sendNotificationToUser(tomorrowResponse.mechanicId.toString(), rejectionNotification);

      res.json({
        success: true,
        message: 'Yarın randevu talebi reddedildi',
        data: {
          action: 'rejected'
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz aksiyon. "accept" veya "reject" olmalı'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yanıt işlenirken bir hata oluştu'
    });
  }
};

// İletişime geç - mesaj gönderme
export const initiateContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // faultReportId
    const { message } = req.body;
    const userId = req.user?.userId;

    // Validation
    const { error } = validateContact(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Arıza bildirimi kontrolü
    const faultReport = await FaultReport.findById(id);
    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Kullanıcı kontrolü
    if (faultReport.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu arıza bildirimi size ait değil'
      });
    }

    // "İletişime geç" yanıtını bul
    const contactResponse = faultReport.mechanicResponses.find(
      response => response.responseType === 'contact_me'
    );

    if (!contactResponse) {
      return res.status(404).json({
        success: false,
        message: 'İletişim talebi bulunamadı'
      });
    }

    // Usta bilgilerini al
    const mechanic = await User.findById(contactResponse.mechanicId);
    const user = await User.findById(userId);

    // Ustaya mesaj bildirimi gönder
    const messageNotification = {
      type: 'contact_message',
      title: 'Mesaj Geldi',
      message: `${user?.name} ${user?.surname} size mesaj gönderdi`,
      data: {
        faultReportId: faultReport._id,
        fromUserId: userId,
        fromUserName: `${user?.name} ${user?.surname}`,
        message: message,
        action: 'open_chat'
      }
    };

    sendNotificationToUser(contactResponse.mechanicId.toString(), messageNotification);

    res.json({
      success: true,
      message: 'Mesaj başarıyla gönderildi',
      data: {
        faultReportId: faultReport._id,
        mechanicId: contactResponse.mechanicId,
        mechanicName: mechanic ? `${mechanic.name} ${mechanic.surname}` : 'Bilinmeyen Usta',
        action: 'open_chat',
        chatData: {
          faultReportId: faultReport._id,
          mechanicId: contactResponse.mechanicId,
          userId: userId,
          serviceCategory: faultReport.serviceCategory,
          faultDescription: faultReport.faultDescription
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilirken bir hata oluştu'
    });
  }
};

// Fiyat teklifi ver
export const submitQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // URL'den faultReportId al
    const { quoteAmount, estimatedDuration, notes } = req.body;
    const mechanicId = req.user?.userId;

    // Usta kontrolü - önce Mechanic tablosunda ara, bulamazsan User tablosunda ara
    let mechanic = await Mechanic.findById(mechanicId);
    let userMechanic = null;
    
    if (!mechanic) {
      // Mechanic tablosunda bulunamadı, User tablosunda ara
      userMechanic = await User.findById(mechanicId);
      if (!userMechanic || userMechanic.userType !== 'mechanic') {
        return res.status(404).json({
          success: false,
          message: 'Usta bulunamadı'
        });
      }
    }

    // Arıza bildirimi kontrolü
    const faultReport = await FaultReport.findById(id);
    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Zaten teklif verilmiş mi kontrol et
    const existingQuote = faultReport.quotes.find(
      quote => quote.mechanicId.toString() === mechanicId
    );

    if (existingQuote) {
      return res.status(400).json({
        success: false,
        message: 'Bu arıza için zaten teklif verdiniz'
      });
    }

    // Teklif ekle - gerçek bilgileri sakla
    const mechanicName = mechanic ? `${mechanic.name} ${mechanic.surname}` : `${userMechanic?.name} ${userMechanic?.surname}`;
    const mechanicPhone = mechanic ? mechanic.phone : userMechanic?.phone || '';
    
    faultReport.quotes.push({
      mechanicId: mechanicId as any,
      mechanicName: mechanicName || 'Bilinmeyen Usta', // Gerçek isim bilgisini sakla
      mechanicPhone: mechanicPhone || '', // Gerçek telefon bilgisini sakla
      quoteAmount,
      estimatedDuration,
      notes: notes || '',
      status: 'pending',
      createdAt: new Date()
    });

    faultReport.status = 'quoted';
    await faultReport.save();

    // Kullanıcıya bildirim gönder
    const notification = {
      type: 'quote_received',
      title: 'Yeni Fiyat Teklifi',
      message: `${mechanicName} arızanız için ${quoteAmount} TL teklif verdi`,
      data: {
        faultReportId: faultReport._id,
        mechanicName,
        quoteAmount,
        estimatedDuration
      }
    };

    sendNotificationToUser(faultReport.userId.toString(), notification);

    res.json({
      success: true,
      message: 'Fiyat teklifi başarıyla gönderildi',
      data: {
        quoteId: faultReport.quotes[faultReport.quotes.length - 1].mechanicId,
        quoteAmount,
        estimatedDuration
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fiyat teklifi gönderilirken bir hata oluştu'
    });
  }
};

// Teklif seç ve randevu oluştur
export const selectQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // URL'den faultReportId al
    const { quoteIndex } = req.body;
    const userId = req.user?.userId;

    console.log(`🔍 selectQuote başlatıldı:`, {
      faultReportId: id,
      quoteIndex,
      userId
    });

    // Input validation
    if (quoteIndex === undefined || quoteIndex === null) {
      console.log('❌ quoteIndex eksik');
      return res.status(400).json({
        success: false,
        message: 'Teklif indeksi gerekli'
      });
    }

    if (typeof quoteIndex !== 'number' || quoteIndex < 0 || !Number.isInteger(quoteIndex)) {
      console.log('❌ Geçersiz quoteIndex:', quoteIndex);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz teklif indeksi'
      });
    }

    // Arıza bildirimini bul
    const faultReport = await FaultReport.findOne({ _id: id, userId })
      .populate('userId', 'name surname phone')
      .populate('vehicleId', 'brand modelName plateNumber');
    
    if (!faultReport) {
      console.log('❌ Arıza bildirimi bulunamadı:', id);
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    console.log(`📋 Arıza bildirimi bulundu:`, {
      id: faultReport._id,
      status: faultReport.status,
      quotesCount: faultReport.quotes?.length || 0
    });

    // Durum kontrolü
    if (faultReport.status === 'accepted') {
      console.log('❌ Arıza zaten kabul edilmiş');
      return res.status(400).json({
        success: false,
        message: 'Bu arıza için zaten bir teklif seçilmiş'
      });
    }

    if (faultReport.status === 'completed') {
      console.log('❌ Arıza tamamlanmış');
      return res.status(400).json({
        success: false,
        message: 'Bu arıza işlemi tamamlanmış'
      });
    }

    // Teklif kontrolü
    if (!faultReport.quotes || faultReport.quotes.length === 0) {
      console.log('❌ Hiç teklif yok');
      return res.status(400).json({
        success: false,
        message: 'Bu arıza için hiç teklif bulunmuyor'
      });
    }

    // Array bounds kontrolü
    if (quoteIndex >= faultReport.quotes.length) {
      console.log('❌ Geçersiz quoteIndex:', quoteIndex, 'quotes length:', faultReport.quotes.length);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz teklif indeksi'
      });
    }

    const selectedQuote = faultReport.quotes[quoteIndex];
    
    // Teklif durumu kontrolü
    if (selectedQuote.status !== 'pending') {
      console.log('❌ Teklif zaten işleme alınmış:', selectedQuote.status);
      return res.status(400).json({
        success: false,
        message: 'Bu teklif zaten işleme alınmış'
      });
    }

    console.log(`✅ Seçilen teklif:`, {
      mechanicId: selectedQuote.mechanicId,
      mechanicName: selectedQuote.mechanicName,
      quoteAmount: selectedQuote.quoteAmount,
      status: selectedQuote.status
    });

    // mechanicId'yi ObjectId olarak dönüştür
    const mechanicObjectId = new mongoose.Types.ObjectId(selectedQuote.mechanicId);

    // Seçilen teklifi işaretle
    faultReport.selectedQuote = {
      mechanicId: mechanicObjectId,
      quoteAmount: selectedQuote.quoteAmount,
      selectedAt: new Date()
    };

    faultReport.status = 'accepted';
    selectedQuote.status = 'accepted';

    // Diğer teklifleri reddet
    faultReport.quotes.forEach((quote, index) => {
      if (index !== quoteIndex) {
        quote.status = 'rejected';
      } else {
        // Seçilen teklifi accepted olarak işaretle
        quote.status = 'accepted';
      }
    });

    await faultReport.save();
    console.log('✅ FaultReport güncellendi');
    
    // Mechanic bilgisini manuel olarak çek
    const mechanic = await User.findById(selectedQuote.mechanicId).select('name surname phone');
    console.log('✅ Mechanic bilgisi:', mechanic);

    // Randevu oluştur
    const appointment = new Appointment({
      userId: new mongoose.Types.ObjectId(userId),
      mechanicId: new mongoose.Types.ObjectId(selectedQuote.mechanicId),
      serviceType: faultReport.serviceCategory,
      appointmentDate: new Date(), // Varsayılan tarih, frontend'de güncellenecek
      timeSlot: '10:00', // Varsayılan saat, frontend'de güncellenecek
      description: faultReport.faultDescription,
      vehicleId: new mongoose.Types.ObjectId(faultReport.vehicleId),
      faultReportId: new mongoose.Types.ObjectId(faultReport._id as string),
      price: selectedQuote.quoteAmount, // Arıza bildirimindeki fiyatı kopyala
      quotedPrice: selectedQuote.quoteAmount, // quotedPrice'ı da set et
      status: 'TALEP_EDILDI',
      paymentStatus: 'pending',
      shareContactInfo: false,
      isShopAppointment: false,
      notificationSettings: {
        oneDayBefore: false,
        oneHourBefore: true,
        twoHoursBefore: false
      },
      createdAt: new Date()
    });

    await appointment.save();
    console.log('✅ Appointment oluşturuldu:', appointment._id);

    // Socket.io ile real-time bildirim gönder
    try {
      const io = req.app.get('io');
      if (io) {
        // Ustaya bildirim gönder
        io.to(selectedQuote.mechanicId.toString()).emit('quote_selected', {
          faultReportId: faultReport._id,
          appointmentId: appointment._id,
          message: 'Teklifiniz kabul edildi!'
        });
        
        // Kullanıcıya bildirim gönder
        io.to(userId).emit('quote_selection_success', {
          faultReportId: faultReport._id,
          appointmentId: appointment._id,
          mechanicName: selectedQuote.mechanicName,
          quoteAmount: selectedQuote.quoteAmount
        });
      }
    } catch (socketError) {
      console.log('⚠️ Socket bildirimi gönderilemedi:', socketError);
    }

    res.json({
      success: true,
      message: 'Teklif seçildi ve randevu oluşturuldu',
      data: {
        appointment: {
          _id: appointment._id,
          price: appointment.price,
          status: appointment.status
        },
        selectedQuote: {
          mechanicId: mechanicObjectId,
          mechanicName: selectedQuote.mechanicName,
          quoteAmount: selectedQuote.quoteAmount,
          estimatedDuration: selectedQuote.estimatedDuration,
          mechanic: mechanic // Mechanic bilgisini ekle
        }
      }
    });

  } catch (error: any) {
    console.error('❌ selectQuote error:', error);
    res.status(500).json({
      success: false,
      message: 'Teklif seçilirken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Ustaların arıza bildirimlerini getir
export const getMechanicFaultReports = async (req: Request, res: Response) => {
  try {
    const mechanicId = req.user?.userId;
    const { status, page = 1, limit = 10 } = req.query;

    // Önce ustanın bilgilerini al - User ID ile
    const user = await User.findById(mechanicId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // User'ın email'i ile Mechanic tablosunda ara
    let mechanic = await Mechanic.findOne({ email: user.email });
    
    // Eğer Mechanic tablosunda yoksa, User'dan mekanik profili oluştur
    if (!mechanic) {
      // User'dan mekanik profili oluştur
      const mechanicProfile = {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        serviceCategories: user.serviceCategories || ['repair'],
        experience: user.experience || 0,
        rating: user.rating || 0,
        ratingCount: user.ratingCount || 0,
        totalServices: user.totalServices || 0,
        isAvailable: user.isAvailable !== undefined ? user.isAvailable : true,
        location: user.location || {},
        workingHours: user.workingHours || '',
        shopName: user.shopName || '',
        bio: user.bio || '',
        avatar: user.avatar,
        cover: user.cover,
        vehicleBrands: user.carBrands || [],
        engineTypes: user.engineTypes || [],
        transmissionTypes: user.transmissionTypes || [],
        customBrands: user.customBrands || [],
        supportedBrands: user.carBrands || ['Genel'],
        createdAt: user.createdAt
      };
      
      mechanic = mechanicProfile as any;
      
    }

    // Ustanın hizmet kategorileri ve desteklediği markalar
    // Eğer mechanic objesi oluşturulduysa, user.serviceCategories'i kullan
    const mechanicServiceCategories = mechanic?.serviceCategories || user.serviceCategories || ['repair'];
    const mechanicSupportedBrands = mechanic?.supportedBrands || [];

    // Ustanın ServiceCategory'lerine göre hangi fault kategorilerini göreceğini belirle
    // FAULT_CATEGORY_TO_SERVICE_CATEGORY mapping'i kullan
    const allowedFaultCategories: string[] = [];
    
    Object.entries(FAULT_CATEGORY_TO_SERVICE_CATEGORY).forEach(([faultCat, serviceCat]) => {
      if (mechanicServiceCategories.includes(serviceCat)) {
        allowedFaultCategories.push(faultCat);
      }
    });

    // Temel sorgu - ustanın hizmet kategorisine uygun arıza bildirimleri
    const query: any = {
      serviceCategory: { $in: allowedFaultCategories },
      // Ustanın "müsait değilim" dediği arıza bildirimlerini hariç tut
      'mechanicResponses': {
        $not: {
          $elemMatch: {
            mechanicId: mechanicId,
            responseType: 'not_available'
          }
        }
      },
      // Accepted durumundaki arıza bildirimleri sadece seçili usta tarafından görülmeli
      $or: [
        { status: { $ne: 'accepted' } },
        { 'selectedQuote.mechanicId': mechanicId }
      ]
    };

    // Status filtreleme
    if (status) {
      if (status === 'pending') {
        // Pending: Bekleyen arıza bildirimleri
        query.status = 'pending';
      } else if (status === 'quoted') {
        // Quoted: Ustanın teklif verdiği arıza bildirimleri
        query.$and = [
          { status: 'quoted' },
          { 'quotes.mechanicId': mechanicId }
        ];
      } else if (status === 'accepted') {
        // Accepted: Ustanın teklifi kabul edilen arıza bildirimleri
        query.$and = [
          { status: 'accepted' },
          { 'selectedQuote.mechanicId': mechanicId }
        ];
      } else {
        query.status = status;
      }
    }

    // Arıza bildirimlerini getir
    const faultReports = await FaultReport.find(query)
      .populate('userId', 'name surname phone')
      .populate('vehicleId', 'brand modelName plateNumber year')
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await FaultReport.countDocuments(query);

    res.json({
      success: true,
      data: faultReports,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Arıza bildirimleri getirilirken bir hata oluştu'
    });
  }
};

// Arıza bildirimi için randevu oluştur (mechanicId null olsa bile)
export const createAppointmentFromFaultReport = async (req: Request, res: Response) => {
  try {
    console.log('🔍 createAppointmentFromFaultReport çağrıldı');
    console.log('🔍 Request params:', req.params);
    console.log('🔍 Request body:', req.body);
    
    const { faultReportId, appointmentDate, timeSlot } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bilgisi bulunamadı'
      });
    }

    if (!faultReportId) {
      return res.status(400).json({
        success: false,
        message: 'Arıza bildirimi ID\'si gereklidir'
      });
    }

    if (!appointmentDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Tarih ve saat bilgisi gereklidir'
      });
    }

    // FaultReport'u bul
    const faultReport = await FaultReport.findById(faultReportId)
      .populate('userId', 'name surname phone')
      .populate('vehicleId', 'brand modelName plateNumber year');

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Aynı faultReportId ile zaten randevu var mı kontrol et
    const existingAppointment = await Appointment.findOne({
      faultReportId: faultReportId,
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Bu arıza bildirimi için zaten randevu oluşturulmuş'
      });
    }

    // selectedQuote'dan mechanicId'yi al, null ise quotes array'inden bul
    let mechanicId = faultReport.selectedQuote?.mechanicId;
    
    if (!mechanicId) {
      // Aynı fiyata sahip accepted quote'u bul
      const matchingQuote = faultReport.quotes.find(quote => 
        quote.status === 'accepted' && 
        quote.quoteAmount === faultReport.selectedQuote?.quoteAmount
      );
      
      if (matchingQuote) {
        mechanicId = matchingQuote.mechanicId;
      }
    }

    // Eğer hala mechanicId yoksa, quotes array'indeki herhangi bir quote'u kullan
    if (!mechanicId && faultReport.quotes.length > 0) {
      const anyQuote = faultReport.quotes.find(quote => 
        quote.quoteAmount === faultReport.selectedQuote?.quoteAmount
      );
      if (anyQuote) {
        mechanicId = anyQuote.mechanicId;
      }
    }

    // Eğer hala mechanicId yoksa, geçici bir ID oluştur
    if (!mechanicId) {
      mechanicId = new mongoose.Types.ObjectId();
    }

    // ServiceCategory'yi ServiceType'a çevir
    console.log('🔍 faultReport.serviceCategory:', faultReport.serviceCategory);
    const serviceCategory = getFaultReportServiceCategory(faultReport.serviceCategory);
    console.log('🔍 serviceCategory:', serviceCategory);
    const serviceType = getServiceTypeFromServiceCategory(serviceCategory);
    console.log('🔍 serviceType:', serviceType);

    // Randevu oluştur
    console.log('🔍 Appointment oluşturuluyor...');
    const appointment = new Appointment({
      userId: new mongoose.Types.ObjectId(userId),
      mechanicId: new mongoose.Types.ObjectId(mechanicId),
      serviceType: serviceType,
      appointmentDate: new Date(appointmentDate),
      timeSlot: timeSlot,
      description: faultReport.faultDescription,
      vehicleId: new mongoose.Types.ObjectId(faultReport.vehicleId),
      faultReportId: new mongoose.Types.ObjectId(faultReportId),
      price: faultReport.selectedQuote?.quoteAmount || 0,
      quotedPrice: faultReport.selectedQuote?.quoteAmount || 0,
      finalPrice: faultReport.selectedQuote?.quoteAmount || 0,
      priceSource: 'fault_report_quoted',
      status: 'TALEP_EDILDI',
      paymentStatus: 'PENDING',
      shareContactInfo: false,
      isShopAppointment: false,
      notificationSettings: {
        oneDayBefore: false,
        oneHourBefore: true,
        twoHoursBefore: false
      },
      createdAt: new Date()
    });

    console.log('🔍 Appointment kaydediliyor...');
    await appointment.save();
    console.log('✅ Appointment kaydedildi:', appointment._id);

    // FaultReport'u güncelle
    console.log('🔍 FaultReport güncelleniyor...');
    faultReport.appointmentId = new mongoose.Types.ObjectId(appointment._id as string);
    await faultReport.save();
    console.log('✅ FaultReport güncellendi');

    res.json({
      success: true,
      message: 'Randevu başarıyla oluşturuldu',
      data: {
        appointment: {
          _id: appointment._id,
          price: appointment.price,
          status: appointment.status
        }
      }
    });

  } catch (error: any) {
    console.error('❌ createAppointmentFromFaultReport error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    if (error.name === 'ValidationError') {
      console.error('❌ Validation errors:', error.errors);
    }
    res.status(500).json({
      success: false,
      message: 'Randevu oluşturulurken bir hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
async function findNearbyMechanics(
  coordinates: [number, number] | undefined,
  serviceCategory: string,
  vehicleBrand: string,
  userCity?: string
) {
  try {
    // Fault category'yi ServiceCategory enum'una çevir
    const normalizedServiceCategory = getFaultReportServiceCategory(serviceCategory);
    
    // O kategorinin tüm query değerlerini al (enum değeri + Türkçe alternatifleri)
    const matchingCategories = getCategoryQueryValues(normalizedServiceCategory);

    console.log(`[FIND MECHANICS] Usta arama başladı:`, {
      serviceCategory,
      normalizedServiceCategory,
      matchingCategories,
      vehicleBrand
    });

    // Önce Mechanic modelinde ara
    let mechanics = await Mechanic.find({
      isAvailable: true,
      serviceCategories: { $in: matchingCategories },
      $or: [
        { supportedBrands: { $in: [vehicleBrand] } },
        { supportedBrands: { $in: ['Genel', 'Tüm Markalar', 'Tümü'] } },
        { vehicleBrands: { $in: [vehicleBrand] } },
        { vehicleBrands: { $in: ['Genel', 'Tüm Markalar', 'Tümü'] } }
      ]
    }).lean();

    console.log(`[FIND MECHANICS] Mechanic modelinde ${mechanics.length} usta bulundu`);

    // User modelinde de ara (rektefe-us uygulamasından gelen ustalar)
    const userMechanics = await User.find({
      userType: 'mechanic',
      isAvailable: true,
      serviceCategories: { $in: matchingCategories },
      $or: [
        { supportedBrands: { $in: [vehicleBrand] } },
        { supportedBrands: { $in: ['Genel', 'Tüm Markalar', 'Tümü'] } },
        { vehicleBrands: { $in: [vehicleBrand] } },
        { vehicleBrands: { $in: ['Genel', 'Tüm Markalar', 'Tümü'] } }
      ]
    }).lean();

    console.log(`[FIND MECHANICS] User modelinde ${userMechanics.length} usta bulundu`);

    // User verilerini Mechanic formatına çevir
    const formattedUserMechanics = userMechanics.map(user => ({
      _id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      phone: user.phone || '',
      // location kaldırıldı
      serviceCategories: user.serviceCategories || ['Genel Bakım'],
      supportedBrands: (user as any).supportedBrands || user.vehicleBrands || ['Genel'],
      isAvailable: user.isAvailable || true
    }));

    // Tüm ustaları birleştir
    const allMechanics = [...mechanics, ...formattedUserMechanics];

    console.log(`[FIND MECHANICS] Toplam ${allMechanics.length} usta bulundu (en fazla 20 dönecek)`);

    // Konum sıralaması kaldırıldı - sadece hizmet kategorisine göre döndür
    return allMechanics.slice(0, 20); // En fazla 20 usta

  } catch (error) {
    console.error(`[FIND MECHANICS] Usta arama hatası:`, error);
    return [];
  }
}

// Mesafe hesaplama fonksiyonu kaldırıldı - artık kullanılmıyor

// Ödeme oluşturma
export const createPayment = async (req: Request, res: Response) => {
  try {
    const { faultReportId } = req.params;
    const { paymentMethod = 'credit_card' } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    // Arıza bildirimini bul
    const faultReport = await FaultReport.findById(faultReportId)
      .populate('userId', 'name surname email')
      .populate('selectedQuote.mechanicId', 'name surname email phone');

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Sadece arıza bildirimi sahibi ödeme yapabilir
    if (faultReport.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu arıza bildirimi için ödeme yapma yetkiniz yok'
      });
    }

    // Sadece accepted durumundaki arıza bildirimleri için ödeme yapılabilir
    if (faultReport.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Bu arıza bildirimi için ödeme yapılamaz'
      });
    }

    // Seçili teklif yoksa hata
    if (!faultReport.selectedQuote) {
      return res.status(400).json({
        success: false,
        message: 'Seçili teklif bulunamadı'
      });
    }

    // Ödeme zaten yapılmışsa hata
    if (faultReport.payment && faultReport.payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Bu arıza bildirimi için ödeme zaten yapılmış'
      });
    }

    // Ödeme bilgilerini güncelle
    faultReport.payment = {
      amount: faultReport.selectedQuote.quoteAmount,
      status: 'pending',
      paymentMethod,
      paymentDate: new Date()
    };

    // Durumu payment_pending yap
    faultReport.status = 'payment_pending';

    await faultReport.save();

    // Ustaya bildirim gönder
    const notification = {
      type: 'payment_pending',
      title: 'Ödeme Bekleniyor',
      message: `${(faultReport.userId as any).name} ${(faultReport.userId as any).surname} ödeme yapmaya hazırlanıyor`,
      data: {
        faultReportId: faultReport._id,
        amount: faultReport.selectedQuote?.quoteAmount || 0,
        customerName: `${(faultReport.userId as any).name} ${(faultReport.userId as any).surname}`
      }
    };

    sendNotificationToUser(faultReport.selectedQuote?.mechanicId._id.toString() || '', notification);

    res.json({
      success: true,
      message: 'Ödeme oluşturuldu',
      data: {
        faultReportId: faultReport._id,
        amount: faultReport.selectedQuote?.quoteAmount || 0,
        paymentMethod,
        status: 'payment_pending'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ödeme oluşturulurken bir hata oluştu'
    });
  }
};

// Ödeme onaylama (yeni sistem - appointment üzerinden)
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Route'da :id olarak tanımlanmış
    const faultReportId = id;
    const { transactionId } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulanamadı'
      });
    }

    // Arıza bildirimini bul
    const faultReport = await FaultReport.findById(faultReportId)
      .populate('userId', 'name surname email')
      .populate('appointmentId')
      .populate('selectedQuote.mechanicId', 'name surname email phone');

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Sadece arıza bildirimi sahibi ödeme onaylayabilir
    if (faultReport.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu arıza bildirimi için ödeme onaylama yetkiniz yok'
      });
    }

    // Sadece payment_pending durumundaki arıza bildirimleri için ödeme onaylanabilir
    if (faultReport.status !== 'payment_pending') {
      return res.status(400).json({
        success: false,
        message: 'Bu arıza bildirimi için ödeme onaylanamaz'
      });
    }

    // Appointment varsa, appointment üzerinden ödeme yap
    if (faultReport.appointmentId) {
      const AppointmentController = require('./appointment.controller').AppointmentController;
      
      // Appointment ID ile ödeme onaylama endpoint'ini çağır
      const appointmentId = (faultReport.appointmentId as any)._id || faultReport.appointmentId;
      
      // Request objesini yeniden oluştur
      req.params = { appointmentId: appointmentId.toString() };
      req.body = { 
        transactionId, 
        amount: faultReport.payment?.amount || (faultReport.appointmentId as any).finalPrice || 0 
      };
      
      // AppointmentController.confirmPayment'ı çağır
      return await AppointmentController.confirmPayment(req, res);
    }

    // Eski sistem (appointment yoksa)
    // Ödeme bilgilerini güncelle
    if (faultReport.payment) {
      faultReport.payment.status = 'completed';
      faultReport.payment.transactionId = transactionId;
      faultReport.payment.paymentDate = new Date();
    }

    // Durumu paid yap
    faultReport.status = 'paid';

    await faultReport.save();

    // TefePuan kazandır
    try {
      const tefePointResult = await TefePointService.processPaymentTefePoints({
        userId: faultReport.userId._id.toString(),
        amount: faultReport.selectedQuote?.quoteAmount || 0,
        paymentType: 'fault_report',
        serviceCategory: 'maintenance', // Arıza bildirimi için genel bakım kategorisi
        description: `Arıza bildirimi ödemesi - ${(faultReport.selectedQuote?.mechanicId as any).name}`,
        serviceId: (faultReport._id as any).toString()
      });

      if (tefePointResult.success && tefePointResult.earnedPoints) {
        }
    } catch (tefeError) {
      // TefePuan hatası ödeme işlemini durdurmaz
    }

    // Ustaya bildirim gönder
    const notification = {
      type: 'payment_completed',
      title: 'Ödeme Tamamlandı',
      message: `${(faultReport.userId as any).name} ${(faultReport.userId as any).surname} ödemeyi tamamladı. İşe başlayabilirsiniz.`,
      data: {
        faultReportId: faultReport._id,
        amount: faultReport.selectedQuote?.quoteAmount || 0,
        customerName: `${(faultReport.userId as any).name} ${(faultReport.userId as any).surname}`,
        transactionId
      }
    };

    sendNotificationToUser(faultReport.selectedQuote?.mechanicId._id.toString() || '', notification);

    res.json({
      success: true,
      message: 'Ödeme başarıyla tamamlandı',
      data: {
        faultReportId: faultReport._id,
        amount: faultReport.selectedQuote?.quoteAmount || 0,
        status: 'paid',
        transactionId
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ödeme onaylanırken bir hata oluştu'
    });
  }
};

// Usta işi finalize etme
export const finalizeWork = async (req: Request, res: Response) => {
  try {
    const { faultReportId } = req.params;
    const { notes } = req.body;
    const mechanicId = (req as any).user?.userId;

    if (!mechanicId) {
      return res.status(401).json({
        success: false,
        message: 'Usta doğrulanamadı'
      });
    }

    // Arıza bildirimini bul
    const faultReport = await FaultReport.findById(faultReportId)
      .populate('userId', 'name surname email')
      .populate('selectedQuote.mechanicId', 'name surname email phone');

    if (!faultReport) {
      return res.status(404).json({
        success: false,
        message: 'Arıza bildirimi bulunamadı'
      });
    }

    // Sadece seçili usta finalize edebilir
    if (faultReport.selectedQuote?.mechanicId._id.toString() !== mechanicId) {
      return res.status(403).json({
        success: false,
        message: 'Bu arıza bildirimi için işi bitirme yetkiniz yok'
      });
    }

    // Sadece paid durumundaki arıza bildirimleri finalize edilebilir
    if (faultReport.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Bu arıza bildirimi için iş bitirilemez'
      });
    }

    // Durumu completed yap
    faultReport.status = 'completed';

    // Usta notları ekle (eğer varsa)
    if (notes) {
      faultReport.faultDescription += `\n\nUsta Notları: ${notes}`;
    }

    await faultReport.save();

    // Müşteriye bildirim gönder
    const notification = {
      type: 'work_completed',
      title: 'İş Tamamlandı',
      message: `${(faultReport.selectedQuote?.mechanicId as any).name} ${(faultReport.selectedQuote?.mechanicId as any).surname} Usta işinizi tamamladı`,
      data: {
        faultReportId: faultReport._id,
        mechanicName: `${(faultReport.selectedQuote?.mechanicId as any).name} ${(faultReport.selectedQuote?.mechanicId as any).surname}`,
        amount: faultReport.selectedQuote?.quoteAmount
      }
    };

    sendNotificationToUser(faultReport.userId._id.toString(), notification);

    res.json({
      success: true,
      message: 'İş başarıyla tamamlandı',
      data: {
        faultReportId: faultReport._id,
        status: 'completed',
        completedAt: new Date()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İş finalize edilirken bir hata oluştu'
    });
  }
};
