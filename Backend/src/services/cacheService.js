'use strict';

const logger = require('../utils/logger');

/**
 * Cache Service
 * Provides Redis-based caching for analytics data with fallback mechanisms
 */

// Redis client (will be initialized if available)
let redisClient = null;

// In-memory fallback cache
const memoryCache = new Map();

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 300, // 5 minutes
  analyticsTTL: 600, // 10 minutes
  exportTTL: 1800, // 30 minutes
  maxMemoryItems: 1000,
};

/**
 * Initialize Redis client
 * @param {Object} redisOptions - Redis connection options
 */
const initializeRedis = async (redisOptions = {}) => {
  // Skip Redis in development to avoid connection errors
  if (process.env.NODE_ENV === 'development') {
    logger.info('Skipping Redis initialization in development environment');
    redisClient = null;
    return false;
  }

  try {
    const Redis = require('redis');
    redisClient = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      ...redisOptions,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
      redisClient = null; // Fallback to memory cache
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected successfully');
    });

    await redisClient.connect();
    return true;

  } catch (error) {
    logger.warn('Redis initialization failed, using memory cache fallback:', error.message);
    redisClient = null;
    return false;
  }
};

/**
 * Generate cache key
 * @param {string} prefix - Cache key prefix
 * @param {Object} params - Parameters to include in key
 * @returns {string} Cache key
 */
const generateCacheKey = (prefix, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');

  return `${prefix}:${sortedParams}`;
};

/**
 * Set cache value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
const setCache = async (key, value, ttl = CACHE_CONFIG.defaultTTL) => {
  try {
    const serializedValue = JSON.stringify({
      data: value,
      timestamp: Date.now(),
      ttl,
    });

    if (redisClient) {
      await redisClient.setEx(key, ttl, serializedValue);
      logger.debug(`Cached data in Redis: ${key}`);
    } else {
      // Memory cache fallback
      if (memoryCache.size >= CACHE_CONFIG.maxMemoryItems) {
        // Remove oldest item
        const firstKey = memoryCache.keys().next().value;
        memoryCache.delete(firstKey);
      }

      memoryCache.set(key, {
        data: serializedValue,
        expiry: Date.now() + (ttl * 1000),
      });
      logger.debug(`Cached data in memory: ${key}`);
    }

    return true;

  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Get cache value
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
const getCache = async (key) => {
  try {
    let serializedValue;

    if (redisClient) {
      serializedValue = await redisClient.get(key);
    } else {
      // Memory cache fallback
      const cached = memoryCache.get(key);
      if (!cached || Date.now() > cached.expiry) {
        memoryCache.delete(key);
        return null;
      }
      serializedValue = cached.data;
    }

    if (!serializedValue) {
      return null;
    }

    const parsed = JSON.parse(serializedValue);

    // Validate cache structure
    if (!parsed.data || !parsed.timestamp) {
      return null;
    }

    logger.debug(`Retrieved cached data: ${key}`);
    return parsed.data;

  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Delete cache value
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
const deleteCache = async (key) => {
  try {
    if (redisClient) {
      await redisClient.del(key);
      logger.debug(`Deleted cache from Redis: ${key}`);
    } else {
      memoryCache.delete(key);
      logger.debug(`Deleted cache from memory: ${key}`);
    }

    return true;

  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Cache key pattern
 * @returns {Promise<boolean>} Success status
 */
const clearCacheByPattern = async (pattern) => {
  try {
    if (redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } else {
      // Memory cache fallback
      const regexPattern = pattern.replace(/\*/g, '.*');
      for (const key of memoryCache.keys()) {
        if (new RegExp(regexPattern).test(key)) {
          memoryCache.delete(key);
        }
      }
      logger.debug(`Cleared memory cache entries matching pattern: ${pattern}`);
    }

    return true;

  } catch (error) {
    logger.error(`Error clearing cache pattern ${pattern}:`, error);
    return false;
  }
};

/**
 * Cache analytics data
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} analyticsData - Analytics data to cache
 * @param {Object} options - Cache options
 * @returns {Promise<boolean>} Success status
 */
const cacheAnalyticsData = (questionnaireId, analyticsData, options = {}) => {
  const {
    dateFrom = null,
    dateTo = null,
    comparisonPeriod = 'week',
    customDateFrom = null,
    customDateTo = null,
  } = options;

  const cacheKey = generateCacheKey('analytics', {
    questionnaireId,
    dateFrom,
    dateTo,
    comparisonPeriod,
    customDateFrom,
    customDateTo,
  });

  return setCache(cacheKey, analyticsData, CACHE_CONFIG.analyticsTTL);
};

/**
 * Get cached analytics data
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} options - Cache options
 * @returns {Promise<Object|null>} Cached analytics data or null
 */
const getCachedAnalyticsData = (questionnaireId, options = {}) => {
  const {
    dateFrom = null,
    dateTo = null,
    comparisonPeriod = 'week',
    customDateFrom = null,
    customDateTo = null,
  } = options;

  const cacheKey = generateCacheKey('analytics', {
    questionnaireId,
    dateFrom,
    dateTo,
    comparisonPeriod,
    customDateFrom,
    customDateTo,
  });

  return getCache(cacheKey);
};

