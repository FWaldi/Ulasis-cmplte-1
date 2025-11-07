const express = require('express');
const router = express.Router();
// const databaseConfig = require('../config/database'); // Not used
// const logger = require('../utils/logger'); // Not used
const { validateRequest, validationSchemas, rateLimiters } = require('../middleware/security'); // eslint-disable-line no-unused-vars

/**
 * @route   GET /api/v1/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get(
  '/',
  (req, res) => {
    console.log('Health route hit');
    // Simple health check for testing
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  },
);

/**
 * @route   GET /api/v1/health/ping
 * @desc    Simple ping endpoint
 * @access  Public
 */
router.get(
  '/ping',
  (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  },
);

module.exports = router;
