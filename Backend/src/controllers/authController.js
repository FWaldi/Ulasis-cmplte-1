'use strict';

const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Authentication controller for handling HTTP requests
 */
class AuthController {
  /**
   * Validation middleware for registration
   */
  static validateRegistration = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be between 1 and 100 characters'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be between 1 and 100 characters'),
  ];

  /**
    * Validation middleware for login
    */
  static validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ];

  /**
    * Validation middleware for admin login
    */
  static validateAdminLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
    body('mfa_token').optional().isLength({ min: 6, max: 6 }).isNumeric().withMessage('MFA token must be 6 digits'),
  ];

  /**
   * Validation middleware for password reset request
   */
  static validatePasswordResetRequest = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  ];

  /**
   * Validation middleware for password reset confirmation
   */
  static validatePasswordReset = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
  ];

  /**
   * Validation middleware for profile update
   */
  static validateProfileUpdate = [
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be between 1 and 100 characters'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be between 1 and 100 characters'),
    body('preferences').optional().isObject().withMessage('Preferences must be a valid object'),
  ];

  /**
   * Validation middleware for password change
   */
  static validatePasswordChange = [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
  ];

  /**
    * Validation middleware for token refresh
    */
  static validateTokenRefresh = [
    body().custom((value, { req }) => {
      if (!req.body.refresh_token && !req.body.refreshToken) {
        throw new Error('Refresh token is required');
      }
      return true;
    }),
  ];

  /**
    * Validation middleware for MFA setup
    */
  static validateMFASetup = [
    // No body validation needed for setup
  ];

  /**
    * Validation middleware for MFA enable
    */
  static validateMFAEnable = [
    body('token').isLength({ min: 6, max: 6 }).isNumeric().withMessage('MFA token must be 6 digits'),
  ];

  /**
    * Validation middleware for MFA disable
    */
  static validateMFADisable = [
    body('token').isLength({ min: 6, max: 6 }).isNumeric().withMessage('MFA token must be 6 digits'),
  ];

  /**
   * Handle validation errors
   */
  static handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: errorMessages.join(', '),
        details: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };

  /**
   * Register new user
   */
  static async register(req, res) {
    try {
      console.log('🔍 Registration controller called with:', req.body.email);
      const result = await authService.register(req.body);
      console.log('✅ Registration successful:', result.success);

      res.status(201).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      console.log('❌ Registration failed:', error.message);
      logger.error('Registration controller error', {
        error: error.message,
        body: req.body,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'Registration Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
    * Login user
    */
  static async login(req, res) {
    try {
      console.log('🔐 Login controller called with:', req.body.email);
      const result = await authService.login(req.body);
      console.log('✅ Login successful:', result.success);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      console.log('❌ Login failed:', error.message);
      logger.error('Login controller error', {
        error: error.message,
        email: req.body.email,
        requestId: req.requestId,
      });

      // Return proper status codes based on error type
      let statusCode = 401;
      let errorMessage = 'Authentication Failed';
      
      if (error.code === 'INVALID_CREDENTIALS') {
        statusCode = 401;
        errorMessage = 'Invalid Credentials';
      } else if (error.code === 'RATE_LIMIT') {
        statusCode = 429;
        errorMessage = 'Rate limit exceeded';
      } else if (error.message.includes('locked')) {
        statusCode = 423;
        errorMessage = 'Account locked';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'AUTHENTICATION_FAILED',
          message: errorMessage,
        },
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
    * Admin login with enhanced security
    */
  static async adminLogin(req, res) {
    try {
      // Get client IP for security tracking
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

      const result = await authService.login(req.body, { requireMFA: true, ip: clientIP });

      // Verify admin role
      const user = await authService.getUserById(result.user.id);
      if (user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin Access Denied',
          message: 'You do not have admin privileges.',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
      }

      logger.info('Admin login successful', {
        userId: user.id,
        email: user.email,
        ip: clientIP,
        requestId: req.requestId,
      });

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Admin login controller error', {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
        requestId: req.requestId,
      });

      res.status(401).json({
        success: false,
        error: 'Admin Authentication Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      const result = await authService.verifyEmail(token);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Email verification controller error', {
        error: error.message,
        token: req.params.token,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'Email Verification Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req, res) {
    try {
      const result = await authService.requestPasswordReset(req.body.email);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Password reset request controller error', {
        error: error.message,
        email: req.body.email,
        requestId: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: 'Password Reset Request Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Password reset controller error', {
        error: error.message,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'Password Reset Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.sub; // From JWT token
      const result = await authService.getProfile(userId);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Get profile controller error', {
        error: error.message,
        userId: req.user?.sub,
        requestId: req.requestId,
      });

      res.status(404).json({
        success: false,
        error: 'Profile Not Found',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.sub; // From JWT token
      const result = await authService.updateProfile(userId, req.body);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Update profile controller error', {
        error: error.message,
        userId: req.user?.sub,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'Profile Update Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res) {
    try {
      const userId = req.user.sub; // From JWT token
      const { current_password, new_password } = req.body;
      const result = await authService.changePassword(userId, current_password, new_password);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Change password controller error', {
        error: error.message,
        userId: req.user?.sub,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'Password Change Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req, res) {
    try {
      const { refresh_token, refreshToken } = req.body;
      const tokenToUse = refresh_token || refreshToken;
      const result = await authService.refreshToken(tokenToUse);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Token refresh controller error', {
        error: error.message,
        requestId: req.requestId,
      });

      res.status(401).json({
        success: false,
        error: 'Token Refresh Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
    * Setup MFA for authenticated user
    */
  static async setupMFA(req, res) {
    try {
      const userId = req.user.sub; // From JWT token
      const result = await authService.setupMFA(userId);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('MFA setup controller error', {
        error: error.message,
        userId: req.user?.sub,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'MFA Setup Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
    * Enable MFA for authenticated user
    */
  static async enableMFA(req, res) {
    try {
      const userId = req.user.sub; // From JWT token
      const { token } = req.body;
      const result = await authService.enableMFA(userId, token);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('MFA enable controller error', {
        error: error.message,
        userId: req.user?.sub,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'MFA Enable Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
    * Disable MFA for authenticated user
    */
  static async disableMFA(req, res) {
    try {
      const userId = req.user.sub; // From JWT token
      const { token } = req.body;
      const result = await authService.disableMFA(userId, token);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('MFA disable controller error', {
        error: error.message,
        userId: req.user?.sub,
        requestId: req.requestId,
      });

      res.status(400).json({
        success: false,
        error: 'MFA Disable Failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }

  /**
    * Logout user
    */
  static async logout(req, res) {
    try {
      const { refresh_token } = req.body;
      const result = await authService.logout(refresh_token);

      res.status(200).json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Logout controller error', {
        error: error.message,
        requestId: req.requestId,
      });

      // Always return success for logout
      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  }
}

module.exports = AuthController;
