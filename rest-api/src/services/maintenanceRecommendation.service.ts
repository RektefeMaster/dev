import { ServiceType } from '../../../shared/types/enums';
import { MAINTENANCE_RULES, MaintenanceRule, MaintenanceSeverity } from '../config/maintenanceRules';

type Nullable<T> = T | null | undefined;

export interface MaintenanceRecommendation {
  ruleId: string;
  title: string;
  severity: MaintenanceSeverity;
  message: string;
  dueInKm?: number | null;
  dueInDays?: number | null;
  recommendedActions: string[];
  reasonCodes: string[];
  relatedServiceTypes: ServiceType[];
}

export interface MaintenanceRecommendationContext {
  now: Date;
  currentKm: number | null;
  kmPerDay: number;
  vehicleAgeYears: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  lastServiceByType: Map<ServiceType, { date: Date; appointmentId: string }>;
  activeFaultCategories: Set<string>;
}

const DEFAULT_KM_PER_DAY = 30;
const severityPriority: Record<MaintenanceSeverity, number> = { info: 0, warning: 1, critical: 2 };
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const normalizeKm = (value?: number | null) => (typeof value === 'number' && !Number.isNaN(value) ? value : null);

const toYears = (start: Date, end: Date) => (end.getTime() - start.getTime()) / (365.25 * MS_PER_DAY);

const diffDays = (from: Date, to: Date) => Math.max(Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY), 0);

const matchesTransmission = (rule: MaintenanceRule, transmission?: string | null) => {
  if (!rule.applicableTransmissions || rule.applicableTransmissions.length === 0) {
    return true;
  }
  if (!transmission) {
    return false;
  }
  const normalized = transmission.toLowerCase();
  return rule.applicableTransmissions.some((item) => normalized.includes(item.toLowerCase()));
};

const matchesFuelType = (rule: MaintenanceRule, fuelType?: string | null) => {
  if (!rule.applicableFuelTypes || rule.applicableFuelTypes.length === 0) {
    return true;
  }
  if (!fuelType) {
    return false;
  }
  const normalized = fuelType.toLowerCase();
  return rule.applicableFuelTypes.some((item) => normalized.includes(item.toLowerCase()));
};

const escalateSeverity = (current: MaintenanceSeverity, next: MaintenanceSeverity) =>
  severityPriority[next] > severityPriority[current] ? next : current;

export class MaintenanceRecommendationEngine {
  static buildContext(params: {
    vehicleCreatedAt?: Nullable<Date>;
    vehicleUpdatedAt?: Nullable<Date>;
    fuelType?: Nullable<string>;
    transmission?: Nullable<string>;
    currentKm?: Nullable<number>;
    kmPerDay?: Nullable<number>;
    lastServiceByType: Map<ServiceType, { date: Date; appointmentId: string }>;
    activeFaultCategories: Set<string>;
    now?: Date;
  }): MaintenanceRecommendationContext {
    const now = params.now ?? new Date();
    const createdAt = params.vehicleCreatedAt ?? params.vehicleUpdatedAt ?? now;
    const vehicleAgeYears = createdAt ? toYears(createdAt, now) : null;
    const kmPerDay =
      typeof params.kmPerDay === 'number' && params.kmPerDay > 0 ? params.kmPerDay : DEFAULT_KM_PER_DAY;

    return {
      now,
      currentKm: normalizeKm(params.currentKm),
      kmPerDay,
      vehicleAgeYears,
      fuelType: params.fuelType ?? null,
      transmission: params.transmission ?? null,
      lastServiceByType: params.lastServiceByType,
      activeFaultCategories: params.activeFaultCategories,
    };
  }

