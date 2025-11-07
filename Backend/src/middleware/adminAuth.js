'use strict';

const logger = require('../utils/logger');

/**
 * Admin Authentication and Authorization Middleware
 * Ensures user is authenticated and has admin role
 */
class AdminAuthMiddleware {
  /**
   * Admin access middleware
   * Requires authentication and admin role
   */
  static requireAdmin = (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.userProfile) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'Please authenticate to access admin resources.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Check if user has admin subscription plan
      if (req.userProfile.subscription_plan !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin Access Required',
          message: 'You do not have admin privileges to access this resource.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      logger.debug('Admin access granted', {
        userId: req.userProfile.id,
        email: req.userProfile.email,
        requestId: req.requestId,
      });

      next();
    } catch (error) {
      logger.error('Admin auth middleware error', {
        error: error.message,
        userId: req.user?.id,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An error occurred while verifying admin access.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  };

  /**
   * Admin session timeout middleware
   * Logs out admin after period of inactivity
   */
  static adminSessionTimeout = (timeoutMs = 30 * 60 * 1000) => { // 30 minutes default
    return (req, res, next) => {
      if (!req.userProfile || req.userProfile.subscription_plan !== 'admin') {
        return next();
      }

      const now = Date.now();
      const lastActivity = req.userProfile.last_login_at ?
        new Date(req.userProfile.last_login_at).getTime() : now;

      if (now - lastActivity > timeoutMs) {
        return res.status(401).json({
          success: false,
          error: 'Session Expired',
          message: 'Your admin session has expired due to inactivity. Please log in again.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Update last activity
      req.userProfile.update({ last_login_at: new Date() });

      next();
    };
  };

  /**
   * Admin rate limiting middleware
   * Stricter rate limiting for admin endpoints
   */
  static adminRateLimit = (maxRequests = 10, windowMs = 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
      if (!req.userProfile || req.userProfile.subscription_plan !== 'admin') {
        return next();
      }

      const key = req.userProfile.id;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      if (requests.has(key)) {
        const userRequests = requests.get(key).filter((time) => time > windowStart);
        requests.set(key, userRequests);
      } else {
        requests.set(key, []);
      }

      // Check current requests
      const userRequests = requests.get(key);

      if (userRequests.length >= maxRequests) {
        logger.warn('Admin rate limit exceeded', {
          userId: req.userProfile.id,
          email: req.userProfile.email,
          requestId: req.requestId,
        });

        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: 'Admin rate limit exceeded. Please slow down your requests.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Add current request
      userRequests.push(now);
      requests.set(key, userRequests);

      next();
    };
  };

  /**
   * Admin action logging middleware
   * Logs all admin actions for audit trail
   */
  static logAdminAction = (action) => {
    return (req, res, next) => {
      if (!req.userProfile || req.userProfile.subscription_plan !== 'admin') {
        return next();
      }

      const originalSend = res.send;

      res.send = function (data) {
        // Log admin action
        logger.info('Admin action performed', {
          userId: req.userProfile.id,
          email: req.userProfile.email,
          action,
          resource: req.params.id || req.params.userId || 'general',
          method: req.method,
          path: req.path,
          success: JSON.parse(data)?.success,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.requestId,
        });

        originalSend.call(this, data);
      };

      next();
    };
  };
}

module.exports = AdminAuthMiddleware;