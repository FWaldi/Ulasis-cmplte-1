'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Rate limiting for authentication endpoints - TEMPORARILY DISABLED
const authLimiter = (req, res, next) => {
  // Completely disabled for development/testing
  return next();
};

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many password reset attempts from this IP, please try again after 1 hour.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration endpoint
router.post(
  '/register',
  authLimiter,
  AuthController.validateRegistration,
  AuthController.handleValidationErrors,
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : AuthMiddleware.logAuthEvent('register'),
  AuthController.register,
);

// Login endpoint
router.post(
  '/login',
  authLimiter,
  AuthController.validateLogin,
  AuthController.handleValidationErrors,
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : AuthMiddleware.logAuthEvent('login'),
  AuthController.login,
);

// Admin login endpoint with enhanced security
router.post(
  '/admin/login',
  authLimiter,
  AuthController.validateAdminLogin,
  AuthController.handleValidationErrors,
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : AuthMiddleware.logAuthEvent('admin_login'),
  AuthController.adminLogin,
);

// Email verification endpoint
router.get('/verify/:token', AuthController.verifyEmail);

// Password reset request endpoint
router.post(
  '/forgot-password',
  passwordResetLimiter,
  AuthController.validatePasswordResetRequest,
  AuthController.handleValidationErrors,
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : AuthMiddleware.logAuthEvent('forgot_password'),
  AuthController.requestPasswordReset,
);

// Password reset confirmation endpoint
router.post(
  '/reset-password',
  AuthController.validatePasswordReset,
  AuthController.handleValidationErrors,
  process.env.NODE_ENV === 'test' ? (req, res, next) => next() : AuthMiddleware.logAuthEvent('reset_password'),
  AuthController.resetPassword,
);

// Token refresh endpoint
router.post(
  '/refresh',
  AuthController.validateTokenRefresh,
  AuthController.handleValidationErrors,
  AuthController.refreshToken,
);

// Logout endpoint
router.post('/logout', AuthController.logout);

// Protected routes (require authentication)
router.use(AuthMiddleware.authenticate);

// Get user profile
router.get('/profile', AuthController.getProfile);

// Update user profile
router.put(
  '/profile',
  AuthController.validateProfileUpdate,
  AuthController.handleValidationErrors,
  AuthController.updateProfile,
);

// Change password
router.post(
  '/change-password',
  AuthController.validatePasswordChange,
  AuthController.handleValidationErrors,
  AuthController.changePassword,
);

// MFA setup
router.post(
  '/mfa/setup',
  AuthController.validateMFASetup,
  AuthController.handleValidationErrors,
  AuthController.setupMFA,
);

// MFA enable
router.post(
  '/mfa/enable',
  AuthController.validateMFAEnable,
  AuthController.handleValidationErrors,
  AuthController.enableMFA,
);

// MFA disable
router.post(
  '/mfa/disable',
  AuthController.validateMFADisable,
  AuthController.handleValidationErrors,
  AuthController.disableMFA,
);

module.exports = router;
