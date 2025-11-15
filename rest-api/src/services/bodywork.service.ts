import { BodyworkJob, IBodyworkJob } from '../models/BodyworkJob';
import { BodyworkTemplate, IBodyworkTemplate } from '../models/BodyworkTemplate';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import { Wallet } from '../models/Wallet';
import { TefePointService } from './tefePoint.service';
import { sendNotification } from '../utils/notifications';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';

export class BodyworkService {
  /**
   * Yeni kaporta/boya işi oluştur
   */
  static async createBodyworkJob(data: {
    customerId: string;
    vehicleId: string;
    mechanicId: string;
    damageInfo: {
      description: string;
      photos: string[];
      videos?: string[];
      damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
      severity: 'minor' | 'moderate' | 'major' | 'severe';
      affectedAreas: string[];
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
      if (data.damageInfo.photos.length > 20) {
        throw new CustomError('Maksimum 20 fotoğraf yüklenebilir', 400);
      }

      // Video validasyonu - maksimum 5 video
      if (data.damageInfo.videos && data.damageInfo.videos.length > 5) {
        throw new CustomError('Maksimum 5 video yüklenebilir', 400);
      }

      // Şablon bul (varsa)
      const template = await BodyworkTemplate.findOne({
        mechanicId: data.mechanicId,
        damageType: data.damageInfo.damageType,
        severity: data.damageInfo.severity,
        isActive: true
      });

      // İş akışı şablonunu oluştur
      const workflowStages = template ? template.workflowTemplate : this.getDefaultWorkflowStages();
      
      // Tahmini tamamlanma tarihi hesapla
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + data.damageInfo.estimatedRepairTime);

      const bodyworkJob = new BodyworkJob({
        ...data,
        quote: {
          totalAmount: 0,
          breakdown: {
            partsToReplace: [],
            partsToRepair: [],
            paintMaterials: [],
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

      await bodyworkJob.save();

      return {
        success: true,
        data: bodyworkJob,
        message: 'Kaporta/boya işi başarıyla oluşturuldu'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Kaporta işi oluşturulurken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
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
    paintMaterials: Array<{
      materialName: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
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

      const job = await BodyworkJob.findById(jobId);
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
      
      const paintMaterialsTotal = quoteData.paintMaterials.reduce((sum, material) => 
        sum + (material.quantity * material.unitPrice), 0);

      const laborCost = partsToRepairTotal;
      const materialCost = partsToReplaceTotal + paintMaterialsTotal;
      const totalCost = laborCost + materialCost;

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
          paintMaterials: quoteData.paintMaterials.map(material => ({
            ...material,
            totalPrice: material.quantity * material.unitPrice
          })),
          laborCost,
          materialCost,
          totalCost
        },
        validityDays: quoteData.validityDays || 30,
        createdAt: new Date(),
        status: 'draft'
      };

      job.payment.totalAmount = totalCost;
      await job.save();

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

      const job = await BodyworkJob.findById(jobId);
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

      const job = await BodyworkJob.findById(jobId);
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
      job.workflow.currentStage = stageData.stage as any;
      
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

      const job = await BodyworkJob.findById(jobId);
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

      const job = await BodyworkJob.findById(jobId);
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
   * Ustanın kaporta işlerini getir
   */
  /**
   * Usta iş detayını getir
   */
  static async getMechanicBodyworkJobById(jobId: string, mechanicId: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const job = await BodyworkJob.findOne({ 
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

  static async getMechanicBodyworkJobs(mechanicId: string, status?: string, page: number = 1, limit: number = 20) {
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
        BodyworkJob.find(query)
          .populate('customerId', 'name surname phone email')
          .populate('vehicleId', 'brand modelName plateNumber year')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(), // 🚀 OPTIMIZE: Memory optimization
        BodyworkJob.countDocuments(query)
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
        message: 'Kaporta işleri getirildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Kaporta işleri getirilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşterinin kaporta işlerini getir
   */
  static async getCustomerBodyworkJobs(customerId: string, status?: string, page: number = 1, limit: number = 20) {
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
        BodyworkJob.find(query)
          .populate('mechanicId', 'name surname phone email')
          .populate('vehicleId', 'brand modelName plateNumber year')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        BodyworkJob.countDocuments(query)
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
        message: 'Kaporta işleri getirildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Kaporta işleri getirilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Müşteri iş detayını getir
   */
  static async getCustomerBodyworkJobById(jobId: string, customerId: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        throw new CustomError('Geçersiz iş ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        throw new CustomError('Geçersiz müşteri ID', 400);
      }

      const job = await BodyworkJob.findOne({ 
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
   * Müşteri adına bodywork işi oluştur (mechanicId opsiyonel)
   */
  static async createCustomerBodyworkJob(data: {
    customerId: string;
    vehicleId: string;
    mechanicId?: string; // Opsiyonel - sonra atanabilir
    damageInfo: {
      description: string;
      photos: string[];
      videos?: string[];
      damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
      severity: 'minor' | 'moderate' | 'major' | 'severe';
      affectedAreas: string[];
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
      if (data.damageInfo.photos.length > 20) {
        throw new CustomError('Maksimum 20 fotoğraf yüklenebilir', 400);
      }

      // Video validasyonu - maksimum 5 video
      if (data.damageInfo.videos && data.damageInfo.videos.length > 5) {
        throw new CustomError('Maksimum 5 video yüklenebilir', 400);
      }

      // Eğer mechanicId verilmişse, ustanın var olduğunu kontrol et
      if (data.mechanicId) {
        const mechanic = await User.findById(data.mechanicId);
        if (!mechanic || (mechanic as any).userType !== 'mechanic') {
          throw new CustomError('Geçersiz usta', 404);
        }
      }

      // Eğer mechanicId verilmişse şablon bul, yoksa default workflow kullan
      let workflowStages = this.getDefaultWorkflowStages();
      
      if (data.mechanicId) {
        const template = await BodyworkTemplate.findOne({
          mechanicId: data.mechanicId,
          damageType: data.damageInfo.damageType,
          severity: data.damageInfo.severity,
          isActive: true
        });

        if (template) {
          workflowStages = template.workflowTemplate;
        }
      }
      
      // Tahmini tamamlanma tarihi hesapla
      const estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + data.damageInfo.estimatedRepairTime);

      // Eğer mechanicId verilmemişse, null bırak (sonra atanacak)
      const bodyworkJob = new BodyworkJob({
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        mechanicId: data.mechanicId ? new mongoose.Types.ObjectId(data.mechanicId) : undefined,
        damageInfo: data.damageInfo,
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

      await bodyworkJob.save();

      return {
        success: true,
        data: bodyworkJob,
        message: 'Kaporta/boya işi başarıyla oluşturuldu'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Kaporta işi oluşturulurken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
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

      const job = await BodyworkJob.findOne({ 
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
        job.quote.status = 'accepted';
        job.status = 'quote_accepted';
      } else {
        job.quote.status = 'rejected';
        job.status = 'quote_preparation';
        // Red nedenini kaydet - rejectionReason artık breakdown içinde değil, ayrı bir field olarak saklanabilir
        // Ancak şu anki şema yapısına göre sadece bildirimde kullanılıyor
      }

      await job.save();

      // Ustaya bildirim gönder
      if (action === 'accept') {
        await this.sendQuoteAcceptedNotification(job);
      } else {
        await this.sendQuoteRejectedNotification(job, rejectionReason);
      }

      return {
        success: true,
        data: job,
        message: action === 'accept' ? 'Teklif kabul edildi' : 'Teklif reddedildi'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Teklif yanıtı verilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
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

      const job = await BodyworkJob.findOne({ _id: jobId, customerId });
      if (!job) {
        throw new CustomError('İş bulunamadı veya erişim yetkiniz yok', 404);
      }

      // Onay kaydını bul veya oluştur
      const approvalIndex = job.customerApprovals.findIndex(a => a.stage === stage);
      
      if (approvalIndex >= 0) {
        job.customerApprovals[approvalIndex].approved = approved;
        job.customerApprovals[approvalIndex].approvedAt = new Date();
        if (notes) {
          job.customerApprovals[approvalIndex].notes = notes;
        }
      } else {
        job.customerApprovals.push({
          stage,
          approved,
          approvedAt: new Date(),
          notes: notes || ''
        });
      }

      await job.save();

      // Ustaya bildirim gönder
      await this.sendStageApprovalNotification(job, stage, approved);

      return {
        success: true,
        data: job,
        message: approved ? 'Aşama onaylandı' : 'Aşama onaylanmadı'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Aşama onayı verilirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Teklif kabul edildi bildirimi gönder
   */
  private static async sendQuoteAcceptedNotification(job: IBodyworkJob) {
    try {
      if (!job.mechanicId) return;
      const mechanic = await User.findById(job.mechanicId);
      if (!mechanic) return;

      await sendNotification(
        job.mechanicId,
        'mechanic',
        'Teklif Onaylandı',
        `Kaporta işi teklifi (${job.quote.totalAmount.toLocaleString('tr-TR')}₺) müşteri tarafından onaylandı. İşe başlayabilirsiniz.`,
        'bodywork_quote_accepted',
        {
          jobId: job._id.toString(),
          amount: job.quote.totalAmount
        }
      );
    } catch (error) {
      console.error('Teklif kabul bildirimi gönderme hatası:', error);
    }
  }

  /**
   * Teklif reddedildi bildirimi gönder
   */
  private static async sendQuoteRejectedNotification(job: IBodyworkJob, reason?: string) {
    try {
      if (!job.mechanicId) return;
      const mechanic = await User.findById(job.mechanicId);
      if (!mechanic) return;

      await sendNotification(
        job.mechanicId,
        'mechanic',
        'Teklif Reddedildi',
        `Kaporta işi teklifi müşteri tarafından reddedildi.${reason ? ` Sebep: ${reason}` : ''}`,
        'bodywork_quote_rejected',
        {
          jobId: job._id.toString(),
          reason: reason || 'Belirtilmemiş'
        }
      );
    } catch (error) {
      console.error('Teklif red bildirimi gönderme hatası:', error);
    }
  }

  /**
   * Aşama onay bildirimi gönder
   */
  private static async sendStageApprovalNotification(job: IBodyworkJob, stage: string, approved: boolean) {
    try {
      const stageNames: Record<string, string> = {
        'disassembly': 'Söküm',
        'repair': 'Düzeltme',
        'putty': 'Macun',
        'primer': 'Astar',
        'paint': 'Boya',
        'assembly': 'Montaj',
        'quality_check': 'Kalite Kontrol'
      };

      const stageName = stageNames[stage] || stage;

      if (approved) {
        // Ustaya bildirim
        if (job.mechanicId) {
          await sendNotification(
            job.mechanicId,
            'mechanic',
            'Aşama Onaylandı',
            `Müşteri ${stageName} aşamasını onayladı. İş akışına devam edebilirsiniz.`,
            'bodywork_approval_request',
            {
              jobId: job._id.toString(),
              stage,
              stageName,
              approved: true
            }
          );
        }
      } else {
        // Ustaya red bildirimi
        if (job.mechanicId) {
          await sendNotification(
            job.mechanicId,
            'mechanic',
            'Aşama Onaylanmadı',
            `Müşteri ${stageName} aşamasını onaylamadı. Lütfen gerekli düzenlemeleri yapın.`,
            'bodywork_approval_request',
            {
              jobId: job._id.toString(),
              stage,
              stageName,
              approved: false
            }
          );
        }
      }
    } catch (error) {
      console.error('Aşama onay bildirimi gönderme hatası:', error);
    }
  }

  /**
   * Şablon oluştur
   */
  static async createTemplate(data: {
    mechanicId: string;
    name: string;
    description: string;
    damageType: 'collision' | 'scratch' | 'dent' | 'rust' | 'paint_damage' | 'other';
    severity: 'minor' | 'moderate' | 'major' | 'severe';
    workflowTemplate: Array<{
      stage: string;
      stageName: string;
      estimatedHours: number;
      requiredPhotos: number;
      description: string;
      order: number;
    }>;
    standardParts: Array<{
      partName: string;
      partNumber?: string;
      brand: string;
      estimatedPrice: number;
      notes?: string;
    }>;
    standardMaterials: Array<{
      materialName: string;
      estimatedQuantity: number;
      estimatedPrice: number;
      notes?: string;
    }>;
    laborRates: {
      hourlyRate: number;
      overtimeRate: number;
      weekendRate: number;
    };
  }) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(data.mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      // Ustanın var olduğunu kontrol et
      const mechanic = await User.findById(data.mechanicId);
      if (!mechanic || (mechanic as any).userType !== 'mechanic') {
        throw new CustomError('Geçersiz usta', 404);
      }

      const template = new BodyworkTemplate(data);
      await template.save();

      return {
        success: true,
        data: template,
        message: 'Şablon başarıyla oluşturuldu'
      };

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Şablon oluşturulurken hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 500);
    }
  }

  /**
   * Şablon güncelle
   */
  static async updateTemplate(templateId: string, mechanicId: string, data: Partial<IBodyworkTemplate>) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        throw new CustomError('Geçersiz şablon ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const template = await BodyworkTemplate.findOne({ 
        _id: new mongoose.Types.ObjectId(templateId), 
        mechanicId: new mongoose.Types.ObjectId(mechanicId) 
      });
      if (!template) {
        throw new CustomError('Şablon bulunamadı veya güncelleme yetkiniz yok', 404);
      }

      Object.assign(template, data);
      template.updatedAt = new Date();
      await template.save();

      return {
        success: true,
        data: template,
        message: 'Şablon başarıyla güncellendi'
      };
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Şablon güncellenirken hata oluştu: ' + error.message, 500);
    }
  }

  /**
   * Şablon sil (soft delete)
   */
  static async deleteTemplate(templateId: string, mechanicId: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        throw new CustomError('Geçersiz şablon ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const template = await BodyworkTemplate.findOne({ 
        _id: new mongoose.Types.ObjectId(templateId), 
        mechanicId: new mongoose.Types.ObjectId(mechanicId) 
      });
      if (!template) {
        throw new CustomError('Şablon bulunamadı veya silme yetkiniz yok', 404);
      }

      template.isActive = false;
      template.updatedAt = new Date();
      await template.save();

      return {
        success: true,
        message: 'Şablon başarıyla silindi'
      };
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Şablon silinirken hata oluştu: ' + error.message, 500);
    }
  }

  /**
   * Şablon detayını getir
   */
  static async getTemplateById(templateId: string, mechanicId: string) {
    try {
      // ObjectId validation
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        throw new CustomError('Geçersiz şablon ID', 400);
      }
      if (!mongoose.Types.ObjectId.isValid(mechanicId)) {
        throw new CustomError('Geçersiz usta ID', 400);
      }

      const template = await BodyworkTemplate.findOne({ 
        _id: new mongoose.Types.ObjectId(templateId), 
        mechanicId: new mongoose.Types.ObjectId(mechanicId), 
        isActive: true 
      });
      if (!template) {
        throw new CustomError('Şablon bulunamadı', 404);
      }

      return {
        success: true,
        data: template,
        message: 'Şablon detayı getirildi'
      };
    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Şablon detayı getirilirken hata oluştu: ' + error.message, 500);
    }
  }

  /**
   * Varsayılan iş akışı aşamaları
   */
  private static getDefaultWorkflowStages() {
    return [
      { stage: 'disassembly', stageName: 'Söküm', estimatedHours: 2, requiredPhotos: 2, description: 'Hasarlı parçaların sökülmesi', order: 1 },
      { stage: 'repair', stageName: 'Düzeltme', estimatedHours: 4, requiredPhotos: 3, description: 'Gövde düzeltme işlemleri', order: 2 },
      { stage: 'putty', stageName: 'Macun', estimatedHours: 2, requiredPhotos: 2, description: 'Macun çekme işlemleri', order: 3 },
      { stage: 'primer', stageName: 'Astar', estimatedHours: 1, requiredPhotos: 1, description: 'Astar atma işlemi', order: 4 },
      { stage: 'paint', stageName: 'Boya', estimatedHours: 3, requiredPhotos: 2, description: 'Boya işlemi', order: 5 },
      { stage: 'assembly', stageName: 'Montaj', estimatedHours: 2, requiredPhotos: 1, description: 'Parçaların montajı', order: 6 },
      { stage: 'quality_check', stageName: 'Kalite Kontrol', estimatedHours: 1, requiredPhotos: 2, description: 'Son kalite kontrolü', order: 7 }
    ];
  }

  /**
   * Teklif bildirimi gönder
   */
  private static async sendQuoteNotification(job: IBodyworkJob) {
    try {
      const customer = await User.findById(job.customerId);
      if (!customer) return;

      await sendNotification(
        job.customerId,
        'driver',
        'Yeni Kaporta İşi Teklifi',
        `${job.quote.totalAmount.toLocaleString('tr-TR')}₺ tutarında kaporta işi teklifi hazırlandı. Teklifi görüntüleyip onaylayabilirsiniz.`,
        'bodywork_quote_sent',
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
  private static async sendStageUpdateNotification(job: IBodyworkJob, stage: string, status: string) {
    try {
      const customer = await User.findById(job.customerId);
      if (!customer) return;

      const stageNames: Record<string, string> = {
        'disassembly': 'Söküm',
        'repair': 'Düzeltme',
        'putty': 'Macun',
        'primer': 'Astar',
        'paint': 'Boya',
        'assembly': 'Montaj',
        'quality_check': 'Kalite Kontrol'
      };

      const stageName = stageNames[stage] || stage;
      const statusText = status === 'completed' ? 'tamamlandı' : status === 'in_progress' ? 'başlatıldı' : 'güncellendi';

      await sendNotification(
        job.customerId,
        'driver',
        'İş Aşaması Güncellendi',
        `${stageName} aşaması ${statusText}. Kaporta işinizin durumunu takip edebilirsiniz.`,
        'bodywork_stage_update',
        {
          jobId: job._id.toString(),
          stage,
          stageName,
          status
        }
      );
    } catch (error) {
      console.error('Aşama güncelleme bildirimi gönderme hatası:', error);
    }
  }

  /**
   * Onay isteme bildirimi gönder
   */
  private static async sendApprovalRequestNotification(job: IBodyworkJob, stage: string) {
    try {
      const customer = await User.findById(job.customerId);
      if (!customer) return;

      const stageNames: Record<string, string> = {
        'disassembly': 'Söküm',
        'repair': 'Düzeltme',
        'putty': 'Macun',
        'primer': 'Astar',
        'paint': 'Boya',
        'assembly': 'Montaj',
        'quality_check': 'Kalite Kontrol'
      };

      const stageName = stageNames[stage] || stage;

      await sendNotification(
        job.customerId,
        'driver',
        'Aşama Onayı Gerekli',
        `${stageName} aşaması için onayınız gerekiyor. Lütfen iş akışını kontrol edin ve onaylayın.`,
        'bodywork_approval_request',
        {
          jobId: job._id.toString(),
          stage,
          stageName
        }
      );
    } catch (error) {
      console.error('Onay isteme bildirimi gönderme hatası:', error);
    }
  }

  /**
   * İş tamamlandı bildirimi gönder
   */
  private static async sendJobCompletedNotification(job: IBodyworkJob) {
    try {
      const customer = await User.findById(job.customerId);
      if (!customer) return;

      await sendNotification(
        job.customerId,
        'driver',
        'Kaporta İşi Tamamlandı',
        `Kaporta işiniz başarıyla tamamlandı. İşin detaylarını görüntüleyebilir ve ödeme işlemini tamamlayabilirsiniz.`,
        'bodywork_job_completed',
        {
          jobId: job._id.toString(),
          totalAmount: job.payment.totalAmount
        }
      );

      // Ustaya da bildirim gönder
      if (job.mechanicId) {
        await sendNotification(
          job.mechanicId,
          'mechanic',
          'İş Tamamlandı',
          `Kaporta işi başarıyla tamamlandı. Müşteri bilgilendirildi.`,
          'bodywork_job_completed',
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

  /**
   * Bodywork job için ödeme işlemi
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

      const job = await BodyworkJob.findOne({ 
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

      // Wallet'ı bul
      const wallet = await Wallet.findOne({ userId: customerId });
      if (!wallet) {
        throw new CustomError('Cüzdan bulunamadı', 404);
      }

      // Bakiye kontrolü (eğer cüzdan ödemesi yapılıyorsa)
      if (paymentMethod === 'card' && wallet.balance < amount) {
        throw new CustomError('Yetersiz bakiye', 400);
      }

      // MongoDB transaction başlat
      const session = await mongoose.startSession();
      
      try {
        await session.startTransaction();

        // Wallet'tan para çek (eğer kart ile ödeme yapılıyorsa)
        if (paymentMethod === 'card') {
          const transaction = {
            type: 'debit' as const,
            amount: amount,
            description: `Kaporta işi ödemesi - İş #${jobId}`,
            date: new Date(),
            status: 'completed' as const,
            bodyworkJobId: jobId
          };

          await Wallet.findOneAndUpdate(
            { userId: customerId },
            {
              $inc: { balance: -amount },
              $push: { transactions: transaction }
            },
            { session, new: true }
          );
        }

                // Bodywork job ödeme bilgilerini güncelle
                const newPaidAmount = job.payment.paidAmount + amount;
                // Hassas karşılaştırma için tolerance ekle
                const tolerance = 0.01; // 1 kuruş tolerans
                const paymentStatus = (job.payment.totalAmount - newPaidAmount) <= tolerance ? 'paid' : 'partial';

        await BodyworkJob.findByIdAndUpdate(
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

        // TEFE puan kazandır (transaction dışında)
        try {
          await TefePointService.processPaymentTefePoints({
            userId: customerId,
            amount: amount,
            paymentType: 'other',
            serviceCategory: 'bodywork',
            description: 'Kaporta işi ödemesi',
            serviceId: jobId
          });
        } catch (tefeError) {
          // TefePuan hatası ödemeyi engellemesin
          console.error('TefePuan hatası:', tefeError);
        }

        // Güncellenmiş job'ı getir
        const updatedJob = await BodyworkJob.findById(jobId);

        return {
          success: true,
          data: updatedJob,
          message: 'Ödeme başarıyla tamamlandı'
        };

      } catch (transactionError: any) {
        await session.abortTransaction();
        throw transactionError;
      } finally {
        session.endSession();
      }

    } catch (error: any) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Ödeme işlemi sırasında hata oluştu: ' + error.message, 500);
    }
  }
}
