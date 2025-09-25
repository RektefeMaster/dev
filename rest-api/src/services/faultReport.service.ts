/**
 * Fault Report Service - Business logic for fault report operations
 * Refactored from large controller to improve maintainability and testability
 */

import mongoose from 'mongoose';
import { FaultReport } from '../models/FaultReport';
import { Vehicle } from '../models/Vehicle';
import { Mechanic } from '../models/Mechanic';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import { ErrorHandler, ErrorCodes } from '../utils/errorHandler';
import { 
  FaultReportStatus, 
  Priority, 
  FaultQuote, 
  MechanicResponse,
  LocationDetails,
  NotificationData,
  ServiceType
} from '../types/common';

// ===== INTERFACES =====

export interface CreateFaultReportInput {
  userId: string;
  vehicleId: string;
  serviceCategory: string;
  mainServiceCategory?: string;
  faultDescription: string;
  photos?: string[];
  videos?: string[];
  priority?: Priority;
  location?: LocationDetails;
}

export interface FaultReportFilter {
  userId?: string;
  status?: FaultReportStatus;
  serviceCategory?: string;
  priority?: Priority;
  city?: string;
  page?: number;
  limit?: number;
}

export interface QuoteInput {
  faultReportId: string;
  mechanicId: string;
  quoteAmount: number;
  estimatedDuration: string;
  notes: string;
}

// ===== CATEGORY MAPPING CONSTANTS =====

const CATEGORY_NAME_MAPPING: { [key: string]: string } = {
  'genel-bakim': 'Genel Bakım',
  'agir-bakim': 'Ağır Bakım',
  'alt-takim': 'Alt Takım',
  'ust-takim': 'Üst Takım',
  'kaporta-boya': 'Kaporta/Boya',
  'elektrik-elektronik': 'Elektrik-Elektronik',
  'yedek-parca': 'Yedek Parça',
  'egzoz-emisyon': 'Egzoz & Emisyon',
  'ekspertiz': 'Ekspertiz',
  'sigorta-kasko': 'Sigorta & Kasko',
  'arac-yikama': 'Araç Yıkama',
  'lastik': 'Lastik',
  'wash': 'Araç Yıkama',
  'towing': 'Çekici',
  'repair': 'Genel Bakım',
  'tire': 'Lastik'
};

// ===== FAULT REPORT SERVICE CLASS =====

export interface MechanicResponseInput {
  faultReportId: string;
  mechanicId: string;
  responseType: 'quote' | 'not_available' | 'check_tomorrow' | 'contact_me';
  message?: string;
}

// ===== CONSTANTS =====

/**
 * Category to service type mapping
 */
// 4 ana hizmet türü - tüm hizmetler bu 4 kategoriye bölünür
export const CATEGORY_SERVICE_MAPPING: Record<string, string[]> = {
  // Tamir ve Bakım - tüm mekanik hizmetler
  'Tamir ve Bakım': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Genel Bakım': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Ağır Bakım': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Alt Takım': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Üst Takım': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Kaporta/Boya': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Elektrik-Elektronik': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Yedek Parça': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  'Egzoz & Emisyon': ['Tamir ve Bakım', 'repair', 'Tamir & Bakım'],
  
  // Araç Yıkama
  'Araç Yıkama': ['Araç Yıkama', 'wash'],
  
  // Lastik
  'Lastik': ['Lastik', 'tire', 'Lastik & Parça'],
  
  // Çekici
  'Çekici': ['Çekici', 'towing', 'Çekici Hizmeti']
};

// Alias for backward compatibility
const CATEGORY_MAPPING = CATEGORY_SERVICE_MAPPING;

// ===== SERVICE CLASS =====

export class FaultReportService {
  
