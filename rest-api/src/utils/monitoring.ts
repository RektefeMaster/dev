/**
 * REKTEFE PROJESİ - MONITORING & LOGGING SYSTEM
 * 
 * Bu dosya, Winston logger, Prometheus metrics ve
 * performans monitoring araçlarını içerir.
 */

import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import os from 'os';

// ===== WINSTON LOGGER CONFIGURATION =====

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rektefe-rest-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transports
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// ===== PROMETHEUS METRICS CONFIGURATION =====

// Registry oluştur
const register = new client.Registry();
register.setDefaultLabels({
  app: 'rektefe-rest-api'
});

// Default metrics'leri topla
client.collectDefaultMetrics({ register });

// HTTP Request Duration Histogram
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 1.5, 2, 2.5, 5, 10],
  registers: [register]
});

// HTTP Request Counter
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
  registers: [register]
});

// Active Connections Gauge
const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

// Database Connection Pool Gauge
const dbConnections = new client.Gauge({
  name: 'database_connections',
  help: 'Database connection pool status',
  labelNames: ['state'],
  registers: [register]
});

// Memory Usage Gauge
const memoryUsageGauge = new client.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register]
});

// CPU Usage Gauge
const cpuUsageGauge = new client.Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage',
  labelNames: ['type'],
  registers: [register]
});

// Odometer metrics
const odometerEventsTotal = new client.Counter({
  name: 'odometer_events_total',
  help: 'Number of odometer events processed',
  labelNames: ['source', 'outcome'],
  registers: [register],
});

const odometerOutlierRatio = new client.Gauge({
  name: 'odometer_outlier_ratio',
  help: 'Outlier ratio for odometer events',
  registers: [register],
});

const odometerCalibrationDuration = new client.Histogram({
  name: 'odometer_calibration_duration_seconds',
  help: 'Duration of odometer calibration operations',
  labelNames: ['source'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
  registers: [register],
});

const odometerEstimateAbsError = new client.Histogram({
  name: 'odometer_estimate_abs_error_km',
  help: 'Absolute error between estimate and next true reading',
  buckets: [1, 5, 10, 20, 50, 100, 200, 500],
  registers: [register],
});

const odometerFeatureShadowError = new client.Histogram({
  name: 'odometer_feature_shadow_abs_error_km',
  help: 'Absolute error distribution in shadow mode',
  buckets: [1, 5, 10, 20, 50, 100, 200, 500],
  registers: [register],
});

// ===== MONITORING FUNCTIONS =====

export const initializeMonitoring = () => {
  logger.info('Monitoring sistemi başlatılıyor...');
  
  // Memory usage monitoring
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const systemMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    memoryUsageGauge.set({ type: 'rss' }, memoryUsage.rss);
    memoryUsageGauge.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
    memoryUsageGauge.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
    memoryUsageGauge.set({ type: 'external' }, memoryUsage.external);
    memoryUsageGauge.set({ type: 'system' }, systemMemory);
    memoryUsageGauge.set({ type: 'free' }, freeMemory);
  }, 5000); // Her 5 saniyede bir
  
  // CPU usage monitoring
  setInterval(() => {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    cpuUsageGauge.set({ type: 'load1' }, loadAvg[0]);
    cpuUsageGauge.set({ type: 'load5' }, loadAvg[1]);
    cpuUsageGauge.set({ type: 'load15' }, loadAvg[2]);
    cpuUsageGauge.set({ type: 'cpuCount' }, cpus.length);
  }, 5000);
  
  logger.info('✅ Monitoring sistemi başlatıldı');
};

export const recordOdometerEvent = (source: string, outcome: string) => {
  odometerEventsTotal.labels(source, outcome).inc();
};

export const recordOdometerCalibrationDuration = (source: string, durationSeconds: number) => {
  odometerCalibrationDuration.labels(source).observe(durationSeconds);
};

export const recordOdometerOutlierRatio = (ratio: number) => {
  odometerOutlierRatio.set(ratio);
};

export const observeOdometerEstimateAbsError = (valueKm: number) => {
  odometerEstimateAbsError.observe(valueKm);
};

export const observeOdometerShadowError = (valueKm: number) => {
  odometerFeatureShadowError.observe(valueKm);
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000_000; // saniye cinsinden
    
    // Winston logger
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration.toFixed(3)}s`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
    
    // Prometheus metrics
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.originalUrl, res.statusCode.toString())
      .observe(duration);
      
    httpRequestTotal
      .labels(req.method, req.route?.path || req.originalUrl, res.statusCode.toString())
      .inc();
  });
  
  next();
};

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Request ID ekle
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  // Response header'a request ID ekle
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
  
  next();
};

export const healthCheckHandler = (req: Request, res: Response) => {
  const healthData = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  logger.info('Health check requested', { healthData });
  res.status(200).json(healthData);
};

export const metricsHandler = async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).json({ error: 'Metrics collection failed' });
  }
};

// ===== CUSTOM METRICS FUNCTIONS =====

export const incrementCounter = (name: string, labels: Record<string, string> = {}) => {
  const counter = new client.Counter({
    name: `custom_${name}_total`,
    help: `Custom counter: ${name}`,
    labelNames: Object.keys(labels),
    registers: [register]
  });
  
  counter.inc(labels);
};

export const setGauge = (name: string, value: number, labels: Record<string, string> = {}) => {
  const gauge = new client.Gauge({
    name: `custom_${name}`,
    help: `Custom gauge: ${name}`,
    labelNames: Object.keys(labels),
    registers: [register]
  });
  
  gauge.set(labels, value);
};

export const observeHistogram = (name: string, value: number, labels: Record<string, string> = {}) => {
  const histogram = new client.Histogram({
    name: `custom_${name}_duration_seconds`,
    help: `Custom histogram: ${name}`,
    labelNames: Object.keys(labels),
    registers: [register]
  });
  
  histogram.observe(labels, value);
};

// ===== ERROR TRACKING =====

export const trackError = (error: Error, context: Record<string, any> = {}) => {
  logger.error('Application error occurred', {
    error: error.message,
    stack: error.stack,
    context
  });
  
  incrementCounter('errors_total', {
    error_type: error.constructor.name,
    ...context
  });
};

// ===== PERFORMANCE TRACKING =====

export const trackPerformance = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  labels: Record<string, string> = {}
): Promise<T> => {
  const start = process.hrtime.bigint();
  
  try {
    const result = await operation();
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    
    observeHistogram(`operation_${operationName}`, duration, labels);
    
    logger.info(`Operation completed: ${operationName}`, {
      operation: operationName,
      duration: duration,
      labels
    });
    
    return result;
  } catch (error) {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    
    observeHistogram(`operation_${operationName}_error`, duration, labels);
    trackError(error as Error, { operation: operationName, ...labels });
    
    throw error;
  }
};

// ===== DATABASE MONITORING =====

export const updateDatabaseMetrics = (connectionState: string, count: number) => {
  dbConnections.set({ state: connectionState }, count);
};

export const updateActiveConnections = (count: number) => {
  activeConnections.set(count);
};

// ===== EXPORT ALL =====
export default {
  logger,
  register,
  initializeMonitoring,
  requestLogger,
  monitoringMiddleware,
  healthCheckHandler,
  metricsHandler,
  incrementCounter,
  setGauge,
  observeHistogram,
  trackError,
  trackPerformance,
  updateDatabaseMetrics,
  updateActiveConnections
};