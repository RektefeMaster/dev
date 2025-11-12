import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { OdometerService } from '../services/odometer.service';
import { createOdometerEventSchema, timelineQuerySchema, auditQuerySchema } from '../validators/odometer.validation';
import { createErrorResponse, createSuccessResponse, ErrorCode, ERROR_STATUS_MAPPING } from '../../../shared/types/apiResponse';
import { FeatureFlagService } from '../services/featureFlag.service';
import { Vehicle } from '../models/Vehicle';
import { OdometerEvent } from '../models/OdometerEvent';
import { OdometerAuditLog } from '../models/OdometerAuditLog';
import { UserType } from '../../../shared/types/enums';
import { logger } from '../utils/monitoring';

const DEFAULT_FORCED_FLAGS = new Set(['akilli_kilometre', 'akilli_kilometre_shadow']);
const configuredForcedFlags = new Set(
  (process.env.FEATURE_FLAGS_FORCE_ON || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
);
const isNonProductionEnv = (process.env.NODE_ENV || 'development').toLowerCase() !== 'production';

const shouldForceEnableFlag = (key: string) => {
  if (configuredForcedFlags.has(key)) {
    return true;
  }

  const envOverride = process.env[`FORCE_FLAG_${key.toUpperCase()}`];
  if (typeof envOverride === 'string') {
    const normalized = envOverride.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'enabled') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'disabled') {
      return false;
    }
  }

  if (isNonProductionEnv && DEFAULT_FORCED_FLAGS.has(key)) {
    return true;
  }

  return false;
};
import { getRedisClient } from '../config/cache';

const generateWeakEtag = (payload: unknown) => {
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('base64');
  return `W/"${hash}"`;
};

const encodeCursor = (cursor: { ts: string; id: string }) =>
  Buffer.from(JSON.stringify(cursor)).toString('base64');

const decodeCursor = (cursor?: string) => {
  if (!cursor) {
    return null;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (parsed.ts && parsed.id) {
      return parsed as { ts: string; id: string };
    }
    return null;
  } catch {
    return null;
  }
};

const resolveTenantId = (req: Request) => req.tenantId || (req.headers['x-tenant-id'] as string) || 'default';

const ensureFlagEnabled = async (req: Request, key: string) => {
  const tenantId = resolveTenantId(req);
  const userId = req.user?.userId;
  const cached = req.featureFlags?.[key];
  if (cached) {
    if (cached.enabled) {
      return true;
    }
    if (shouldForceEnableFlag(key)) {
      logger.debug?.(`Feature flag ${key} dev ortamında zorla aktifleştirildi (cached).`);
      req.featureFlags = {
        ...(req.featureFlags || {}),
        [key]: {
          ...cached,
          enabled: true,
        },
      };
      return true;
    }
    return false;
  }
  const flag = await FeatureFlagService.getFlag(key, { tenantId, userId });
  if (flag.enabled) {
    req.featureFlags = {
      ...(req.featureFlags || {}),
      [key]: flag,
    };
    return true;
  }

  if (shouldForceEnableFlag(key)) {
    logger.debug?.(`Feature flag ${key} dev ortamında zorla aktifleştirildi.`);
    const forcedFlag = {
      ...flag,
      enabled: true,
    };
    req.featureFlags = {
      ...(req.featureFlags || {}),
      [key]: forcedFlag,
    };
    return true;
  }

  req.featureFlags = {
    ...(req.featureFlags || {}),
    [key]: flag,
  };
  return false;
};

const ensureVehicleAccess = async (req: Request, vehicleId: string) => {
  const vehicle = await Vehicle.findById(new mongoose.Types.ObjectId(vehicleId));
  if (!vehicle) {
    throw createErrorResponse(ErrorCode.NOT_FOUND, 'Araç bulunamadı', null, req.headers['x-request-id'] as string);
  }

  if (!req.user) {
    throw createErrorResponse(ErrorCode.UNAUTHORIZED, 'Kullanıcı doğrulanamadı', null, req.headers['x-request-id'] as string);
  }

  if (req.user.userType === UserType.DRIVER && vehicle.userId.toString() !== req.user.userId) {
    throw createErrorResponse(ErrorCode.INSUFFICIENT_PERMISSIONS, 'Bu araca erişim izniniz yok.', null, req.headers['x-request-id'] as string);
  }

  return vehicle;
};

