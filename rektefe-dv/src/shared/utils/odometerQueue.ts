import AsyncStorage from '@react-native-async-storage/async-storage';
import { OdometerQuickUpdatePayload } from '@/features/services/components/OdometerQuickUpdateModal';

export interface QueuedOdometerEvent {
  id: string;
  vehicleId: string;
  payload: OdometerQuickUpdatePayload;
  createdAt: string;
}

const STORAGE_KEY = '@rek:odometer_queue';

const loadQueue = async (): Promise<QueuedOdometerEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

const persistQueue = async (queue: QueuedOdometerEvent[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
};

export const odometerQueue = {
  async enqueue(vehicleId: string, payload: OdometerQuickUpdatePayload) {
    const queue = await loadQueue();
    const event: QueuedOdometerEvent = {
      id: `${vehicleId}:${Date.now()}`,
      vehicleId,
      payload,
      createdAt: new Date().toISOString(),
    };
    queue.push(event);
    await persistQueue(queue);
    return event;
  },

  async dequeue(eventId: string) {
    const queue = await loadQueue();
    const next = queue.filter((item) => item.id !== eventId);
    await persistQueue(next);
  },

  async list() {
    return loadQueue();
  },

  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  async flush(processor: (event: QueuedOdometerEvent) => Promise<void>) {
    const queue = await loadQueue();
    const remaining: QueuedOdometerEvent[] = [];

    for (const event of queue) {
      try {
        await processor(event);
      } catch (error) {
        remaining.push(event);
      }
    }

    await persistQueue(remaining);
    return remaining;
  },
};


