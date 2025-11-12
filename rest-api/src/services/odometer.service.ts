import mongoose, { ClientSession } from 'mongoose';
import { MileageModel, IMileageModel } from '../models/MileageModel';
import {
  IOdometerEvent,
  OdometerEvent,
  OdometerEventEvidenceType,
  OdometerEventSource,
  OdometerUnit,
} from '../models/OdometerEvent';
import { OdometerAuditLog } from '../models/OdometerAuditLog';
import { Vehicle } from '../models/Vehicle';
import {
  ABS_MAX_RATE_PER_DAY,
  BACKPRESSURE_MESSAGE,
  CACHE_TTL_SECONDS,
  CONFIDENCE_MAX,
  CONFIDENCE_MIN,
  CRITICAL_CONFIDENCE_THRESHOLD,
  CRITICAL_STALE_THRESHOLD_DAYS,
  DEFAULT_CONFIDENCE,
  DEFAULT_RATE_KM_PER_DAY,
  HARD_OUTLIER_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
  PENDING_REVIEW_QUEUE,
  PENDING_REVIEW_WARNING_THRESHOLD,
  RATE_MAX,
  RATE_MIN,
  SOFT_OUTLIER_THRESHOLD,
  STALE_THRESHOLD_DAYS,
  getAlphaForEvent,
  getConfidenceDeltaForEvent,
} from '../config/mileage';
import { FeatureFlagKey } from '../config/featureFlags';
import { CacheManager, getRedisClient } from '../config/cache';
import { DistributedLock } from '../utils/distributedLock';
import { CustomError } from '../middleware/errorHandler';
import { ErrorCode } from '../../../shared/types/apiResponse';
import { FeatureFlagService } from './featureFlag.service';
import {
  recordOdometerEvent,
  recordOdometerCalibrationDuration,
  observeOdometerEstimateAbsError,
  observeOdometerShadowError,
  recordOdometerOutlierRatio,
} from '../utils/monitoring';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MILES_TO_KM = 1.60934;

let totalEventsProcessed = 0;
let totalOutliersDetected = 0;

export interface EstimateContext {
  tenantId: string;
  vehicleId: string;
  featureFlags?: Record<string, { enabled: boolean }>;
  forceRefresh?: boolean;
}

export interface RecordEventInput {
  tenantId: string;
  vehicleId: string;
  km: number;
  unit?: OdometerUnit;
  timestampUtc: Date;
  source: OdometerEventSource;
  evidenceType: OdometerEventEvidenceType;
  evidenceUrl?: string;
  notes?: string;
  createdByUserId?: string;
  odometerReset?: boolean;
  clientRequestId?: string;
  metadata?: Record<string, any>;
  featureFlags?: Record<string, { enabled: boolean }>;
}

export type EstimateSeverity = 'info' | 'warning' | 'critical';
export type EstimateHealthCode = 'OK' | 'NO_BASELINE' | 'STALE' | 'LOW_CONFIDENCE';

export interface EstimateStatus {
  code: EstimateHealthCode;
  severity: EstimateSeverity;
  message: string;
}

export interface EstimateResult {
  vehicleId: string;
  tenantId: string;
  estimateKm: number;
  isApproximate: boolean;
  lastTrueKm: number;
  lastTrueTsUtc: Date;
  sinceDays: number;
  rateKmPerDay: number;
  confidence: number;
  sourceSeriesId: string;
  cacheHit: boolean;
  status: EstimateStatus;
  warnings: string[];
}

export interface RecordEventResult {
  event: IOdometerEvent;
  estimate: EstimateResult;
  warnings: string[];
  backPressureWarning?: string;
  pendingReview: boolean;
  outlierClass?: 'soft' | 'hard';
}

const convertToKm = (value: number, unit: OdometerUnit) =>
  unit === 'mi' ? value * MILES_TO_KM : value;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const generateSeriesId = (vehicleId: string) => `series-${vehicleId}-${Date.now()}`;

const getCacheKey = (tenantId: string, vehicleId: string, seriesId: string) =>
  `odo:est:${tenantId}:${vehicleId}:${seriesId}`;

const getShadowCacheKey = (tenantId: string, vehicleId: string, seriesId: string) =>
  `odo:shadow:${tenantId}:${vehicleId}:${seriesId}`;

