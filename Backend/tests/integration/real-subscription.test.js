'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app-test');
const { sequelize } = require('../../src/config/database-test');
const { User, Questionnaire, SubscriptionUsage } = require('../../src/models');

// Mock security middleware to prevent rate limiting hangs
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

describe('Real Subscription Integration Tests', () => {
  let freeUser, starterUser, businessUser;
  let freeToken, starterToken, businessToken;

  beforeAll(async () => {
    // jest.setTimeout(30000); // Removed - using --no-timeout flag instead

    // Ensure clean database
    await sequelize.sync({ force: true });

    // Create users with different subscription plans via registration
    const freeResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'free-user@example.com',
        password: 'password123',
        first_name: 'Free',
        last_name: 'User',
      })
      .expect(201);

    const starterResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'starter-user@example.com',
        password: 'password123',
        first_name: 'Starter',
        last_name: 'User',
      })
      .expect(201);

    const businessResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'business-user@example.com',
        password: 'password123',
        first_name: 'Business',
        last_name: 'User',
      })
      .expect(201);

    // Update users with subscription plans
    freeUser = await User.findByPk(freeResponse.body.data.user_id);
    await freeUser.update({
      subscription_plan: 'free',
      subscription_status: 'active',
      email_verified: true,
    });

    starterUser = await User.findByPk(starterResponse.body.data.user_id);
    await starterUser.update({
      subscription_plan: 'starter',
      subscription_status: 'active',
      email_verified: true,
    });

    businessUser = await User.findByPk(businessResponse.body.data.user_id);
    await businessUser.update({
      subscription_plan: 'business',
      subscription_status: 'active',
      email_verified: true,
    });

    // Login to get tokens
    const freeLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'free-user@example.com', password: 'password123' });
    freeToken = freeLogin.body.data.accessToken;

    const starterLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'starter-user@example.com', password: 'password123' });
    starterToken = starterLogin.body.data.accessToken;

    const businessLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'business-user@example.com', password: 'password123' });
    businessToken = businessLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await sequelize.sync({ force: true });
    await sequelize.close();
  });

  describe('Real Subscription Status', () => {
    test('should return real subscription status for free user', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(freeUser.id);
      expect(response.body.data.subscription_plan).toBe('free');
      expect(response.body.data.subscription_status).toBe('active');
    });

    test('should return real subscription status for starter user', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(starterUser.id);
      expect(response.body.data.subscription_plan).toBe('starter');
      expect(response.body.data.subscription_status).toBe('active');
    });

    test('should return real subscription status for business user', async () => {
      const response = await request(app)
        .get('/api/v1/subscription/current')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(businessUser.id);
      expect(response.body.data.subscription_plan).toBe('business');
      expect(response.body.data.subscription_status).toBe('active');
    });
  });

  describe('Real Subscription Usage', () => {
    test('should track real questionnaire usage for free user', async () => {
      // Create a questionnaire for free user
      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          title: 'Free User Questionnaire',
          description: 'Test questionnaire',
          isActive: true,
        })
        .expect(201);

      // Check usage
      const response = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.usage.questionnaires.used).toBe(1);
      expect(response.body.data.usage.questionnaires.limit).toBe(1);
    });

    test('should allow multiple questionnaires for starter user', async () => {
      // Create multiple questionnaires for starter user
      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${starterToken}`)
        .send({
          title: 'Starter User Questionnaire 1',
          description: 'Test questionnaire',
          isActive: true,
        })
        .expect(201);

      await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${starterToken}`)
        .send({
          title: 'Starter User Questionnaire 2',
          description: 'Test questionnaire',
          isActive: true,
        })
        .expect(201);

      // Check usage
      const response = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.usage.questionnaires.used).toBe(2);
      expect(response.body.data.usage.questionnaires.limit).toBe(5);
    });
  });

  describe('Real Subscription Limits Enforcement', () => {
    beforeEach(async () => {
      // Simulate free user already having 1 questionnaire by incrementing mock usage
      const subscriptionService = require('../../src/services/subscriptionService');
      await subscriptionService.incrementUsage(freeUser.id, 'questionnaires', 1);
    });

    test('should enforce free user questionnaire limit', async () => {
      // Free user already has 1 questionnaire from setup
      const response = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          title: 'Should Fail Questionnaire',
          description: 'This should exceed free limit',
          isActive: true,
        })
        .expect(402);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');
      expect(response.body.error.message).toContain('Questionnaires limit exceeded');
    });

    test('should allow unlimited questionnaires for business user', async () => {
      // Reset questionnaires usage to ensure clean test
      const { resetUserUsage } = require('../../tests/setup');
      resetUserUsage('questionnaires');

      // Business user should be able to create many questionnaires
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/v1/questionnaires')
          .set('Authorization', `Bearer ${businessToken}`)
          .send({
            title: `Business Questionnaire ${i}`,
            description: `Business user questionnaire ${i}`,
            isActive: true,
          })
          .expect(201);
      }

      // Check usage - should show actual count but no limit
      const response = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.usage.questionnaires.used).toBe(3);
      expect(response.body.data.usage.questionnaires.limit).toBeNull();
    });
  });

  describe('Real Response Submission with Limits', () => {
    test('should allow response submission within limits', async () => {
      // Create a questionnaire for response testing
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${starterToken}`)
        .send({
          title: 'Response Test Questionnaire',
          description: 'For testing response limits',
          isActive: true,
        })
        .expect(201);

      const questionnaireId = qResponse.body.data.id;

      // Add a question
      const questionResponse = await request(app)
        .post(`/api/v1/questions/questionnaires/${questionnaireId}/questions`)
        .set('Authorization', `Bearer ${starterToken}`)
        .send({
          questionText: 'How would you rate our service?',
          questionType: 'rating',
          isRequired: true,
        })
        .expect(201);

      const questionId = questionResponse.body.data.id;

      const response = await request(app)
        .post('/api/v1/responses')
        .set('Authorization', `Bearer ${starterToken}`)
        .send({
          questionnaireId,
          responses: [{ questionId, answerText: 'Test response' }],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should track response usage correctly', async () => {
      // Create a questionnaire for response testing
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${starterToken}`)
        .send({
          title: 'Response Usage Test Questionnaire',
          description: 'For testing response usage tracking',
          isActive: true,
        })
        .expect(201);

      const questionnaireId = qResponse.body.data.id;

      // Add a question
      const questionResponse = await request(app)
        .post(`/api/v1/questions/questionnaires/${questionnaireId}/questions`)
        .set('Authorization', `Bearer ${starterToken}`)
        .send({
          questionText: 'How would you rate our service?',
          questionType: 'rating',
          isRequired: true,
        })
        .expect(201);

      const questionId = questionResponse.body.data.id;

      // Submit multiple responses as authenticated user
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/responses')
          .set('Authorization', `Bearer ${starterToken}`)
          .send({
            questionnaireId,
            responses: [{ questionId, answerText: `Response ${i}` }],
          })
          .expect(201);
      }

      // Check usage
      const response = await request(app)
        .get('/api/v1/subscription/usage')
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.usage.responses.used).toBeGreaterThan(5);
      expect(response.body.data.usage.responses.limit).toBe(500);
    });
  });

  describe('Real Export Permissions', () => {
    let questionnaireId;

    beforeAll(async () => {
      // Create a questionnaire for export testing
      const qResponse = await request(app)
        .post('/api/v1/questionnaires')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          title: 'Export Test Questionnaire',
          description: 'For testing export permissions',
          isActive: true,
        })
        .expect(201);

      questionnaireId = qResponse.body.data.id;
    });

    test('should reject CSV export for free user', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_001');
    });

    test('should allow CSV export for starter user', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });

    test('should reject Excel export for starter user', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${starterToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBSCRIPTION_ERROR_002');
    });

    test('should allow Excel export for business user', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/report/${questionnaireId}`)
        .query({ format: 'excel' })
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });
});