/**
 * Cache comparison data
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} comparisonData - Comparison data to cache
 * @param {Object} options - Cache options
 * @returns {Promise<boolean>} Success status
 */
const cacheComparisonData = (questionnaireId, comparisonData, options = {}) => {
  const {
    comparisonType = 'week_over_week',
    currentPeriodStart = null,
    currentPeriodEnd = null,
    previousPeriodStart = null,
    previousPeriodEnd = null,
  } = options;

  const cacheKey = generateCacheKey('comparison', {
    questionnaireId,
    comparisonType,
    currentPeriodStart,
    currentPeriodEnd,
    previousPeriodStart,
    previousPeriodEnd,
  });

  return setCache(cacheKey, comparisonData, CACHE_CONFIG.analyticsTTL);
};

/**
 * Get cached comparison data
 * @param {number} questionnaireId - Questionnaire ID
 * @param {Object} options - Cache options
 * @returns {Promise<Object|null>} Cached comparison data or null
 */
const getCachedComparisonData = (questionnaireId, options = {}) => {
  const {
    comparisonType = 'week_over_week',
    currentPeriodStart = null,
    currentPeriodEnd = null,
    previousPeriodStart = null,
    previousPeriodEnd = null,
  } = options;

  const cacheKey = generateCacheKey('comparison', {
    questionnaireId,
    comparisonType,
    currentPeriodStart,
    currentPeriodEnd,
    previousPeriodStart,
    previousPeriodEnd,
  });

  return getCache(cacheKey);
};

/**
 * Invalidate cache for a questionnaire
 * @param {number} questionnaireId - Questionnaire ID
 * @returns {Promise<boolean>} Success status
 */
const invalidateQuestionnaireCache = async (questionnaireId) => {
  try {
    const patterns = [
      `analytics:*questionnaireId:${questionnaireId}*`,
      `comparison:*questionnaireId:${questionnaireId}*`,
      `report:*questionnaireId:${questionnaireId}*`,
    ];

    for (const pattern of patterns) {
      await clearCacheByPattern(pattern);
    }

    logger.info(`Invalidated cache for questionnaire ${questionnaireId}`);
    return true;

  } catch (error) {
    logger.error(`Error invalidating cache for questionnaire ${questionnaireId}:`, error);
    return false;
  }
};

/**
 * Warm up cache for frequently accessed questionnaires
 * @param {Array<number>} questionnaireIds - Array of questionnaire IDs
 * @param {Function} analyticsFunction - Function to generate analytics data
 * @returns {Promise<number>} Number of questionnaires warmed up
 */
const warmUpCache = async (questionnaireIds, analyticsFunction) => {
  let warmedUp = 0;

  for (const questionnaireId of questionnaireIds) {
    try {
      // Check if already cached
      const cached = await getCachedAnalyticsData(questionnaireId);
      if (cached) {
        continue;
      }

      // Generate and cache analytics data
      const analyticsData = await analyticsFunction(questionnaireId);
      await cacheAnalyticsData(questionnaireId, analyticsData);
      warmedUp++;

    } catch (error) {
      logger.error(`Error warming up cache for questionnaire ${questionnaireId}:`, error);
    }
  }

  logger.info(`Warmed up cache for ${warmedUp} questionnaires`);
  return warmedUp;
};

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
const getCacheStats = async () => {
  try {
    if (redisClient) {
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');

      return {
        type: 'redis',
        connected: true,
        memory: info,
        keyspace,
      };
    } else {
      return {
        type: 'memory',
        connected: true,
        size: memoryCache.size,
        maxSize: CACHE_CONFIG.maxMemoryItems,
      };
    }

  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return {
      type: redisClient ? 'redis' : 'memory',
      connected: false,
      error: error.message,
    };
  }
};

/**
 * Health check for cache service
 * @returns {Promise<Object>} Health status
 */
const healthCheck = async () => {
  try {
    const testKey = 'health_check_test';
    const testValue = { test: 'data', timestamp: Date.now() };

    // Test set and get
    const setResult = await setCache(testKey, testValue, 10);
    if (!setResult) {
      throw new Error('Cache set operation failed');
    }

    const getValue = await getCache(testKey);
    if (!getValue || getValue.test !== 'data') {
      throw new Error('Cache get operation failed');
    }

    // Clean up test key
    await deleteCache(testKey);

    return {
      status: 'healthy',
      type: redisClient ? 'redis' : 'memory',
      responseTime: Date.now(),
    };

  } catch (error) {
    logger.error('Cache health check failed:', error);
    return {
      status: 'unhealthy',
      type: redisClient ? 'redis' : 'memory',
      error: error.message,
    };
  }
};

// Initialize Redis on module load
initializeRedis().catch(() => {
  logger.info('Using memory cache fallback');
});

module.exports = {
  initializeRedis,
  setCache,
  getCache,
  deleteCache,
  clearCacheByPattern,
  cacheAnalyticsData,
  getCachedAnalyticsData,
  cacheComparisonData,
  getCachedComparisonData,
  invalidateQuestionnaireCache,
  warmUpCache,
  getCacheStats,
  healthCheck,
  CACHE_CONFIG,
};