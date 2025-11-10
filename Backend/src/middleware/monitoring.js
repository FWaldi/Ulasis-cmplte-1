const performanceMonitor = require('../monitoring/performance-monitor');
const securityMonitor = require('../monitoring/security-monitor');
const logger = require('../utils/logger');

/**
 * Monitoring Middleware
 *
 * This middleware integrates performance and security monitoring
 * with Express.js requests and responses.
 */

/**
 * Request monitoring middleware
 */
const requestMonitor = (req, res, next) => {
  const startTime = Date.now();

  // Generate unique request ID
  req.requestId = generateRequestId();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Log request start
  logger.info('Request started', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Security analysis
  const securityAnalysis = securityMonitor.analyzeRequest(req, res);

  // Block request if security threats detected
  if (securityAnalysis.actions.includes('block_request')) {
    logger.warn('Request blocked due to security threats', {
      requestId: req.requestId,
      threats: securityAnalysis.threats,
      ip: req.ip,
    });

    return res.status(403).json({
      error: 'Access Denied',
      message: 'Request blocked for security reasons',
      requestId: req.requestId,
    });
  }

  // Monitor response
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - startTime;

    // Record performance metrics
    performanceMonitor.recordRequest(req, res, responseTime);

    // Log request completion
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  // Handle response finish event
  res.on('finish', () => {
    // const responseTime = Date.now() - startTime; // Available for future use

    // Record security events based on response
    if (res.statusCode === 401) {
      securityMonitor.recordEvent(
        'unauthorized_access_attempt',
        {
          requestId: req.requestId,
          path: req.path,
          method: req.method,
          ip: req.ip,
        },
        'MEDIUM',
      );
    }

    if (res.statusCode === 403) {
      securityMonitor.recordEvent(
        'forbidden_access_attempt',
        {
          requestId: req.requestId,
          path: req.path,
          method: req.method,
          ip: req.ip,
        },
        'MEDIUM',
      );
    }

    if (res.statusCode === 429) {
      securityMonitor.recordRateLimitHit(req.ip, `${req.method} ${req.path}`);
    }
  });

  next();
};

/**
 * Database query monitoring middleware
 */
const databaseMonitor = (query, _options) => {
  const startTime = Date.now();

  return {
    ...query,
    execute: async (...args) => {
      try {
        const result = await query.execute(...args);
        const executionTime = Date.now() - startTime;

        // Record successful query
        performanceMonitor.recordDatabaseQuery(query.sql || 'unknown', executionTime);

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;

        // Record failed query
        performanceMonitor.recordDatabaseQuery(query.sql || 'unknown', executionTime, error);

        throw error;
      }
    },
  };
};

/**
 * Error monitoring middleware
 */
const errorMonitor = (err, req, res, next) => {
  // Record security event for suspicious errors
  if (isSuspiciousError(err)) {
    securityMonitor.recordEvent(
      'suspicious_error',
      {
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
      },
      'MEDIUM',
    );
  }

  // Record performance impact
  performanceMonitor.recordRequest(req, res, Date.now() - req.startTime || 0);

  // Log error with monitoring context
  logger.error('Request error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  next(err);
};

/**
 * IP blocking middleware
 */
const ipBlocker = (req, res, next) => {
  const ip = req.ip;

  if (securityMonitor.isIPBlocked(ip)) {
    logger.warn('Blocked IP attempted access', {
      ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });

    return res.status(403).json({
      error: 'Access Denied',
      message: 'Your IP address has been blocked due to security violations',
    });
  }

  next();
};

/**
 * Business metrics middleware
 */
const businessMetrics = (req, res, next) => {
  // Record business metrics based on request patterns
  const originalSend = res.send;
  res.send = function (data) {
    // Record successful business events
    if (res.statusCode >= 200 && res.statusCode < 300) {
      recordBusinessMetric(req, res);
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Health check enhancement
 */
const enhancedHealthCheck = async (req, res) => {
  const startTime = Date.now();

  try {
    // Get performance metrics
    const performanceMetrics = performanceMonitor.getMetrics();

    // Get security metrics
    const securityMetrics = securityMonitor.getMetrics();

    // Basic health checks
    const dbHealth = await checkDatabaseHealth();
    const systemHealth = checkSystemHealth();

    // Calculate overall health
    const overallHealth = calculateOverallHealth({
      performance: performanceMetrics,
      security: securityMetrics,
      database: dbHealth,
      system: systemHealth,
    });

    const responseTime = Date.now() - startTime;

    const healthData = {
      status: overallHealth.status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: dbHealth,
        system: systemHealth,
        performance: {
          status: performanceMetrics.requests.errorRate < 0.05 ? 'healthy' : 'warning',
          averageResponseTime: performanceMetrics.requests.averageResponseTime,
          errorRate: performanceMetrics.requests.errorRate,
          memoryUsage: performanceMetrics.system.memory.usage,
        },
        security: {
          status: securityMetrics.summary.blockedIPs < 50 ? 'healthy' : 'warning',
          recentEvents: securityMetrics.summary.recentEvents,
          blockedIPs: securityMetrics.summary.blockedIPs,
          activeAlerts: securityMetrics.summary.activeAlerts,
        },
      },
      metrics: {
        performance: performanceMetrics,
        security: securityMetrics,
      },
    };

    const statusCode = overallHealth.status === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Enhanced health check failed:', error);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Monitoring metrics endpoint
 */
const metricsEndpoint = (req, res) => {
  try {
    const performanceMetrics = performanceMonitor.getMetrics();
    const securityMetrics = securityMonitor.getMetrics();

    const metrics = {
      timestamp: new Date().toISOString(),
      performance: performanceMetrics,
      security: securityMetrics,
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message,
    });
  }
};

/**
 * Helper functions
 */

const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const isSuspiciousError = (err) => {
  const suspiciousPatterns = [
    /sql/i,
    /database/i,
    /unauthorized/i,
    /forbidden/i,
    /injection/i,
    /xss/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(err.message) || pattern.test(err.stack));
};

const recordBusinessMetric = (req, _res) => {
  const path = req.path;
  const method = req.method;

  // Record business metrics based on endpoints
  if (method === 'POST' && path.includes('/questionnaires')) {
    performanceMonitor.recordBusinessMetric('questionnaire_created');
  }

  if (method === 'POST' && path.includes('/responses')) {
    performanceMonitor.recordBusinessMetric('response_submitted');
  }

  if (method === 'POST' && path.includes('/qr-codes')) {
    performanceMonitor.recordBusinessMetric('qr_code_generated');
  }

  if ((method === 'POST' && path.includes('/users')) || path.includes('/register')) {
    performanceMonitor.recordBusinessMetric('user_registered');
  }
};

const checkDatabaseHealth = async () => {
  try {
    // Use test database config when in test environment
    const dbConfig = process.env.NODE_ENV === 'test'
      ? require('../config/database-test')
      : require('../config/database');

    const { sequelize, getConnectionPoolInfo } = dbConfig;
    await sequelize.authenticate();

    const poolInfo = getConnectionPoolInfo();

    return {
      status: 'healthy',
      connectionPool: poolInfo,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastChecked: new Date().toISOString(),
    };
  }
};

const checkSystemHealth = () => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  const memoryUsage = {
    rss: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
    heapTotal: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
    heapUsed: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
    external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
  };

  const memoryThreshold = process.env.NODE_ENV === 'test' ? 1000 : 500; // Higher threshold for tests
  const isMemoryHealthy = memoryUsage.heapUsed < memoryThreshold;

  return {
    status: isMemoryHealthy ? 'healthy' : 'warning',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: memoryUsage,
    platform: process.platform,
    nodeVersion: process.version,
    lastChecked: new Date().toISOString(),
  };
};

const calculateOverallHealth = (components) => {
  const { performance, security, database, system } = components;

  // Check critical components
  if (database.status !== 'healthy') {
    return { status: 'unhealthy', reason: 'Database unhealthy' };
  }

  if (system.status === 'warning') {
    return { status: 'warning', reason: 'System resources high' };
  }

  if (performance.requests.errorRate > 0.1) {
    return { status: 'warning', reason: 'High error rate' };
  }

  if (security.summary.activeAlerts > 0) {
    return { status: 'warning', reason: 'Active security alerts' };
  }

  return { status: 'healthy' };
};

module.exports = {
  requestMonitor,
  databaseMonitor,
  errorMonitor,
  ipBlocker,
  businessMetrics,
  enhancedHealthCheck,
  metricsEndpoint,
};
