import mongoose, { Schema, Document } from 'mongoose';

export interface IWashDispute extends Document {
  // İlişkiler
  orderId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  
  // İtiraz tipi
  type: 'damage' | 'quality' | 'missing_service' | 'overcharge' | 'other';
  
  // İtiraz detayları
  title: string;
  description: string;
  
  // Kanıtlar
  evidence: {
    photos: string[];
    videos?: string[];
    documents?: string[];
  };
  
  // Sürücü bilgileri
  driverClaim: {
    requestedResolution: 'full_refund' | 'partial_refund' | 'redo_service' | 'compensation';
    requestedAmount?: number;
    details: string;
  };
  
  // İşletme yanıtı
  providerResponse?: {
    statement: string;
    counterEvidence: {
      photos: string[];
      videos?: string[];
      documents?: string[];
    };
    responseDate: Date;
    acceptsResponsibility: boolean;
    offeredResolution?: string;
    offeredAmount?: number;
  };
  
  // Admin incelemesi
  adminReview?: {
    reviewedBy: mongoose.Types.ObjectId;
    reviewDate: Date;
    findings: string;
    decision: 'driver_favor' | 'provider_favor' | 'partial' | 'dismissed';
    reasoning: string;
    evidenceReview: string;
  };
  
  // Çözüm
  resolution?: {
    type: 'refund' | 'partial_refund' | 'redo_service' | 'compensation' | 'dismissed';
    amount?: number;
    description: string;
    resolvedBy: mongoose.Types.ObjectId;
    resolvedDate: Date;
    driverAccepted: boolean;
    providerAccepted: boolean;
  };
  
  // Escrow işlemleri
  escrow: {
    originalAmount: number;
    heldAmount: number;
    refundAmount: number;
    providerPenalty?: number;
    adminFee?: number;
    escrowReleaseDate?: Date;
  };
  
  // Durum
  status: 
    | 'OPENED' 
    | 'PROVIDER_NOTIFIED'
    | 'PROVIDER_RESPONDED'
    | 'UNDER_ADMIN_REVIEW'
    | 'RESOLUTION_PROPOSED'
    | 'RESOLVED'
    | 'ESCALATED'
    | 'CLOSED';
  
  // Zaman damgaları
  timestamps: {
    openedAt: Date;
    providerNotifiedAt?: Date;
    providerResponseDeadline?: Date;
    adminReviewStartedAt?: Date;
    resolutionProposedAt?: Date;
    resolvedAt?: Date;
    closedAt?: Date;
  };
  
  // SLA takibi
  sla: {
    responseTimeHours: number;
    resolutionTimeHours: number;
    isOverdue: boolean;
    escalationLevel: 0 | 1 | 2 | 3;
  };
  
  // İletişim geçmişi
  communications: Array<{
    from: 'driver' | 'provider' | 'admin';
    to: 'driver' | 'provider' | 'admin';
    message: string;
    attachments?: string[];
    timestamp: Date;
    readAt?: Date;
  }>;
  
  // İtibar etkileri
  reputationImpact: {
    providerScoreChange: number;
    driverScoreChange: number;
    appliedAt?: Date;
  };
  
