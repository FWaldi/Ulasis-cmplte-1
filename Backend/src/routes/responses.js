'use strict';

const express = require('express');
const router = express.Router();

// Import controllers
const responseController = require('../controllers/responseController');

// Import middleware
const { validateAnonymousSubmission } = require('../middleware/validation');
const { anonymousRateLimit } = require('../middleware/rateLimiting');
const { spamProtection, sanitizeContent } = require('../middleware/spamProtection');
const AuthMiddleware = require('../middleware/auth');

/**
 * Authenticated Response Routes
 * These routes require authentication
 */

// POST /api/v1/responses - Submit authenticated response
router.post('/',
  AuthMiddleware.authenticate,
  responseController.submitResponse,
);

/**
 * Anonymous Response Routes
 * These routes do not require authentication
 */

// POST /api/v1/responses/anonymous - Submit anonymous response
router.post('/anonymous',
  anonymousRateLimit,
  spamProtection,
  sanitizeContent,
  validateAnonymousSubmission,
  responseController.submitAnonymousResponse,
);

// GET /api/v1/responses/anonymous/:id - Get anonymous response (public data)
router.get('/anonymous/:id',
  responseController.getAnonymousResponse,
);

// GET /api/v1/responses/questionnaire/:questionnaire_id - Get questionnaire responses (public aggregated)
router.get('/questionnaire/:questionnaire_id',
  responseController.getQuestionnaireResponses,
);

// GET /api/v1/responses/analytics/:questionnaire_id - Get questionnaire analytics (public aggregated)
router.get('/analytics/:questionnaire_id',
  responseController.getQuestionnaireAnalytics,
);

// GET /api/v1/responses/kpis/:questionnaire_id - Get real-time KPIs for questionnaire
router.get('/kpis/:questionnaire_id',
  responseController.getQuestionnaireKPIs,
);

/**
 * QR Code Scan Tracking Routes
 * These routes handle QR code scan analytics and tracking
 */

// POST /api/v1/responses/qr-scan/:qr_code_id - Track QR code scan
router.post('/qr-scan/:qr_code_id',
  anonymousRateLimit,
  responseController.trackQRCodeScan,
);

// GET /api/v1/responses/qr-scan/:qr_code_id/analytics - Get QR code scan analytics
router.get('/qr-scan/:qr_code_id/analytics',
  responseController.getQRCodeScanAnalytics,
);

// GET /api/v1/responses/location/:location_tag/performance - Get location performance analytics
router.get('/location/:location_tag/performance',
  responseController.getLocationPerformance,
);

// GET /api/v1/responses/locations/top - Get top performing locations
router.get('/locations/top',
  responseController.getTopLocations,
);

// GET /api/v1/responses/scan-statistics - Get scan statistics summary
router.get('/scan-statistics',
  responseController.getScanStatisticsSummary,
);

/**
 * Batch Processing Management Routes
 * These routes require admin authentication
 */

// GET /api/v1/responses/batch/status - Get batch processing status
router.get('/batch/status',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.getBatchProcessingStatus,
);

// PUT /api/v1/responses/batch/configure - Configure batch processing
router.put('/batch/configure',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.configureBatchProcessing,
);

// POST /api/v1/responses/batch/force-process - Force process all queued responses
router.post('/batch/force-process',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.forceProcessAllQueued,
);

/**
 * Privacy and Data Protection Routes
 * These routes require admin authentication
 */

// GET /api/v1/responses/privacy/compliance-report - Get privacy compliance report
router.get('/privacy/compliance-report',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.getPrivacyComplianceReport,
);

// GET /api/v1/responses/privacy/gdpr-validation - Validate GDPR compliance
router.get('/privacy/gdpr-validation',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.validateGDPRCompliance,
);

// POST /api/v1/responses/privacy/cleanup - Clean up expired data
router.post('/privacy/cleanup',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.cleanupExpiredData,
);

// GET /api/v1/responses/privacy/export - Export data with privacy controls
router.get('/privacy/export',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.exportDataWithPrivacy,
);

// PUT /api/v1/responses/privacy/settings - Update privacy settings
router.put('/privacy/settings',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.updatePrivacySettings,
);

// PUT /api/v1/responses/privacy/retention - Update retention policies
router.put('/privacy/retention',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole(['admin']),
  responseController.updateRetentionPolicies,
);

module.exports = router;