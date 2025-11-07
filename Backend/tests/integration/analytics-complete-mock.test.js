'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app-test');

// Mock the models to isolate database issues
jest.mock('../../src/models', () => ({
  Questionnaire: {
    findByPk: jest.fn().mockResolvedValue(null), // Return null to simulate not found
    destroy: jest.fn().mockResolvedValue(true),
  },
  User: {
    destroy: jest.fn().mockResolvedValue(true),
  },
  Question: {
    destroy: jest.fn().mockResolvedValue(true),
  },
  Response: {
    destroy: jest.fn().mockResolvedValue(true),
  },
  Answer: {
    destroy: jest.fn().mockResolvedValue(true),
  },
}));

// Mock the analytics services completely
jest.mock('../../src/services/bubbleAnalyticsService', () => ({
  getBubbleAnalytics: jest.fn(),
  validateQuestionnaireForBubbleAnalytics: jest.fn(),
}));

jest.mock('../../src/services/timeComparisonService', () => ({
  getTimeComparison: jest.fn(),
}));

jest.mock('../../src/services/reportService', () => ({
  generateReport: jest.fn(),
}));

// Mock security middleware to prevent rate limiting issues
jest.mock('../../src/middleware/security', () => ({
  validateInput: jest.fn().mockImplementation((req, res, next) => next()),
  rateLimiters: {
    general: jest.fn().mockImplementation((req, res, next) => next()),
    analytics: jest.fn().mockImplementation((req, res, next) => next()),
    auth: jest.fn().mockImplementation((req, res, next) => next()),
    submission: jest.fn().mockImplementation((req, res, next) => next()),
    qrGeneration: jest.fn().mockImplementation((req, res, next) => next()),
    anonymousSubmission: jest.fn().mockImplementation((req, res, next) => next()),
    qrScanTracking: jest.fn().mockImplementation((req, res, next) => next()),
  },
  helmetConfig: jest.fn().mockReturnValue((req, res, next) => next()),
  validateRequest: jest.fn().mockReturnValue((req, res, next) => next()),
  validationSchemas: {},
  securityHeaders: jest.fn().mockImplementation((req, res, next) => next()),
  ipWhitelist: jest.fn().mockReturnValue((req, res, next) => next()),
  requestSizeLimiter: jest.fn().mockReturnValue((req, res, next) => next()),
}));

describe('Analytics Complete Mock Test', () => {
  it('should handle analytics endpoint with complete mocking', async () => {
    const response = await request(app)
      .get('/api/v1/analytics/bubble/99999')
      .set('Authorization', 'Bearer test-access-token-analytics-business')
      .timeout(5000); // 5 second timeout

    expect(response.status).toBe(404); // Should return 404 when questionnaire not found
  }, 10000); // Test timeout of 10 seconds
});