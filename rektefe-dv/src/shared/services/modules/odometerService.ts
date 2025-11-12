import { apiClient } from '../http/client';

export type OdometerEstimateSeverity = 'info' | 'warning' | 'critical';
export type OdometerEstimateStatusCode = 'OK' | 'NO_BASELINE' | 'STALE' | 'LOW_CONFIDENCE';

export interface OdometerEstimateStatus {
  code: OdometerEstimateStatusCode;
  severity: OdometerEstimateSeverity;
  message: string;
}

export interface OdometerEstimate {
  vehicleId: string;
  estimateKm: number;
  displayKm: number;
  lastTrueKm: number;
  lastTrueTsUtc: string;
  sinceDays: number;
  rateKmPerDay: number;
  confidence: number;
  isApproximate: boolean;
  seriesId: string;
  status: OdometerEstimateStatus;
  warnings: string[];
}

export interface OdometerEventPayload {
  km: number;
  unit?: 'km' | 'mi';
  timestampUtc?: string;
  source?: 'service' | 'inspection' | 'user_manual' | 'system_import';
  evidenceType?: 'none' | 'photo' | 'document';
  evidenceUrl?: string;
  notes?: string;
  odometerReset?: boolean;
  clientRequestId?: string;
  metadata?: Record<string, any>;
}

export interface OdometerEventResponse {
  event: {
    id: string;
    km: number;
    unit: 'km' | 'mi';
    timestampUtc: string;
    source: string;
    evidenceType: string;
    evidenceUrl?: string;
    notes?: string;
    pendingReview: boolean;
    outlierClass?: 'soft' | 'hard';
    seriesId: string;
  };
  estimate: OdometerEstimate;
  warnings?: string[];
  backPressureWarning?: string;
  pendingReview: boolean;
  outlierClass?: 'soft' | 'hard';
}

export interface OdometerTimelineItem {
  id: string;
  km: number;
  unit: 'km' | 'mi';
  timestampUtc: string;
  source: string;
  evidenceType: string;
  evidenceUrl?: string;
  notes?: string;
  pendingReview: boolean;
  outlierClass?: 'soft' | 'hard';
  seriesId: string;
  createdAtUtc: string;
}

export interface OdometerTimelineResponse {
  items: OdometerTimelineItem[];
  nextCursor?: string | null;
}

export const odometerService = {
  async getEstimate(vehicleId: string) {
    const response = await apiClient.get(`/vehicles/${vehicleId}/odometer`);
    return response.data?.data as OdometerEstimate;
  },

  async submitEvent(vehicleId: string, payload: OdometerEventPayload) {
    const normalizedPayload: OdometerEventPayload = {
      ...payload,
      timestampUtc: payload.timestampUtc ?? new Date().toISOString(),
      source: payload.source ?? 'user_manual',
      evidenceType: payload.evidenceType ?? 'none',
    };

    const response = await apiClient.post(`/vehicles/${vehicleId}/odometer/events`, normalizedPayload);
    return response.data?.data as OdometerEventResponse;
  },

  async getTimeline(vehicleId: string, params?: { cursor?: string; limit?: number; source?: string; evidenceType?: string }) {
    const response = await apiClient.get(`/vehicles/${vehicleId}/odometer/timeline`, { params });
    return response.data?.data as OdometerTimelineResponse;
  },
};


