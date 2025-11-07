'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const NotificationController = require('../controllers/notificationController');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all notification routes
router.use(AuthMiddleware.authenticate);

// Rate limiting for notification endpoints
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many notification requests, please try again later.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id, // Rate limit per user, not IP
});

// Stricter rate limiting for test email endpoint
const testEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 test emails per hour
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many test emails sent, please try again after 1 hour.',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
});

// Get notification preferences
router.get(
  '/preferences',
  notificationLimiter,
  NotificationController.getPreferences,
);

// Update notification preferences
router.put(
  '/preferences',
  notificationLimiter,
  NotificationController.validatePreferencesUpdate,
  NotificationController.updatePreferences,
);

// Get notification history
router.get(
  '/history',
  notificationLimiter,
  NotificationController.getHistory,
);

// Send test email
router.post(
  '/test',
  testEmailLimiter,
  NotificationController.validateTestEmail,
  NotificationController.sendTestEmail,
);

module.exports = router;