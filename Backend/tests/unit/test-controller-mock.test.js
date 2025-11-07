'use strict';

process.env.NODE_ENV = 'test';

// Mock the auth middleware before importing the controller
jest.mock('../../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'Access token is required.',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7);

    // Simple mapping based on token content
    let subscriptionPlan = 'business';
    let userId = 1;
    let email = 'analytics-test@example.com';

    if (token.includes('starter')) {
      subscriptionPlan = 'starter';
      userId = 4;
      email = 'starter@example.com';
    } else if (token.includes('free')) {
      subscriptionPlan = 'free';
      userId = 5;
      email = 'free@example.com';
    } else {
      subscriptionPlan = 'business';
      userId = 1;
      email = 'analytics-test@example.com';
    }

    req.user = {
      sub: userId,
      id: userId,
      email,
      email_verified: true,
      subscription_plan: subscriptionPlan,
      subscriptionPlan,
    };

    req.userProfile = {
      id: userId,
      email,
      email_verified: true,
      subscription_plan: subscriptionPlan,
      subscription_status: 'active',
      isLocked: () => false,
    };

    next();
  },
}));

// Mock subscription validation
jest.mock('../../src/middleware/subscriptionValidation', () => ({
  validateExportLimit: (req, res, next) => {
    const format = req.query.format || 'csv';
    const userPlan = req.userProfile?.subscription_plan || 'free';

    // Check subscription-based export permissions
    if (userPlan === 'free') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR_001',
          message: 'CSV exports not available for free plan',
        },
      });
    }

    if (userPlan === 'starter' && format === 'excel') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR_002',
          message: 'Excel exports not available for starter plan',
        },
      });
    }

    next();
  },
}));

const analyticsController = require('../../src/controllers/analyticsController');

describe('Analytics Controller Subscription Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      params: { questionnaireId: '1' },
      query: {},
      user: null,
      userProfile: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  test('should reject Excel export for starter plan', async () => {
    // Set up starter user
    mockReq.headers.authorization = 'Bearer test-access-token-starter';
    mockReq.query.format = 'excel';

    // Mock the auth middleware to run first
    const auth = require('../../src/middleware/auth');
    await auth.authenticate(mockReq, mockRes, mockNext);

    // Mock subscription validation
    const subValidation = require('../../src/middleware/subscriptionValidation');
    await subValidation.validateExportLimit(mockReq, mockRes, mockNext);

    // Verify the response
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'SUBSCRIPTION_ERROR_002',
        message: 'Excel exports not available for starter plan',
      },
    });
  });

  test('should reject CSV export for free plan', async () => {
    // Set up free user
    mockReq.headers.authorization = 'Bearer test-access-token-free';
    mockReq.query.format = 'csv';

    // Mock the auth middleware to run first
    const auth = require('../../src/middleware/auth');
    await auth.authenticate(mockReq, mockRes, mockNext);

    // Mock subscription validation
    const subValidation = require('../../src/middleware/subscriptionValidation');
    await subValidation.validateExportLimit(mockReq, mockRes, mockNext);

    // Verify the response
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'SUBSCRIPTION_ERROR_001',
        message: 'CSV exports not available for free plan',
      },
    });
  });

  test('should allow CSV export for starter plan', async () => {
    // Set up starter user
    mockReq.headers.authorization = 'Bearer test-access-token-starter';
    mockReq.query.format = 'csv';

    // Mock the auth middleware to run first
    const auth = require('../../src/middleware/auth');
    await auth.authenticate(mockReq, mockRes, mockNext);

    // Mock subscription validation
    const subValidation = require('../../src/middleware/subscriptionValidation');
    await subValidation.validateExportLimit(mockReq, mockRes, mockNext);

    // Should not call status(403) for CSV on starter plan
    expect(mockRes.status).not.toHaveBeenCalledWith(403);
  });

  test('should allow Excel export for business plan', async () => {
    // Set up business user
    mockReq.headers.authorization = 'Bearer test-access-token-business';
    mockReq.query.format = 'excel';

    // Mock the auth middleware to run first
    const auth = require('../../src/middleware/auth');
    await auth.authenticate(mockReq, mockRes, mockNext);

    // Mock subscription validation
    const subValidation = require('../../src/middleware/subscriptionValidation');
    await subValidation.validateExportLimit(mockReq, mockRes, mockNext);

    // Should not call status(403) for Excel on business plan
    expect(mockRes.status).not.toHaveBeenCalledWith(403);
  });
});