const computeSinceDays = (from: Date, to: Date) =>
  Math.max((to.getTime() - from.getTime()) / MS_PER_DAY, 0);

const ensureDate = (input: Date | string) => (input instanceof Date ? input : new Date(input));

const isValidRateWeekdayJson = (value?: number[] | null) => {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length !== 7) {
    return false;
  }
  return value.every((entry) => typeof entry === 'number' && entry >= RATE_MIN && entry <= RATE_MAX);
};

const normalizeRateWeekdayJson = (model: IMileageModel): boolean => {
  if (isValidRateWeekdayJson(model.rateWeekdayJson)) {
    return false;
  }

  const baseRate = clamp(model.rateKmPerDay ?? DEFAULT_RATE_KM_PER_DAY, RATE_MIN, RATE_MAX);
  model.rateWeekdayJson = Array(7).fill(baseRate);
  return true;
};

const getUnitForEvent = (unit: OdometerUnit | undefined, mileageModel: IMileageModel) =>
  unit || mileageModel.defaultUnit || 'km';

const getTenantDefault = (tenantId?: string) => tenantId || 'default';

const getFeatureFlagEnabled = async (
  key: FeatureFlagKey,
  tenantId: string,
  userId?: string,
  contextFlags?: Record<string, { enabled: boolean }>
) => {
  const keyString = key as string;
  if (contextFlags && keyString in contextFlags) {
    return contextFlags[keyString].enabled;
  }
  const flag = await FeatureFlagService.getFlag(key, { tenantId, userId });
  return flag.enabled;
};

const queuePendingReview = async (payload: Record<string, any>): Promise<{ warning?: string }> => {
  const redis = getRedisClient();
  if (!redis) {
    return {};
  }

  const queueSize = await redis.llen(PENDING_REVIEW_QUEUE);
  await redis.lpush(PENDING_REVIEW_QUEUE, JSON.stringify(payload));

  if (queueSize >= PENDING_REVIEW_WARNING_THRESHOLD) {
    return { warning: BACKPRESSURE_MESSAGE };
  }

  return {};
};

const loadMileageModel = async (
  tenantId: string,
  vehicleId: mongoose.Types.ObjectId,
  session?: ClientSession,
  defaultUnit: OdometerUnit = 'km'
) => {
  const model = await MileageModel.findOne({ tenantId, vehicleId }).session(session ?? null);
  if (model) {
    const needsNormalization = normalizeRateWeekdayJson(model);
    if (needsNormalization) {
      if (session) {
        await model.save({ session });
      } else {
        await model.save();
      }
    }
    return model;
  }

  const created = new MileageModel({
    tenantId,
    vehicleId,
    seriesId: generateSeriesId(vehicleId.toString()),
    lastTrueKm: 0,
    lastTrueTsUtc: new Date(),
    rateKmPerDay: DEFAULT_RATE_KM_PER_DAY,
    confidence: DEFAULT_CONFIDENCE,
    defaultUnit,
    hasBaseline: false,
    rateWeekdayJson: Array(7).fill(DEFAULT_RATE_KM_PER_DAY),
  });

  if (session) {
    await created.save({ session });
  } else {
    await created.save();
  }

  return created;
};

const createAuditLog = async (
  tenantId: string,
  vehicleId: mongoose.Types.ObjectId,
  seriesId: string,
  action: string,
  detailsJson: Record<string, any>,
  eventId?: mongoose.Types.ObjectId,
  actorUserId?: mongoose.Types.ObjectId,
  session?: ClientSession
) => {
  await OdometerAuditLog.create(
    [
      {
        tenantId,
        vehicleId,
        eventId,
        action,
        detailsJson,
        actorUserId,
        seriesId,
      },
    ],
    { session }
  );
};