type CounterRecord = { count: number; resetAt: number };
const inMemoryCounters = new Map<string, CounterRecord>();

const incrementCounter = async (key: string, windowSeconds: number): Promise<number> => {
  const redis = getRedisClient();
  if (redis) {
    const redisKey = `odometer:rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return count;
  }

  const now = Date.now();
  const record = inMemoryCounters.get(key);
  if (!record || record.resetAt < now) {
    const newRecord: CounterRecord = {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    };
    inMemoryCounters.set(key, newRecord);
    return newRecord.count;
  }

  record.count += 1;
  inMemoryCounters.set(key, record);
  return record.count;
};

const getCounterValue = async (key: string): Promise<number> => {
  const redis = getRedisClient();
  if (redis) {
    const redisKey = `odometer:rl:${key}`;
    const value = await redis.get(redisKey);
    return value ? Number(value) : 0;
  }

  const record = inMemoryCounters.get(key);
  if (!record) {
    return 0;
  }

  if (record.resetAt < Date.now()) {
    inMemoryCounters.delete(key);
    return 0;
  }

  return record.count;
};

const enforceLimit = async (key: string, limit: number, windowSeconds: number): Promise<boolean> => {
  const count = await incrementCounter(key, windowSeconds);
  return count <= limit;
};

export class OdometerController {
  static getEstimate = async (req: Request, res: Response) => {
    try {
      const featureEnabled = await ensureFlagEnabled(req, 'akilli_kilometre');
      if (!featureEnabled) {
        const error = createErrorResponse(ErrorCode.ERR_FEATURE_DISABLED, 'Akıllı kilometre özelliği devre dışı.', null, req.headers['x-request-id'] as string);
        return res.status(403).json(error);
      }

      const { id: vehicleId } = req.params;
      await ensureVehicleAccess(req, vehicleId);

      const tenantId = resolveTenantId(req);
      const estimate = await OdometerService.getEstimate({
        tenantId,
        vehicleId,
        featureFlags: req.featureFlags,
      });

      const etag = generateWeakEtag({
        vehicleId: estimate.vehicleId,
        lastTrueKm: estimate.lastTrueKm,
        lastTrueTsUtc: estimate.lastTrueTsUtc,
        rateKmPerDay: estimate.rateKmPerDay,
      });

      const requestEtag = req.headers['if-none-match'];
      if (requestEtag && requestEtag === etag) {
        return res.status(304).end();
      }

      res.setHeader('ETag', etag);

      const response = createSuccessResponse(
        {
          vehicleId: estimate.vehicleId,
          tenantId: estimate.tenantId,
          estimateKm: estimate.estimateKm,
          displayKm: Math.round(estimate.estimateKm),
          isApproximate: estimate.isApproximate,
          lastTrueKm: estimate.lastTrueKm,
          lastTrueTsUtc: estimate.lastTrueTsUtc,
          sinceDays: estimate.sinceDays,
          rateKmPerDay: estimate.rateKmPerDay,
          confidence: estimate.confidence,
          seriesId: estimate.sourceSeriesId,
          cacheHit: estimate.cacheHit,
        },
        'Kilometre tahmini başarıyla getirildi',
        req.headers['x-request-id'] as string,
        undefined,
        {
          cacheHit: estimate.cacheHit,
          environment: process.env.NODE_ENV,
        }
      );

      return res.json(response);
    } catch (error) {
      if ((error as any)?.success === false) {
        const code = (error as any).error?.code as ErrorCode;
        const status = (code && ERROR_STATUS_MAPPING[code]) || 403;
        return res.status(status).json(error);
      }

      logger.error('getEstimate error', { error });
      const errorResponse = createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kilometre tahmini alınırken bir hata oluştu.',
        process.env.NODE_ENV === 'development' ? { error } : null,
        req.headers['x-request-id'] as string
      );
      return res.status(500).json(errorResponse);
    }
  };

  static createEvent = async (req: Request, res: Response) => {
    try {
      const featureEnabled = await ensureFlagEnabled(req, 'akilli_kilometre');
      const shadowEnabled = await ensureFlagEnabled(req, 'akilli_kilometre_shadow');

      if (!featureEnabled && !shadowEnabled) {
        const error = createErrorResponse(
          ErrorCode.ERR_FEATURE_DISABLED,
          'Akıllı kilometre özelliği devre dışı.',
          null,
          req.headers['x-request-id'] as string
        );
        return res.status(403).json(error);
      }

      const { id: vehicleId } = req.params;
      const vehicle = await ensureVehicleAccess(req, vehicleId);

      const tenantId = resolveTenantId(req);
      const rateLimitKey = `${tenantId}:${req.user?.userId || req.ip || 'anon'}`;
      const isAllowed = await enforceLimit(rateLimitKey, 5, 60);
      if (!isAllowed) {
        const errorResponse = createErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Çok sık kilometre güncellemesi yapmaya çalışıyorsunuz. Lütfen kısa bir süre sonra tekrar deneyin.',
          null,
          req.headers['x-request-id'] as string
        );
        return res.status(ERROR_STATUS_MAPPING[ErrorCode.RATE_LIMIT_EXCEEDED]).json(errorResponse);
      }

      const hardClusterKey = `hard:${tenantId}:${req.user?.userId || req.ip || 'anon'}`;
      const hardCount = await getCounterValue(hardClusterKey);
      if (hardCount >= 3) {
        const errorResponse = createErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Olağandışı kilometre artışları tespit edildi. Lütfen belge ekleyin veya destek ile iletişime geçin.',
          { hardOutliersLast10Min: hardCount },
          req.headers['x-request-id'] as string
        );
        return res.status(ERROR_STATUS_MAPPING[ErrorCode.RATE_LIMIT_EXCEEDED]).json(errorResponse);
      }

      const { error: validationError, value } = createOdometerEventSchema.validate(req.body, { abortEarly: false });
      if (validationError) {
        const error = createErrorResponse(
          ErrorCode.VALIDATION_FAILED,
          'Kilometre kaydı doğrulama hatası',
          validationError.details,
          req.headers['x-request-id'] as string
        );
        return res.status(400).json(error);
      }

      const userType = req.user?.userType;
      if (userType === UserType.DRIVER && value.source !== 'user_manual') {
        const error = createErrorResponse(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          'Bu kilometre kaynağı için yetkiniz yok.',
          { allowedSources: ['user_manual'] },
          req.headers['x-request-id'] as string
        );
        return res.status(403).json(error);
      }

      if (userType === UserType.MECHANIC && !['service', 'inspection'].includes(value.source)) {
        const error = createErrorResponse(
          ErrorCode.INSUFFICIENT_PERMISSIONS,
          'Bu kilometre kaynağı için yetkiniz yok.',
          { allowedSources: ['service', 'inspection'] },
          req.headers['x-request-id'] as string
        );
        return res.status(403).json(error);
      }

      const result = await OdometerService.recordEvent({
        tenantId,
        vehicleId,
        km: value.km,
        unit: value.unit || (vehicle.defaultUnit as any) || 'km',
        timestampUtc: value.timestampUtc,
        source: value.source,
        evidenceType: value.evidenceType,
        evidenceUrl: value.evidenceUrl,
        notes: value.notes,
        createdByUserId: req.user?.userId,
        odometerReset: value.odometerReset,
        clientRequestId: value.clientRequestId,
        metadata: value.metadata,
        featureFlags: req.featureFlags,
      });

      const responseStatus = result.pendingReview
        ? ErrorCode.ERR_ODO_OUTLIER_HARD
        : result.outlierClass === 'soft'
          ? ErrorCode.ERR_ODO_OUTLIER_SOFT
          : undefined;

      const payload = {
        event: {
          id: result.event._id,
          km: result.event.km,
          unit: result.event.unit,
          timestampUtc: result.event.timestampUtc,
          source: result.event.source,
          evidenceType: result.event.evidenceType,
          evidenceUrl: result.event.evidenceUrl,
          notes: result.event.notes,
          pendingReview: result.pendingReview,
          outlierClass: result.outlierClass,
          seriesId: result.event.seriesId,
        },
        estimate: {
          estimateKm: result.estimate.estimateKm,
          displayKm: Math.round(result.estimate.estimateKm),
          lastTrueKm: result.estimate.lastTrueKm,
          lastTrueTsUtc: result.estimate.lastTrueTsUtc,
          sinceDays: result.estimate.sinceDays,
          rateKmPerDay: result.estimate.rateKmPerDay,
          confidence: result.estimate.confidence,
        },
        warnings: result.warnings,
        backPressureWarning: result.backPressureWarning,
      };

      if (responseStatus === ErrorCode.ERR_ODO_OUTLIER_HARD || responseStatus === ErrorCode.ERR_ODO_OUTLIER_SOFT) {
        if (responseStatus === ErrorCode.ERR_ODO_OUTLIER_HARD) {
          await incrementCounter(hardClusterKey, 600);
        }
        const statusMessage =
          responseStatus === ErrorCode.ERR_ODO_OUTLIER_HARD
            ? 'Kilometre kaydı incelemeye alındı.'
            : 'Kilometre kaydı düşük güvenle işlendi.';
        const errorResponse = createErrorResponse(
          responseStatus,
          statusMessage,
          payload,
          req.headers['x-request-id'] as string
        );
        return res.status(202).json(errorResponse);
      }

      const response = createSuccessResponse(
        payload,
        'Kilometre kaydı başarıyla işlendi.',
        req.headers['x-request-id'] as string
      );

      if (!responseStatus && result.outlierClass === 'hard') {
        await incrementCounter(hardClusterKey, 600);
      }
      return res.status(201).json(response);
    } catch (error) {
      if ((error as any)?.success === false) {
        const code = (error as any).error?.code as ErrorCode;
        const status = (code && ERROR_STATUS_MAPPING[code]) || 400;
        return res.status(status).json(error);
      }
      logger.error('createEvent error', { error });
      const errorResponse = createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kilometre kaydı oluşturulurken bir hata oluştu.',
        process.env.NODE_ENV === 'development' ? { error } : null,
        req.headers['x-request-id'] as string
      );
      return res.status(500).json(errorResponse);
    }
  };

  static getTimeline = async (req: Request, res: Response) => {
    try {
      const featureEnabled = await ensureFlagEnabled(req, 'akilli_kilometre');
      const shadowEnabled = await ensureFlagEnabled(req, 'akilli_kilometre_shadow');
      if (!featureEnabled && !shadowEnabled) {
        const error = createErrorResponse(
          ErrorCode.ERR_FEATURE_DISABLED,
          'Akıllı kilometre özelliği devre dışı.',
          null,
          req.headers['x-request-id'] as string
        );
        return res.status(403).json(error);
      }

      const { id: vehicleId } = req.params;
      await ensureVehicleAccess(req, vehicleId);

      const { error: validationError, value } = timelineQuerySchema.validate(req.query);
      if (validationError) {
        const error = createErrorResponse(
          ErrorCode.VALIDATION_FAILED,
          'Kilometre geçmişi doğrulama hatası',
          validationError.details,
          req.headers['x-request-id'] as string
        );
        return res.status(400).json(error);
      }

      const cursorData = decodeCursor(value.cursor);
      const tenantId = resolveTenantId(req);
      const query: Record<string, any> = {
        tenantId,
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
      };

      if (value.source) {
        query.source = value.source;
      }
      if (value.evidenceType) {
        query.evidenceType = value.evidenceType;
      }

      if (cursorData) {
        query.$or = [
          { timestampUtc: { $lt: new Date(cursorData.ts) } },
          {
            timestampUtc: new Date(cursorData.ts),
            _id: { $lt: new mongoose.Types.ObjectId(cursorData.id) },
          },
        ];
      }

      const results = await OdometerEvent.find(query)
        .sort({ timestampUtc: -1, _id: -1 })
        .limit(value.limit + 1);

      const hasMore = results.length > value.limit;
      if (hasMore) {
        results.pop();
      }

      const nextCursor =
        hasMore && results.length > 0
          ? encodeCursor({
              ts: results[results.length - 1].timestampUtc.toISOString(),
              id: results[results.length - 1]._id.toString(),
            })
          : null;

      const response = createSuccessResponse(
        {
          items: results.map((event) => ({
            id: event._id,
            km: event.km,
            unit: event.unit,
            timestampUtc: event.timestampUtc,
            source: event.source,
            evidenceType: event.evidenceType,
            evidenceUrl: event.evidenceUrl,
            notes: event.notes,
            pendingReview: event.pendingReview,
            outlierClass: event.outlierClass,
            seriesId: event.seriesId,
            createdAtUtc: event.createdAtUtc,
          })),
          nextCursor,
        },
        'Kilometre geçmişi başarıyla getirildi',
        req.headers['x-request-id'] as string
      );

      return res.json(response);
    } catch (error) {
      if ((error as any)?.success === false) {
        const code = (error as any).error?.code as ErrorCode;
        const status = (code && ERROR_STATUS_MAPPING[code]) || 400;
        return res.status(status).json(error);
      }
      logger.error('getTimeline error', { error });
      const errorResponse = createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kilometre geçmişi alınırken bir hata oluştu.',
        process.env.NODE_ENV === 'development' ? { error } : null,
        req.headers['x-request-id'] as string
      );
      return res.status(500).json(errorResponse);
    }
  };

  static getAuditLogs = async (req: Request, res: Response) => {
    try {
      if (req.user?.userType !== UserType.ADMIN) {
        const error = createErrorResponse(
          ErrorCode.FORBIDDEN,
          'Bu işlem için yetkiniz yok.',
          null,
          req.headers['x-request-id'] as string
        );
        return res.status(403).json(error);
      }

      const featureEnabled = await ensureFlagEnabled(req, 'akilli_kilometre');
      const shadowEnabled = await ensureFlagEnabled(req, 'akilli_kilometre_shadow');
      if (!featureEnabled && !shadowEnabled) {
        const error = createErrorResponse(
          ErrorCode.ERR_FEATURE_DISABLED,
          'Akıllı kilometre özelliği devre dışı.',
          null,
          req.headers['x-request-id'] as string
        );
        return res.status(403).json(error);
      }

      const { id: vehicleId } = req.params;
      await ensureVehicleAccess(req, vehicleId);

      const { error: validationError, value } = auditQuerySchema.validate(req.query);
      if (validationError) {
        const error = createErrorResponse(
          ErrorCode.VALIDATION_FAILED,
          'Audit filtreleri doğrulanamadı.',
          validationError.details,
          req.headers['x-request-id'] as string
        );
        return res.status(400).json(error);
      }

      const tenantId = resolveTenantId(req);
      const query: Record<string, any> = {
        tenantId,
        vehicleId: new mongoose.Types.ObjectId(vehicleId),
      };

      if (value.from || value.to) {
        query.createdAtUtc = {};
        if (value.from) {
          query.createdAtUtc.$gte = new Date(value.from);
        }
        if (value.to) {
          query.createdAtUtc.$lte = new Date(value.to);
        }
      }

      if (value.action) {
        query.action = value.action;
      }

      const skip = (value.page - 1) * value.limit;
      const [items, total] = await Promise.all([
        OdometerAuditLog.find(query)
          .sort({ createdAtUtc: -1 })
          .skip(skip)
          .limit(value.limit),
        OdometerAuditLog.countDocuments(query),
      ]);

      const response = createSuccessResponse(
        {
          items: items.map((entry) => ({
            id: entry._id,
            action: entry.action,
            details: entry.detailsJson,
            createdAtUtc: entry.createdAtUtc,
            actorUserId: entry.actorUserId,
            eventId: entry.eventId,
            seriesId: entry.seriesId,
          })),
        },
        'Kilometre audit kayıtları başarıyla getirildi',
        req.headers['x-request-id'] as string,
        {
          page: value.page,
          limit: value.limit,
          total,
          totalPages: Math.ceil(total / value.limit),
          hasNext: value.page * value.limit < total,
          hasPrev: value.page > 1,
        }
      );

      return res.json(response);
    } catch (error) {
      if ((error as any)?.success === false) {
        const code = (error as any).error?.code as ErrorCode;
        const status = (code && ERROR_STATUS_MAPPING[code]) || 400;
        return res.status(status).json(error);
      }
      logger.error('getAuditLogs error', { error });
      const errorResponse = createErrorResponse(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Kilometre audit kayıtları alınırken bir hata oluştu.',
        process.env.NODE_ENV === 'development' ? { error } : null,
        req.headers['x-request-id'] as string
      );
      return res.status(500).json(errorResponse);
    }
  };
}


