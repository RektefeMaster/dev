/**
 * REKTEFE PROJESİ - QUERY PERFORMANCE MONITOR
 * 
 * Database query performansını izler ve slow query'leri loglar.
 */

import Logger from './logger';

interface QueryMetrics {
  name: string;
  duration: number;
  timestamp: string;
  count: number;
}

/**
 * Query Monitor Class
 * Database query performansını izler
 */
export class QueryMonitor {
  private static queryHistory: Map<string, QueryMetrics[]> = new Map();
  private static slowQueryThreshold = 100; // ms
  private static slowQueries: Map<string, number> = new Map();

  /**
   * Query'yi izle ve performans ölç
   */
  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    options?: {
      threshold?: number;
      logSlow?: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const threshold = options?.threshold || this.slowQueryThreshold;
    const logSlow = options?.logSlow !== false;

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Store metrics
      this.recordQuery(queryName, duration);

      // Check if slow
      if (duration > threshold && logSlow) {
        this.handleSlowQuery(queryName, duration, threshold);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error(`Query failed: ${queryName} after ${duration}ms`, error);
      throw error;
    }
  }

  /**
   * Record query metrics
   */
  private static recordQuery(name: string, duration: number): void {
    if (!this.queryHistory.has(name)) {
      this.queryHistory.set(name, []);
    }

    const history = this.queryHistory.get(name)!;
    history.push({
      name,
      duration,
      timestamp: new Date().toISOString(),
      count: 1,
    });

    // Keep only last 100 records per query
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Handle slow query
   */
  private static handleSlowQuery(
    name: string,
    duration: number,
    threshold: number
  ): void {
    // Increment slow query counter
    const currentCount = this.slowQueries.get(name) || 0;
    this.slowQueries.set(name, currentCount + 1);

    // Log slow query
    Logger.warn(
      `🐌 Slow query detected: ${name} took ${duration}ms (threshold: ${threshold}ms)`
    );

    // Alert if too many slow queries
    if (currentCount > 10) {
      Logger.error(
        `⚠️ CRITICAL: Query "${name}" has been slow ${currentCount} times. Optimization needed!`
      );
    }
  }

  /**
   * Get query statistics
   */
  static getQueryStats(queryName?: string): any {
    if (queryName) {
      const history = this.queryHistory.get(queryName);
      if (!history || history.length === 0) {
        return null;
      }

      return this.calculateStats(queryName, history);
    }

    // Return stats for all queries
    const allStats: any = {};
    for (const [name, history] of this.queryHistory.entries()) {
      allStats[name] = this.calculateStats(name, history);
    }

    return allStats;
  }

  /**
   * Calculate statistics for a query
   */
  private static calculateStats(name: string, history: QueryMetrics[]): any {
    const durations = history.map((m) => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    const slowCount = this.slowQueries.get(name) || 0;

    return {
      queryName: name,
      totalExecutions: history.length,
      averageDuration: Math.round(avg * 100) / 100,
      maxDuration: max,
      minDuration: min,
      slowQueryCount: slowCount,
      lastExecution: history[history.length - 1].timestamp,
    };
  }

  /**
   * Get all slow queries
   */
  static getSlowQueries(): any[] {
    const slowQueries: any[] = [];

    for (const [name, count] of this.slowQueries.entries()) {
      const history = this.queryHistory.get(name);
      if (history) {
        const stats = this.calculateStats(name, history);
        slowQueries.push({
          ...stats,
          slowOccurrences: count,
        });
      }
    }

    // Sort by slow occurrences
    return slowQueries.sort((a, b) => b.slowOccurrences - a.slowOccurrences);
  }

  /**
   * Reset statistics
   */
  static reset(): void {
    this.queryHistory.clear();
    this.slowQueries.clear();
    Logger.info('Query monitor statistics reset');
  }

  /**
   * Set slow query threshold
   */
  static setThreshold(ms: number): void {
    this.slowQueryThreshold = ms;
    Logger.info(`Slow query threshold set to ${ms}ms`);
  }

  /**
   * Get monitoring summary
   */
  static getSummary(): any {
    const totalQueries = Array.from(this.queryHistory.values()).reduce(
      (total, history) => total + history.length,
      0
    );

    const totalSlowQueries = Array.from(this.slowQueries.values()).reduce(
      (total, count) => total + count,
      0
    );

    const uniqueQueries = this.queryHistory.size;

    return {
      totalQueries,
      uniqueQueries,
      totalSlowQueries,
      slowQueryPercentage:
        totalQueries > 0
          ? Math.round((totalSlowQueries / totalQueries) * 10000) / 100
          : 0,
      threshold: this.slowQueryThreshold,
    };
  }
}

/**
 * Helper function for easy query monitoring
 */
export const monitorQuery = <T>(
  name: string,
  queryFn: () => Promise<T>,
  threshold?: number
): Promise<T> => {
  return QueryMonitor.measureQuery(name, queryFn, { threshold });
};

export default QueryMonitor;

