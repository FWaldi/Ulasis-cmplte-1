const logger = require('../utils/logger');
const { getConnectionPoolInfo } = process.env.NODE_ENV === 'test' 
  ? require('../config/database-test')
  : require('../config/database');

/**
 * Performance Monitoring System
 *
 * This module provides comprehensive performance monitoring including:
 * - Application metrics
 * - Database performance
 * - Memory usage tracking
 * - Response time monitoring
 * - Error rate tracking
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        responseTimes: [],
        errorRates: new Map(),
      },
      database: {
        queryTimes: [],
        slowQueries: [],
        connectionErrors: 0,
        poolInfo: {
          total: 0,
          used: 0,
          free: 0,
        },
      },
      security: {
        rateLimitHits: 0,
        suspiciousRequests: 0,
        blockedIPs: new Map(),
      },
      business: {
        activeUsers: 0,
        questionnairesCreated: 0,
        responsesSubmitted: 0,
        qrCodesGenerated: 0,
      },
      system: {
        memory: {},
        cpu: {},
        uptime: 0,
      },
    };

    this.startTime = Date.now();
    this.alertThresholds = {
      responseTime: 2000, // 2 seconds
      errorRate: 0.05, // 5%
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.8, // 80%
      slowQueryTime: 1000, // 1 second
      connectionPoolUsage: 0.9, // 90%
    };

    // Store interval IDs for cleanup
    this.intervals = [];

    // Start periodic metrics collection only in non-test environment
    if (process.env.NODE_ENV !== 'test') {
      if (process.env.NODE_ENV !== 'test') {
        this.startPeriodicCollection();
      }
    }
  }

  /**
   * Start periodic metrics collection
   */
  startPeriodicCollection() {
    // Collect system metrics every 30 seconds
    this.intervals.push(
      setInterval(() => {
        this.collectSystemMetrics();
        this.collectDatabaseMetrics();
      }, 30000),
    );

    // Clean old data every 5 minutes
    this.intervals.push(
      setInterval(() => {
        this.cleanupOldMetrics();
      }, 300000),
    );

    // Log summary every hour
    this.intervals.push(
      setInterval(() => {
        this.logPerformanceSummary();
      }, 3600000),
    );
  }

  /**
   * Record HTTP request metrics
   */
  recordRequest(req, res, responseTime) {
    const now = Date.now();
    const path = req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const isSuccess = statusCode >= 200 && statusCode < 400;

    // Update request counters
    this.metrics.requests.total++;
    if (isSuccess) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Record response time
    this.metrics.requests.responseTimes.push({
      timestamp: now,
      time: responseTime,
      path,
      method,
      statusCode,
    });

    // Update error rates by endpoint
    const endpointKey = `${method} ${path}`;
    if (!this.metrics.requests.errorRates.has(endpointKey)) {
      this.metrics.requests.errorRates.set(endpointKey, {
        total: 0,
        errors: 0,
      });
    }

    const endpointStats = this.metrics.requests.errorRates.get(endpointKey);
    endpointStats.total++;
    if (!isSuccess) {
      endpointStats.errors++;
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(responseTime, endpointKey, isSuccess);

    logger.debug('Request metrics recorded', {
      path,
      method,
      statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(query, executionTime, error = null) {
    const now = Date.now();

    this.metrics.database.queryTimes.push({
      timestamp: now,
      query: this.sanitizeQuery(query),
      executionTime,
      success: !error,
    });

    if (error) {
      this.metrics.database.connectionErrors++;
      logger.warn('Database query error', {
        query: this.sanitizeQuery(query),
        error: error.message,
        executionTime,
      });
    }

    // Track slow queries
    if (executionTime > this.alertThresholds.slowQueryTime) {
      this.metrics.database.slowQueries.push({
        timestamp: now,
        query: this.sanitizeQuery(query),
        executionTime,
      });

      logger.warn('Slow query detected', {
        query: this.sanitizeQuery(query),
        executionTime,
      });
    }
  }

  /**
   * Record security events
   */
  recordSecurityEvent(eventType, details) {
    const now = Date.now();

    switch (eventType) {
      case 'rate_limit_hit':
        this.metrics.security.rateLimitHits++;
        break;
      case 'suspicious_request':
        this.metrics.security.suspiciousRequests++;
        break;
      case 'ip_blocked':
        this.metrics.security.blockedIPs.add(details.ip);
        break;
    }

    logger.info('Security event recorded', {
      eventType,
      details,
      timestamp: now,
    });
  }

  /**
   * Record business metrics
   */
  recordBusinessMetric(eventType, details = {}) {
    const now = Date.now();

    switch (eventType) {
      case 'user_registered':
        this.metrics.business.activeUsers++;
        break;
      case 'questionnaire_created':
        this.metrics.business.questionnairesCreated++;
        break;
      case 'response_submitted':
        this.metrics.business.responsesSubmitted++;
        break;
      case 'qr_code_generated':
        this.metrics.business.qrCodesGenerated++;
        break;
    }

    logger.debug('Business metric recorded', {
      eventType,
      details,
      timestamp: now,
    });
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    // Always collect uptime, even in test environment
    const uptime = process.uptime();
    this.metrics.system.uptime = uptime;

    // Skip other system metrics collection in test environment to reduce overhead
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.system.memory = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
    };

    this.metrics.system.cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system,
    };

    // Check for system alerts
    this.checkSystemAlerts();
  }

  /**
   * Collect database metrics
   */
  collectDatabaseMetrics() {
    try {
      // Skip database metrics collection in test environment to avoid overhead
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      // Safely get connection pool info
      let poolInfo;
      try {
        poolInfo = getConnectionPoolInfo();
      } catch (poolError) {
        logger.warn('Failed to get connection pool info:', poolError.message);
        poolInfo = { error: 'Failed to retrieve pool information' };
      }

      this.metrics.database.connectionPool = poolInfo;

      // Check for database alerts only if we have valid pool info
      if (poolInfo && !poolInfo.error) {
        this.checkDatabaseAlerts(poolInfo);
      }
    } catch (error) {
      logger.error('Failed to collect database metrics:', error);
    }
  }

  /**
   * Check performance alerts
   */
  checkPerformanceAlerts(responseTime, endpoint, _isSuccess) {
    // Response time alert
    if (responseTime > this.alertThresholds.responseTime) {
      logger.warn('Performance alert: Slow response time', {
        endpoint,
        responseTime,
        threshold: this.alertThresholds.responseTime,
      });
    }

    // Error rate alert
    const endpointStats = this.metrics.requests.errorRates.get(endpoint);
    if (endpointStats && endpointStats.total >= 10) {
      const errorRate = endpointStats.errors / endpointStats.total;
      if (errorRate > this.alertThresholds.errorRate) {
        logger.warn('Performance alert: High error rate', {
          endpoint,
          errorRate: `${(errorRate * 100).toFixed(2)}%`,
          threshold: `${this.alertThresholds.errorRate * 100}%`,
        });
      }
    }
  }

  /**
   * Check system alerts
   */
  checkSystemAlerts() {
    const { memory } = this.metrics.system;

    // Memory usage alert
    if (memory.heapUsed > 0) {
      const memoryUsageRatio = memory.heapUsed / memory.heapTotal;
      if (memoryUsageRatio > this.alertThresholds.memoryUsage) {
        logger.warn('System alert: High memory usage', {
          usage: `${(memoryUsageRatio * 100).toFixed(2)}%`,
          heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        });
      }
    }
  }

  /**
   * Check database alerts
   */
  checkDatabaseAlerts(poolInfo) {
    if (poolInfo.total && poolInfo.max) {
      const poolUsageRatio = poolInfo.used / poolInfo.max;
      if (poolUsageRatio > this.alertThresholds.connectionPoolUsage) {
        logger.warn('Database alert: High connection pool usage', {
          usage: `${(poolUsageRatio * 100).toFixed(2)}%`,
          used: poolInfo.used,
          max: poolInfo.max,
        });
      }
    }
  }

  /**
   * Clean old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Clean old response times
    this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.filter(
      (metric) => metric.timestamp > cutoffTime,
    );

    // Clean old query times
    this.metrics.database.queryTimes = this.metrics.database.queryTimes.filter(
      (metric) => metric.timestamp > cutoffTime,
    );

    // Clean old slow queries
    this.metrics.database.slowQueries = this.metrics.database.slowQueries.filter(
      (metric) => metric.timestamp > cutoffTime,
    );

    logger.debug('Old metrics cleaned up');
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary() {
    const uptimeHours = Math.floor(this.metrics.system.uptime / 3600);
    const avgResponseTime = this.calculateAverageResponseTime();
    const errorRate = this.calculateOverallErrorRate();
    const memoryUsageMB = Math.round(this.metrics.system.memory.heapUsed / 1024 / 1024);

    logger.info('Performance summary', {
      uptime: `${uptimeHours}h`,
      totalRequests: this.metrics.requests.total,
      avgResponseTime: `${avgResponseTime}ms`,
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      memoryUsage: `${memoryUsageMB}MB`,
      slowQueries: this.metrics.database.slowQueries.length,
      rateLimitHits: this.metrics.security.rateLimitHits,
    });
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime() {
    if (this.metrics.requests.responseTimes.length === 0) return 0;

    const total = this.metrics.requests.responseTimes.reduce((sum, metric) => sum + metric.time, 0);
    return Math.round(total / this.metrics.requests.responseTimes.length);
  }

  /**
   * Calculate overall error rate
   */
  calculateOverallErrorRate() {
    if (this.metrics.requests.total === 0) return 0;
    return this.metrics.requests.failed / this.metrics.requests.total;
  }

  /**
   * Get performance metrics for API
   */
  getMetrics() {
    // Handle test environment where system metrics might not be collected
    const memory = this.metrics.system.memory;
    const memoryMetrics = memory && memory.heapUsed && memory.heapTotal ? {
      used: Math.round(memory.heapUsed / 1024 / 1024), // MB
      total: Math.round(memory.heapTotal / 1024 / 1024), // MB
      usage: memory.heapUsed / memory.heapTotal,
    } : {
      used: 0,
      total: 0,
      usage: 0,
    };

    return {
      timestamp: new Date().toISOString(),
      uptime: this.metrics.system.uptime || Math.floor((Date.now() - this.startTime) / 1000),
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        averageResponseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateOverallErrorRate(),
        responseTimes: this.metrics.requests.responseTimes,
        errorRatesByEndpoint: Array.from(this.metrics.requests.errorRates.entries()).map(
          ([endpoint, stats]) => ({
            endpoint,
            ...stats,
            errorRate: stats.total > 0 ? stats.errors / stats.total : 0,
          }),
        ),
      },
      database: {
        connectionPool: this.metrics.database.connectionPool || { status: 'Test environment' },
        averageQueryTime: this.calculateAverageQueryTime(),
        slowQueries: this.metrics.database.slowQueries,
        connectionErrors: this.metrics.database.connectionErrors,
      },
      system: {
        memory: memoryMetrics,
        cpu: this.metrics.system.cpu || { user: 0, system: 0 },
        uptime: this.metrics.system.uptime || Math.floor((Date.now() - this.startTime) / 1000),
      },
      security: {
        rateLimitHits: this.metrics.security.rateLimitHits,
        suspiciousRequests: this.metrics.security.suspiciousRequests,
        blockedIPs: this.metrics.security.blockedIPs.size,
      },
      business: this.metrics.business,
    };
  }

  /**
   * Calculate average query time
   */
  calculateAverageQueryTime() {
    if (this.metrics.database.queryTimes.length === 0) return 0;

    const successfulQueries = this.metrics.database.queryTimes.filter((q) => q.success);
    if (successfulQueries.length === 0) return 0;

    const total = successfulQueries.reduce((sum, metric) => sum + metric.executionTime, 0);
    return Math.round(total / successfulQueries.length);
  }

  /**
   * Sanitize query for logging
   */
  sanitizeQuery(query) {
    if (!query) return '';

    // Remove sensitive data and limit length
    let sanitized = query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .substring(0, 200);

    if (sanitized.length === 200) {
      sanitized += '...';
    }

    return sanitized;
  }

  /**
   * Cleanup intervals and timers (for testing)
   */
  cleanup() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
  }

  /**
   * Reset metrics (for testing or manual intervention)
   */
  resetMetrics() {
    this.metrics.requests = {
      total: 0,
      successful: 0,
      failed: 0,
      responseTimes: [],
      errorRates: new Map(),
    };
    this.metrics.database.queryTimes = [];
    this.metrics.database.slowQueries = [];
    this.metrics.database.connectionErrors = 0;
    this.metrics.security.rateLimitHits = 0;
    this.metrics.security.suspiciousRequests = 0;
    this.metrics.security.blockedIPs.clear();

    // Reset business metrics
    this.metrics.business.activeUsers = 0;
    this.metrics.business.questionnairesCreated = 0;
    this.metrics.business.responsesSubmitted = 0;
    this.metrics.business.qrCodesGenerated = 0;

    logger.info('Performance metrics reset');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