export class OdometerService {
  static async getEstimate(context: EstimateContext): Promise<EstimateResult> {
    const tenantId = getTenantDefault(context.tenantId);
    const vehicleObjectId = new mongoose.Types.ObjectId(context.vehicleId);
    const mileageModel = await loadMileageModel(tenantId, vehicleObjectId);
    const now = new Date();
    const hasBaseline =
      typeof mileageModel.hasBaseline === 'boolean'
        ? mileageModel.hasBaseline
        : mileageModel.lastTrueKm > 0;
    const sinceDays = computeSinceDays(mileageModel.lastTrueTsUtc, now);
    const estimateKm = mileageModel.lastTrueKm + mileageModel.rateKmPerDay * sinceDays;
    const warnings: string[] = [];
    const severityPriority: Record<EstimateSeverity, number> = { info: 0, warning: 1, critical: 2 };
    let status: EstimateStatus = {
      code: 'OK',
      severity: 'info',
      message: 'Kilometre tahmini güncel görünüyor.',
    };
    const setStatus = (next: EstimateStatus) => {
      if (
        severityPriority[next.severity] > severityPriority[status.severity] ||
        (severityPriority[next.severity] === severityPriority[status.severity] && status.code === 'OK')
      ) {
        status = next;
      }
    };

    if (!hasBaseline) {
      warnings.push('Bu araç için henüz doğrulanmış bir kilometre kaydı bulunmuyor.');
      setStatus({
        code: 'NO_BASELINE',
        severity: 'warning',
        message: 'İlk kilometre değerini girerek tahmin modelini başlatabilirsiniz.',
      });
    }

    if (hasBaseline) {
      if (sinceDays >= CRITICAL_STALE_THRESHOLD_DAYS) {
        warnings.push(
          `Kilometre verisi ${Math.round(sinceDays)} gündür güncellenmemiş. Güncel değeri girmeniz önerilir.`
        );
        setStatus({
          code: 'STALE',
          severity: 'critical',
          message: 'Kilometre verisi çok eski. Lütfen aracı güncel kilometreyle doğrulayın.',
        });
      } else if (sinceDays >= STALE_THRESHOLD_DAYS) {
        warnings.push(
          `Kilometre verisi ${Math.round(sinceDays)} gündür güncellenmemiş. Tahminler düşük hassasiyetli olabilir.`
        );
        setStatus({
          code: 'STALE',
          severity: 'warning',
          message: 'Kilometre verisi beklenenden eski. Yakında güncelleme yapmanız önerilir.',
        });
      }
    }

    if (mileageModel.confidence <= CRITICAL_CONFIDENCE_THRESHOLD) {
      warnings.push(
        'Kilometre tahmininin güven değeri çok düşük. Bu değer doğrulanana kadar tahminler güvenilir olmayabilir.'
      );
      setStatus({
        code: 'LOW_CONFIDENCE',
        severity: 'critical',
        message: 'Kilometre tahmininin güveni çok düşük. Lütfen kilometreyi doğrulayın.',
      });
    } else if (mileageModel.confidence <= LOW_CONFIDENCE_THRESHOLD) {
      warnings.push(
        'Kilometre tahmininin güveni düşük seviyede. Yakında bir servis kaydıyla doğrulamanız önerilir.'
      );
      setStatus({
        code: 'LOW_CONFIDENCE',
        severity: 'warning',
        message: 'Kilometre tahmininin güveni sınırlı. Doğrulama yapmanız faydalı olur.',
      });
    }

    const isApproximate = status.code !== 'OK' || mileageModel.confidence < 0.7;
    const cacheKey = getCacheKey(tenantId, context.vehicleId, mileageModel.seriesId);

    if (!context.forceRefresh) {
      const cached = await CacheManager.get<EstimateResult>(cacheKey);
      if (cached) {
        return { ...cached, cacheHit: true };
      }
    }

    const result: EstimateResult = {
      vehicleId: context.vehicleId,
      tenantId,
      estimateKm,
      isApproximate,
      lastTrueKm: mileageModel.lastTrueKm,
      lastTrueTsUtc: mileageModel.lastTrueTsUtc,
      sinceDays,
      rateKmPerDay: mileageModel.rateKmPerDay,
      confidence: mileageModel.confidence,
      sourceSeriesId: mileageModel.seriesId,
      cacheHit: false,
      status,
      warnings,
    };

    await CacheManager.set(cacheKey, result, { ttl: CACHE_TTL_SECONDS });
    if (mileageModel.shadowRateKmPerDay) {
      const shadowResult = {
        ...result,
        rateKmPerDay: mileageModel.shadowRateKmPerDay,
      };
      await CacheManager.set(getShadowCacheKey(tenantId, context.vehicleId, mileageModel.seriesId), shadowResult, {
        ttl: CACHE_TTL_SECONDS,
      });
    }

    return result;
  }

