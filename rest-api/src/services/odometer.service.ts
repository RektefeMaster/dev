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
  MAX_RATE_CHANGE_PERCENT,
  MIN_DAYS_FOR_RATE_CALCULATION,
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

    // Confidence uyarıları kaldırıldı - Kullanıcı girdiği kilometre doğru kabul edilir

    // Confidence her zaman yüksek (0.85), bu yüzden approximate değil
    const isApproximate = status.code !== 'OK';
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
          if (existing.pendingReview) {
            existing.pendingReview = false;
            await existing.save({ session });
          }
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

      // İlk baseline için: Eğer deltaDays <= 0 ise (aynı gün veya geçmiş), 1 gün kabul et (rate hesaplama için)
      if (!hasBaseline && deltaDays <= 0) {
        deltaDays = 1;
      }

      let observedRate = deltaDays > 0 ? deltaKm / deltaDays : 0;
      const warnings: string[] = [];

      // deltaKm < 0 kontrolü kaldırıldı - Kullanıcı yanlış girip düzeltmek isteyebilir
      // Sadece odometerReset değilse uyarı ver (ama yine de güncelle)
      if (!input.odometerReset && deltaKm < 0 && hasBaseline) {
        warnings.push('Yeni kilometre değeri, önceki değerden düşük. Eğer bu bir düzeltme ise sorun yok.');
      }

      // deltaDays <= 0 kontrolü kaldırıldı - Kullanıcı aynı gün içinde birden fazla kez güncelleme yapabilir
      // Basit mantık: Kullanıcı girdiği kilometre doğru kabul edilir, kontroller kaldırıldı
      let pendingReview = false;
      let outlierClass: 'soft' | 'hard' | undefined;

      // Günde kaç kez kilometre güncellemesi yapıldığını kontrol et (odometerReset hariç)
      if (!input.odometerReset) {
        // Bugünün başlangıcı ve bitişi (UTC timezone'unda)
        const timestampDate = new Date(timestamp);
        const todayStart = new Date(Date.UTC(
          timestampDate.getUTCFullYear(),
          timestampDate.getUTCMonth(),
          timestampDate.getUTCDate(),
          0, 0, 0, 0
        ));
        const todayEnd = new Date(Date.UTC(
          timestampDate.getUTCFullYear(),
          timestampDate.getUTCMonth(),
          timestampDate.getUTCDate(),
          23, 59, 59, 999
        ));
        
        // Bugün oluşturulmuş event sayısını kontrol et (bu event henüz oluşturulmamış)
        const todayUpdateCount = await OdometerEvent.countDocuments({
          tenantId,
          vehicleId: vehicleObjectId,
          timestampUtc: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        }).session(session);

        // Günde 3 kez sınırsız (1., 2. ve 3. güncelleme), 4. kez uyarı ver (ama yine de güncellemeyi yap)
        // todayUpdateCount: Bugün oluşturulmuş event sayısı (bu event hariç)
        // 1. güncelleme: count = 0, uyarı yok
        // 2. güncelleme: count = 1, uyarı yok  
        // 3. güncelleme: count = 2, uyarı yok
        // 4. güncelleme: count = 3, uyarı var
        if (todayUpdateCount >= 3) {
          warnings.push(
            'Günde 3 kez kilometre düzeltme hakkınızı kullandınız. Daha fazla düzeltme yapmak için lütfen destek ile iletişime geçin.'
          );
        }
      }

      // Basit mantık: Kullanıcı girdiği kilometre doğru kabul edilir
      const alphaBase = getAlphaForEvent(input.source, input.evidenceType);
      const alpha = alphaBase; // Outlier kontrolü kaldırıldı, her zaman normal alpha

      // Confidence her zaman yüksek: Kullanıcı girdiği için doğru kabul ediyoruz
      let newConfidence = 0.85; // Her zaman yüksek confidence
      
      // Rate hesaplaması: İlk 3 güncelleme sonrasına kadar beklenir, sonra ortalama hesaplanır
      let nextRate = mileageModel.rateKmPerDay;
      let shadowNextRate = mileageModel.shadowRateKmPerDay ?? mileageModel.rateKmPerDay;
      
      // Toplam event sayısını kontrol et (odometerReset hariç, bu event henüz oluşturulmadı)
      const totalEventCount = await OdometerEvent.countDocuments({
        tenantId,
        vehicleId: vehicleObjectId,
        odometerReset: { $ne: true },
      }).session(session);
      
      // Minimum gün aralığı kontrolü: Aynı gün veya çok yakın günlerdeki güncellemeler rate hesaplamasına dahil edilmez
      const hasMinimumDaysInterval = deltaDays >= MIN_DAYS_FOR_RATE_CALCULATION;
      
      // İlk 3 güncelleme sonrasına kadar rate hesaplama yapma (30 km/gün sabit kalır)
      // 4. güncellemede (totalEventCount = 3, bu event sonrası 4 olacak) ortalama hesaplanmaya başlar
      if (hasMinimumDaysInterval && totalEventCount >= 3) {
        // 4. veya daha sonraki güncelleme: Ortalama hesapla
        const calibrationStart = process.hrtime.bigint();
        
        // User manual için konservatif alpha (daha yavaş öğrenme)
        let effectiveAlpha = alpha;
        if (input.source === 'user_manual') {
          effectiveAlpha = alpha * 0.5; // Alpha'yı %50 azalt
        }
        
        if (totalEventCount === 3) {
          // 4. güncelleme: İlk 4 eventin ortalamasını hesapla (sadece minimum gün aralığı olanlar)
          const allEvents = await OdometerEvent.find({
            tenantId,
            vehicleId: vehicleObjectId,
            odometerReset: { $ne: true },
          })
            .sort({ timestampUtc: 1 })
            .limit(4)
            .lean()
            .session(session);
          
          // Bu event'i de dahil et (henüz kaydedilmemiş ama km değeri belli)
          const eventsWithCurrent = [
            ...allEvents.map(e => ({ km: e.km, timestamp: e.timestampUtc })),
            { km: kmValue, timestamp },
          ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          // Tüm güncellemeler arası ortalama günlük artış hesapla (sadece minimum gün aralığı olanlar)
          let totalRateSum = 0;
          let rateCount = 0;
          
          for (let i = 1; i < eventsWithCurrent.length; i++) {
            const prev = eventsWithCurrent[i - 1];
            const curr = eventsWithCurrent[i];
            const daysDiff = computeSinceDays(prev.timestamp, curr.timestamp);
            // Sadece minimum gün aralığı olan çiftleri dahil et
            if (daysDiff >= MIN_DAYS_FOR_RATE_CALCULATION) {
              const rate = (curr.km - prev.km) / daysDiff;
              totalRateSum += rate;
              rateCount++;
            }
          }
          
          if (rateCount > 0) {
            const avgRate = totalRateSum / rateCount;
            observedRate = clamp(avgRate, RATE_MIN, RATE_MAX);
            // İlk 4 event ortalaması ile başlat (rate değişim limiti uygulanmaz - başlangıç için)
            nextRate = clamp(observedRate, RATE_MIN, RATE_MAX);
            shadowNextRate = clamp(observedRate, RATE_MIN, RATE_MAX);
            
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('[ODOMETER RATE] İlk 4 event ortalaması hesaplandı:', {
                vehicleId: vehicleObjectId.toString(),
                eventCount: rateCount,
                avgRate: avgRate.toFixed(2),
                newRate: nextRate.toFixed(2),
                previousRate: mileageModel.rateKmPerDay.toFixed(2),
              });
            }
          } else {
            // Yeterli veri yok (tüm güncellemeler çok kısa süreli), rate 30 km/gün sabit kalır
            nextRate = mileageModel.rateKmPerDay;
            shadowNextRate = mileageModel.shadowRateKmPerDay ?? mileageModel.rateKmPerDay;
          }
        } else {
          // 5. ve sonraki güncelleme: Normal EWMA ile devam et
          observedRate = clamp(observedRate, RATE_MIN, RATE_MAX);
          let calculatedRate = (1 - effectiveAlpha) * mileageModel.rateKmPerDay + effectiveAlpha * observedRate;
          
          // Rate değişim limiti: Tek seferde maksimum %50 değişim
          const minAllowedRate = mileageModel.rateKmPerDay * (1 - MAX_RATE_CHANGE_PERCENT);
          const maxAllowedRate = mileageModel.rateKmPerDay * (1 + MAX_RATE_CHANGE_PERCENT);
          calculatedRate = clamp(calculatedRate, minAllowedRate, maxAllowedRate);
          
          nextRate = clamp(calculatedRate, RATE_MIN, RATE_MAX);
          
          // Shadow rate için de aynı limitleri uygula
          let calculatedShadowRate = (1 - effectiveAlpha) * shadowNextRate + effectiveAlpha * observedRate;
          const minAllowedShadowRate = shadowNextRate * (1 - MAX_RATE_CHANGE_PERCENT);
          const maxAllowedShadowRate = shadowNextRate * (1 + MAX_RATE_CHANGE_PERCENT);
          calculatedShadowRate = clamp(calculatedShadowRate, minAllowedShadowRate, maxAllowedShadowRate);
          shadowNextRate = clamp(calculatedShadowRate, RATE_MIN, RATE_MAX);
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('[ODOMETER RATE] EWMA ile güncellendi:', {
              vehicleId: vehicleObjectId.toString(),
              previousRate: mileageModel.rateKmPerDay.toFixed(2),
              observedRate: observedRate.toFixed(2),
              calculatedRate: calculatedRate.toFixed(2),
              newRate: nextRate.toFixed(2),
              alpha: effectiveAlpha.toFixed(3),
              rateChangePercent: (((nextRate - mileageModel.rateKmPerDay) / mileageModel.rateKmPerDay) * 100).toFixed(2) + '%',
            });
          }
        }
        
        const calibrationDuration = Number(process.hrtime.bigint() - calibrationStart) / 1_000_000_000;
        recordOdometerCalibrationDuration(input.source, calibrationDuration);
      }
      // deltaDays < MIN_DAYS_FOR_RATE_CALCULATION durumunda: Rate'i değiştirme (çok kısa süreli güncelleme)
      // totalEventCount < 3 durumunda: İlk 3 güncelleme bekleniyor, rate 30 km/gün kalır

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
            pendingReview: false, // Her zaman false - kullanıcı girdiği için doğru kabul edilir
            odometerReset: Boolean(input.odometerReset),
            outlierClass: undefined, // Outlier kontrolü kaldırıldı
            clientRequestId: input.clientRequestId,
            metadata: input.metadata,
          },
        ],
        { session }
      );

      const createdEvent = event[0] as IOdometerEvent;

      // Basit mantık: Her zaman güncelle (kullanıcı girdiği için doğru)
      mileageModel.lastTrueKm = kmValue;
      mileageModel.lastTrueTsUtc = timestamp;
      mileageModel.rateKmPerDay = nextRate;
      mileageModel.confidence = newConfidence;
      mileageModel.defaultUnit = unit;
      mileageModel.hasBaseline = true;
      if (shadowFlagEnabled) {
        mileageModel.shadowRateKmPerDay = shadowNextRate;
      }

      await mileageModel.save({ session });

      await createAuditLog(
        tenantId,
        vehicleObjectId,
        seriesId,
        'calibrated', // Her zaman calibrated
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
          pendingReview: false,
          outlierClass: undefined,
          source: input.source,
          evidenceType: input.evidenceType,
        },
        createdEvent._id,
        actorUserId,
        session
      );

      // Pending review kaldırıldı - kullanıcı girdiği için doğru kabul edilir
      let backPressureWarning: string | undefined;

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

      // Monitoring (basit)
      const absError = Math.abs(estimate.estimateKm - kmValue);
      observeOdometerEstimateAbsError(absError);
      if (shadowFlagEnabled && mileageModel.shadowRateKmPerDay) {
        const shadowEstimate =
          mileageModel.lastTrueKm +
          (mileageModel.shadowRateKmPerDay ?? mileageModel.rateKmPerDay) *
            computeSinceDays(mileageModel.lastTrueTsUtc, new Date());
        observeOdometerShadowError(Math.abs(shadowEstimate - kmValue));
      }

      recordOdometerEvent(input.source, 'accepted'); // Her zaman accepted
      totalEventsProcessed += 1;
      if (totalEventsProcessed > 0) {
        recordOdometerOutlierRatio(totalOutliersDetected / totalEventsProcessed);
      }

      return {
        event: createdEvent,
        estimate,
        warnings,
        backPressureWarning: undefined,
        pendingReview: false, // Her zaman false
        outlierClass: undefined, // Her zaman undefined
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


