import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Redis bağlantısı kurulamadı');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

let isConnecting = false;

// Redis bağlantısını başlat
const connectRedis = async () => {
  if (isConnecting || redisClient.isOpen) {
    return;
  }

  try {
    isConnecting = true;
    await redisClient.connect();
    console.log('Redis bağlantısı başarılı!');
  } catch (error) {
    console.error('Redis bağlantı hatası:', error);
  } finally {
    isConnecting = false;
  }
};

// Uygulama başladığında Redis'e bağlan
connectRedis();

// Hata yönetimi
redisClient.on('error', (err: Error) => {
  console.error('Redis Client Error:', err);
  // Bağlantı koptuğunda yeniden bağlanmayı dene
  if (!isConnecting && !redisClient.isOpen) {
    setTimeout(connectRedis, 5000);
  }
});

redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));
redisClient.on('end', () => console.log('Redis Client Connection Ended'));

const getFromCache = async (key: string) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis okuma hatası:', error);
    return null;
  }
};

const setToCache = async (key: string, value: any, expireTime = 3600) => {
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: expireTime
    });
  } catch (error) {
    console.error('Redis yazma hatası:', error);
  }
};

const clearCache = async (pattern: string) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Redis temizleme hatası:', error);
  }
};

export { connectRedis, getFromCache, setToCache, clearCache, redisClient }; 