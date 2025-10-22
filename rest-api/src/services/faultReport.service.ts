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
import { ErrorHandler, ErrorCodes } from '../middleware/errorHandler';
import { 
  FaultReportStatus, 
  Priority, 
  FaultQuote, 
  MechanicResponse,
  LocationDetails,
  NotificationData,
  ServiceType
} from '../types/common';
import { 
  getFaultReportServiceCategory,
  getCategoryQueryValues,
  buildCategoryFilterQuery
} from '../utils/serviceCategoryHelper';

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
// Frontend ServiceType kod değerlerini Fault Report Türkçe kategorilerine çevirir
// Not: Fault Report model'i Türkçe kategori isimleri kullanıyor
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
 * Category mapping artık serviceCategoryHelper.ts'de merkezi olarak yönetiliyor
 * FAULT_CATEGORY_TO_SERVICE_CATEGORY ve getCategoryQueryValues() kullanın
 */

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
      const matchQuery: any = { _id: new mongoose.Types.ObjectId(id) };
      if (userId) matchQuery.userId = new mongoose.Types.ObjectId(userId);

      // 🚀 OPTIMIZE: 5 populate yerine 1 aggregate query!
      const [report] = await FaultReport.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails',
            pipeline: [{ $project: { name: 1, surname: 1, phone: 1, email: 1 } }]
          }
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicleDetails',
            pipeline: [{ $project: { brand: 1, modelName: 1, year: 1, plateNumber: 1, fuelType: 1 } }]
          }
        },
        {
          $lookup: {
            from: 'mechanics',
            localField: 'quotes.mechanicId',
            foreignField: '_id',
            as: 'quoteMechanics',
            pipeline: [{ $project: { name: 1, surname: 1, phone: 1, shopName: 1, location: 1, rating: 1 } }]
          }
        },
        {
          $addFields: {
            userId: { $arrayElemAt: ['$userDetails', 0] },
            vehicleId: { $arrayElemAt: ['$vehicleDetails', 0] }
          }
        },
        { $project: { userDetails: 0, vehicleDetails: 0 } }
      ]);

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
        _id: new mongoose.Types.ObjectId().toString(),
        faultReportId: faultReport._id.toString(),
        mechanicId: new mongoose.Types.ObjectId(mechanicId).toString(),
        mechanicName: `${mechanic.name} ${mechanic.surname}`,
        mechanicPhone: mechanic.phone || '',
        quoteAmount: Number(quoteAmount),
        price: Number(quoteAmount),
        description: notes,
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
        _id: new mongoose.Types.ObjectId().toString(),
        faultReportId: faultReport._id.toString(),
        mechanicId: new mongoose.Types.ObjectId(mechanicId).toString(),
        responseType,
        message: message || '',
        status: 'pending',
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
      // Fault category'yi ServiceCategory enum'una çevir
      const serviceCategory = getFaultReportServiceCategory(faultReport.serviceCategory);
      
      // O kategorinin tüm query değerlerini al (enum değeri + Türkçe alternatifleri)
      const categoryQueryValues = getCategoryQueryValues(serviceCategory);
      
      let query: any = {
        userType: 'mechanic',
        isAvailable: true,
        // ServiceCategory enum değerleri ile ara
        serviceCategories: { $in: categoryQueryValues }
      };

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
      
      // TODO: Implement notification service
      console.log(`Notifying ${mechanics.length} nearby mechanics about fault report ${faultReport._id}`);

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
      // TODO: Implement notification service
      console.log(`User ${faultReport.userId} received quote from ${quote.mechanicName}: ${quote.quoteAmount} TL`);
    } catch (error) {
      // Don't throw error - notification failure shouldn't block quote creation
    }
  }

  /**
   * Notify user about mechanic response
   */
  private static async notifyUserAboutResponse(faultReport: any, response: MechanicResponse) {
    try {
      // TODO: Implement notification service
      console.log(`Mechanic ${response.mechanicId} responded to fault report ${faultReport._id}: ${response.responseType}`);
    } catch (error) {
      // Don't throw error - notification failure shouldn't block response creation
    }
  }

  /**
   * Notify mechanic about quote selection
   */
  private static async notifyMechanicAboutSelection(faultReport: any, quote: any) {
    try {
      // TODO: Implement notification service
      console.log(`Quote ${quote._id} from mechanic ${quote.mechanicId} was selected for fault report ${faultReport._id}`);
    } catch (error) {
      // Don't throw error - notification failure shouldn't block quote selection
    }
  }
}

export default FaultReportService;