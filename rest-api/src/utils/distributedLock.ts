import { getRedisClient } from '../config/cache';
import { v4 as uuid } from 'uuid';

export interface LockOptions {
  ttlMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  jitterMs?: number;
}

const DEFAULT_LOCK_OPTIONS: Required<LockOptions> = {
  ttlMs: 5000,
  retryCount: 3,
  retryDelayMs: 50,
  jitterMs: 25,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class DistributedLock {
  static async acquire(lockKey: string, options: LockOptions = {}): Promise<string | null> {
    const redis = getRedisClient();
    if (!redis) {
      return null;
    }

    const merged = { ...DEFAULT_LOCK_OPTIONS, ...options };
    const token = uuid();

    for (let attempt = 0; attempt <= merged.retryCount; attempt += 1) {
      const result = await redis.set(lockKey, token, 'PX', merged.ttlMs, 'NX');
      if (result === 'OK') {
        return token;
      }

      const delay =
        merged.retryDelayMs +
        Math.floor(Math.random() * (merged.jitterMs * 2)) -
        merged.jitterMs;
      await wait(Math.max(delay, 0));
    }

    return null;
  }

  static async release(lockKey: string, token: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      return;
    }

    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await redis.eval(releaseScript, 1, lockKey, token);
  }
}