  static generateRecommendations(context: MaintenanceRecommendationContext): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];

    for (const rule of MAINTENANCE_RULES) {
      if (!matchesFuelType(rule, context.fuelType)) {
        continue;
      }
      if (!matchesTransmission(rule, context.transmission)) {
        continue;
      }
      if (rule.minVehicleAgeYears && context.vehicleAgeYears !== null && context.vehicleAgeYears < rule.minVehicleAgeYears) {
        continue;
      }
      if (rule.minMileage && context.currentKm !== null && context.currentKm < rule.minMileage) {
        continue;
      }

      const { dueInKm, dueInDays, severity, reasonCodes } = this.evaluateRule(rule, context);
      if (!dueInKm && !dueInDays && reasonCodes.length === 0) {
        continue;
      }

      recommendations.push({
        ruleId: rule.id,
        title: rule.title,
        severity,
        message: rule.description,
        dueInKm,
        dueInDays,
        recommendedActions: rule.recommendedActions,
        reasonCodes,
        relatedServiceTypes: rule.serviceTypes,
      });
    }

    return recommendations.sort((a, b) => severityPriority[b.severity] - severityPriority[a.severity]);
  }

  private static evaluateRule(
    rule: MaintenanceRule,
    context: MaintenanceRecommendationContext
  ): { dueInKm: number | null; dueInDays: number | null; severity: MaintenanceSeverity; reasonCodes: string[] } {
    const reasonCodes: string[] = [];
    let severity: MaintenanceSeverity = rule.severity;
    let dueInKm: number | null = null;
    let dueInDays: number | null = null;

    const lastService = this.findLastService(rule.serviceTypes, context.lastServiceByType);
    if (rule.kmInterval && context.currentKm !== null) {
      if (lastService) {
        const daysSince = diffDays(lastService.date, context.now);
        const estimatedKmSince = Math.max(daysSince * context.kmPerDay, 0);
        dueInKm = Math.max(rule.kmInterval - estimatedKmSince, 0);
        if (dueInKm === 0) {
          severity = escalateSeverity(severity, 'critical');
          reasonCodes.push('KM_OVERDUE');
        } else if (dueInKm <= 2000) {
          severity = escalateSeverity(severity, 'warning');
          reasonCodes.push('KM_UPCOMING');
        }
      } else {
        dueInKm = 0;
        severity = escalateSeverity(severity, 'critical');
        reasonCodes.push('NO_SERVICE_HISTORY');
      }
    }

    if (rule.monthInterval) {
      if (lastService) {
        const daysSince = diffDays(lastService.date, context.now);
        dueInDays = Math.max(rule.monthInterval * 30 - daysSince, 0);
        if (dueInDays === 0) {
          severity = escalateSeverity(severity, 'critical');
          reasonCodes.push('TIME_OVERDUE');
        } else if (dueInDays <= 30) {
          severity = escalateSeverity(severity, 'warning');
          reasonCodes.push('TIME_UPCOMING');
        }
      } else {
        dueInDays = 0;
        severity = escalateSeverity(severity, 'critical');
        reasonCodes.push('NO_SERVICE_HISTORY');
      }
    }

    if (context.activeFaultCategories.size > 0 && rule.tags?.some((tag) => context.activeFaultCategories.has(tag))) {
      severity = escalateSeverity(severity, 'critical');
      reasonCodes.push('RELATED_FAULT_ACTIVE');
    }

    if (rule.minVehicleAgeYears && (context.vehicleAgeYears ?? 0) >= rule.minVehicleAgeYears) {
      severity = escalateSeverity(severity, 'warning');
      reasonCodes.push('VEHICLE_AGE');
    }

    return { dueInKm, dueInDays, severity, reasonCodes };
  }

  private static findLastService(
    serviceTypes: ServiceType[],
    lastServiceByType: Map<ServiceType, { date: Date; appointmentId: string }>
  ) {
    let latest: { date: Date; appointmentId: string } | null = null;
    for (const type of serviceTypes) {
      const record = lastServiceByType.get(type);
      if (!record) {
        continue;
      }
      if (!latest || record.date > latest.date) {
        latest = record;
      }
    }
    return latest;
  }
}


