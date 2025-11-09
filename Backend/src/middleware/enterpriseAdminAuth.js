'use strict';

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { AdminUser, AdminRole, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Enhanced Enterprise Admin Authentication Middleware
 */
class EnterpriseAdminAuthMiddleware {
  constructor() {
    // Initialize static properties if not already initialized
    if (!EnterpriseAdminAuthMiddleware.sessionStore) {
      EnterpriseAdminAuthMiddleware.sessionStore = new Map(); // In-memory session store (replace with Redis in production)
      EnterpriseAdminAuthMiddleware.failedAttempts = new Map(); // Track failed login attempts
      EnterpriseAdminAuthMiddleware.lockoutDuration = 15 * 60 * 1000; // 15 minutes
      EnterpriseAdminAuthMiddleware.maxFailedAttempts = 5;
    }
  }

  /**
   * Authenticate enterprise admin user
   */
  static async authenticate(req, res, next) {
    try {
      const token = EnterpriseAdminAuthMiddleware.extractToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'Enterprise admin token is required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get admin user with role
      const adminUser = await AdminUser.findByPk(decoded.adminUserId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'first_name', 'last_name', 'is_active'],
          },
          {
            model: AdminRole,
            as: 'role',
            attributes: ['id', 'name', 'permissions', 'level'],
          },
        ],
      });

      if (!adminUser || !adminUser.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Admin User',
          message: 'Admin user not found or inactive',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      if (!adminUser.user || !adminUser.user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'Invalid User Account',
          message: 'Associated user account is inactive',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Check session validity
      const session = EnterpriseAdminAuthMiddleware.sessionStore.get(decoded.sessionId);
      if (!session || session.adminUserId !== adminUser.id) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Session',
          message: 'Admin session has expired or is invalid',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Check for 2FA requirement
      if (adminUser.two_factor_enabled && !session.twoFactorVerified) {
        return res.status(403).json({
          success: false,
          error: 'Two-Factor Authentication Required',
          message: 'Please complete 2FA verification',
          requiresTwoFactor: true,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      // Attach admin user to request
      req.adminUser = adminUser;
      req.sessionId = decoded.sessionId;
      req.adminPermissions = EnterpriseAdminAuthMiddleware.getEffectivePermissions(adminUser);

      // Update session activity
      session.lastActivity = Date.now();
      EnterpriseAdminAuthMiddleware.sessionStore.set(decoded.sessionId, session);

      next();
    } catch (error) {
      logger.error('Enterprise admin authentication error', {
        error: error.message,
        stack: error.stack,
        requestId: req.requestId,
      });

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid Token',
          message: 'The provided token is invalid',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token Expired',
          message: 'The provided token has expired',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Authentication Error',
        message: 'An error occurred during authentication',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Require specific permission
   */
  static requirePermission(permission) {
    return (req, res, next) => {
      if (!req.adminUser) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'Admin authentication is required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      const hasPermission = req.adminPermissions.includes('*') ||
                           req.adminPermissions.includes(permission);

      if (!hasPermission) {
        logger.warn('Permission denied', {
          adminUserId: req.adminUser.id,
          requiredPermission: permission,
          userPermissions: req.adminPermissions,
          requestId: req.requestId,
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient Permissions',
          message: `You do not have permission to perform this action. Required: ${permission}`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      next();
    };
  }

  /**
   * Require minimum role level
   */
  static requireRoleLevel(minLevel) {
    return (req, res, next) => {
      if (!req.adminUser || !req.adminUser.role) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'Admin authentication is required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      if (req.adminUser.role.level < minLevel) {
        logger.warn('Role level insufficient', {
          adminUserId: req.adminUser.id,
          userLevel: req.adminUser.role.level,
          requiredLevel: minLevel,
          requestId: req.requestId,
        });

        return res.status(403).json({
          success: false,
          error: 'Insufficient Role Level',
          message: `Your role level is insufficient. Required: ${minLevel}, Current: ${req.adminUser.role.level}`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      next();
    };
  }

  /**
   * Check for account lockout
   */
  static checkAccountLockout(req, res, next) {
    const identifier = req.body.email || req.ip;
    const attempts = EnterpriseAdminAuthMiddleware.failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };

    if (attempts.count >= EnterpriseAdminAuthMiddleware.maxFailedAttempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;

      if (timeSinceLastAttempt < EnterpriseAdminAuthMiddleware.lockoutDuration) {
        const remainingTime = Math.ceil((EnterpriseAdminAuthMiddleware.lockoutDuration - timeSinceLastAttempt) / 1000 / 60);

        return res.status(429).json({
          success: false,
          error: 'Account Locked',
          message: `Too many failed login attempts. Account locked for ${remainingTime} minutes.`,
          lockoutRemaining: remainingTime * 60, // seconds
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      } else {
        // Reset attempts after lockout period
        EnterpriseAdminAuthMiddleware.failedAttempts.delete(identifier);
      }
    }

    next();
  }

  /**
   * Track failed login attempt
   */
  static trackFailedAttempt(identifier) {
    const attempts = EnterpriseAdminAuthMiddleware.failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    EnterpriseAdminAuthMiddleware.failedAttempts.set(identifier, attempts);

    logger.warn('Failed admin login attempt', {
      identifier,
      attemptCount: attempts.count,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Clear failed login attempts
   */
  static clearFailedAttempts(identifier) {
    EnterpriseAdminAuthMiddleware.failedAttempts.delete(identifier);
  }

  /**
   * Extract token from request
   */
  static extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return req.cookies?.adminToken || req.query?.token || null;
  }

  /**
   * Get effective permissions for admin user
   */
  static getEffectivePermissions(adminUser) {
    const rolePermissions = adminUser.role?.permissions || [];
    const customPermissions = adminUser.permissions || [];

    // If role has wildcard permission, return all
    if (rolePermissions.includes('*')) {
      return ['*'];
    }

    // Merge role permissions with custom permissions
    return [...new Set([...rolePermissions, ...customPermissions])];
  }

  /**
   * Generate admin session token
   */
  static generateSessionToken(adminUserId, sessionId) {
    return jwt.sign(
      {
        adminUserId,
        sessionId,
        type: 'enterprise_admin',
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
    );
  }

  /**
   * Create admin session
   */
  static createSession(adminUserId, metadata = {}) {
    const sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      sessionId,
      adminUserId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      twoFactorVerified: false,
    };

    EnterpriseAdminAuthMiddleware.sessionStore.set(sessionId, session);
    return session;
  }

  /**
   * Verify 2FA token
   */
  static verifyTwoFactorToken(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before and after
    });
  }

  /**
   * Generate 2FA secret
   */
  static generateTwoFactorSecret() {
    return speakeasy.generateSecret({
      name: `Ulasis Enterprise Admin (${process.env.APP_NAME || 'Ulasis'})`,
      issuer: 'Ulasis Enterprise',
      length: 32,
    });
  }

  /**
   * Generate QR code for 2FA setup
   */
  static async generateTwoFactorQRCode(secret) {
    try {
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: `Ulasis Enterprise Admin (${process.env.APP_NAME || 'Ulasis'})`,
        issuer: 'Ulasis Enterprise',
      });

      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      logger.error('Failed to generate 2FA QR code', { error: error.message });
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Rate limiting for admin operations
   */
  static adminRateLimit(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for admin operations',
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use admin user ID if available, otherwise IP
        return req.adminUser ? `admin_${req.adminUser.id}` : req.ip;
      },
    };

    return rateLimit({ ...defaultOptions, ...options });
  }

  /**
   * Strict rate limiting for sensitive operations
   */
  static strictRateLimit(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // Very strict limit for sensitive operations
      message: {
        success: false,
        error: 'Rate Limit Exceeded',
        message: 'Too many sensitive operations attempted',
        timestamp: new Date().toISOString(),
      },
      keyGenerator: (req) => {
        return req.adminUser ? `admin_${req.adminUser.id}` : req.ip;
      },
    };

    return rateLimit({ ...defaultOptions, ...options });
  }

  /**
   * Log admin action
   */
  static logAdminAction(action, resourceType = null) {
    return async (req, res, next) => {
      // Store action info for logging after response
      req.adminAction = {
        action,
        resourceType,
        resourceId: req.params.id || null,
        startTime: Date.now(),
      };

      // Override res.json to log after response
      const originalJson = res.json;
      res.json = function(data) {
        if (req.adminUser && req.adminAction) {
          const enterpriseAdminService = require('../services/enterpriseAdminService');

          enterpriseAdminService.logActivity(
            req.adminUser.id,
            req.adminAction.action,
            req.adminAction.resourceType,
            req.adminAction.resourceId,
            {
              statusCode: res.statusCode,
              response: data,
              method: req.method,
              url: req.originalUrl,
            },
            {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              sessionId: req.sessionId,
              duration: Date.now() - req.adminAction.startTime,
              status: res.statusCode < 400 ? 'success' : 'failure',
            },
          ).catch(error => {
            logger.error('Failed to log admin action', { error: error.message });
          });
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions() {
    const now = Date.now();
    const sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours

    for (const [sessionId, session] of EnterpriseAdminAuthMiddleware.sessionStore.entries()) {
      if (now - session.lastActivity > sessionTimeout) {
        EnterpriseAdminAuthMiddleware.sessionStore.delete(sessionId);
        logger.info('Expired admin session cleaned up', { sessionId });
      }
    }
  }

  /**
   * Get session info
   */
  static getSession(sessionId) {
    return EnterpriseAdminAuthMiddleware.sessionStore.get(sessionId);
  }

  /**
   * Destroy a specific session
   */
  static destroySession(sessionId) {
    return EnterpriseAdminAuthMiddleware.sessionStore.delete(sessionId);
  }

  /**
   * Invalidate all sessions for a specific user
   */
  static invalidateAllUserSessions(adminUserId) {
    const sessionsToDestroy = [];
    
    // Find all sessions for this user
    for (const [sessionId, session] of EnterpriseAdminAuthMiddleware.sessionStore.entries()) {
      if (session.adminUserId === adminUserId) {
        sessionsToDestroy.push(sessionId);
      }
    }
    
    // Destroy all found sessions
    sessionsToDestroy.forEach(sessionId => {
      EnterpriseAdminAuthMiddleware.sessionStore.delete(sessionId);
    });
    
    return sessionsToDestroy.length;
  }

  /**
   * Update session 2FA verification
   */
  static verifySessionTwoFactor(sessionId) {
    const session = EnterpriseAdminAuthMiddleware.sessionStore.get(sessionId);
    if (session) {
      session.twoFactorVerified = true;
      session.lastActivity = Date.now();
      EnterpriseAdminAuthMiddleware.sessionStore.set(sessionId, session);
      return true;
    }
    return false;
  }
}

// Initialize static properties
EnterpriseAdminAuthMiddleware.sessionStore = new Map();
EnterpriseAdminAuthMiddleware.failedAttempts = new Map();
EnterpriseAdminAuthMiddleware.lockoutDuration = 15 * 60 * 1000;
EnterpriseAdminAuthMiddleware.maxFailedAttempts = 5;

// Clean up expired sessions every 5 minutes
setInterval(() => {
  EnterpriseAdminAuthMiddleware.cleanupExpiredSessions();
}, 5 * 60 * 1000);

module.exports = EnterpriseAdminAuthMiddleware;