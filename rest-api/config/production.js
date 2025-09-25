/**
 * Production Configuration for REST-API
 */

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: 'production'
  },

  // Database Configuration
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rektefe_production',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false
      }
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || '',
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-production',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-for-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  },

  // Cloudinary Configuration
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloudinary-cloud-name',
    api_key: process.env.CLOUDINARY_API_KEY || 'your-cloudinary-api-key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'your-cloudinary-api-secret'
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
      }
    }
  },

  // Push Notification Configuration
  notifications: {
    expo: {
      accessToken: process.env.EXPO_ACCESS_TOKEN || 'your-expo-access-token'
    }
  },

  // Google Services
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret'
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
        'https://app.rektefe.com',
        'https://api.rektefe.com'
      ],
      credentials: true
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/production.log',
    maxSize: '10m',
    maxFiles: 5
  },

  // Monitoring Configuration
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || 'your-sentry-dsn'
    }
  },

  // Backup Configuration
  backup: {
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
    storage: {
      type: 'local', // or 's3', 'gcs'
      path: './backups'
    }
  },

  // API Configuration
  api: {
    version: 'v1',
    prefix: '/api',
    timeout: 30000,
    retries: 3
  },

  // Socket.io Configuration
  socket: {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
        'https://app.rektefe.com',
        'https://api.rektefe.com'
      ],
      credentials: true
    },
    transports: ['websocket', 'polling']
  }
};
