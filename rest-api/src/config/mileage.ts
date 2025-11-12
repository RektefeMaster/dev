import { OdometerEventSource, OdometerEventEvidenceType } from '../models/OdometerEvent';
import { MAX_OBSERVED_RATE_PER_DAY, DEFAULT_KM_PER_DAY } from '../../../shared/config/mileage';

type SourceEvidenceKey = `${OdometerEventSource}:${OdometerEventEvidenceType}`;

export const DEFAULT_RATE_KM_PER_DAY = Number(
  process.env.MILEAGE_DEFAULT_RATE_KM_PER_DAY || DEFAULT_KM_PER_DAY
);
export const DEFAULT_CONFIDENCE = Number(process.env.MILEAGE_DEFAULT_CONFIDENCE || 0.3);

export const EWMA_ALPHA_MAP: Record<SourceEvidenceKey, number> = {
  'service:none': 0.5,
  'service:photo': 0.7,
  'service:document': 0.75,
  'inspection:none': 0.6,
  'inspection:photo': 0.7,
  'inspection:document': 0.75,
  'user_manual:none': 0.25,
  'user_manual:photo': 0.35,
  'user_manual:document': 0.35,
  'system_import:none': 0.55,
  'system_import:photo': 0.6,
  'system_import:document': 0.6,
};

export const CONFIDENCE_DELTA_MAP: Record<SourceEvidenceKey, number> = {
  'service:none': 0.05,
  'service:photo': 0.1,
  'service:document': 0.12,
  'inspection:none': 0.05,
  'inspection:photo': 0.1,
  'inspection:document': 0.12,
  'user_manual:none': 0.02,
  'user_manual:photo': 0.04,
  'user_manual:document': 0.04,
  'system_import:none': 0.06,
  'system_import:photo': 0.08,
  'system_import:document': 0.08,
};

export const CONFIDENCE_MIN = 0.05;
export const CONFIDENCE_MAX = 0.95;

export const RATE_MIN = 0;
export const RATE_MAX = 300;
export const SOFT_OUTLIER_THRESHOLD = 300;
export const HARD_OUTLIER_THRESHOLD = 500;

export const ABS_MAX_RATE_PER_DAY = Number(
  process.env.MILEAGE_MAX_RATE_PER_DAY || MAX_OBSERVED_RATE_PER_DAY
);
export const STALE_THRESHOLD_DAYS = Number(process.env.MILEAGE_STALE_THRESHOLD_DAYS || 90);
export const CRITICAL_STALE_THRESHOLD_DAYS = Number(process.env.MILEAGE_CRITICAL_STALE_THRESHOLD_DAYS || 180);
export const LOW_CONFIDENCE_THRESHOLD = Number(process.env.MILEAGE_LOW_CONFIDENCE_THRESHOLD || 0.55);
export const CRITICAL_CONFIDENCE_THRESHOLD = Number(process.env.MILEAGE_CRITICAL_CONFIDENCE_THRESHOLD || 0.35);

export const CACHE_TTL_SECONDS = Number(process.env.MILEAGE_CACHE_TTL_SECONDS || 60 * 60 * 24);

export const PENDING_REVIEW_QUEUE = 'odometer_review';
export const PENDING_REVIEW_WARNING_THRESHOLD = Number(process.env.MILEAGE_PENDING_REVIEW_WARNING_THRESHOLD || 100);

export const BACKPRESSURE_MESSAGE =
  'Kilometre onayı yoğunluk nedeniyle gecikebilir. İşleminiz sıraya alınmıştır.';

export const getAlphaForEvent = (source: OdometerEventSource, evidence: OdometerEventEvidenceType): number => {
  const key: SourceEvidenceKey = `${source}:${evidence}`;
  return EWMA_ALPHA_MAP[key] ?? 0.5;
};

export const getConfidenceDeltaForEvent = (source: OdometerEventSource, evidence: OdometerEventEvidenceType): number => {
  const key: SourceEvidenceKey = `${source}:${evidence}`;
  return CONFIDENCE_DELTA_MAP[key] ?? 0.05;
};

