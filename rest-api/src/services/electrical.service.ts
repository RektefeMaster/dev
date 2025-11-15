import { ElectricalJob, IElectricalJob } from '../models/ElectricalJob';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import { Wallet } from '../models/Wallet';
import { TefePointService } from './tefePoint.service';
import { sendNotification } from '../utils/notifications';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';

export class ElectricalService {
  /**
   * Yeni elektrik-elektronik işi oluştur
   */
  static async createElectricalJob(data: {
    customerId: string;
    vehicleId: string;
    mechanicId: string;
    electricalInfo: {
      description: string;
      photos: string[];
      videos?: string[];
      systemType: 'klima' | 'far' | 'alternator' | 'batarya' | 'elektrik-araci' | 'sinyal' | 'diger';
      problemType: 'calismiyor' | 'arizali-bos' | 'ariza-gostergesi' | 'ses-yapiyor' | 'isinma-sorunu' | 'kisa-devre' | 'tetik-atmiyor' | 'diger';
      urgencyLevel: 'normal' | 'acil';
      isRecurring: boolean;
      lastWorkingCondition?: string;
      estimatedRepairTime: number;
    };
  }) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(data.customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(data.vehicleId)) {
        throw new CustomError('Geçersiz araç ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(data.mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      // Customer ve Vehicle'ın var olduğunu kontrol et
      const customer = await User.findById(data.customerId);
      if (!customer) {
        throw new CustomError('Müşteri bulunamadı', 404);
      }

      const vehicle = await Vehicle.findById(data.vehicleId);
      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }

      // Vehicle'ın müşteriye ait olduğunu kontrol et
      if (vehicle.userId?.toString() !== data.customerId) {
        throw new CustomError('Bu araç bu müşteriye ait değil', 403);
      }

      // Fotoğraf validasyonu - maksimum 20 fotoğraf
      if (data.electricalInfo.photos.length > 20) {
        throw new CustomError('Maksimum 20 fotoğraf yüklenebilir', 400);
      }

      // Video validasyonu - maksimum 5 video
      if (data.electricalInfo.videos && data.electricalInfo.videos.length > 5) {
        throw new CustomError('Maksimum 5 video yüklenebilir', 400);
      }

      // İş akışı şablonunu oluştur
      const workflowStages = this.getDefaultWorkflowStages();
      
      // Tahmini tamamlanma tarihi hesapla (saat cinsinden)
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setHours(estimatedCompletionDate.getHours() + data.electricalInfo.estimatedRepairTime);

      const electricalJob = new ElectricalJob({
        ...data,
        quote: {
          totalAmount: 0,
          breakdown: {
            partsToReplace: [],
            partsToRepair: [],
            diagnosisCost: 0,
            testingCost: 0,
            laborCost: 0,
            materialCost: 0,
            totalCost: 0
          },
          validityDays: 30,
          createdAt: new Date(),
          status: 'draft' as const
        },
        workflow: {
          currentStage: 'quote_preparation',
          stages: workflowStages.map(stage => ({
            stage: stage.stage,
            status: 'pending',
            photos: [],
            notes: ''
          })),
          estimatedCompletionDate
        },
        status: 'quote_preparation',
        payment: {
          totalAmount: 0,
          paidAmount: 0,
          paymentStatus: 'pending'
        },
        customerApprovals: [],
        qualityCheck: {
          passed: false,
          issues: [],
          photos: []
        }
      });

      await electricalJob.save();

      return {
        success: true,
        data: electricalJob,
        message: 'Elektrik-elektronik işi başarıyla oluşturuldu'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Elektrik işi oluşturulurken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Teklif hazırla
   */
  static async prepareQuote(jobId: string, mechanicId: string, quoteData: {
    partsToReplace: Array<{
      partName: string;
      partNumber?: string;
      brand: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
    partsToRepair: Array<{
      partName: string;
      laborHours: number;
      laborRate: number;
      notes?: string;
    }>;
    diagnosisCost: number;
    testingCost: number;
    validityDays?: number;
  }) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const job = await ElectricalJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Authorization check - sadece işin sahibi usta teklif hazırlayabilir
      if (!job.mechanicId || job.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu iş için teklif hazırlama yetkiniz yok', 403);
      }

      // Teklif zaten gönderilmiş mi kontrol et
      if (job.quote.status === 'sent' || job.quote.status === 'accepted') {
        throw new CustomError('Teklif zaten gönderilmiş veya kabul edilmiş', 400);
      }

      // Maliyet hesaplamaları
      const partsToReplaceTotal = quoteData.partsToReplace.reduce((sum, part) => 
        sum + (part.quantity * part.unitPrice), 0);
      
      const partsToRepairTotal = quoteData.partsToRepair.reduce((sum, part) => 
        sum + (part.laborHours * part.laborRate), 0);

      const materialCost = partsToReplaceTotal;
      const laborCost = partsToRepairTotal;
      const totalCost = laborCost + materialCost + quoteData.diagnosisCost + quoteData.testingCost;

      // Total cost validation
      if (totalCost <= 0) {
        throw new CustomError('Teklif tutarı sıfırdan büyük olmalıdır', 400);
      }

      // Teklifi güncelle
      job.quote = {
        totalAmount: totalCost,
        breakdown: {
          partsToReplace: quoteData.partsToReplace.map(part => ({
            ...part,
            totalPrice: part.quantity * part.unitPrice
          })),
          partsToRepair: quoteData.partsToRepair.map(part => ({
            ...part,
            totalPrice: part.laborHours * part.laborRate
          })),
          diagnosisCost: quoteData.diagnosisCost,
          testingCost: quoteData.testingCost,
          laborCost,
          materialCost,
          totalCost
        },
        validityDays: quoteData.validityDays || 30,
        createdAt: new Date(),
        status: 'draft'
      };

      // Payment totalAmount'u güncelle - nested field için markModified kullan
      job.payment.totalAmount = totalCost;
      job.markModified('payment');
      job.markModified('quote');
      
      // İki kez save yapmak yerine, findByIdAndUpdate ile garantile
      await job.save();
      
      // Double-check: Eğer save başarısız olursa, findByIdAndUpdate ile güncelle
      const savedJob = await ElectricalJob.findById(jobId);
      if (savedJob && savedJob.payment.totalAmount === 0 && totalCost > 0) {
        await ElectricalJob.findByIdAndUpdate(
          jobId,
          { $set: { 'payment.totalAmount': totalCost } }
        );
      }

      return {
        success: true,
        data: job,
        message: 'Teklif başarıyla hazırlandı'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Teklif hazırlanırken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Teklifi müşteriye gönder
   */
  static async sendQuote(jobId: string, mechanicId: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const job = await ElectricalJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Authorization check
      if (!job.mechanicId || job.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu iş için teklif gönderme yetkiniz yok', 403);
      }

      if (job.quote.status !== 'draft') {
        throw new CustomError('Teklif zaten gönderilmiş', 400);
      }

      // Quote total amount kontrolü
      if (!job.quote.totalAmount || job.quote.totalAmount <= 0) {
        throw new CustomError('Teklif tutarı geçersiz. Lütfen önce teklifi hazırlayın', 400);
      }

      job.quote.status = 'sent';
      job.status = 'quote_sent';
      await job.save();

      // Burada SMS/push notification gönderilecek
      await this.sendQuoteNotification(job);

      return {
        success: true,
        data: job,
        message: 'Teklif müşteriye gönderildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Teklif gönderilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * İş akışı aşamasını güncelle
   */
  static async updateWorkflowStage(jobId: string, mechanicId: string, stageData: {
    stage: string;
    status: 'in_progress' | 'completed' | 'skipped';
    photos?: string[];
    notes?: string;
    assignedTo?: string;
  }) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const job = await ElectricalJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Authorization check
      if (!job.mechanicId || job.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu iş için iş akışı güncelleme yetkiniz yok', 403);
      }

      // Teklif onaylanmış mı kontrol et (iş akışına başlamadan önce)
      if (stageData.stage !== 'quote_preparation' && job.quote.status !== 'accepted') {
        throw new CustomError('İş akışına başlamak için teklifin onaylanmış olması gerekir', 400);
      }

      // Aşamayı bul ve güncelle
      const stageIndex = job.workflow.stages.findIndex(s => s.stage === stageData.stage);
      if (stageIndex === -1) {
        throw new CustomError('Aşama bulunamadı', 404);
      }

      // Workflow stage order validation - önceki aşamalar tamamlanmış mı?
      if (stageData.status === 'in_progress' || stageData.status === 'completed') {
        const previousStages = job.workflow.stages.slice(0, stageIndex);
        const incompletePreviousStage = previousStages.find(
          s => s.stage !== 'quote_preparation' && s.status !== 'completed' && s.status !== 'skipped'
        );
        if (incompletePreviousStage) {
          throw new CustomError('Önceki aşamalar tamamlanmadan bu aşamaya geçilemez', 400);
        }
      }

      const stage = job.workflow.stages[stageIndex];
      
      if (stageData.status === 'in_progress' && stage.status === 'pending') {
        stage.startDate = new Date();
      }
      
      if (stageData.status === 'completed') {
        stage.endDate = new Date();
        if (!stage.startDate) {
          stage.startDate = new Date();
        }
      }

      stage.status = stageData.status;
      if (stageData.photos) {
        // Duplicate fotoğraf kontrolü
        const uniquePhotos = [...new Set([...stage.photos, ...stageData.photos])];
        // Maksimum 50 fotoğraf per stage
        if (uniquePhotos.length > 50) {
          throw new CustomError('Bir aşama için maksimum 50 fotoğraf eklenebilir', 400);
        }
        stage.photos = uniquePhotos;
      }
      if (stageData.notes) {
        stage.notes = stageData.notes;
      }
      if (stageData.assignedTo) {
        stage.assignedTo = new mongoose.Types.ObjectId(stageData.assignedTo);
      }

      // Mevcut aşamayı güncelle
      if (stageData.status === 'completed' || stageData.status === 'skipped') {
        // Aşama tamamlandığında veya atlandığında, bir sonraki aşamaya geç
        const nextStageIndex = stageIndex + 1;
        if (nextStageIndex < job.workflow.stages.length) {
          const nextStage = job.workflow.stages[nextStageIndex];
          job.workflow.currentStage = nextStage.stage as any;
        } else {
          // Son aşama tamamlandıysa, currentStage'i son aşama olarak bırak
          job.workflow.currentStage = stageData.stage as any;
        }
      } else {
        // Aşama başlatıldığında veya devam ediyorsa, currentStage'i güncelle
        job.workflow.currentStage = stageData.stage as any;
      }
      
      // İş durumunu güncelle
      if (stageData.status === 'in_progress') {
        job.status = 'in_progress';
      } else if (stageData.stage === 'quality_check' && stageData.status === 'completed') {
        // Kalite kontrol aşaması tamamlandıysa iş tamamlandı sayılır
        job.status = 'completed';
        job.workflow.actualCompletionDate = new Date();
      }

      await job.save();

      // Müşteriye bildirim gönder
      await this.sendStageUpdateNotification(job, stageData.stage, stageData.status);

      // Eğer iş tamamlandıysa tamamlandı bildirimi gönder
      if (job.status === 'completed' && stageData.stage === 'quality_check' && stageData.status === 'completed') {
        await this.sendJobCompletedNotification(job);
      }

      return {
        success: true,
        data: job,
        message: 'İş akışı aşaması güncellendi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('İş akışı güncellenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşteri onayı al
   */
  static async requestCustomerApproval(jobId: string, mechanicId: string, stage: string, photos?: string[]) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const job = await ElectricalJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Authorization check
      if (!job.mechanicId || job.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu iş için müşteri onayı isteme yetkiniz yok', 403);
      }

      // Fotoğraf validasyonu
      if (photos && photos.length > 20) {
        throw new CustomError('Onay için maksimum 20 fotoğraf gönderilebilir', 400);
      }

      // Onay kaydı ekle
      job.customerApprovals.push({
        stage,
        approved: false,
        photos: photos || [],
        notes: ''
      });

      await job.save();

      // Müşteriye onay bildirimi gönder
      await this.sendApprovalRequestNotification(job, stage);

      return {
        success: true,
        data: job,
        message: 'Müşteri onayı istendi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Müşteri onayı istenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Kalite kontrol yap
   */
  static async performQualityCheck(jobId: string, mechanicId: string, qualityData: {
    passed: boolean;
    checkedBy: string;
    issues?: string[];
    photos?: string[];
    notes?: string;
  }) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(qualityData.checkedBy)) {
        throw new CustomError('Geçersiz kontrol eden kişi ID', 400);
      }

      const job = await ElectricalJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Authorization check
      if (!job.mechanicId || job.mechanicId.toString() !== mechanicId) {
        throw new CustomError('Bu iş için kalite kontrol yapma yetkiniz yok', 403);
      }

      // Fotoğraf validasyonu
      if (qualityData.photos && qualityData.photos.length > 20) {
        throw new CustomError('Kalite kontrol için maksimum 20 fotoğraf eklenebilir', 400);
      }

      job.qualityCheck = {
        passed: qualityData.passed,
        checkedBy: new mongoose.Types.ObjectId(qualityData.checkedBy),
        checkedAt: new Date(),
        issues: qualityData.issues || [],
        photos: qualityData.photos || [],
        notes: qualityData.notes || ''
      };

      if (qualityData.passed) {
        job.status = 'completed';
        job.workflow.actualCompletionDate = new Date();
        // İş tamamlandı bildirimi gönder
        await this.sendJobCompletedNotification(job);
      }

      await job.save();

      return {
        success: true,
        data: job,
        message: 'Kalite kontrol tamamlandı'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Kalite kontrol yapılırken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Usta iş detayını getir
   */
  static async getMechanicElectricalJobById(jobId: string, mechanicId: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const job = await ElectricalJob.findOne({ 
        _id: new mongoose.Types.ObjectId(jobId), 
        mechanicId: new mongoose.Types.ObjectId(mechanicId) 
      })
        .populate('customerId', 'name surname phone email')
        .populate('vehicleId', 'brand modelName plateNumber year')
        .lean();

      if (!job) {
        throw new CustomError('İş bulunamadı veya erişim yetkiniz yok', 404);
      }

      return {
        success: true,
        data: job,
        message: 'İş detayı getirildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('İş detayı getirilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Ustanın elektrik işlerini getir
   */
  static async getMechanicElectricalJobs(mechanicId: string, status?: string, page: number = 1, limit: number = 20) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      // Pagination validation
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20; // Max 100 items per page
      const skip = (page - 1) * limit;

      const query: any = { mechanicId: new mongoose.Types.ObjectId(mechanicId) };
      if (status) {
        query.status = status;
      }

      const [jobs, total] = await Promise.all([
        ElectricalJob.find(query)
          .populate('customerId', 'name surname phone email')
          .populate('vehicleId', 'brand modelName plateNumber year')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ElectricalJob.countDocuments(query)
      ]);

      return {
        success: true,
        data: jobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: skip + jobs.length < total,
          hasPrevPage: page > 1
        },
        message: 'Elektrik işleri getirildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Elektrik işleri getirilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşterinin elektrik işlerini getir
   */
  static async getCustomerElectricalJobs(customerId: string, status?: string, page: number = 1, limit: number = 20) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }

      // Pagination validation
      if (page < 1) page = 1;
      if (limit < 1 || limit > 100) limit = 20; // Max 100 items per page
      const skip = (page - 1) * limit;

      const query: any = { customerId: new mongoose.Types.ObjectId(customerId) };
      if (status) {
        query.status = status;
      }

      const [jobs, total] = await Promise.all([
        ElectricalJob.find(query)
          .populate('mechanicId', 'name surname phone email')
          .populate('vehicleId', 'brand modelName plateNumber year')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ElectricalJob.countDocuments(query)
      ]);

      return {
        success: true,
        data: jobs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: skip + jobs.length < total,
          hasPrevPage: page > 1
        },
        message: 'Elektrik işleri getirildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Elektrik işleri getirilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşteri iş detayını getir
   */
  static async getCustomerElectricalJobById(jobId: string, customerId: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }

      const job = await ElectricalJob.findOne({ 
        _id: new mongoose.Types.ObjectId(jobId), 
        customerId: new mongoose.Types.ObjectId(customerId) 
      })
        .populate('mechanicId', 'name surname phone email')
        .populate('vehicleId', 'brand modelName plateNumber year')
        .lean();

      if (!job) {
        throw new CustomError('İş bulunamadı veya erişim yetkiniz yok', 404);
      }

      return {
        success: true,
        data: job,
        message: 'İş detayı getirildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('İş detayı getirilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşteri adına electrical işi oluştur (mechanicId opsiyonel)
   */
  static async createCustomerElectricalJob(data: {
    customerId: string;
    vehicleId: string;
    mechanicId?: string; // Opsiyonel - sonra atanabilir
    electricalInfo: {
      description: string;
      photos: string[];
      videos?: string[];
      systemType: 'klima' | 'far' | 'alternator' | 'batarya' | 'elektrik-araci' | 'sinyal' | 'diger';
      problemType: 'calismiyor' | 'arizali-bos' | 'ariza-gostergesi' | 'ses-yapiyor' | 'isinma-sorunu' | 'kisa-devre' | 'tetik-atmiyor' | 'diger';
      urgencyLevel: 'normal' | 'acil';
      isRecurring: boolean;
      lastWorkingCondition?: string;
      estimatedRepairTime: number;
    };
  }) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(data.customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(data.vehicleId)) {
        throw new CustomError('Geçersiz araç ID', 400);
      }
      if (data.mechanicId && !mongoose.Types.ObjectId.isValid(data.mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      // Customer ve Vehicle'ın var olduğunu kontrol et
      const customer = await User.findById(data.customerId);
      if (!customer) {
        throw new CustomError('Müşteri bulunamadı', 404);
      }

      const vehicle = await Vehicle.findById(data.vehicleId);
      if (!vehicle) {
        throw new CustomError('Araç bulunamadı', 404);
      }

      // Vehicle'ın müşteriye ait olduğunu kontrol et
      if (vehicle.userId?.toString() !== data.customerId) {
        throw new CustomError('Bu araç bu müşteriye ait değil', 403);
      }

      // Fotoğraf validasyonu - maksimum 20 fotoğraf
      if (data.electricalInfo.photos.length > 20) {
        throw new CustomError('Maksimum 20 fotoğraf yüklenebilir', 400);
      }

      // Video validasyonu - maksimum 5 video
      if (data.electricalInfo.videos && data.electricalInfo.videos.length > 5) {
        throw new CustomError('Maksimum 5 video yüklenebilir', 400);
      }

      // Eğer mechanicId verilmişse, ustanın var olduğunu kontrol et
      if (data.mechanicId) {
        const mechanic = await User.findById(data.mechanicId);
        if (!mechanic || (mechanic as any).userType !== 'mechanic') {
          throw new CustomError('Geçersiz usta', 404);
        }
      }

      // Default workflow kullan
      let workflowStages = this.getDefaultWorkflowStages();
      
      // Tahmini tamamlanma tarihi hesapla (saat cinsinden)
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setHours(estimatedCompletionDate.getHours() + data.electricalInfo.estimatedRepairTime);

      // Eğer mechanicId verilmemişse, null bırak (sonra atanacak)
      const electricalJob = new ElectricalJob({
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        mechanicId: data.mechanicId ? new mongoose.Types.ObjectId(data.mechanicId) : undefined,
        electricalInfo: data.electricalInfo,
        quote: {
          totalAmount: 0,
          breakdown: {
            partsToReplace: [],
            partsToRepair: [],
            diagnosisCost: 0,
            testingCost: 0,
            laborCost: 0,
            materialCost: 0,
            totalCost: 0
          },
          validityDays: 30,
          createdAt: new Date(),
          status: 'draft' as const
        },
        workflow: {
          currentStage: 'quote_preparation',
          stages: workflowStages.map(stage => ({
            stage: stage.stage,
            status: 'pending' as const,
            photos: [],
            notes: ''
          })),
          estimatedCompletionDate
        },
        status: data.mechanicId ? 'quote_preparation' : 'pending_mechanic',
        payment: {
          totalAmount: 0,
          paidAmount: 0,
          paymentStatus: 'pending' as const
        },
        customerApprovals: [],
        qualityCheck: {
          passed: false,
          issues: [],
          photos: []
        }
      });

      await electricalJob.save();

      return {
        success: true,
        data: electricalJob,
        message: 'Elektrik-elektronik işi başarıyla oluşturuldu'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Elektrik işi oluşturulurken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşteri teklif yanıtı (onaylama/reddetme)
   */
  static async respondToQuote(jobId: string, customerId: string, action: 'accept' | 'reject', rejectionReason?: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }

      let job = await ElectricalJob.findOne({ 
        _id: new mongoose.Types.ObjectId(jobId), 
        customerId: new mongoose.Types.ObjectId(customerId) 
      });
      if (!job) {
        throw new CustomError('İş bulunamadı veya erişim yetkiniz yok', 404);
      }

      if (job.quote.status !== 'sent') {
        throw new CustomError('Teklif henüz gönderilmemiş veya zaten yanıtlanmış', 400);
      }

      // Quote expiry kontrolü
      if (action === 'accept' && job.quote.createdAt && job.quote.validityDays) {
        const expiryDate = new Date(job.quote.createdAt);
        expiryDate.setDate(expiryDate.getDate() + job.quote.validityDays);
        if (new Date() > expiryDate) {
          job.quote.status = 'expired';
          await job.save();
          throw new CustomError('Teklif süresi dolmuş. Lütfen yeni bir teklif isteyin', 400);
        }
      }

      if (action === 'accept') {
        // Teklif onaylandığında payment.totalAmount'u quote.totalAmount'dan güncelle
        const quoteTotalAmount = job.quote.totalAmount || 0;
        
        // Model üzerinden güncelle
        job.quote.status = 'accepted';
        job.status = 'quote_accepted';
        
        // Payment totalAmount'u güncelle
        if (quoteTotalAmount > 0) {
          job.payment.totalAmount = quoteTotalAmount;
        }
        
        // Nested field güncellemesi için markModified
        job.markModified('quote');
        job.markModified('payment');
        await job.save();
        
        // Double-check: Eğer save başarısız olduysa findByIdAndUpdate ile güncelle
        const verifyJob = await ElectricalJob.findById(jobId);
        if (verifyJob && verifyJob.payment.totalAmount === 0 && quoteTotalAmount > 0) {
          await ElectricalJob.findByIdAndUpdate(
            jobId,
            { $set: { 'payment.totalAmount': quoteTotalAmount } }
          );
          // Job'ı tekrar çek
          const recheckJob = await ElectricalJob.findById(jobId);
          if (recheckJob) job = recheckJob;
        }
        
        // Ustaya bildirim gönder
        if (job.mechanicId) {
          await sendNotification(
            job.mechanicId,
            'mechanic',
            'Teklif Onaylandı',
            'Elektrik işi teklifiniz müşteri tarafından onaylandı. İş akışına başlayabilirsiniz.',
            'electrical_quote_accepted',
            {
              jobId: job._id.toString(),
              customerId: job.customerId.toString()
            }
          );
        }
      } else {
        job.quote.status = 'rejected';
        job.status = 'quote_preparation'; // Teklif reddedildiğinde tekrar hazırlama aşamasına dön
        
        // Ustaya bildirim gönder
        if (job.mechanicId) {
          await sendNotification(
            job.mechanicId,
            'mechanic',
            'Teklif Reddedildi',
            `Elektrik işi teklifiniz müşteri tarafından reddedildi.${rejectionReason ? ' Sebep: ' + rejectionReason : ''}`,
            'electrical_quote_rejected',
            {
              jobId: job._id.toString(),
              customerId: job.customerId.toString(),
              rejectionReason: rejectionReason || ''
            }
          );
        }
        await job.save();
      }

      return {
        success: true,
        data: job,
        message: action === 'accept' ? 'Teklif onaylandı' : 'Teklif reddedildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Teklif yanıtlanırken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşteri aşama onayı
   */
  static async approveStage(jobId: string, customerId: string, stage: string, approved: boolean, notes?: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }

      const job = await ElectricalJob.findOne({ 
        _id: new mongoose.Types.ObjectId(jobId), 
        customerId: new mongoose.Types.ObjectId(customerId) 
      });
      if (!job) {
        throw new CustomError('İş bulunamadı veya erişim yetkiniz yok', 404);
      }

      const approval = job.customerApprovals.find(a => a.stage === stage && !a.approved);
      if (!approval) {
        throw new CustomError('Bu aşama için onay isteği bulunamadı', 404);
      }

      approval.approved = approved;
      approval.approvedAt = new Date();
      if (notes) {
        approval.notes = notes;
      }

      await job.save();

      // Ustaya bildirim gönder
      if (job.mechanicId) {
        await sendNotification(
          job.mechanicId,
          'mechanic',
          approved ? 'Aşama Onaylandı' : 'Aşama Reddedildi',
          `Müşteri ${stage} aşamasını ${approved ? 'onayladı' : 'reddetti'}.`,
          'electrical_stage_approval',
          {
            jobId: job._id.toString(),
            stage,
            approved
          }
        );
      }

      return {
        success: true,
        data: job,
        message: approved ? 'Aşama onaylandı' : 'Aşama reddedildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Aşama onayı işlenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Electrical job için ödeme işlemi
   */
  static async processPayment(jobId: string, customerId: string, amount: number, paymentMethod: 'cash' | 'card' | 'bank_transfer' = 'card') {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }

      const job = await ElectricalJob.findOne({ 
        _id: new mongoose.Types.ObjectId(jobId), 
        customerId: new mongoose.Types.ObjectId(customerId) 
      });
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Teklif onaylanmış olmalı
      if (job.quote.status !== 'accepted') {
        throw new CustomError('Ödeme yapabilmek için teklifin onaylanmış olması gerekir', 400);
      }

      // Ödeme tutarı kontrolü
      if (amount <= 0) {
        throw new CustomError('Ödeme tutarı sıfırdan büyük olmalıdır', 400);
      }
      
      const remainingAmount = job.payment.totalAmount - job.payment.paidAmount;
      if (amount > remainingAmount) {
        throw new CustomError(`Ödeme tutarı kalan tutardan (${remainingAmount.toFixed(2)}₺) fazla olamaz`, 400);
      }

      // MongoDB transaction başlat - kritik işlem için atomicity garantisi
      const session = await mongoose.startSession();
      
      try {
        await session.startTransaction();

        // Wallet'tan para çek (eğer kart ile ödeme yapılıyorsa)
        if (paymentMethod === 'card') {
          // Bakiye kontrolü ve atomik güncelleme
          const walletUpdateResult = await Wallet.updateOne(
            { 
              userId: customerId,
              balance: { $gte: amount } // Balance yeterli olmalı
            },
            {
              $inc: { balance: -amount },
              $push: { 
                transactions: {
                  type: 'debit' as const,
                  amount: amount,
                  description: `Elektrik işi ödemesi - İş #${jobId}`,
                  date: new Date(),
                  status: 'completed' as const,
                  electricalJobId: jobId
                }
              }
            },
            { session }
          );

          if (walletUpdateResult.matchedCount === 0) {
            await session.abortTransaction();
            const walletDoc = await Wallet.findOne({ userId: customerId });
            if (!walletDoc) {
              throw new CustomError('Cüzdan bulunamadı', 404);
            }
            throw new CustomError(`Yetersiz bakiye. Mevcut bakiye: ${walletDoc.balance}₺, Gerekli: ${amount}₺`, 400);
          }
        }

        // Electrical job ödeme bilgilerini güncelle
        const newPaidAmount = job.payment.paidAmount + amount;
        // Hassas karşılaştırma için tolerance ekle
        const tolerance = 0.01; // 1 kuruş tolerans
        const paymentStatus = (job.payment.totalAmount - newPaidAmount) <= tolerance ? 'paid' : 'partial';

        await ElectricalJob.findByIdAndUpdate(
          jobId,
          {
            'payment.paidAmount': newPaidAmount,
            'payment.paymentStatus': paymentStatus,
            'payment.paymentMethod': paymentMethod,
            'payment.paymentDate': new Date()
          },
          { session }
        );

        // Transaction'ı commit et
        await session.commitTransaction();
      } catch (transactionError: any) {
        await session.abortTransaction();
        throw transactionError;
      } finally {
        session.endSession();
      }

      // TEFE puan kazandır
      try {
        await TefePointService.processPaymentTefePoints({
          userId: customerId,
          amount: amount,
          paymentType: 'other',
          serviceCategory: 'electrical',
          description: 'Elektrik işi ödemesi',
          serviceId: jobId
        });
      } catch (tefeError) {
        // TefePuan hatası ödemeyi engellemesin
        console.error('TefePuan hatası:', tefeError);
      }

      // Güncellenmiş job'ı getir
      const updatedJob = await ElectricalJob.findById(jobId);

      return {
        success: true,
        data: updatedJob,
        message: 'Ödeme başarıyla tamamlandı'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Ödeme işlemi sırasında hata oluştu: ' + error.message, 500);
    }
  }

  /**
   * Default workflow stages - Elektrik-elektronik onarım süreci
   */
  private static getDefaultWorkflowStages() {
    return [
      { stage: 'diagnosis', stageName: 'Teşhis/Kontrol', estimatedHours: 2, requiredPhotos: 2, description: 'Elektrik sisteminin teşhisi ve kontrolü', order: 1 },
      { stage: 'part_ordering', stageName: 'Parça Siparişi', estimatedHours: 0, requiredPhotos: 0, description: 'Gerekli parçaların siparişi (opsiyonel)', order: 2 },
      { stage: 'repair', stageName: 'Onarım', estimatedHours: 4, requiredPhotos: 3, description: 'Elektrik sisteminin onarımı', order: 3 },
      { stage: 'replacement', stageName: 'Parça Değişimi', estimatedHours: 2, requiredPhotos: 2, description: 'Arızalı parçaların değiştirilmesi (opsiyonel)', order: 4 },
      { stage: 'testing', stageName: 'Test/Kontrol', estimatedHours: 1, requiredPhotos: 2, description: 'Onarım sonrası sistem testleri', order: 5 },
      { stage: 'quality_check', stageName: 'Kalite Kontrol', estimatedHours: 1, requiredPhotos: 2, description: 'Son kalite kontrolü', order: 6 }
    ];
  }

  /**
   * Teklif bildirimi gönder
   */
  private static async sendQuoteNotification(job: IElectricalJob) {
    try {
      const customer = await User.findById(job.customerId);
      if (!customer) return;

      await sendNotification(
        job.customerId,
        'driver',
        'Yeni Elektrik İşi Teklifi',
        `${job.quote.totalAmount.toLocaleString('tr-TR')}₺ tutarında elektrik işi teklifi hazırlandı. Teklifi görüntüleyip onaylayabilirsiniz.`,
        'electrical_quote_sent',
        {
          jobId: job._id.toString(),
          amount: job.quote.totalAmount,
          validityDays: job.quote.validityDays
        }
      );
    } catch (error) {
      console.error('Teklif bildirimi gönderme hatası:', error);
    }
  }

  /**
   * Aşama güncelleme bildirimi gönder
   */
  private static async sendStageUpdateNotification(job: IElectricalJob, stage: string, status: string) {
    try {
      const customer = await User.findById(job.customerId);
      if (!customer) return;

      const stageNames: Record<string, string> = {
        'diagnosis': 'Teşhis/Kontrol',
        'part_ordering': 'Parça Siparişi',
        'repair': 'Onarım',
        'replacement': 'Parça Değişimi',
        'testing': 'Test/Kontrol',
        'quality_check': 'Kalite Kontrol'
      };

      const stageName = stageNames[stage] || stage;

      await sendNotification(
        job.customerId,
        'driver',
        'İş Akışı Güncellendi',
        `Elektrik işinizde ${stageName} aşaması ${status === 'completed' ? 'tamamlandı' : 'başladı'}.`,
        'electrical_stage_updated',
        {
          jobId: job._id.toString(),
          stage,
          status
        }
      );
    } catch (error) {
      console.error('Aşama güncelleme bildirimi gönderme hatası:', error);
    }
  }

  /**
   * Onay isteği bildirimi gönder
   */
  private static async sendApprovalRequestNotification(job: IElectricalJob, stage: string) {
    try {
      const customer = await User.findById(job.customerId);
      if (!customer) return;

      await sendNotification(
        job.customerId,
        'driver',
        'Onay İsteği',
        `Elektrik işinizde ${stage} aşaması için onayınız gerekiyor.`,
        'electrical_approval_requested',
        {
          jobId: job._id.toString(),
          stage
        }
      );
    } catch (error) {
      console.error('Onay isteği bildirimi gönderme hatası:', error);
    }
  }

  /**
   * İş tamamlandı bildirimi gönder
   */
  private static async sendJobCompletedNotification(job: IElectricalJob) {
    try {
      // Müşteriye bildirim
      await sendNotification(
        job.customerId,
        'driver',
        'İş Tamamlandı',
        `Elektrik işiniz başarıyla tamamlandı. Detayları görüntüleyebilirsiniz.`,
        'electrical_job_completed',
        {
          jobId: job._id.toString(),
          mechanicId: job.mechanicId?.toString() || ''
        }
      );

      // Ustaya bildirim
      if (job.mechanicId) {
        await sendNotification(
          job.mechanicId,
          'mechanic',
          'İş Tamamlandı',
          `Elektrik işi başarıyla tamamlandı. Müşteri bilgilendirildi.`,
          'electrical_job_completed',
          {
            jobId: job._id.toString(),
            customerId: job.customerId.toString()
          }
        );
      }
    } catch (error) {
      console.error('İş tamamlandı bildirimi gönderme hatası:', error);
    }
  }
}

