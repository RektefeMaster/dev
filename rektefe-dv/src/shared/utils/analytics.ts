import { apiClient } from '../services/http/client';

interface AnalyticsPayload {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

const postEvent = async (payload: AnalyticsPayload) => {
  try {
    await apiClient.post('/analytics/events', payload);
  } catch (error) {
    if (__DEV__) {
      console.log('[analytics] fallback event:', payload.event, payload.properties);
    }
  }
};

export const analytics = {
  async track(event: string, properties?: Record<string, any>) {
    const payload: AnalyticsPayload = {
      event,
      properties,
      timestamp: new Date().toISOString(),
    };
    await postEvent(payload);
  },
};
