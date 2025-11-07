'use strict';

const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');
const { rateLimiters } = require('../middleware/security');

// Apply authentication and rate limiting
router.use(AuthMiddleware.authenticate);
router.use(rateLimiters.general);

/**
 * @route GET /api/v1/api-keys
 * @desc Get user's API keys
 * @access Private (Business/Admin plans)
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;

    // Check subscription plan - only business and admin can access API keys
    if (!['business', 'admin'].includes(user.subscription_plan)) {
      const errorCode = user.subscription_plan === 'starter' ? 'SUBSCRIPTION_ERROR_002' : 'SUBSCRIPTION_ERROR_001';
      return res.status(403).json({
        success: false,
        error: {
          code: errorCode,
          message: 'API keys are available for Business and Admin plans only',
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }

    // Mock API keys data for testing
    const mockApiKeys = [
      {
        id: 1,
        name: 'Production API Key',
        key: 'ak_live_xxxxxxxxxxxxxxxxxxxxxxxx',
        permissions: ['read', 'write'],
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        is_active: true,
      },
      {
        id: 2,
        name: 'Test API Key',
        key: 'ak_test_yyyyyyyyyyyyyyyyyyyyyyyy',
        permissions: ['read'],
        created_at: new Date().toISOString(),
        last_used: null,
        is_active: true,
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        apiKeys: mockApiKeys,
        count: mockApiKeys.length,
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve API keys',
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }
});

/**
 * @route POST /api/v1/api-keys
 * @desc Create new API key
 * @access Private (Business/Admin plans)
 */
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    const { name, permissions } = req.body;

    // Check subscription plan
    if (!['business', 'admin'].includes(user.subscription_plan)) {
      const errorCode = user.subscription_plan === 'starter' ? 'SUBSCRIPTION_ERROR_002' : 'SUBSCRIPTION_ERROR_001';
      return res.status(403).json({
        success: false,
        error: {
          code: errorCode,
          message: 'API keys are available for Business and Admin plans only',
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }

    // Mock API key creation
    const newApiKey = {
      id: Date.now(),
      name: name || 'New API Key',
      key: `ak_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      permissions: permissions || ['read'],
      created_at: new Date().toISOString(),
      last_used: null,
      is_active: true,
    };

    res.status(201).json({
      success: true,
      data: {
        apiKey: newApiKey,
      },
      message: 'API key created successfully',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }
});

module.exports = router;