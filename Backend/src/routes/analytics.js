'use strict';

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const AuthMiddleware = require('../middleware/auth');
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
 * @route GET /api/v1/analytics/bubble/:questionnaireId
 * @desc Get bubble analytics for a questionnaire
 * @access Private
 * @param {number} questionnaireId - Questionnaire ID
 * @query {string} dateFrom - Start date for analytics period (optional)
 * @query {string} dateTo - End date for analytics period (optional)
 * @query {string} comparisonPeriod - Comparison period type: 'week' or 'custom' (default: 'week')
 * @query {string} customDateFrom - Custom comparison start date (optional)
 * @query {string} customDateTo - Custom comparison end date (optional)
 */
router.get(
  '/bubble/:questionnaireId',
  [
    param('questionnaireId')
      .isInt({ min: 1 })
      .withMessage('Questionnaire ID must be a positive integer'),

    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('dateFrom must be a valid date'),

    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('dateTo must be a valid date'),

    query('comparisonPeriod')
      .optional()
      .isIn(['week', 'custom'])
      .withMessage('comparisonPeriod must be either "week" or "custom"'),

    query('customDateFrom')
      .optional()
      .isISO8601()
      .withMessage('customDateFrom must be a valid date'),

    query('customDateTo')
      .optional()
      .isISO8601()
      .withMessage('customDateTo must be a valid date'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: errors.array().map(error => error.msg).join(', '),
        details: errors.array(),
        timestamp: new Date().toISOString(),
      });
    }
    next();
  },
  analyticsController.getBubbleAnalytics,
);

/**
 * @route GET /api/v1/analytics/comparison/:questionnaireId
 * @desc Get time-period comparison analytics
 * @access Private
 * @param {number} questionnaireId - Questionnaire ID
 * @query {string} currentPeriodStart - Current period start date (optional)
 * @query {string} currentPeriodEnd - Current period end date (optional)
 * @query {string} previousPeriodStart - Previous period start date (optional)
 * @query {string} previousPeriodEnd - Previous period end date (optional)
 * @query {string} comparisonType - Comparison type: 'week_over_week' or 'custom' (default: 'week_over_week')
 */
router.get(
  '/comparison/:questionnaireId',
  [
    param('questionnaireId')
      .isInt({ min: 1 })
      .withMessage('Questionnaire ID must be a positive integer'),

    query('currentPeriodStart')
      .optional()
      .isISO8601()
      .withMessage('currentPeriodStart must be a valid date'),

    query('currentPeriodEnd')
      .optional()
      .isISO8601()
      .withMessage('currentPeriodEnd must be a valid date'),

    query('previousPeriodStart')
      .optional()
      .isISO8601()
      .withMessage('previousPeriodStart must be a valid date'),

    query('previousPeriodEnd')
      .optional()
      .isISO8601()
      .withMessage('previousPeriodEnd must be a valid date'),

    query('comparison_type')
      .optional()
      .isIn(['week_over_week', 'custom'])
      .withMessage('comparison_type must be either "week_over_week" or "custom"'),
  ],
  analyticsController.getTimePeriodComparison,
);

/**
 * @route GET /api/v1/analytics/report/:questionnaireId
 * @desc Generate and download analytics report
 * @access Private (Starter plan for CSV, Business plan for Excel)
 * @param {number} questionnaireId - Questionnaire ID
 * @query {string} format - Export format: 'csv' or 'excel' (default: 'csv')
 * @query {string} dateFrom - Start date for report period (optional)
 * @query {string} dateTo - End date for report period (optional)
 * @query {boolean} includeComparison - Include comparison data (default: false)
 * @query {boolean} includeRawData - Include raw response data (default: false)
 */
router.get(
  '/report/:questionnaireId',
  [
    param('questionnaireId')
      .isInt({ min: 1 })
      .withMessage('Questionnaire ID must be a positive integer'),

    query('format')
      .optional()
      .isIn(['csv', 'excel'])
      .withMessage('format must be either "csv" or "excel"'),

    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('dateFrom must be a valid date'),

    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('dateTo must be a valid date'),

    query('includeComparison')
      .optional()
      .isBoolean()
      .withMessage('includeComparison must be a boolean'),

    query('includeRawData')
      .optional()
      .isBoolean()
      .withMessage('includeRawData must be a boolean'),
  ],
  analyticsController.generateReport,
);

/**
 * @route GET /api/v1/analytics/summary/:questionnaireId
 * @desc Get analytics summary for dashboard
 * @access Private
 * @param {number} questionnaireId - Questionnaire ID
 * @query {string} dateFrom - Start date for analytics period (optional)
 * @query {string} dateTo - End date for analytics period (optional)
 */
router.get(
  '/summary/:questionnaireId',
  [
    param('questionnaireId')
      .isInt({ min: 1 })
      .withMessage('Questionnaire ID must be a positive integer'),

    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('dateFrom must be a valid date'),

    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('dateTo must be a valid date'),
  ],
  analyticsController.getAnalyticsSummary,
);

/**
 * @route GET /api/v1/analytics/realtime/:questionnaireId
 * @desc Get real-time analytics updates (last 24 hours)
 * @access Private
 * @param {number} questionnaireId - Questionnaire ID
 */
router.get(
  '/realtime/:questionnaireId',
  [
    param('questionnaireId')
      .isInt({ min: 1 })
      .withMessage('Questionnaire ID must be a positive integer'),
  ],
  analyticsController.getRealTimeAnalytics,
);

/**
 * @route GET /api/v1/analytics/dashboard/:questionnaireId
 * @desc Get analytics dashboard with KPI cards, trends, and breakdown
 * @access Private
 * @param {number} questionnaireId - Questionnaire ID
 * @query {string} period - Time period: 'day', 'week', 'month', 'year' (default: 'week')
 */
router.get(
  '/dashboard/:questionnaireId',
  [
    param('questionnaireId')
      .isInt({ min: 1 })
      .withMessage('Questionnaire ID must be a positive integer'),

    query('period')
      .optional()
      .isIn(['day', 'week', 'month', 'year'])
      .withMessage('period must be one of: day, week, month, year'),
  ],
  analyticsController.getDashboard,
);

/**
 * @route GET /api/v1/analytics/dashboard
 * @desc Get general analytics dashboard (no questionnaire ID required)
 * @access Private
 */
router.get('/dashboard', analyticsController.getGeneralDashboard);

/**
 * @route GET /api/v1/analytics/advanced
 * @desc Get advanced analytics (Business/Admin only)
 * @access Private (Business/Admin plans)
 */
router.get('/advanced', analyticsController.getAdvancedAnalytics);

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