import { BodyworkJob, IBodyworkJob } from '../models/BodyworkJob';
import { BodyworkTemplate, IBodyworkTemplate } from '../models/BodyworkTemplate';
import { CustomError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

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

    } catch (error) {
      throw error;
    }
  }

  /**
   * Teklif hazırla
   */
  static async prepareQuote(jobId: string, quoteData: {
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
      const job = await BodyworkJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
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

    } catch (error) {
      throw error;
    }
  }

  /**
   * Teklifi müşteriye gönder
   */
  static async sendQuote(jobId: string) {
    try {
      const job = await BodyworkJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      if (job.quote.status !== 'draft') {
        throw new CustomError('Teklif zaten gönderilmiş', 400);
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

    } catch (error) {
      throw error;
    }
  }

  /**
   * İş akışı aşamasını güncelle
   */
  static async updateWorkflowStage(jobId: string, stageData: {
    stage: string;
    status: 'in_progress' | 'completed' | 'skipped';
    photos?: string[];
    notes?: string;
    assignedTo?: string;
  }) {
    try {
      const job = await BodyworkJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
      }

      // Aşamayı bul ve güncelle
      const stageIndex = job.workflow.stages.findIndex(s => s.stage === stageData.stage);
      if (stageIndex === -1) {
        throw new CustomError('Aşama bulunamadı', 404);
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
        stage.photos.push(...stageData.photos);
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
      } else if (stageData.stage === 'completed' && stageData.status === 'completed') {
        job.status = 'completed';
        job.workflow.actualCompletionDate = new Date();
      }

      await job.save();

      // Müşteriye bildirim gönder
      await this.sendStageUpdateNotification(job, stageData.stage, stageData.status);

      return {
        success: true,
        data: job,
        message: 'İş akışı aşaması güncellendi'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Müşteri onayı al
   */
  static async requestCustomerApproval(jobId: string, stage: string, photos?: string[]) {
    try {
      const job = await BodyworkJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
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

    } catch (error) {
      throw error;
    }
  }

  /**
   * Kalite kontrol yap
   */
  static async performQualityCheck(jobId: string, qualityData: {
    passed: boolean;
    checkedBy: string;
    issues?: string[];
    photos?: string[];
    notes?: string;
  }) {
    try {
      const job = await BodyworkJob.findById(jobId);
      if (!job) {
        throw new CustomError('İş bulunamadı', 404);
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
      }

      await job.save();

      return {
        success: true,
        data: job,
        message: 'Kalite kontrol tamamlandı'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Ustanın kaporta işlerini getir
   */
  static async getMechanicBodyworkJobs(mechanicId: string, status?: string) {
    try {
      const query: any = { mechanicId };
      if (status) {
        query.status = status;
      }

      const jobs = await BodyworkJob.find(query)
        .populate('customerId', 'name surname phone email')
        .populate('vehicleId', 'brand modelName plateNumber year')
        .sort({ createdAt: -1 })
        .lean(); // 🚀 OPTIMIZE: Memory optimization

      return {
        success: true,
        data: jobs,
        message: 'Kaporta işleri getirildi'
      };

    } catch (error) {
      throw error;
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
      const template = new BodyworkTemplate(data);
      await template.save();

      return {
        success: true,
        data: template,
        message: 'Şablon başarıyla oluşturuldu'
      };

    } catch (error) {
      throw error;
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
   * Teklif bildirimi gönder (mock)
   */
  private static async sendQuoteNotification(job: IBodyworkJob) {
    // Burada gerçek SMS/push notification servisi entegrasyonu yapılacak
    console.log(`Teklif gönderildi: ${job._id} - ${job.quote.totalAmount}₺`);
  }

  /**
   * Aşama güncelleme bildirimi gönder (mock)
   */
  private static async sendStageUpdateNotification(job: IBodyworkJob, stage: string, status: string) {
    // Burada gerçek SMS/push notification servisi entegrasyonu yapılacak
    console.log(`Aşama güncellendi: ${job._id} - ${stage} - ${status}`);
  }

  /**
   * Onay isteme bildirimi gönder (mock)
   */
  private static async sendApprovalRequestNotification(job: IBodyworkJob, stage: string) {
    // Burada gerçek SMS/push notification servisi entegrasyonu yapılacak
    console.log(`Onay istendi: ${job._id} - ${stage}`);
  }
}
