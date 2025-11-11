'use strict';

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const AuthMiddleware = require('../middleware/auth');
const subscriptionValidation = require('../middleware/subscriptionValidation');
const { rateLimiters } = require('../middleware/security');

const router = express.Router();

/**
 * Analytics Routes
 * All routes require authentication and rate limiting
 *
 * TEMPORARILY DISABLED FOR PRODUCTION DEPLOYMENT
 * Analytics service is undergoing performance optimization
 * Core functionality (auth, questionnaires, subscription) remains fully operational
 */

// Apply authentication and rate limiting middleware to all routes
router.use(AuthMiddleware.authenticate);
router.use(rateLimiters.analytics);

/**
 * @route GET /api/analytics/sentiment-analysis
 * @desc Get sentiment analysis data (subscription-based)
 * @access Private (requires sentimentAnalysis feature)
 */
router.get(
  '/sentiment-analysis',
  [
    query('dateRange')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('dateRange must be one of: day, week, month, year'),
  ],
  subscriptionValidation.validateFeatureAccess('sentiment_analysis'),
  analyticsController.getAnalytics
);

/**
 * @route GET /api/analytics/actionable-insights
 * @desc Get actionable insights (subscription-based)
 * @access Private (requires actionableInsights feature)
 */
router.get(
  '/actionable-insights',
  [
    query('dateRange')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('dateRange must be one of: day, week, month, year'),
  ],
  subscriptionValidation.validateFeatureAccess('actionable_insights'),
  analyticsController.getActionableInsights
);

/**
 * @route GET /api/analytics/real-time
 * @desc Get real-time analytics (subscription-based)
 * @access Private (requires realTimeAnalytics feature)
 */
router.get(
  '/real-time',
  subscriptionValidation.validateFeatureAccess('real_time_analytics'),
  analyticsController.getRealTimeAnalytics
);

/**
 * @route GET /api/analytics/customer-journey
 * @desc Get customer journey analytics (subscription-based)
 * @access Private (requires customerJourney feature)
 */
router.get(
  '/customer-journey',
  [
    query('dateRange')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('dateRange must be one of: day, week, month, year'),
  ],
  subscriptionValidation.validateFeatureAccess('customer_journey'),
  analyticsController.getCustomerJourney
);

/**
 * @route GET /api/analytics/advanced-sentiment
 * @desc Get advanced sentiment analysis (subscription-based)
 * @access Private (requires advancedAnalytics feature)
 */
router.get(
  '/advanced-sentiment',
  [
    query('dateRange')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('dateRange must be one of: day, week, month, year'),
  ],
  subscriptionValidation.validateFeatureAccess('advanced_analytics'),
  analyticsController.getAdvancedSentiment
);



/**
 * Error handling middleware for validation errors
 */
router.use((error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: error.details || error.message,
      },
    });
  }
  next(error);
});

module.exports = router;