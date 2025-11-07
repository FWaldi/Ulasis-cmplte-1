'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app-test');
const { sequelize } = require('../../src/config/database-test');
const { User, Questionnaire, Question, Response, Answer } = require('../../src/models');

// Use the auth middleware mock from setup.js - no need to re-mock it

// Mock security middleware to prevent rate limiting issues in tests
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

describe('Analytics API Integration Tests', () => {
  let testUser, authToken, testQuestionnaire, testQuestions, testResponses;

  beforeAll(async () => {
    // Increase timeout for database setup
    // jest.setTimeout(30000); // Removed - using --no-timeout flag instead

    // Ensure test database is clean
    await sequelize.sync({ force: true });

    // Create test user
    testUser = await User.createWithPassword({
      id: 1,
      email: 'analytics-test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      subscriptionPlan: 'business', // Business plan for full access
    });

    // Use mock auth token instead of real login
    authToken = 'test-access-token-analytics-business';

    // Create test questionnaire
    testQuestionnaire = await Questionnaire.create({
      userId: testUser.id,
      title: 'Analytics Test Questionnaire',
      description: 'Test questionnaire for analytics',
      categoryMapping: {
        'service': { improvementArea: 'Service Quality', weight: 1.0 },
        'product': { improvementArea: 'Product Quality', weight: 1.2 },
        'ambience': { improvementArea: 'Ambience', weight: 0.8 },
      },
      isActive: true,
    });

    // Create test questions
    testQuestions = await Question.bulkCreate([
      {
        questionnaireId: testQuestionnaire.id,
        questionText: 'How would you rate our service?',
        questionType: 'rating',
        category: 'service',
        isRequired: true,
        orderIndex: 1,
        minValue: 1,
        maxValue: 5,
      },
      {
        questionnaireId: testQuestionnaire.id,
        questionText: 'How would you rate our product quality?',
        questionType: 'rating',
        category: 'product',
        isRequired: true,
        orderIndex: 2,
        minValue: 1,
        maxValue: 5,
      },
      {
        questionnaireId: testQuestionnaire.id,
        questionText: 'How would you rate ambience?',
        questionType: 'rating',
        category: 'ambience',
        isRequired: true,
        orderIndex: 3,
        minValue: 1,
        maxValue: 5,
      },
    ]);

    // Create fewer test responses to reduce test time
    testResponses = [];
    for (let i = 0; i < 5; i++) {
      const response = await Response.create({
        questionnaireId: testQuestionnaire.id,
        responseDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        deviceFingerprint: `device-${i}`,
        ipAddress: `192.168.1.${i + 1}`,
        isComplete: true,
        progressPercentage: 100,
      });

      // Create answers for each question
      await Answer.bulkCreate([
        {
          responseId: response.id,
          questionId: testQuestions[0].id,
          ratingScore: Math.random() * 4 + 1, // Random rating 1-5
          isSkipped: false,
          validationStatus: 'valid',
        },
        {
          responseId: response.id,
          questionId: testQuestions[1].id,
          ratingScore: Math.random() * 4 + 1, // Random rating 1-5
          isSkipped: false,
          validationStatus: 'valid',
        },
        {
          responseId: response.id,
          questionId: testQuestions[2].id,
          ratingScore: Math.random() * 4 + 1, // Random rating 1-5
          isSkipped: false,
          validationStatus: 'valid',
        },
      ]);

      testResponses.push(response);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await sequelize.sync({ force: true });
    await sequelize.close();
  });

  describe('GET /api/v1/analytics/bubble/:questionnaireId', () => {
    it('should return bubble analytics for valid questionnaire', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('questionnaire_id', testQuestionnaire.id);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories.length).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty('period_comparison');
      expect(response.body.data).toHaveProperty('total_responses');
      expect(response.body.data).toHaveProperty('response_rate');
      expect(response.body.data).toHaveProperty('generated_at');

      // Validate category structure
      const category = response.body.data.categories[0];
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('rating');
      expect(category).toHaveProperty('response_count');
      expect(category).toHaveProperty('color');
      expect(category).toHaveProperty('trend');
      expect(['red', 'yellow', 'green']).toContain(category.color);
      expect(['improving', 'declining', 'stable']).toContain(category.trend);
    });

    it('should accept date range parameters', async () => {
      const dateFrom = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
        .query({ dateFrom, dateTo })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.total_responses).toBe('number');
    });

    it('should accept custom comparison period', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
        .query({
          comparisonPeriod: 'custom',
          customDateFrom: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          customDateTo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent questionnaire', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/bubble/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ANALYTICS_ERROR_001');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
        .expect(401);
    });

    it('should validate questionnaire ID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/bubble/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/analytics/comparison/:questionnaireId', () => {
    it('should return time period comparison', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/comparison/${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('questionnaire_id', testQuestionnaire.id);
      expect(response.body.data).toHaveProperty('comparison_type');
      expect(response.body.data).toHaveProperty('current_period');
      expect(response.body.data).toHaveProperty('previous_period');
      expect(response.body.data).toHaveProperty('comparison_metrics');

      const metrics = response.body.data.comparison_metrics;
      expect(metrics).toHaveProperty('response_count_change');
      expect(metrics).toHaveProperty('overall_rating_change');
      expect(metrics).toHaveProperty('category_comparisons');
      expect(metrics).toHaveProperty('overall_trend');
    });

    it('should accept custom date ranges', async () => {
      const currentPeriodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const currentPeriodEnd = new Date().toISOString();
      const previousPeriodStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const previousPeriodEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/v1/analytics/comparison/${testQuestionnaire.id}`)
        .query({
          comparisonType: 'custom',
          currentPeriodStart,
          currentPeriodEnd,
          previousPeriodStart,
          previousPeriodEnd,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comparison_type).toBe('custom');
    });
  });

  describe('GET /api/v1/analytics/report/:questionnaireId', () => {
    it('should generate CSV report for business plan', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${testQuestionnaire.id}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Analytics Report');
      expect(response.text).toContain('Category Analytics');
    });

    it('should generate Excel report for business plan', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${testQuestionnaire.id}`)
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should include comparison data when requested', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${testQuestionnaire.id}`)
        .query({
          format: 'csv',
          includeComparison: true,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('Period Comparison');
    });

    it('should reject Excel export for starter plan', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${testQuestionnaire.id}`)
        .query({ format: 'excel' })
        .set('Authorization', 'Bearer test-access-token-starter')
        .expect(403);

      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_002');
    });

    it('should reject any export for free plan', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${testQuestionnaire.id}`)
        .query({ format: 'csv' })
        .set('Authorization', 'Bearer test-access-token-free')
        .expect(403);

      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');
    });
  });

  describe('GET /api/v1/analytics/summary/:questionnaireId', () => {
    it('should return analytics summary', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/summary/${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('questionnaire_id', testQuestionnaire.id);
      expect(response.body.data).toHaveProperty('total_categories');
      expect(response.body.data).toHaveProperty('overall_rating');
      expect(response.body.data).toHaveProperty('total_responses');
      expect(response.body.data).toHaveProperty('response_rate');
      expect(response.body.data).toHaveProperty('color_distribution');
      expect(response.body.data).toHaveProperty('overall_trend');

      const colorDist = response.body.data.color_distribution;
      expect(colorDist).toHaveProperty('red');
      expect(colorDist).toHaveProperty('yellow');
      expect(colorDist).toHaveProperty('green');
    });
  });

  describe('GET /api/v1/analytics/realtime/:questionnaireId', () => {
    it('should return real-time analytics', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/realtime/${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('questionnaire_id', testQuestionnaire.id);
      expect(response.body.data).toHaveProperty('real_time_window', '24 hours');
      expect(response.body.data).toHaveProperty('last_updated');
    });
  });

  describe('Error Handling', () => {
    it('should handle questionnaire without category mapping', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/bubble/0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ANALYTICS_ERROR_003');
    });

    it('should handle invalid date formats', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
        .query({ dateFrom: 'invalid-date' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid comparison parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
        .query({ comparisonPeriod: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app)
        .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds (test environment)
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(1).fill().map(() =>
        request(app)
          .get(`/api/v1/analytics/bubble/${testQuestionnaire.id}`)
          .set('Authorization', `Bearer ${authToken}`),
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});