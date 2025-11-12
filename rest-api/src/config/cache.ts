import NodeCache from 'node-cache';
import Redis from 'ioredis';

// Memory cache for frequently accessed data
export const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  maxKeys: 1000, // Limit memory usage
  useClones: false // Better performance, but be careful with object mutations
});

// Redis cache configuration (if available)
let redisClient: Redis | null = null;

try {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    redisClient.on('error', (err) => {
      // Redis error - handled silently in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Redis error:', err.message);
      }
    });
  }
} catch (error) {
  // Redis connection error - handled silently
}

// Cache interface
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  useRedis?: boolean; // Force Redis usage
  useMemory?: boolean; // Force memory cache usage
}

// Generic cache functions
export class CacheManager {
  static async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      // Try Redis first if available and not explicitly disabled
      if (redisClient && !options.useMemory) {
        const redisValue = await redisClient.get(key);
        if (redisValue) {
          return JSON.parse(redisValue);
        }
      }
      
      // Fallback to memory cache
      const memoryValue = memoryCache.get<T>(key);
      return memoryValue || null;
    } catch (error) {
      return null;
    }
  }
  
  static async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const ttl = options.ttl || 300; // Default 5 minutes
    
    try {
      // Set in Redis if available and not explicitly disabled
      if (redisClient && !options.useMemory) {
        await redisClient.setex(key, ttl, JSON.stringify(value));
      }
      
      // Always set in memory cache as fallback
      memoryCache.set(key, value, ttl);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  static async del(key: string): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.del(key);
      }
      memoryCache.del(key);
    } catch (error) {
      }
  }
  
  static async clear(): Promise<void> {
    try {
      if (redisClient) {
        await redisClient.flushall();
      }
      memoryCache.flushAll();
    } catch (error) {
      }
  }
}

export const getRedisClient = () => redisClient;

// Common cache keys and TTL configurations
export const CacheKeys = {
  // User caches (short TTL due to frequent updates)
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_VEHICLES: (userId: string) => `user:vehicles:${userId}`,
  USER_APPOINTMENTS: (userId: string) => `user:appointments:${userId}`,
  
  // Mechanic caches (medium TTL)
  MECHANIC_PROFILE: (mechanicId: string) => `mechanic:profile:${mechanicId}`,
  MECHANIC_SERVICES: (mechanicId: string) => `mechanic:services:${mechanicId}`,
  AVAILABLE_MECHANICS: (city: string, service?: string) => 
    `mechanics:available:${city}${service ? `:${service}` : ''}`,
  
  // Static/semi-static data (long TTL)
  SERVICE_CATEGORIES: 'service:categories',
  VEHICLE_BRANDS: 'vehicle:brands',
  CITIES: 'cities:list',
  
  // Real-time data (very short TTL)
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  UNREAD_COUNT: (userId: string) => `unread:count:${userId}`,
  
  // Conversation caches
  USER_CONVERSATIONS: (userId: string) => `conversations:user:${userId}`,
  CONVERSATION_MESSAGES: (conversationId: string) => `messages:${conversationId}`,
};

export const CacheTTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes
  LONG: 1800,     // 30 minutes
  VERY_LONG: 3600, // 1 hour
  STATIC: 86400,  // 24 hours
};

// Cache utility decorators for common patterns
export function cacheResult<T>(
  keyGenerator: (...args: any[]) => string,
  ttl: number = CacheTTL.MEDIUM
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache first
      const cached = await CacheManager.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Execute original method
      const result = await method.apply(this, args);
      
      // Cache the result
      if (result !== null && result !== undefined) {
        await CacheManager.set(cacheKey, result, { ttl });
      }
      
      return result;
    };
  };
}

// Predefine common cache strategies
export const CacheStrategies = {
  // For frequently read, infrequently updated data
  readHeavy: { ttl: CacheTTL.LONG },
  
  // For real-time data that changes often
  realTime: { ttl: CacheTTL.SHORT },
  
  // For static reference data
  static: { ttl: CacheTTL.STATIC },
  
  // For user-specific data
  userSpecific: { ttl: CacheTTL.MEDIUM },
};