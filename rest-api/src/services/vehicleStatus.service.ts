import { Types } from 'mongoose';
import { Appointment } from '../models/Appointment';
import { FaultReport } from '../models/FaultReport';
import { Vehicle, IVehicle } from '../models/Vehicle';
import { VehicleStatusRecordModel } from '../models/HomeRecords';
import { AppointmentStatus, ServiceType, ServiceCategory, SERVICE_CATEGORY_TURKISH_NAMES } from '../../../shared/types/enums';
import { translateServiceType } from '../utils/serviceTypeTranslator';
import { EstimateResult, OdometerService } from './odometer.service';
import { logger } from '../utils/monitoring';
import {
  MaintenanceRecommendation,
  MaintenanceRecommendationEngine,
} from './maintenanceRecommendation.service';
import { AnalyticsEvent } from '../models/AnalyticsEvent';
import { DEFAULT_KM_PER_DAY } from '../../../shared/config/mileage';
import { getFaultReportServiceCategory } from '../utils/serviceCategoryHelper';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const KEYWORD_TAGS: Record<string, string[]> = {
  yağ: ['yağ', 'motor', 'general_maintenance'],
  motor: ['motor', 'general_maintenance'],
  fren: ['fren', 'general_maintenance'],
  balata: ['fren', 'general_maintenance'],
  disk: ['fren'],
  lastik: ['lastik', 'tire_service'],
  şanzıman: ['şanzıman', 'vites', 'general_maintenance'],
  vites: ['şanzıman', 'vites'],
  batarya: ['batarya', 'electrical'],
  akü: ['batarya', 'electrical'],
  triger: ['triger', 'motor'],
};

const SERVICE_CATEGORY_TAGS: Record<string, string[]> = {
  'Tamir ve Bakım': ['general_maintenance', 'motor', 'yağ'],
  tamir_ve_bakım: ['general_maintenance', 'motor', 'yağ'],
  'Genel Bakım': ['general_maintenance'],
  genel_bakım: ['general_maintenance'],
  'Ağır Bakım': ['general_maintenance'],
  ağır_bakım: ['general_maintenance'],
  'Üst Takım': ['general_maintenance'],
  üst_takım: ['general_maintenance'],
  'Alt Takım': ['general_maintenance'],
  alt_takım: ['general_maintenance'],
  Lastik: ['lastik', 'tire_service'],
  lastik: ['lastik', 'tire_service'],
  'Lastik & Parça': ['lastik', 'tire_service'],
  'lastik_&_parça': ['lastik', 'tire_service'],
  'Elektrik-Elektronik': ['electrical', 'batarya'],
  elektrik_elektronik: ['electrical', 'batarya'],
  Elektrik: ['electrical'],
  elektrik: ['electrical'],
  'Kaporta/Boya': ['bodywork'],
  kaporta_boya: ['bodywork'],
};

const getServiceCategoryDisplayName = (raw?: string | null): string | null => {
  if (!raw) {
    return null;
  }
  const normalizedCategory = getFaultReportServiceCategory(raw);
  const names = SERVICE_CATEGORY_TURKISH_NAMES[normalizedCategory as ServiceCategory];
  if (names && names.length > 0) {
    return names[0];
  }
  return raw;
};

type VehicleSnapshot = Pick<
  IVehicle,
  | '_id'
  | 'userId'
  | 'lastMaintenanceDate'
  | 'nextMaintenanceDate'
  | 'mileage'
  | 'updatedAt'
  | 'createdAt'
  | 'brand'
  | 'modelName'
  | 'fuelType'
  | 'transmission'
  | 'year'
>;

type AppointmentLean = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  serviceType: ServiceType | string;
  appointmentDate?: Date;
  completionDate?: Date;
  status: AppointmentStatus | string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type FaultReportLean = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  faultDescription: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  serviceCategory?: string;
  createdAt?: Date;
};