  /**
   * Create a new fault report
   */
  static async createFaultReport(data: CreateFaultReportInput) {
    try {
      // Normalize service category
      const normalizedServiceCategory = CATEGORY_NAME_MAPPING[data.serviceCategory] || data.serviceCategory;

      // Verify vehicle ownership
      const vehicle = await Vehicle.findOne({ 
        _id: data.vehicleId, 
        userId: data.userId 
      });

      if (!vehicle) {
        throw new Error('Vehicle not found or not owned by user');
      }

      // Create fault report
      const faultReport = new FaultReport({
        userId: data.userId,
        vehicleId: data.vehicleId,
        serviceCategory: normalizedServiceCategory,
        faultDescription: data.faultDescription,
        photos: data.photos || [],
        videos: data.videos || [],
        priority: data.priority || 'medium',
        location: data.location,
        status: 'pending'
      });

      const savedReport = await faultReport.save();

      // Find and notify nearby mechanics
      await this.notifyNearbyMechanics(savedReport);

      return savedReport;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get fault reports with filtering and pagination
   */
  static async getFaultReports(filters: FaultReportFilter) {
    try {
      const {
        userId,
        status,
        serviceCategory,
        priority,
        city,
        page = 1,
        limit = 10
      } = filters;

      // Build query
      const query: any = {};
      if (userId) query.userId = userId;
      if (status) query.status = status;
      if (serviceCategory) query.serviceCategory = serviceCategory;
      if (priority) query.priority = priority;
      if (city) query['location.city'] = city;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [reports, total] = await Promise.all([
        FaultReport.find(query)
          .populate('userId', 'name surname phone')
          .populate('vehicleId', 'brand modelName year plateNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        FaultReport.countDocuments(query)
      ]);

      return {
        reports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get fault report by ID
   */
  static async getFaultReportById(id: string, userId?: string) {
    try {
      const query: any = { _id: id };
      if (userId) query.userId = userId;

      const report = await FaultReport.findOne(query)
        .populate('userId', 'name surname phone email')
        .populate('vehicleId', 'brand modelName year plateNumber fuelType')
        .populate('quotes.mechanicId', 'name surname phone shopName location rating')
        .populate('mechanicResponses.mechanicId', 'name surname phone shopName')
        .populate('selectedQuote.mechanicId', 'name surname phone shopName location')
        .lean();

      if (!report) {
        throw new Error('Fault report not found');
      }

      return report;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Add mechanic quote to fault report
   */
  static async addMechanicQuote(data: QuoteInput) {
    try {
      const { faultReportId, mechanicId, quoteAmount, estimatedDuration, notes } = data;

      // Verify fault report exists and is in correct status
      const faultReport = await FaultReport.findById(faultReportId);
      if (!faultReport) {
        throw new Error('Fault report not found');
      }

      if (faultReport.status !== 'pending') {
        throw new Error('Cannot add quote to non-pending fault report');
      }

      // Verify mechanic exists
      const mechanic = await User.findById(mechanicId);
      if (!mechanic || mechanic.userType !== 'mechanic') {
        throw new Error('Mechanic not found');
      }

      // Check if mechanic already quoted
      const existingQuote = faultReport.quotes.find(
        q => q.mechanicId.toString() === mechanicId
      );

      if (existingQuote) {
        throw new Error('Mechanic has already provided a quote');
      }

      // Add quote
      const newQuote: FaultQuote = {
        mechanicId: new mongoose.Types.ObjectId(mechanicId) as any,
        mechanicName: `${mechanic.name} ${mechanic.surname}`,
        mechanicPhone: mechanic.phone || '',
        quoteAmount: Number(quoteAmount),
        estimatedDuration: Number(estimatedDuration),
        notes,
        status: 'pending',
        createdAt: new Date()
      };

      faultReport.quotes.push(newQuote as any);
      faultReport.status = 'quoted';

      const updatedReport = await faultReport.save();

      // Notify user about new quote
      await this.notifyUserAboutQuote(faultReport, newQuote);

      return updatedReport;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Add mechanic response (non-quote)
   */
  static async addMechanicResponse(data: MechanicResponseInput) {
    try {
      const { faultReportId, mechanicId, responseType, message } = data;

      const faultReport = await FaultReport.findById(faultReportId);
      if (!faultReport) {
        throw new Error('Fault report not found');
      }

      const mechanic = await User.findById(mechanicId);
      if (!mechanic) {
        throw new Error('Mechanic not found');
      }

      // Add response
      const response: MechanicResponse = {
        mechanicId: new mongoose.Types.ObjectId(mechanicId) as any,
        responseType,
        message: message || '',
        createdAt: new Date()
      };

      faultReport.mechanicResponses.push(response as any);
      await faultReport.save();

      // Notify user about response
      await this.notifyUserAboutResponse(faultReport, response);

      return faultReport;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Select a quote from available quotes
   */
  static async selectQuote(faultReportId: string, mechanicId: string, userId: string) {
    try {
      const faultReport = await FaultReport.findById(faultReportId);
      if (!faultReport) {
        throw new Error('Fault report not found');
      }

      if (faultReport.userId.toString() !== userId) {
        throw new Error('Unauthorized to select quote');
      }

      const selectedQuote = faultReport.quotes.find(
        q => q.mechanicId.toString() === mechanicId && q.status === 'pending'
      );

      if (!selectedQuote) {
        throw new Error('Quote not found or already processed');
      }

      // Update quote status
      selectedQuote.status = 'accepted';
      faultReport.selectedQuote = {
        mechanicId: selectedQuote.mechanicId,
        quoteAmount: selectedQuote.quoteAmount,
        selectedAt: new Date()
      };
      faultReport.status = 'accepted';

      // Reject other quotes
      faultReport.quotes.forEach(quote => {
        if (quote.mechanicId.toString() !== mechanicId) {
          quote.status = 'rejected';
        }
      });

      await faultReport.save();

      // Create appointment
      const appointment = await this.createAppointmentFromQuote(faultReport, selectedQuote);

      // Notify mechanic about selection
      await this.notifyMechanicAboutSelection(faultReport, selectedQuote);

      return { faultReport, appointment };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Find nearby mechanics for fault report
   */
  private static async findNearbyMechanics(faultReport: any): Promise<any[]> {
    try {
      const serviceTypes = CATEGORY_SERVICE_MAPPING[faultReport.serviceCategory] || [];
      
      let query: any = {
        userType: 'mechanic',
        isAvailable: true
      };

      // Add service category filter
      if (serviceTypes.length > 0) {
        query.$or = serviceTypes.map(serviceType => ({
          serviceCategories: { $regex: new RegExp(serviceType, 'i') }
        }));
      }

      // Add location filter if available
      if (faultReport.location?.coordinates) {
        query['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [
                faultReport.location.coordinates.longitude,
                faultReport.location.coordinates.latitude
              ]
            },
            $maxDistance: 50000 // 50km radius
          }
        };
      }

      const mechanics = await User.find(query)
        .select('name surname phone pushToken location serviceCategories rating')
        .limit(20)
        .lean();

      return mechanics;

    } catch (error) {
      return [];
    }
  }

  /**
   * Notify nearby mechanics about new fault report
   */
  private static async notifyNearbyMechanics(faultReport: any) {
    try {
      const mechanics = await this.findNearbyMechanics(faultReport);
      
      // Import notification service to avoid circular dependency
      const { sendNotificationToUser } = await import('../index');
      
      for (const mechanic of mechanics) {
        const notificationData: NotificationData = {
          faultReportId: faultReport._id.toString(),
          vehicleId: faultReport.vehicleId.toString(),
          message: `Yeni arıza bildirimi: ${faultReport.serviceCategory}`
        };

        // Send real-time notification
        sendNotificationToUser(mechanic._id.toString(), {
          type: 'fault_report',
          title: '🔧 Yeni Arıza Bildirimi',
          message: `${faultReport.serviceCategory} kategorisinde yeni bir arıza bildirimi`,
          data: notificationData
        });
      }

    } catch (error) {
      // Don't throw error - notification failure shouldn't block fault report creation
    }
  }

  /**
   * Create appointment from selected quote
   */
  private static async createAppointmentFromQuote(faultReport: any, quote: any) {
    try {
      const appointment = new Appointment({
        userId: faultReport.userId,
        mechanicId: quote.mechanicId,
        serviceType: faultReport.serviceCategory,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        timeSlot: '09:00',
        status: 'PLANLANDI',
        description: faultReport.faultDescription,
        vehicleId: faultReport.vehicleId,
        quotedPrice: quote.quoteAmount,
        finalPrice: quote.quoteAmount,
        priceSource: 'fault_report_quoted',
        paymentStatus: 'pending',
        faultReportId: faultReport._id,
        location: faultReport.location,
        notificationSettings: {
          oneHourBefore: true,
          twoHoursBefore: false,
          oneDayBefore: false
        },
        shareContactInfo: true
      });

      const savedAppointment = await appointment.save();

      // Update fault report with appointment ID
      faultReport.appointmentId = savedAppointment._id;
      await faultReport.save();

      return savedAppointment;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Notify user about new quote
   */
  private static async notifyUserAboutQuote(faultReport: any, quote: FaultQuote) {
    try {
      const { sendNotificationToUser } = await import('../index');
      
      const notificationData: NotificationData = {
        faultReportId: faultReport._id.toString(),
        mechanicId: quote.mechanicId.toString(),
        quoteAmount: quote.quoteAmount
      };

      sendNotificationToUser(faultReport.userId.toString(), {
        type: 'quote_received',
        title: '💰 Yeni Teklif Aldınız',
        message: `${quote.mechanicName} - ₺${quote.quoteAmount}`,
        data: notificationData
      });

    } catch (error) {
      }
  }

  /**
   * Notify user about mechanic response
   */
  private static async notifyUserAboutResponse(faultReport: any, response: MechanicResponse) {
    try {
      const { sendNotificationToUser } = await import('../index');
      
      const notificationData: NotificationData = {
        faultReportId: faultReport._id.toString(),
        mechanicId: response.mechanicId.toString()
      };

      const mechanic = await User.findById(response.mechanicId);
      const mechanicName = mechanic ? `${mechanic.name} ${mechanic.surname}` : 'Usta';

      let title = '📨 Usta Yanıtı';
      let message = `${mechanicName} arıza bildiriminize yanıt verdi`;

      switch (response.responseType) {
        case 'not_available':
          message = `${mechanicName} şu anda müsait değil`;
          break;
        case 'check_tomorrow':
          message = `${mechanicName} yarın kontrol edecek`;
          break;
        case 'contact_me':
          message = `${mechanicName} sizinle iletişime geçmek istiyor`;
          break;
      }

      sendNotificationToUser(faultReport.userId.toString(), {
        type: 'fault_report',
        title,
        message,
        data: notificationData
      });

    } catch (error) {
      }
  }

  /**
   * Notify mechanic about quote selection
   */
  private static async notifyMechanicAboutSelection(faultReport: any, quote: any) {
    try {
      const { sendNotificationToUser } = await import('../index');
      
      const notificationData: NotificationData = {
        faultReportId: faultReport._id.toString(),
        quoteAmount: quote.quoteAmount
      };

      sendNotificationToUser(quote.mechanicId.toString(), {
        type: 'quote_received',
        title: '🎉 Teklifiniz Kabul Edildi!',
        message: `₺${quote.quoteAmount} tutarındaki teklifiniz kabul edildi`,
        data: notificationData
      });

    } catch (error) {
      }
  }
}

export default FaultReportService;