  static async recordEvent(input: RecordEventInput): Promise<RecordEventResult> {
    const tenantId = getTenantDefault(input.tenantId);
    const vehicleObjectId = new mongoose.Types.ObjectId(input.vehicleId);
    const now = new Date();
    const timestamp = ensureDate(input.timestampUtc);

    if (timestamp.getTime() > now.getTime() + 1000) {
      throw new CustomError('Gelecek tarihli odometre kaydı alınamaz.', 400, ErrorCode.ERR_ODO_FUTURE_TS);
    }

    const vehicle = await Vehicle.findById(vehicleObjectId);
    if (!vehicle) {
      throw new CustomError('Araç bulunamadı.', 404, ErrorCode.NOT_FOUND);
    }

    const actorUserId = input.createdByUserId ? new mongoose.Types.ObjectId(input.createdByUserId) : undefined;

    const mainFlagEnabled = await getFeatureFlagEnabled(
      FeatureFlagKey.AKILLI_KILOMETRE,
      tenantId,
      actorUserId?.toString(),
      input.featureFlags
    );
    const shadowFlagEnabled = await getFeatureFlagEnabled(
      FeatureFlagKey.AKILLI_KILOMETRE_SHADOW,
      tenantId,
      actorUserId?.toString(),
      input.featureFlags
    );

    if (!mainFlagEnabled && !shadowFlagEnabled) {
      throw new CustomError('Akıllı kilometre özelliği devre dışı.', 403, ErrorCode.ERR_FEATURE_DISABLED);
    }

    const lockKey = `lock:odometer:${tenantId}:${input.vehicleId}`;
    const lockToken = await DistributedLock.acquire(lockKey, {
      ttlMs: 10000,
      retryCount: 5,
      retryDelayMs: 75,
      jitterMs: 50,
    });

    if (!lockToken) {
      throw new CustomError('Kilometre güncelleme kilidi alınamadı, lütfen tekrar deneyin.', 423, ErrorCode.RESOURCE_LOCKED);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const mileageModel = await loadMileageModel(
        tenantId,
        vehicleObjectId,
        session,
        (vehicle.defaultUnit as OdometerUnit) || 'km'
      );
      const unit = getUnitForEvent(input.unit, mileageModel);
      const kmValue = convertToKm(input.km, unit);

      if (!mileageModel.hasBaseline) {
        const vehicleMileage = typeof vehicle.mileage === 'number' ? vehicle.mileage : null;
        if (vehicleMileage !== null && vehicleMileage >= 0) {
          const baselineUnit = (vehicle.defaultUnit as OdometerUnit) || 'km';
          const baselineKmValue = convertToKm(vehicleMileage, baselineUnit);
          mileageModel.lastTrueKm = baselineKmValue;

          const vehicleTimestamp = (vehicle as any).updatedAt ?? (vehicle as any).createdAt ?? now;
          const baselineDate = ensureDate(vehicleTimestamp);
          mileageModel.lastTrueTsUtc =
            baselineDate.getTime() >= now.getTime()
              ? new Date(now.getTime() - MS_PER_DAY)
              : baselineDate;

          mileageModel.defaultUnit = baselineUnit;
          mileageModel.hasBaseline = true;
        }
      }

      if (kmValue < 0) {
        throw new CustomError('Kilometre değeri negatif olamaz.', 400, ErrorCode.ERR_ODO_NEGATIVE);
      }

      if (input.clientRequestId) {
        const existing = await OdometerEvent.findOne({
          tenantId,
          vehicleId: vehicleObjectId,
          clientRequestId: input.clientRequestId,
        }).session(session);
        if (existing) {
          await session.commitTransaction();
          const estimate = await this.getEstimate({
            tenantId,
            vehicleId: input.vehicleId,
            featureFlags: input.featureFlags,
            forceRefresh: true,
          });
          return {
            event: existing,
            estimate,
            warnings: [],
            backPressureWarning: undefined,
            pendingReview: existing.pendingReview,
            outlierClass: existing.outlierClass as 'soft' | 'hard' | undefined,
          };
        }
      }

      let seriesId = mileageModel.seriesId;

      if (input.odometerReset) {
        const newSeriesId = generateSeriesId(input.vehicleId);
        await createAuditLog(
          tenantId,
          vehicleObjectId,
          mileageModel.seriesId,
          'closed',
          {
            reason: 'odometer_reset',
            closedAt: now.toISOString(),
            newSeriesId,
          },
          undefined,
          actorUserId,
          session
        );
        mileageModel.seriesId = newSeriesId;
        mileageModel.lastTrueKm = kmValue;
        mileageModel.lastTrueTsUtc = timestamp;
        mileageModel.rateKmPerDay = DEFAULT_RATE_KM_PER_DAY;
        mileageModel.shadowRateKmPerDay = undefined;
        mileageModel.hasBaseline = true;
        seriesId = newSeriesId;
      }

      const deltaKm = kmValue - mileageModel.lastTrueKm;
      let deltaDays = computeSinceDays(mileageModel.lastTrueTsUtc, timestamp);
      const hasBaseline = mileageModel.hasBaseline;

      if (!hasBaseline && deltaDays <= 0) {
        deltaDays = 1;
      }

      if (!input.odometerReset && deltaKm < 0) {
        throw new CustomError('Yeni kilometre, son doğrulamanın altında olamaz.', 409, ErrorCode.ERR_ODO_DECREASING);
      }

      if (!input.odometerReset && hasBaseline && deltaDays <= 0) {
        throw new CustomError('Kilometre güncellemesi için zaman farkı bulunamadı.', 400, ErrorCode.BUSINESS_RULE_VIOLATION);
      }

      let observedRate = deltaDays > 0 ? deltaKm / deltaDays : 0;
      const warnings: string[] = [];
      let pendingReview = false;
      let outlierClass: 'soft' | 'hard' | undefined;

      if (!input.odometerReset && deltaDays > 0) {
        if (Number.isFinite(ABS_MAX_RATE_PER_DAY) && observedRate > ABS_MAX_RATE_PER_DAY) {
          throw new CustomError(
            'Kilometre artışı olağan dışı derecede yüksek görünüyor. Lütfen değeri kontrol edin.',
            400,
            ErrorCode.ERR_ODO_RATE_TOO_HIGH
          );
        }
        if (observedRate > HARD_OUTLIER_THRESHOLD) {
          pendingReview = true;
          outlierClass = 'hard';
          warnings.push('Olağandışı km artışı tespit edildi. Kayıt inceleme kuyruğuna alındı.');
        } else if (observedRate > SOFT_OUTLIER_THRESHOLD) {
          outlierClass = 'soft';
          warnings.push('Olağandışı km artışı algılandı. α değeri düşürüldü.');
        }
      }

      const alphaBase = getAlphaForEvent(input.source, input.evidenceType);
      const alpha = outlierClass === 'soft' ? alphaBase / 2 : alphaBase;

      let nextRate = mileageModel.rateKmPerDay;
      let newConfidence = mileageModel.confidence;
      let shadowNextRate = mileageModel.shadowRateKmPerDay ?? mileageModel.rateKmPerDay;
      const confidenceDelta = getConfidenceDeltaForEvent(input.source, input.evidenceType);

      if (!pendingReview && deltaDays > 0) {
        const calibrationStart = process.hrtime.bigint();
        observedRate = clamp(observedRate, RATE_MIN, RATE_MAX);
        nextRate = clamp((1 - alpha) * mileageModel.rateKmPerDay + alpha * observedRate, RATE_MIN, RATE_MAX);
        shadowNextRate = clamp((1 - alpha) * shadowNextRate + alpha * observedRate, RATE_MIN, RATE_MAX);
        newConfidence = clamp(mileageModel.confidence + confidenceDelta, CONFIDENCE_MIN, CONFIDENCE_MAX);
        const calibrationDuration = Number(process.hrtime.bigint() - calibrationStart) / 1_000_000_000;
        recordOdometerCalibrationDuration(input.source, calibrationDuration);
      } else if (pendingReview) {
        newConfidence = clamp(mileageModel.confidence - confidenceDelta, CONFIDENCE_MIN, CONFIDENCE_MAX);
      }

      const previousRate = mileageModel.rateKmPerDay;
      const previousConfidence = mileageModel.confidence;
      const previousShadowRate = mileageModel.shadowRateKmPerDay;

      const event = await OdometerEvent.create(
        [
          {
            tenantId,
            vehicleId: vehicleObjectId,
            seriesId,
            km: kmValue,
            unit,
            timestampUtc: timestamp,
            source: input.source,
            evidenceType: input.evidenceType,
            evidenceUrl: input.evidenceUrl,
            notes: input.notes,
            createdByUserId: actorUserId,
            pendingReview,
            odometerReset: Boolean(input.odometerReset),
            outlierClass,
            clientRequestId: input.clientRequestId,
            metadata: input.metadata,
          },
        ],
        { session }
      );

      const createdEvent = event[0] as IOdometerEvent;

      if (!pendingReview) {
        mileageModel.lastTrueKm = kmValue;
        mileageModel.lastTrueTsUtc = timestamp;
        mileageModel.rateKmPerDay = nextRate;
        mileageModel.confidence = newConfidence;
        mileageModel.defaultUnit = unit;
        mileageModel.hasBaseline = true;
        if (shadowFlagEnabled) {
          mileageModel.shadowRateKmPerDay = shadowNextRate;
        }
      }

      await mileageModel.save({ session });

      await createAuditLog(
        tenantId,
        vehicleObjectId,
        seriesId,
        pendingReview ? 'outlier' : 'calibrated',
        {
          deltaKm,
          deltaDays,
          observedRate,
          alpha,
          previousRate,
          nextRate,
          previousConfidence,
          nextConfidence: newConfidence,
          previousShadowRate,
          nextShadowRate: shadowFlagEnabled ? shadowNextRate : undefined,
          pendingReview,
          outlierClass,
          source: input.source,
          evidenceType: input.evidenceType,
        },
        createdEvent._id,
        actorUserId,
        session
      );

      let backPressureWarning: string | undefined;
      if (pendingReview) {
        const queueResult = await queuePendingReview({
          tenantId,
          vehicleId: input.vehicleId,
          eventId: createdEvent._id.toString(),
          timestamp: now.toISOString(),
        });
        backPressureWarning = queueResult.warning;
      }

      await session.commitTransaction();

      const cacheKey = getCacheKey(tenantId, input.vehicleId, mileageModel.seriesId);
      await CacheManager.del(cacheKey);
      await CacheManager.del(getShadowCacheKey(tenantId, input.vehicleId, mileageModel.seriesId));

      const estimate = await this.getEstimate({
        tenantId,
        vehicleId: input.vehicleId,
        featureFlags: input.featureFlags,
        forceRefresh: true,
      });

      if (pendingReview && backPressureWarning) {
        warnings.push(backPressureWarning);
      }

      if (!pendingReview) {
        const absError = Math.abs(estimate.estimateKm - kmValue);
        observeOdometerEstimateAbsError(absError);
        if (shadowFlagEnabled && mileageModel.shadowRateKmPerDay) {
          const shadowEstimate =
            mileageModel.lastTrueKm +
            (mileageModel.shadowRateKmPerDay ?? mileageModel.rateKmPerDay) *
              computeSinceDays(mileageModel.lastTrueTsUtc, new Date());
          observeOdometerShadowError(Math.abs(shadowEstimate - kmValue));
        }
      }

      recordOdometerEvent(input.source, pendingReview ? 'pending' : 'accepted');
      totalEventsProcessed += 1;
      if (pendingReview || outlierClass) {
        totalOutliersDetected += 1;
      }
      if (totalEventsProcessed > 0) {
        recordOdometerOutlierRatio(totalOutliersDetected / totalEventsProcessed);
      }

      return {
        event: createdEvent,
        estimate,
        warnings,
        backPressureWarning,
        pendingReview,
        outlierClass,
      };
    } catch (error) {
      await session.abortTransaction();
      recordOdometerEvent(input.source, 'failed');
      throw error;
    } finally {
      await session.endSession();
      await DistributedLock.release(lockKey, lockToken);
    }
  }
}