  // Notlar (admin için)
  internalNotes?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const WashDisputeSchema = new Schema<IWashDispute>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'WashOrder',
      required: true,
      unique: true
      // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
      // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
      // index: true kaldırıldı - aşağıda schema.index() ile tanımlanıyor
    },
    type: {
      type: String,
      enum: ['damage', 'quality', 'missing_service', 'overcharge', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidence: {
      photos: [String],
      videos: [String],
      documents: [String],
    },
    driverClaim: {
      requestedResolution: {
        type: String,
        enum: ['full_refund', 'partial_refund', 'redo_service', 'compensation'],
        required: true,
      },
      requestedAmount: Number,
      details: { type: String, required: true },
    },
    providerResponse: {
      statement: String,
      counterEvidence: {
        photos: [String],
        videos: [String],
        documents: [String],
      },
      responseDate: Date,
      acceptsResponsibility: Boolean,
      offeredResolution: String,
      offeredAmount: Number,
    },
    adminReview: {
      reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewDate: Date,
      findings: String,
      decision: {
        type: String,
        enum: ['driver_favor', 'provider_favor', 'partial', 'dismissed'],
      },
      reasoning: String,
      evidenceReview: String,
    },
    resolution: {
      type: {
        type: String,
        enum: ['refund', 'partial_refund', 'redo_service', 'compensation', 'dismissed'],
      },
      amount: Number,
      description: String,
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      resolvedDate: Date,
      driverAccepted: { type: Boolean, default: false },
      providerAccepted: { type: Boolean, default: false },
    },
    escrow: {
      originalAmount: { type: Number, required: true },
      heldAmount: { type: Number, required: true },
      refundAmount: { type: Number, default: 0 },
      providerPenalty: Number,
      adminFee: Number,
      escrowReleaseDate: Date,
    },
    status: {
      type: String,
      enum: [
        'OPENED',
        'PROVIDER_NOTIFIED',
        'PROVIDER_RESPONDED',
        'UNDER_ADMIN_REVIEW',
        'RESOLUTION_PROPOSED',
        'RESOLVED',
        'ESCALATED',
        'CLOSED',
      ],
      default: 'OPENED',
      required: true,
      index: true,
    },
    timestamps: {
      openedAt: { type: Date, required: true, default: Date.now },
      providerNotifiedAt: Date,
      providerResponseDeadline: Date,
      adminReviewStartedAt: Date,
      resolutionProposedAt: Date,
      resolvedAt: Date,
      closedAt: Date,
    },
    sla: {
      responseTimeHours: { type: Number, default: 24 },
      resolutionTimeHours: { type: Number, default: 72 },
      isOverdue: { type: Boolean, default: false },
      escalationLevel: { type: Number, enum: [0, 1, 2, 3], default: 0 },
    },
    communications: [{
      from: {
        type: String,
        enum: ['driver', 'provider', 'admin'],
        required: true,
      },
      to: {
        type: String,
        enum: ['driver', 'provider', 'admin'],
        required: true,
      },
      message: { type: String, required: true },
      attachments: [String],
      timestamp: { type: Date, default: Date.now },
      readAt: Date,
    }],
    reputationImpact: {
      providerScoreChange: { type: Number, default: 0 },
      driverScoreChange: { type: Number, default: 0 },
      appliedAt: Date,
    },
    internalNotes: String,
  },
  {
    timestamps: true,
  }
);

// İndeksler
WashDisputeSchema.index({ orderId: 1 });
WashDisputeSchema.index({ driverId: 1, status: 1 });
WashDisputeSchema.index({ providerId: 1, status: 1 });
WashDisputeSchema.index({ status: 1, 'timestamps.openedAt': -1 });
WashDisputeSchema.index({ 'sla.isOverdue': 1, status: 1 });

// SLA kontrolü için middleware
WashDisputeSchema.pre('save', function(next) {
  const dispute = this as IWashDispute;
  
  // Sadece açık itirazlar için SLA kontrolleri
  if (dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED') {
    const now = new Date();
    const openedAt = dispute.timestamps.openedAt;
    const hoursSinceOpened = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
    
    // Yanıt süresi kontrolü
    if (hoursSinceOpened > dispute.sla.responseTimeHours && !dispute.providerResponse) {
      dispute.sla.isOverdue = true;
      dispute.sla.escalationLevel = Math.min(3, Math.floor(hoursSinceOpened / dispute.sla.responseTimeHours)) as 0 | 1 | 2 | 3;
    }
    
    // Çözüm süresi kontrolü
    if (hoursSinceOpened > dispute.sla.resolutionTimeHours) {
      dispute.sla.isOverdue = true;
      if (dispute.sla.escalationLevel < 2) {
        dispute.sla.escalationLevel = 2;
      }
    }
  }
  
  next();
});

export const WashDispute = mongoose.model<IWashDispute>('WashDispute', WashDisputeSchema);

