'use strict';

const tokenUtils = require('../utils/tokenUtils');
const DeviceFingerprint = require('../utils/deviceFingerprint'); // eslint-disable-line no-unused-vars
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Authentication middleware for protecting routes
 */
class AuthMiddleware {
  /**
   * JWT authentication middleware
   * Verifies JWT token and attaches user info to request
   */
  static authenticate = async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = tokenUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'Access token is required. Please provide a valid Authorization header.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Verify the token
      const decoded = await tokenUtils.verifyAccessToken(token);

      // Check if token is of correct type
      if (decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          error: 'Invalid Token',
          message: 'Invalid token type. Access token required.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Find the user
      const user = await User.scope('active').findByPk(decoded.sub);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User Not Found',
          message: 'The user associated with this token no longer exists.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Check if user is locked
      if (user.isLocked()) {
        return res.status(423).json({
          success: false,
          error: 'Account Locked',
          message: 'Your account is temporarily locked. Please contact support.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Attach user info to request
      req.user = { ...decoded, id: decoded.sub };
      req.userProfile = user;


      logger.debug('User authenticated successfully', {
        userId: user.id,
        email: user.email,
        requestId: req.requestId,
      });

      next();
    } catch (error) {
      logger.error('Authentication middleware error', {
        error: error.message,
        requestId: req.requestId,
      });

      const statusCode = 401;
      let errorMessage = 'Authentication Failed';

      if (error.message.includes('expired')) {
        errorMessage = 'Token Expired';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Invalid Token';
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  };

  /**
   * Optional authentication middleware
   * Attaches user info if token is present, but doesn't require it
   */
  static optionalAuthenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = tokenUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        // No token provided, continue without authentication
        return next();
      }

      // Try to verify token
      const decoded = await tokenUtils.verifyAccessToken(token);

      if (decoded.type !== 'access') {
        return next();
      }

      const user = await User.scope('active').findByPk(decoded.sub);
      if (user && !user.isLocked()) {
        req.user = { ...decoded, id: decoded.sub };
        req.userProfile = user;
      }

      next();
    } catch (error) {
      // Log error but continue without authentication
      logger.debug('Optional authentication failed', {
        error: error.message,
        requestId: req.requestId,
      });
      next();
    }
  };

  /**
   * Email verification required middleware
   * Ensures user's email is verified
   */
  static requireEmailVerification = (req, res, next) => {
    if (!req.userProfile) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'Please authenticate to access this resource.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }

    if (!req.userProfile.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Email Verification Required',
        message: 'Please verify your email address to access this feature.',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }

    next();
  };

  /**
   * Subscription plan middleware
   * Checks if user has required subscription plan
   */
  static requireSubscription = (requiredPlans = ['starter', 'business']) => {
    return (req, res, next) => {
      if (!req.userProfile) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'Please authenticate to access this resource.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const userPlan = req.userProfile.subscription_plan;
      const userStatus = req.userProfile.subscription_status;

      // Check if subscription is active
      if (userStatus !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Subscription Inactive',
          message: 'Your subscription is not active. Please update your payment method.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Check if user has required plan
      if (!requiredPlans.includes(userPlan)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Subscription',
          message: `This feature requires a ${requiredPlans.join(' or ')} subscription. Your current plan: ${userPlan}.`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      next();
    };
  };

  /**
   * Role-based access control middleware (foundation for future roles)
   */
  static requireRole = (requiredRoles = []) => {
    return (req, res, next) => {
      if (!req.userProfile) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'Please authenticate to access this resource.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // For now, all authenticated users have 'user' role
      // This can be extended when role system is implemented
      const userRoles = ['user'];

      const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient Permissions',
          message: 'You do not have the required permissions to access this resource.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      next();
    };
  };

  /**
   * Rate limiting middleware for authentication endpoints
   */
  static authRateLimit = (maxRequests = 5, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
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
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${Math.ceil((userRequests[0] + windowMs - now) / 1000)} seconds.`,
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
   * Request logging middleware for authentication events
   */
  static logAuthEvent = (eventType) => {
    return (req, res, next) => {
      const originalSend = res.send;

      res.send = function (data) {
        // Log authentication events
        logger.info(`Auth event: ${eventType}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          email: req.body?.email,
          userId: req.user?.sub,
          success: JSON.parse(data)?.success,
          requestId: req.requestId,
        });

        originalSend.call(this, data);
      };

      next();
    };
  };
}

module.exports = AuthMiddleware;