export type VehicleStatusSummary = {
  vehicleId: string;
  overallStatus: 'excellent' | 'good' | 'warning' | 'critical';
  score: number;
  lastCheck: Date;
  nextServiceDate: Date | null;
  mileage: number | null;
  issues: string[];
  recommendations: MaintenanceRecommendation[];
  metrics: {
    daysSinceLastCheck: number | null;
    upcomingServiceInDays: number | null;
    activeFaults: number;
    odometerConfidence: number | null;
    pendingAppointments: number;
  };
  details: {
    upcomingAppointments: Array<{
      id: string;
      service: string;
      date: Date | null;
      status: string;
    }>;
    activeFaults: Array<{
      id: string;
      description: string;
      priority: string;
      createdAt: Date | null;
    }>;
    lastCompletedServiceId?: string;
    recommendations: MaintenanceRecommendation[];
  };
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil',
};

const PRIORITY_PENALTIES: Record<string, number> = {
  low: 6,
  medium: 12,
  high: 20,
  urgent: 26,
};

const UPCOMING_STATUSES = new Set<AppointmentStatus | string>([
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.REQUESTED,
  AppointmentStatus.PAYMENT_PENDING,
]);

const toObjectId = (value?: string | Types.ObjectId | null) => {
  if (!value) {
    return null;
  }
  if (value instanceof Types.ObjectId) {
    return value;
  }
  return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
};

const daysBetween = (from?: Date | null, to: Date = new Date()) => {
  if (!from) {
    return null;
  }
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
};

const truncateText = (value: string, maxLength = 80) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
};

const normalizeTag = (value?: string | null) =>
  value ? value.toLowerCase().replace(/[^a-z0-9ğüşöçı]+/g, '_').replace(/^_+|_+$/g, '') : '';

const isServiceType = (value: string): value is ServiceType =>
  Object.values(ServiceType).includes(value as ServiceType);

export class VehicleStatusService {
  static async getStatusForUser({
    userId,
    tenantId,
    vehicle,
    odometerEstimate,
    persist = true,
  }: {
    userId: string;
    tenantId: string;
    vehicle?: VehicleSnapshot | null;
    odometerEstimate?: EstimateResult | null;
    persist?: boolean;
  }): Promise<VehicleStatusSummary | null> {
    const resolvedVehicle = vehicle ?? (await this.resolvePrimaryVehicle(userId));
    if (!resolvedVehicle?._id) {
      return null;
    }

    const estimate =
      odometerEstimate ??
      (await this.tryGetOdometerEstimate({
        tenantId,
        vehicleId: resolvedVehicle._id.toString(),
      }));

    const summary = await this.computeSummary({
      userId,
      tenantId,
      vehicle: resolvedVehicle,
      odometerEstimate: estimate,
    });

    if (persist) {
      await this.persistSummary(userId, summary);
    }

    if (summary.recommendations.length > 0) {
      await this.recordRecommendationTelemetry({
        tenantId,
        userId,
        vehicleId: summary.vehicleId,
        recommendations: summary.recommendations,
        odometerStatus: estimate?.status?.code ?? 'UNKNOWN',
      });
    }

    return summary;
  }

  private static async resolvePrimaryVehicle(userId: string): Promise<VehicleSnapshot | null> {
    const userObjectId = toObjectId(userId);
    if (!userObjectId) {
      return null;
    }

    return Vehicle.findOne({ userId: userObjectId })
      .sort({ isFavorite: -1, createdAt: -1 })
      .lean<VehicleSnapshot>()
      .exec();
  }

