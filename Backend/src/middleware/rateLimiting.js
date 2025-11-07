'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Redis client for rate limiting
let redisClient;

/**
 * Initialize Redis client for rate limiting
 */
const initializeRedis = () => {
  // Skip Redis in development and test to avoid connection errors
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    logger.info('Skipping Redis initialization in development environment');
    return null;
  }

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis rate limiter connection error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis rate limiter connected');
    });

    return redisClient;
  } catch (error) {
    logger.warn('Failed to initialize Redis for rate limiting, falling back to memory store:', error);
    return null;
  }
};

// Initialize Redis client
const redis = initializeRedis();

/**
 * Rate limiter for anonymous response submissions
 * Limits: 10 submissions per minute per IP address
 */
const anonymousRateLimit = rateLimit({
  windowMs: parseInt(process.env.ANONYMOUS_RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.ANONYMOUS_RATE_LIMIT_MAX_REQUESTS) || 10, // 10 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: redis ? new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }) : undefined, // Use memory store if Redis is not available
  keyGenerator: (req) => {
    // Use IP address as the key
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for anonymous submission:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.ANONYMOUS_RATE_LIMIT_WINDOW_MS) || 60000) / 1000),
      },
    });
  },
});

/**
 * Device fingerprint rate limiter
 * Limits: 5 submissions per hour per device fingerprint
 */
const deviceFingerprintRateLimit = rateLimit({
  windowMs: (parseInt(process.env.DEVICE_FINGERPRINT_LIMIT_HOURS) || 1) * 60 * 60 * 1000, // hours to milliseconds
  max: parseInt(process.env.DEVICE_FINGERPRINT_LIMIT_REQUESTS) || 5, // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'DEVICE_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this device, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redis ? new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }) : undefined,
  keyGenerator: (req) => {
    // Use device fingerprint as the key
    const deviceFingerprint = req.deviceFingerprint || 'unknown';
    return `device:${deviceFingerprint}`;
  },
  handler: (req, res) => {
    logger.warn('Device rate limit exceeded for anonymous submission:', {
      deviceFingerprint: req.deviceFingerprint,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'DEVICE_RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this device, please try again later.',
        retryAfter: Math.ceil(((parseInt(process.env.DEVICE_FINGERPRINT_LIMIT_HOURS) || 1) * 60 * 60 * 1000) / 1000),
      },
    });
  },
});

/**
 * Combined rate limiter for anonymous submissions
 * Applies both IP-based and device fingerprint-based limits
 */
const combinedAnonymousRateLimit = (req, res, next) => {
  // First check IP-based rate limit
  anonymousRateLimit(req, res, (err) => {
    if (err) {
      return next(err);
    }

    // Then check device fingerprint-based rate limit
    deviceFingerprintRateLimit(req, res, next);
  });
};

/**
 * Rate limiter for QR code scanning
 * Limits: 100 scans per minute per IP address
 */
const qrCodeScanRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'QR_SCAN_RATE_LIMIT_EXCEEDED',
      message: 'Too many QR code scans from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redis ? new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }) : undefined,
  keyGenerator: (req) => {
    return `qr_scan:${req.ip || req.connection.remoteAddress || req.socket.remoteAddress}`;
  },
  handler: (req, res) => {
    logger.warn('QR code scan rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'QR_SCAN_RATE_LIMIT_EXCEEDED',
        message: 'Too many QR code scans from this IP, please try again later.',
        retryAfter: 60,
      },
    });
  },
});

/**
 * Rate limiter for analytics endpoints
 * Limits: 60 requests per minute per IP address
 */
const analyticsRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 60, // 60 requests per window
  message: {
    success: false,
    error: {
      code: 'ANALYTICS_RATE_LIMIT_EXCEEDED',
      message: 'Too many analytics requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redis ? new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }) : undefined,
  keyGenerator: (req) => {
    return `analytics:${req.ip || req.connection.remoteAddress || req.socket.remoteAddress}`;
  },
  handler: (req, res) => {
    logger.warn('Analytics rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'ANALYTICS_RATE_LIMIT_EXCEEDED',
        message: 'Too many analytics requests from this IP, please try again later.',
        retryAfter: 60,
      },
    });
  },
});

/**
 * Custom rate limiter factory
 * @param {Object} options - Rate limit options
 * @returns {Function} Express middleware
 */
const createRateLimit = (options) => {
  const {
    windowMs = 60000,
    max = 10,
    message = 'Rate limit exceeded',
    keyPrefix = 'custom',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redis ? new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: keyPrefix,
    }) : undefined,
    keyGenerator: (req) => {
      return `${keyPrefix}:${req.ip || req.connection.remoteAddress || req.socket.remoteAddress}`;
    },
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${keyPrefix}:`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.ceil(windowMs / 1000),
        },
      });
    },
  });
};

/**
 * Get rate limit status for a given key
 * @param {string} key - Rate limit key
 * @returns {Promise<Object>} Rate limit status
 */
const getRateLimitStatus = async (key) => {
  if (!redis) {
    return { available: false };
  }

  try {
    const result = await redis.get(key);
    if (result) {
      const data = JSON.parse(result);
      return {
        available: true,
        count: data.count || 0,
        resetTime: data.resetTime || Date.now() + 60000,
      };
    }
    return { available: true, count: 0, resetTime: Date.now() + 60000 };
  } catch (error) {
    logger.error('Error getting rate limit status:', error);
    return { available: false };
  }
};

/**
 * Reset rate limit for a given key
 * @param {string} key - Rate limit key
 * @returns {Promise<boolean>} Success status
 */
const resetRateLimit = async (key) => {
  if (!redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    return false;
  }
};

module.exports = {
  anonymousRateLimit: combinedAnonymousRateLimit,
  ipRateLimit: anonymousRateLimit,
  deviceFingerprintRateLimit,
  qrCodeScanRateLimit,
  analyticsRateLimit,
  createRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  redis,
};