  private static async tryGetOdometerEstimate({
    tenantId,
    vehicleId,
  }: {
    tenantId: string;
    vehicleId: string;
  }): Promise<EstimateResult | null> {
    try {
      return await OdometerService.getEstimate({
        tenantId,
        vehicleId,
        forceRefresh: false,
      });
    } catch (error) {
      logger.debug?.('Odometer estimate alınamadı, hesaplama onsuz devam edecek.', {
        tenantId,
        vehicleId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private static async computeSummary({
    userId,
    tenantId,
    vehicle,
    odometerEstimate,
  }: {
    userId: string;
    tenantId: string;
    vehicle: VehicleSnapshot;
    odometerEstimate?: EstimateResult | null;
  }): Promise<VehicleStatusSummary> {
    const now = new Date();
    const userObjectId = toObjectId(userId);
    const vehicleIdValue = (vehicle as any)._id;
    const vehicleObjectId = toObjectId(vehicleIdValue);
    if (!vehicleObjectId) {
      throw new Error('Araç ID geçersiz: kilometre özeti hesaplanamadı.');
    }

    const appointmentMatch: Record<string, any> = {
      vehicleId: vehicleObjectId,
      status: {
        $in: [
          AppointmentStatus.COMPLETED,
          AppointmentStatus.SCHEDULED,
          AppointmentStatus.REQUESTED,
          AppointmentStatus.IN_SERVICE,
          AppointmentStatus.PAYMENT_PENDING,
        ],
      },
    };
    if (userObjectId) {
      appointmentMatch.userId = userObjectId;
    }

    const [appointmentsRaw, activeFaultsRaw] = await Promise.all([
      Appointment.find(appointmentMatch).sort({ appointmentDate: 1 }).lean().exec(),
      FaultReport.find({
        vehicleId: vehicleObjectId,
        ...(userObjectId ? { userId: userObjectId } : {}),
        status: { $nin: ['completed', 'cancelled'] },
      })
        .sort({ priority: -1, createdAt: -1 })
        .limit(5)
        .lean()
        .exec(),
    ]);

    const appointments = Array.isArray(appointmentsRaw)
      ? (appointmentsRaw as unknown as AppointmentLean[])
      : [];
    const activeFaults = Array.isArray(activeFaultsRaw)
      ? (activeFaultsRaw as unknown as FaultReportLean[])
      : [];

    const lastCompletedService = appointments
      .filter((item) => item.status === AppointmentStatus.COMPLETED)
      .reduce<AppointmentLean | null>((latest, current) => {
        const latestDate =
          latest?.completionDate ||
          latest?.appointmentDate ||
          latest?.updatedAt ||
          latest?.createdAt ||
          null;
        const currentDate =
          current.completionDate || current.appointmentDate || current.updatedAt || current.createdAt || null;

        if (!currentDate) {
          return latest;
        }
        if (!latestDate || currentDate > latestDate) {
          return current;
        }
        return latest;
      }, null);

    const inServiceAppointments = appointments
      .filter((item) => item.status === AppointmentStatus.IN_SERVICE)
      .sort((a, b) => {
        const aDate = a.appointmentDate?.getTime() ?? 0;
        const bDate = b.appointmentDate?.getTime() ?? 0;
        return bDate - aDate;
      });

    const upcomingAppointments = appointments
      .filter((item) => UPCOMING_STATUSES.has(item.status))
      .sort((a, b) => {
        const aDate = a.appointmentDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = b.appointmentDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });

    const lastCheckCandidate =
      lastCompletedService?.completionDate ||
      lastCompletedService?.appointmentDate ||
      vehicle.lastMaintenanceDate ||
      vehicle.updatedAt ||
      vehicle.createdAt ||
      now;

    const lastCheck = new Date(lastCheckCandidate);
    const daysSinceLastCheck = daysBetween(lastCheck, now);

    const nextServiceDateCandidate =
      upcomingAppointments[0]?.appointmentDate || vehicle.nextMaintenanceDate || null;
    const nextServiceDate = nextServiceDateCandidate ? new Date(nextServiceDateCandidate) : null;
    const upcomingServiceInDays = daysBetween(nextServiceDate, now);

    const mileage =
      typeof odometerEstimate?.estimateKm === 'number'
        ? Math.round(odometerEstimate.estimateKm)
        : typeof vehicle.mileage === 'number'
        ? vehicle.mileage
        : null;

    const odometerConfidence =
      typeof odometerEstimate?.confidence === 'number' ? odometerEstimate.confidence : null;

    let score = 92;
    const issues: string[] = [];
    const issueSet = new Set<string>();
    const addIssue = (message: string, penalty = 0) => {
      if (!issueSet.has(message)) {
        issues.push(message);
        issueSet.add(message);
      }
      if (penalty > 0) {
        score = Math.max(0, score - penalty);
      }
    };

    const applyBonus = (value: number) => {
      if (value > 0) {
        score = Math.min(100, score + value);
      }
    };

    if (!lastCompletedService) {
      addIssue('Araç için tamamlanmış bir servis kaydı bulunmuyor.', 15);
    }

    if (typeof daysSinceLastCheck === 'number') {
      if (daysSinceLastCheck <= 60) {
        applyBonus(4);
      } else if (daysSinceLastCheck <= 120) {
        applyBonus(2);
      }

      if (daysSinceLastCheck > 360) {
        addIssue(
          `Son bakım ${daysSinceLastCheck} gün önce yapılmış. Acil servis planlayın.`,
          28
        );
      } else if (daysSinceLastCheck > 210) {
        addIssue(`Son bakım ${daysSinceLastCheck} gün önce yapılmış. Yakında bakım önerilir.`, 18);
      } else if (daysSinceLastCheck > 150) {
        addIssue(`Son bakım ${daysSinceLastCheck} gün önce yapılmış. Takipte kalın.`, 10);
      }
    }

    if (vehicle.nextMaintenanceDate && vehicle.nextMaintenanceDate < now) {
      addIssue(
        `Planlanan bakım tarihi (${vehicle.nextMaintenanceDate.toLocaleDateString('tr-TR')}) geçmiş.`,
        15
      );
    }

    if (inServiceAppointments.length > 0) {
      const currentService = inServiceAppointments[0];
      addIssue(
        `Araç serviste: ${translateServiceType(String(currentService.serviceType))}.`,
        8
      );
    }

    activeFaults.forEach((fault) => {
      const priority = fault.priority ?? 'medium';
      const penalty = PRIORITY_PENALTIES[priority] ?? PRIORITY_PENALTIES.medium;
      const label = PRIORITY_LABELS[priority] ?? PRIORITY_LABELS.medium;
      const categoryLabel = getServiceCategoryDisplayName(fault.serviceCategory) ?? 'Bilinmeyen kategori';
      const description = fault.faultDescription?.trim()
        ? truncateText(fault.faultDescription, 160)
        : 'Açıklama bulunmuyor.';
      addIssue(`Arıza (${label}) · ${categoryLabel}: ${description}`, penalty);
    });

    if (typeof odometerConfidence === 'number') {
      if (odometerConfidence < 0.35) {
        addIssue('Kilometre verisinin güveni çok düşük. Doğrulama gerekli.', 14);
      } else if (odometerConfidence < 0.55) {
        addIssue('Kilometre verisinin güveni düşük. Yakında doğrulama yapın.', 7);
      } else if (odometerConfidence >= 0.75 && (daysSinceLastCheck ?? Infinity) <= 90) {
        applyBonus(3);
      }
    }

    if (issues.length === 0 && score >= 85) {
      issues.push('Araç sağlığı iyi görünüyor. Planlı bakımları aksatmayın.');
    }

    let overallStatus: VehicleStatusSummary['overallStatus'];
    if (score >= 85) {
      overallStatus = 'excellent';
    } else if (score >= 70) {
      overallStatus = 'good';
    } else if (score >= 55) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'critical';
    }

    const lastServiceByType = this.buildLastServiceMap(appointments);
    const activeFaultTags = this.extractFaultTags(activeFaults);
    const kmPerDay =
      odometerEstimate && odometerEstimate.rateKmPerDay > 0
        ? odometerEstimate.rateKmPerDay
        : DEFAULT_KM_PER_DAY;
    const recommendationsContext = MaintenanceRecommendationEngine.buildContext({
      vehicleCreatedAt: vehicle.createdAt ?? vehicle.updatedAt,
      vehicleUpdatedAt: vehicle.updatedAt,
      fuelType: (vehicle as any).fuelType,
      transmission: (vehicle as any).transmission,
      currentKm: mileage ?? null,
      kmPerDay,
      lastServiceByType,
      activeFaultCategories: activeFaultTags,
    });
    const recommendations = MaintenanceRecommendationEngine.generateRecommendations(recommendationsContext);

    const summary: VehicleStatusSummary = {
      vehicleId: vehicleObjectId.toHexString(),
      overallStatus,
      score,
      lastCheck,
      nextServiceDate,
      mileage,
      issues,
      recommendations,
      metrics: {
        daysSinceLastCheck,
        upcomingServiceInDays,
        activeFaults: activeFaults.length,
        odometerConfidence,
        pendingAppointments: upcomingAppointments.length,
      },
      details: {
        upcomingAppointments: upcomingAppointments.slice(0, 3).map((appointment) => ({
          id: appointment._id.toHexString(),
          service: translateServiceType(String(appointment.serviceType)),
          date: appointment.appointmentDate ?? null,
          status: String(appointment.status),
        })),
        activeFaults: activeFaults.map((fault) => ({
          id: fault._id.toHexString(),
          description: truncateText(fault.faultDescription, 120),
          priority: PRIORITY_LABELS[fault.priority ?? 'medium'] ?? 'Orta',
          serviceCategory: getServiceCategoryDisplayName(fault.serviceCategory),
          createdAt: fault.createdAt ?? null,
        })),
        lastCompletedServiceId: lastCompletedService?._id?.toHexString(),
        recommendations,
      },
    };

    if (recommendations.length > 0) {
      await this.recordRecommendationTelemetry({
        tenantId,
        userId,
        vehicleId: vehicleObjectId.toHexString(),
        recommendations,
        odometerStatus: odometerEstimate?.status?.code ?? 'UNKNOWN',
      });
    }

    return summary;
  }

  private static async persistSummary(userId: string, summary: VehicleStatusSummary): Promise<void> {
    await VehicleStatusRecordModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          overallStatus: summary.overallStatus,
          lastCheck: summary.lastCheck,
          nextServiceDate: summary.nextServiceDate ?? null,
          mileage: summary.mileage ?? null,
          issues: summary.issues,
          recommendations: summary.recommendations,
        },
        $setOnInsert: {
          userId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  private static buildLastServiceMap(appointments: AppointmentLean[]): Map<ServiceType, { date: Date; appointmentId: string }> {
    const map = new Map<ServiceType, { date: Date; appointmentId: string }>();
    for (const appointment of appointments) {
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        continue;
      }
      const type = String(appointment.serviceType);
      if (!isServiceType(type)) {
        continue;
      }
      const referenceDate =
        appointment.completionDate || appointment.appointmentDate || appointment.updatedAt || appointment.createdAt;
      if (!referenceDate) {
        continue;
      }
      const existing = map.get(type);
      if (!existing || referenceDate > existing.date) {
        map.set(type, { date: referenceDate, appointmentId: appointment._id.toHexString() });
      }
    }
    return map;
  }

  private static extractFaultTags(faults: FaultReportLean[]): Set<string> {
    const tags = new Set<string>();
    for (const fault of faults) {
      if (fault.serviceCategory) {
        const normalized = normalizeTag(fault.serviceCategory);
        if (normalized) {
          tags.add(normalized);
          SERVICE_CATEGORY_TAGS[normalized]?.forEach((tag) => tags.add(tag));
        }
        SERVICE_CATEGORY_TAGS[fault.serviceCategory]?.forEach((tag) => tags.add(tag));
      }
      if (fault.priority === 'high' || fault.priority === 'urgent') {
        tags.add('critical');
      }
      if (fault.faultDescription) {
        const words = fault.faultDescription.toLowerCase().split(/[\s,.;:/\\]+/);
        for (const word of words) {
          const mapped = KEYWORD_TAGS[word];
          if (mapped) {
            mapped.forEach((tag) => tags.add(tag));
          }
        }
      }
    }
    return tags;
  }

  private static async recordRecommendationTelemetry(params: {
    tenantId: string;
    userId: string;
    vehicleId: string;
    recommendations: MaintenanceRecommendation[];
    odometerStatus: string;
  }): Promise<void> {
    try {
      const analyticsPayload: any = {
        tenantId: params.tenantId,
        event: 'maintenance_recommendation_shown',
        timestamp: new Date(),
        properties: {
          vehicleId: params.vehicleId,
          recommendationCount: params.recommendations.length,
          severities: params.recommendations.reduce<Record<string, number>>((acc, item) => {
            acc[item.severity] = (acc[item.severity] ?? 0) + 1;
            return acc;
          }, {}),
          ruleIds: params.recommendations.map((item) => item.ruleId),
          odometerStatus: params.odometerStatus,
        },
      };

      if (Types.ObjectId.isValid(params.userId)) {
        analyticsPayload.userId = new Types.ObjectId(params.userId);
      }

      await AnalyticsEvent.create(analyticsPayload);
    } catch (error) {
      logger.warn('Maintenance recommendation telemetry kaydedilemedi', {
        tenantId: params.tenantId,
        userId: params.userId,
        vehicleId: params.vehicleId,
        error,
      });
    }
  }
}

